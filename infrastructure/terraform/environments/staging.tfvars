# ── Staging Environment ───────────────────────────────────────────────────────
environment  = "staging"
aws_region   = "ap-south-1"
project_name = "hiresmart"

# VPC — single NAT GW saves ~$30/month in staging
single_nat_gateway   = true
availability_zones   = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

# RDS — smaller instance, no Multi-AZ for staging cost
db_instance_class        = "db.t3.small"
db_allocated_storage     = 20
db_max_allocated_storage = 50
db_multi_az              = false
db_backup_retention_days = 3

# ECS — single task per service for staging
backend_cpu            = 512
backend_memory         = 1024
backend_desired_count  = 1
frontend_cpu           = 256
frontend_memory        = 512
frontend_desired_count = 1

# EC2 Build Server
build_instance_type = "t3.medium"
build_key_pair_name = "hiresmart-build-key"
allowed_ssh_cidrs   = ["0.0.0.0/0"]   # tighten to your office IP in production

# Domain / TLS — leave empty for HTTP-only staging
acm_certificate_arn = ""
domain_name         = ""

# GitHub Actions self-hosted runner
# Obtain token: https://github.com/<org>/<repo>/settings/actions/runners/new
github_actions_runner_token = ""   # set via TF_VAR_github_actions_runner_token env var
github_repo_url             = "https://github.com/your-org/SmartHire"
