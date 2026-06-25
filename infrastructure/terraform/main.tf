locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# ── Random password for RDS ───────────────────────────────────────────────────
resource "random_password" "db_password" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

# ── Secrets Manager ───────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${local.name_prefix}/db-password"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${local.name_prefix}/jwt-secret"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

# Store AWS service credentials — values must be set via AWS Console or CLI after deploy
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${local.name_prefix}/app-secrets"
  recovery_window_in_days = 7
}

# ── VPC ───────────────────────────────────────────────────────────────────────
module "vpc" {
  source = "./modules/vpc"

  name_prefix          = local.name_prefix
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  single_nat_gateway   = var.single_nat_gateway
}

# ── Security Groups ───────────────────────────────────────────────────────────
module "security_groups" {
  source = "./modules/security_groups"

  name_prefix      = local.name_prefix
  vpc_id           = module.vpc.vpc_id
  vpc_cidr         = var.vpc_cidr
  allowed_ssh_cidrs = var.allowed_ssh_cidrs
}

# ── ECR Repositories ──────────────────────────────────────────────────────────
module "ecr" {
  source = "./modules/ecr"

  name_prefix  = local.name_prefix
  project_name = var.project_name
}

# ── RDS PostgreSQL ────────────────────────────────────────────────────────────
module "rds" {
  source = "./modules/rds"

  name_prefix              = local.name_prefix
  db_name                  = var.db_name
  db_username              = var.db_username
  db_password              = random_password.db_password.result
  db_instance_class        = var.db_instance_class
  db_allocated_storage     = var.db_allocated_storage
  db_max_allocated_storage = var.db_max_allocated_storage
  db_multi_az              = var.db_multi_az
  db_backup_retention_days = var.db_backup_retention_days
  private_subnet_ids       = module.vpc.private_subnet_ids
  rds_security_group_id    = module.security_groups.rds_sg_id
}

# ── Application Load Balancer ─────────────────────────────────────────────────
module "alb" {
  source = "./modules/alb"

  name_prefix         = local.name_prefix
  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  alb_security_group_id = module.security_groups.alb_sg_id
  backend_port        = var.backend_port
  frontend_port       = var.frontend_port
  acm_certificate_arn = var.acm_certificate_arn
}

# ── ECS Cluster + Services ────────────────────────────────────────────────────
module "ecs" {
  source = "./modules/ecs"

  name_prefix             = local.name_prefix
  aws_region              = var.aws_region
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  backend_sg_id           = module.security_groups.backend_ecs_sg_id
  frontend_sg_id          = module.security_groups.frontend_ecs_sg_id

  backend_ecr_url         = module.ecr.backend_repository_url
  frontend_ecr_url        = module.ecr.frontend_repository_url

  backend_target_group_arn  = module.alb.backend_target_group_arn
  frontend_target_group_arn = module.alb.frontend_target_group_arn

  backend_cpu             = var.backend_cpu
  backend_memory          = var.backend_memory
  backend_desired_count   = var.backend_desired_count
  backend_port            = var.backend_port

  frontend_cpu            = var.frontend_cpu
  frontend_memory         = var.frontend_memory
  frontend_desired_count  = var.frontend_desired_count
  frontend_port           = var.frontend_port

  db_url                  = "jdbc:postgresql://${module.rds.endpoint}/${var.db_name}"
  db_username             = var.db_username
  db_password_secret_arn  = aws_secretsmanager_secret.db_password.arn
  jwt_secret_arn          = aws_secretsmanager_secret.jwt_secret.arn
  app_secrets_arn         = aws_secretsmanager_secret.app_secrets.arn

  alb_dns_name            = module.alb.alb_dns_name
  jwt_expiration_ms       = var.jwt_expiration_ms
  anthropic_model         = var.anthropic_model
  environment             = var.environment
}

# ── EC2 Build / CI Server ─────────────────────────────────────────────────────
module "ec2_build" {
  source = "./modules/ec2"

  name_prefix                 = local.name_prefix
  instance_type               = var.build_instance_type
  key_pair_name               = var.build_key_pair_name
  subnet_id                   = module.vpc.public_subnet_ids[0]
  security_group_id           = module.security_groups.build_ec2_sg_id
  ecr_backend_repo_url        = module.ecr.backend_repository_url
  ecr_frontend_repo_url       = module.ecr.frontend_repository_url
  aws_region                  = var.aws_region
  github_actions_runner_token = var.github_actions_runner_token
  github_repo_url             = var.github_repo_url
  ecs_backend_service         = module.ecs.backend_service_name
  ecs_frontend_service        = module.ecs.frontend_service_name
  ecs_cluster_name            = module.ecs.cluster_name
}

# ── CloudWatch Log Groups ─────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name_prefix}/backend"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${local.name_prefix}/frontend"
  retention_in_days = 14
}
