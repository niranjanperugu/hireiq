# HireIQ — Complete AWS Deployment Guide

> **Target:** AWS `ap-south-1` (Mumbai) · ECS Fargate · RDS PostgreSQL · ALB · ACM · Route 53  
> **IaC:** Terraform · **CI/CD:** GitHub Actions (self-hosted runner) · **Registry:** ECR

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Phase 1 — AWS Account & IAM Setup](#3-phase-1--aws-account--iam-setup)
4. [Phase 2 — Terraform Infrastructure](#4-phase-2--terraform-infrastructure)
5. [Phase 3 — RDS PostgreSQL](#5-phase-3--rds-postgresql)
6. [Phase 4 — ECS Cluster & Services](#6-phase-4--ecs-cluster--services)
7. [Phase 5 — ALB, ACM & Route 53](#7-phase-5--alb-acm--route-53)
8. [Phase 6 — Secrets Manager](#8-phase-6--secrets-manager)
9. [Phase 7 — Self-Hosted GitHub Actions Runner](#9-phase-7--self-hosted-github-actions-runner)
10. [Phase 8 — GitHub Repository Secrets](#10-phase-8--github-repository-secrets)
11. [Phase 9 — First Deployment](#11-phase-9--first-deployment)
12. [Phase 10 — Monitoring & Alerting](#12-phase-10--monitoring--alerting)
13. [Rollback Procedures](#13-rollback-procedures)
14. [Cost Estimate](#14-cost-estimate)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AWS ap-south-1 (Mumbai)                          │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  VPC: 10.0.0.0/16                                                    │   │
│  │                                                                      │   │
│  │  ┌─────────────────────┐    ┌─────────────────────────────────────┐  │   │
│  │  │  Public Subnets      │    │  Private Subnets                   │  │   │
│  │  │  AZ-a: 10.0.1.0/24  │    │  AZ-a: 10.0.11.0/24               │  │   │
│  │  │  AZ-b: 10.0.2.0/24  │    │  AZ-b: 10.0.12.0/24               │  │   │
│  │  │                      │    │                                     │  │   │
│  │  │  ┌───────────────┐   │    │  ┌────────────┐  ┌──────────────┐  │  │   │
│  │  │  │  ALB          │   │    │  │ ECS Fargate│  │  RDS Postgres│  │  │   │
│  │  │  │  Port 80/443  │   │    │  │  Backend   │  │  db.t3.medium│  │  │   │
│  │  │  │  ACM SSL      │   │    │  │  :8080     │  │  Multi-AZ    │  │  │   │
│  │  │  └──────┬────────┘   │    │  └─────┬──────┘  └──────────────┘  │  │   │
│  │  └─────────│────────────┘    └────────│────────────────────────────┘  │   │
│  │            │                          │                               │   │
│  │  Route 53  │  hireiq.ai               │                               │   │
│  │  *.hireiq.ai → ALB                   ↓                               │   │
│  │                              ┌─────────────────┐                     │   │
│  │                              │  ECS Fargate     │                     │   │
│  │                              │  Frontend :3000  │                     │   │
│  │                              └─────────────────┘                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ECR         S3          SES         Secrets Manager   CloudWatch           │
│  (images)    (resumes)   (email)     (env secrets)     (logs+alerts)        │
└─────────────────────────────────────────────────────────────────────────────┘
                    ↑ GitHub Actions self-hosted runner (EC2 t3.medium)
```

### Traffic Flow

```
User → Route 53 (hireiq.ai) → ALB (HTTPS:443)
  ├── /api/*   → Target Group → ECS Backend  (:8080) → RDS PostgreSQL
  │                              ↓ AWS SDK calls
  │                              S3 (resumes) · SES (email) · Claude API
  └── /*       → Target Group → ECS Frontend (:3000)
```

### Environments

| Environment | URL | Branch | Deploy |
|---|---|---|---|
| **Staging** | `staging.hireiq.ai` | `main` push | Automatic |
| **Production** | `hireiq.ai` | `main` push | Manual approval |

---

## 2. Prerequisites

### Tools to Install Locally

```bash
# 1. AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install
aws --version   # aws-cli/2.x.x

# 2. Terraform >= 1.6
wget -O terraform.zip https://releases.hashicorp.com/terraform/1.6.6/terraform_1.6.6_linux_amd64.zip
unzip terraform.zip && sudo mv terraform /usr/local/bin/
terraform -version

# 3. Docker
sudo apt-get install -y docker.io docker-compose
sudo usermod -aG docker $USER

# 4. jq (JSON processing in scripts)
sudo apt-get install -y jq
```

### Required Before You Start

- [ ] AWS account with billing enabled
- [ ] Domain name purchased (e.g., `hireiq.ai`) — in Route 53 or external registrar
- [ ] GitHub repository with code pushed
- [ ] AWS SES domain verified (for sending emails)
- [ ] Anthropic API key
- [ ] RapidAPI key (optional — for job sourcing)

---

## 3. Phase 1 — AWS Account & IAM Setup

### Step 1.1 — Configure AWS CLI

```bash
aws configure
# AWS Access Key ID: <your-root-or-admin-key>
# AWS Secret Access Key: <your-secret>
# Default region: ap-south-1
# Default output format: json

# Verify
aws sts get-caller-identity
```

### Step 1.2 — Create IAM User for CI/CD (GitHub Actions)

```bash
# Create the CI/CD IAM user
aws iam create-user --user-name hiresmart-cicd

# Attach policies — GitHub Actions needs these permissions
aws iam attach-user-policy \
  --user-name hiresmart-cicd \
  --policy-arn arn:aws:iam::aws:policy/AmazonECR_FullAccess

aws iam attach-user-policy \
  --user-name hiresmart-cicd \
  --policy-arn arn:aws:iam::aws:policy/AmazonECSFullAccess

# Create inline policy for the remaining services
cat > /tmp/cicd-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECSTaskDefinitions",
      "Effect": "Allow",
      "Action": [
        "ecs:RegisterTaskDefinition",
        "ecs:DeregisterTaskDefinition",
        "ecs:DescribeTaskDefinition",
        "ecs:ListTaskDefinitions"
      ],
      "Resource": "*"
    },
    {
      "Sid": "PassRoleToECS",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::*:role/hiresmart-*"
    },
    {
      "Sid": "SecretsManagerRead",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:ap-south-1:*:secret:hiresmart/*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups"
      ],
      "Resource": "arn:aws:logs:ap-south-1:*:log-group:/hiresmart/*"
    }
  ]
}
EOF

aws iam put-user-policy \
  --user-name hiresmart-cicd \
  --policy-name hiresmart-cicd-policy \
  --policy-document file:///tmp/cicd-policy.json

# Generate access keys — SAVE THESE (used in GitHub Secrets later)
aws iam create-access-key --user-name hiresmart-cicd
# → Save: AccessKeyId and SecretAccessKey
```

### Step 1.3 — Create IAM Roles for ECS

```bash
# ECS Task Execution Role (allows ECS to pull images + read secrets)
cat > /tmp/ecs-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ecs-tasks.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
  --role-name hiresmart-ecs-execution-role \
  --assume-role-policy-document file:///tmp/ecs-trust-policy.json

aws iam attach-role-policy \
  --role-name hiresmart-ecs-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Allow reading Secrets Manager
cat > /tmp/ecs-secrets-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
      "kms:Decrypt"
    ],
    "Resource": "arn:aws:secretsmanager:ap-south-1:*:secret:hiresmart/*"
  }]
}
EOF

aws iam put-role-policy \
  --role-name hiresmart-ecs-execution-role \
  --policy-name hiresmart-secrets-access \
  --policy-document file:///tmp/ecs-secrets-policy.json

# ECS Task Role (permissions the app itself needs at runtime)
aws iam create-role \
  --role-name hiresmart-ecs-task-role \
  --assume-role-policy-document file:///tmp/ecs-trust-policy.json

cat > /tmp/ecs-task-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3ResumeBucket",
      "Effect": "Allow",
      "Action": ["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::hiresmart-resumes-prod",
        "arn:aws:s3:::hiresmart-resumes-prod/*"
      ]
    },
    {
      "Sid": "SESSendEmail",
      "Effect": "Allow",
      "Action": ["ses:SendEmail","ses:SendRawEmail","ses:GetSendQuota"],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchMetrics",
      "Effect": "Allow",
      "Action": ["cloudwatch:PutMetricData","logs:CreateLogStream","logs:PutLogEvents"],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name hiresmart-ecs-task-role \
  --policy-name hiresmart-task-permissions \
  --policy-document file:///tmp/ecs-task-policy.json

# Save the role ARNs for Terraform
aws iam get-role --role-name hiresmart-ecs-execution-role --query 'Role.Arn' --output text
aws iam get-role --role-name hiresmart-ecs-task-role --query 'Role.Arn' --output text
```

---

## 4. Phase 2 — Terraform Infrastructure

Create the Terraform project structure:

```bash
mkdir -p infrastructure/terraform/{modules/{vpc,ecr,rds,ecs,alb,monitoring},environments/{staging,production}}
cd infrastructure/terraform
```

### File: `terraform/main.tf` (root)

```hcl
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state — create this S3 bucket + DynamoDB table FIRST (see bootstrap below)
  backend "s3" {
    bucket         = "hiresmart-terraform-state"
    key            = "hiresmart/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "hiresmart-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "HireIQ"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
```

### File: `terraform/variables.tf`

```hcl
variable "aws_region"   { default = "ap-south-1" }
variable "environment"  { description = "staging | production" }
variable "domain_name"  { default = "hireiq.ai" }
variable "db_password"  {
  description = "RDS master password"
  sensitive   = true
}
variable "jwt_secret" {
  description = "JWT signing secret (min 32 chars)"
  sensitive   = true
}
```

### Bootstrap: Remote State (run once manually)

```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket hiresmart-terraform-state \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1

aws s3api put-bucket-versioning \
  --bucket hiresmart-terraform-state \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket hiresmart-terraform-state \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name hiresmart-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

### File: `terraform/modules/vpc/main.tf`

```hcl
# ── VPC ──────────────────────────────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "hiresmart-${var.environment}-vpc" }
}

# ── Internet Gateway ──────────────────────────────────────────────────────────
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "hiresmart-${var.environment}-igw" }
}

# ── Public Subnets (ALB + NAT) ────────────────────────────────────────────────
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = { Name = "hiresmart-${var.environment}-public-${count.index + 1}" }
}

# ── Private Subnets (ECS Tasks + RDS) ────────────────────────────────────────
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 11}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = { Name = "hiresmart-${var.environment}-private-${count.index + 1}" }
}

# ── NAT Gateway (private subnets reach internet for Claude API etc.) ──────────
resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "hiresmart-${var.environment}-nat-eip" }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  tags          = { Name = "hiresmart-${var.environment}-nat" }
  depends_on    = [aws_internet_gateway.main]
}

# ── Route Tables ──────────────────────────────────────────────────────────────
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "hiresmart-${var.environment}-public-rt" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
  tags = { Name = "hiresmart-${var.environment}-private-rt" }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

data "aws_availability_zones" "available" { state = "available" }

# ── Security Groups ───────────────────────────────────────────────────────────
resource "aws_security_group" "alb" {
  name        = "hiresmart-${var.environment}-alb-sg"
  vpc_id      = aws_vpc.main.id
  description = "Allow HTTP/HTTPS inbound to ALB"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "backend" {
  name        = "hiresmart-${var.environment}-backend-sg"
  vpc_id      = aws_vpc.main.id
  description = "ECS backend — accept only from ALB"

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "frontend" {
  name        = "hiresmart-${var.environment}-frontend-sg"
  vpc_id      = aws_vpc.main.id
  description = "ECS frontend — accept only from ALB"

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "rds" {
  name        = "hiresmart-${var.environment}-rds-sg"
  vpc_id      = aws_vpc.main.id
  description = "RDS — accept only from backend ECS tasks"

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }
}

# ── Outputs ───────────────────────────────────────────────────────────────────
output "vpc_id"              { value = aws_vpc.main.id }
output "public_subnet_ids"   { value = aws_subnet.public[*].id }
output "private_subnet_ids"  { value = aws_subnet.private[*].id }
output "alb_sg_id"           { value = aws_security_group.alb.id }
output "backend_sg_id"       { value = aws_security_group.backend.id }
output "frontend_sg_id"      { value = aws_security_group.frontend.id }
output "rds_sg_id"           { value = aws_security_group.rds.id }
```

### File: `terraform/modules/ecr/main.tf`

```hcl
resource "aws_ecr_repository" "backend" {
  name                 = "hiresmart/backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration { scan_on_push = true }
  encryption_configuration     { encryption_type = "AES256" }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "hiresmart/frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration { scan_on_push = true }
  encryption_configuration     { encryption_type = "AES256" }
}

# Lifecycle policy — keep last 10 images, remove untagged after 1 day
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Remove untagged images after 1 day"
        selection    = { tagStatus = "untagged", countType = "sinceImagePushed", countUnit = "days", countNumber = 1 }
        action       = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep last 10 tagged images"
        selection    = { tagStatus = "tagged", tagPrefixList = ["sha-"], countType = "imageCountMoreThan", countNumber = 10 }
        action       = { type = "expire" }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "frontend" {
  repository = aws_ecr_repository.frontend.name
  policy     = aws_ecr_lifecycle_policy.backend.policy
}

output "backend_repo_url"  { value = aws_ecr_repository.backend.repository_url }
output "frontend_repo_url" { value = aws_ecr_repository.frontend.repository_url }
output "registry_id"       { value = aws_ecr_repository.backend.registry_id }
```

### File: `terraform/modules/rds/main.tf`

```hcl
variable "environment"       {}
variable "private_subnet_ids" { type = list(string) }
variable "rds_sg_id"         {}
variable "db_password"       { sensitive = true }

# ── Subnet Group ─────────────────────────────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name       = "hiresmart-${var.environment}"
  subnet_ids = var.private_subnet_ids
  tags       = { Name = "hiresmart-${var.environment}-db-subnet-group" }
}

# ── Parameter Group ───────────────────────────────────────────────────────────
resource "aws_db_parameter_group" "main" {
  name   = "hiresmart-${var.environment}-pg16"
  family = "postgres16"

  parameter {
    name  = "max_connections"
    value = "200"
  }
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"   # log queries > 1s
  }
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
}

# ── RDS Instance ──────────────────────────────────────────────────────────────
resource "aws_db_instance" "main" {
  identifier        = "hiresmart-${var.environment}"
  engine            = "postgres"
  engine_version    = "16.1"
  instance_class    = var.environment == "production" ? "db.t3.medium" : "db.t3.micro"

  db_name  = "hiresmart_db"
  username = "hiresmart_user"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_sg_id]
  parameter_group_name   = aws_db_parameter_group.main.name

  allocated_storage     = var.environment == "production" ? 50 : 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  multi_az               = var.environment == "production"
  publicly_accessible    = false
  deletion_protection    = var.environment == "production"
  skip_final_snapshot    = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "hiresmart-prod-final-snapshot" : null

  backup_retention_period = var.environment == "production" ? 7 : 1
  backup_window           = "02:00-03:00"
  maintenance_window      = "sun:03:00-sun:04:00"

  performance_insights_enabled = var.environment == "production"

  tags = { Name = "hiresmart-${var.environment}-rds" }
}

output "db_endpoint" { value = aws_db_instance.main.endpoint }
output "db_name"     { value = aws_db_instance.main.db_name }
output "db_host"     { value = split(":", aws_db_instance.main.endpoint)[0] }
output "db_port"     { value = "5432" }
```

### File: `terraform/modules/ecs/main.tf`

```hcl
variable "environment"          {}
variable "aws_region"           {}
variable "private_subnet_ids"   { type = list(string) }
variable "backend_sg_id"        {}
variable "frontend_sg_id"       {}
variable "backend_target_group_arn"  {}
variable "frontend_target_group_arn" {}
variable "backend_image_uri"    {}
variable "frontend_image_uri"   {}
variable "execution_role_arn"   {}
variable "task_role_arn"        {}
variable "db_host"              {}
variable "db_name"              {}

# ── ECS Cluster ───────────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "hiresmart-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = var.environment == "production" ? "FARGATE" : "FARGATE_SPOT"
    weight            = 1
  }
}

# ── CloudWatch Log Groups ──────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/hiresmart/${var.environment}/backend"
  retention_in_days = var.environment == "production" ? 30 : 7
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/hiresmart/${var.environment}/frontend"
  retention_in_days = 7
}

# ── Backend Task Definition ───────────────────────────────────────────────────
resource "aws_ecs_task_definition" "backend" {
  family                   = "hiresmart-${var.environment}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.environment == "production" ? "1024" : "512"
  memory                   = var.environment == "production" ? "2048" : "1024"
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([{
    name      = "backend"
    image     = var.backend_image_uri
    essential = true

    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
    }]

    environment = [
      { name = "SPRING_PROFILES_ACTIVE",         value = "prod" },
      { name = "SERVER_PORT",                    value = "8080" },
      { name = "AWS_REGION",                     value = var.aws_region },
      { name = "AWS_S3_BUCKET",                  value = "hiresmart-resumes-${var.environment}" },
      { name = "ANTHROPIC_MODEL",                value = "claude-sonnet-4-6" },
      { name = "ANTHROPIC_MAX_TOKENS",           value = "8000" },
      { name = "SPRING_DATASOURCE_URL",
        value = "jdbc:postgresql://${var.db_host}:5432/${var.db_name}" },
      { name = "SPRING_DATASOURCE_USERNAME",     value = "hiresmart_user" },
      { name = "SPRING_JPA_HIBERNATE_DDL_AUTO",  value = "validate" },
      { name = "SPRING_LIQUIBASE_ENABLED",       value = "true" },
      { name = "JWT_EXPIRATION",                 value = "86400000" },
      { name = "CORS_ALLOWED_ORIGINS",
        value = "https://${var.environment == "production" ? "hireiq.ai" : "staging.hireiq.ai"}" }
    ]

    # Secrets injected from AWS Secrets Manager at runtime (never in plaintext)
    secrets = [
      { name = "SPRING_DATASOURCE_PASSWORD",  valueFrom = "arn:aws:secretsmanager:${var.aws_region}:ACCOUNT_ID:secret:hiresmart/${var.environment}/db-password" },
      { name = "JWT_SECRET",                  valueFrom = "arn:aws:secretsmanager:${var.aws_region}:ACCOUNT_ID:secret:hiresmart/${var.environment}/jwt-secret" },
      { name = "AWS_ACCESS_KEY_ID",           valueFrom = "arn:aws:secretsmanager:${var.aws_region}:ACCOUNT_ID:secret:hiresmart/${var.environment}/aws-access-key-id" },
      { name = "AWS_SECRET_ACCESS_KEY",       valueFrom = "arn:aws:secretsmanager:${var.aws_region}:ACCOUNT_ID:secret:hiresmart/${var.environment}/aws-secret-access-key" },
      { name = "AWS_SES_EMAIL",               valueFrom = "arn:aws:secretsmanager:${var.aws_region}:ACCOUNT_ID:secret:hiresmart/${var.environment}/ses-email" },
      { name = "ANTHROPIC_API_KEY",           valueFrom = "arn:aws:secretsmanager:${var.aws_region}:ACCOUNT_ID:secret:hiresmart/${var.environment}/anthropic-api-key" }
    ]

    healthCheck = {
      command     = ["CMD-SHELL", "wget -q --spider http://localhost:8080/api/v1/health/status || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.backend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "backend"
      }
    }
  }])
}

# ── Frontend Task Definition ───────────────────────────────────────────────────
resource "aws_ecs_task_definition" "frontend" {
  family                   = "hiresmart-${var.environment}-frontend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([{
    name      = "frontend"
    image     = var.frontend_image_uri
    essential = true

    portMappings = [{ containerPort = 3000, protocol = "tcp" }]

    healthCheck = {
      command     = ["CMD-SHELL", "wget -q --spider http://localhost:3000 || exit 1"]
      interval    = 30
      timeout     = 3
      retries     = 3
      startPeriod = 15
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "frontend"
      }
    }
  }])
}

# ── Backend ECS Service ───────────────────────────────────────────────────────
resource "aws_ecs_service" "backend" {
  name            = "hiresmart-${var.environment}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.environment == "production" ? 2 : 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.backend_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.backend_target_group_arn
    container_name   = "backend"
    container_port   = 8080
  }

  deployment_controller { type = "ECS" }

  deployment_circuit_breaker {
    enable   = true
    rollback = true  # Auto-rollback on deployment failure
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  lifecycle {
    ignore_changes = [task_definition]  # Let CI/CD manage the image
  }
}

# ── Frontend ECS Service ──────────────────────────────────────────────────────
resource "aws_ecs_service" "frontend" {
  name            = "hiresmart-${var.environment}-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = var.environment == "production" ? 2 : 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.frontend_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.frontend_target_group_arn
    container_name   = "frontend"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [task_definition]
  }
}

# ── Auto Scaling ──────────────────────────────────────────────────────────────
resource "aws_appautoscaling_target" "backend" {
  count              = var.environment == "production" ? 1 : 0
  max_capacity       = 6
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu" {
  count              = var.environment == "production" ? 1 : 0
  name               = "hiresmart-${var.environment}-backend-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend[0].resource_id
  scalable_dimension = aws_appautoscaling_target.backend[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

output "cluster_name"     { value = aws_ecs_cluster.main.name }
output "backend_svc_name" { value = aws_ecs_service.backend.name }
output "frontend_svc_name"{ value = aws_ecs_service.frontend.name }
```

### File: `terraform/modules/alb/main.tf`

```hcl
variable "environment"         {}
variable "vpc_id"              {}
variable "public_subnet_ids"   { type = list(string) }
variable "alb_sg_id"           {}
variable "acm_certificate_arn" {}
variable "domain_name"         {}

# ── Application Load Balancer ─────────────────────────────────────────────────
resource "aws_lb" "main" {
  name               = "hiresmart-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_sg_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.environment == "production"

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    prefix  = "alb-logs"
    enabled = true
  }
}

# ── Target Groups ──────────────────────────────────────────────────────────────
resource "aws_lb_target_group" "backend" {
  name        = "hiresmart-${var.environment}-backend"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/v1/health/status"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  deregistration_delay = 30
}

resource "aws_lb_target_group" "frontend" {
  name        = "hiresmart-${var.environment}-frontend"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200,304"
  }
}

# ── HTTP Listener (redirect to HTTPS) ─────────────────────────────────────────
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ── HTTPS Listener ────────────────────────────────────────────────────────────
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  # Default: serve frontend
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# ── Listener Rules ─────────────────────────────────────────────────────────────
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  condition {
    path_pattern { values = ["/api/*"] }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# ── ALB Access Logs Bucket ────────────────────────────────────────────────────
resource "aws_s3_bucket" "alb_logs" {
  bucket        = "hiresmart-${var.environment}-alb-logs"
  force_destroy = true
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  rule {
    id     = "delete-old-logs"
    status = "Enabled"
    expiration { days = 30 }
  }
}

output "alb_dns_name"               { value = aws_lb.main.dns_name }
output "alb_zone_id"                { value = aws_lb.main.zone_id }
output "backend_target_group_arn"   { value = aws_lb_target_group.backend.arn }
output "frontend_target_group_arn"  { value = aws_lb_target_group.frontend.arn }
```

### File: `terraform/modules/dns_ssl/main.tf`

```hcl
variable "domain_name"  {}
variable "environment"  {}
variable "alb_dns_name" {}
variable "alb_zone_id"  {}

# ── Route 53 Hosted Zone (import existing or create new) ──────────────────────
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

# ── ACM Certificate (DNS validated) ──────────────────────────────────────────
resource "aws_acm_certificate" "main" {
  domain_name               = var.environment == "production" ? var.domain_name : "${var.environment}.${var.domain_name}"
  subject_alternative_names = var.environment == "production" ? ["*.${var.domain_name}"] : []
  validation_method         = "DNS"

  lifecycle { create_before_destroy = true }
}

# ── DNS Validation Records ────────────────────────────────────────────────────
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# ── A Record → ALB ───────────────────────────────────────────────────────────
resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.environment == "production" ? var.domain_name : "${var.environment}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

output "certificate_arn" { value = aws_acm_certificate_validation.main.certificate_arn }
output "app_url"         { value = "https://${aws_route53_record.app.name}" }
```

### File: `terraform/environments/staging/main.tf`

```hcl
module "vpc" {
  source      = "../../modules/vpc"
  environment = "staging"
}

module "ecr" {
  source = "../../modules/ecr"
}

module "rds" {
  source             = "../../modules/rds"
  environment        = "staging"
  private_subnet_ids = module.vpc.private_subnet_ids
  rds_sg_id          = module.vpc.rds_sg_id
  db_password        = var.db_password
}

module "dns_ssl" {
  source       = "../../modules/dns_ssl"
  domain_name  = "hireiq.ai"
  environment  = "staging"
  alb_dns_name = module.alb.alb_dns_name
  alb_zone_id  = module.alb.alb_zone_id
}

module "alb" {
  source                = "../../modules/alb"
  environment           = "staging"
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = module.vpc.public_subnet_ids
  alb_sg_id             = module.vpc.alb_sg_id
  acm_certificate_arn   = module.dns_ssl.certificate_arn
  domain_name           = "hireiq.ai"
}

module "ecs" {
  source                      = "../../modules/ecs"
  environment                 = "staging"
  aws_region                  = "ap-south-1"
  private_subnet_ids          = module.vpc.private_subnet_ids
  backend_sg_id               = module.vpc.backend_sg_id
  frontend_sg_id              = module.vpc.frontend_sg_id
  backend_target_group_arn    = module.alb.backend_target_group_arn
  frontend_target_group_arn   = module.alb.frontend_target_group_arn
  backend_image_uri           = "${module.ecr.backend_repo_url}:latest"
  frontend_image_uri          = "${module.ecr.frontend_repo_url}:latest"
  execution_role_arn          = "arn:aws:iam::ACCOUNT_ID:role/hiresmart-ecs-execution-role"
  task_role_arn               = "arn:aws:iam::ACCOUNT_ID:role/hiresmart-ecs-task-role"
  db_host                     = module.rds.db_host
  db_name                     = module.rds.db_name
}
```

---

## 5. Phase 3 — RDS PostgreSQL

### Step 3.1 — Create S3 Resume Bucket

```bash
# Create resume storage bucket
aws s3api create-bucket \
  --bucket hiresmart-resumes-production \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1

# Block all public access
aws s3api put-public-access-block \
  --bucket hiresmart-resumes-production \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket hiresmart-resumes-production \
  --versioning-configuration Status=Enabled

# Enable server-side encryption
aws s3api put-bucket-encryption \
  --bucket hiresmart-resumes-production \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Lifecycle: delete old resumes after 2 years
aws s3api put-bucket-lifecycle-configuration \
  --bucket hiresmart-resumes-production \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "archive-old-resumes",
      "Status": "Enabled",
      "Transitions": [{"Days": 90, "StorageClass": "STANDARD_IA"}],
      "Expiration": {"Days": 730}
    }]
  }'

# Repeat for staging bucket
aws s3api create-bucket --bucket hiresmart-resumes-staging \
  --region ap-south-1 --create-bucket-configuration LocationConstraint=ap-south-1
```

### Step 3.2 — Verify SES Domain

```bash
# Request SES domain identity (sends DNS records to add)
aws ses verify-domain-identity \
  --domain hireiq.ai \
  --region ap-south-1

# Get the DKIM tokens to add as DNS records
aws ses get-identity-dkim-attributes \
  --identities hireiq.ai \
  --region ap-south-1

# Check verification status
aws ses get-identity-verification-attributes \
  --identities hireiq.ai \
  --region ap-south-1

# Move SES out of sandbox to send to unverified addresses (production only)
# Submit a support request at: AWS Console → SES → Account dashboard → Request production access
```

---

## 6. Phase 4 — ECS Cluster & Services

### Step 4.1 — Run Terraform

```bash
cd infrastructure/terraform/environments/staging

# Initialize (downloads providers + connects to S3 backend)
terraform init

# Preview what will be created
terraform plan -var="environment=staging" -var="db_password=YourSecurePass123!"

# Apply — creates all resources (~10 minutes)
terraform apply -var="environment=staging" -var="db_password=YourSecurePass123!" -auto-approve

# Save outputs
terraform output
```

> **Expected resources created:** VPC, 2 public + 2 private subnets, IGW, NAT, route tables, 4 security groups, ECR repos, RDS instance, ECS cluster + 2 services, ALB + 2 target groups, ACM certificate, Route 53 records.

### Step 4.2 — Replace ACCOUNT_ID Placeholder

The task definition Terraform references `ACCOUNT_ID` in IAM ARNs. Get yours:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo $ACCOUNT_ID

# Replace in all terraform files
find infrastructure/terraform -name "*.tf" -exec \
  sed -i "s/ACCOUNT_ID/${ACCOUNT_ID}/g" {} \;

# Re-apply after replacement
terraform apply -var="environment=staging" -var="db_password=YourSecurePass123!"
```

### Step 4.3 — ECS Task Definition JSON Files (for GitHub Actions)

These JSON files are what the CI/CD pipeline downloads, updates the image tag, then re-registers.

**Create `infrastructure/ecs-task-definitions/staging-backend.json`:**

```json
{
  "family": "hiresmart-staging-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/hiresmart-ecs-execution-role",
  "taskRoleArn":      "arn:aws:iam::ACCOUNT_ID:role/hiresmart-ecs-task-role",
  "containerDefinitions": [{
    "name":  "backend",
    "image": "ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/hiresmart/backend:latest",
    "essential": true,
    "portMappings": [{ "containerPort": 8080, "protocol": "tcp" }],
    "environment": [
      { "name": "SPRING_PROFILES_ACTIVE", "value": "prod" },
      { "name": "SERVER_PORT",            "value": "8080" },
      { "name": "AWS_REGION",             "value": "ap-south-1" },
      { "name": "AWS_S3_BUCKET",          "value": "hiresmart-resumes-staging" },
      { "name": "ANTHROPIC_MODEL",        "value": "claude-sonnet-4-6" },
      { "name": "ANTHROPIC_MAX_TOKENS",   "value": "8000" },
      { "name": "SPRING_DATASOURCE_URL",  "value": "jdbc:postgresql://RDS_HOST:5432/hiresmart_db" },
      { "name": "SPRING_DATASOURCE_USERNAME", "value": "hiresmart_user" },
      { "name": "SPRING_JPA_HIBERNATE_DDL_AUTO", "value": "validate" },
      { "name": "SPRING_LIQUIBASE_ENABLED", "value": "true" },
      { "name": "JWT_EXPIRATION",         "value": "86400000" },
      { "name": "CORS_ALLOWED_ORIGINS",   "value": "https://staging.hireiq.ai" }
    ],
    "secrets": [
      { "name": "SPRING_DATASOURCE_PASSWORD", "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT_ID:secret:hiresmart/staging/db-password" },
      { "name": "JWT_SECRET",                 "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT_ID:secret:hiresmart/staging/jwt-secret" },
      { "name": "AWS_ACCESS_KEY_ID",          "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT_ID:secret:hiresmart/staging/aws-access-key-id" },
      { "name": "AWS_SECRET_ACCESS_KEY",      "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT_ID:secret:hiresmart/staging/aws-secret-access-key" },
      { "name": "AWS_SES_EMAIL",              "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT_ID:secret:hiresmart/staging/ses-email" },
      { "name": "ANTHROPIC_API_KEY",          "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT_ID:secret:hiresmart/staging/anthropic-api-key" }
    ],
    "healthCheck": {
      "command":     ["CMD-SHELL", "wget -q --spider http://localhost:8080/api/v1/health/status || exit 1"],
      "interval":    30,
      "timeout":     5,
      "retries":     3,
      "startPeriod": 60
    },
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group":         "/hiresmart/staging/backend",
        "awslogs-region":        "ap-south-1",
        "awslogs-stream-prefix": "backend"
      }
    }
  }]
}
```

> Create equivalent files for `staging-frontend.json`, `production-backend.json`, `production-frontend.json` — adjusting `staging` → `production` and cpu/memory values.

---

## 7. Phase 5 — ALB, ACM & Route 53

These are created automatically by Terraform above. Verify:

```bash
# Check ALB status
aws elbv2 describe-load-balancers \
  --names hiresmart-staging-alb \
  --query 'LoadBalancers[0].{DNS:DNSName,State:State.Code}'

# Check ACM certificate validation
aws acm list-certificates \
  --region ap-south-1 \
  --query 'CertificateSummaryList[?DomainName==`staging.hireiq.ai`]'

# Confirm Route 53 record exists
aws route53 list-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --query "ResourceRecordSets[?Name=='staging.hireiq.ai.']"

# Test HTTPS end-to-end
curl -v https://staging.hireiq.ai/api/v1/health/status
```

---

## 8. Phase 6 — Secrets Manager

Store every sensitive value in Secrets Manager so **nothing sensitive appears in task definitions or GitHub Actions logs**.

```bash
# Helper function
create_secret() {
  local name=$1
  local value=$2
  aws secretsmanager create-secret \
    --name "hiresmart/staging/${name}" \
    --description "HireIQ staging: ${name}" \
    --secret-string "${value}" \
    --region ap-south-1
  echo "Created: hiresmart/staging/${name}"
}

# Create all secrets (replace placeholder values)
create_secret "db-password"       "YourRDSPassword123!"
create_secret "jwt-secret"        "$(openssl rand -base64 64 | tr -d '\n')"
create_secret "aws-access-key-id" "AKIAIOSFODNN7EXAMPLE"
create_secret "aws-secret-access-key" "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
create_secret "ses-email"         "noreply@hireiq.ai"
create_secret "anthropic-api-key" "sk-ant-api03-..."

# Repeat for production (use PROD values)
for secret in db-password jwt-secret aws-access-key-id aws-secret-access-key ses-email anthropic-api-key; do
  aws secretsmanager create-secret \
    --name "hiresmart/production/${secret}" \
    --description "HireIQ production: ${secret}" \
    --secret-string "CHANGE_ME_PRODUCTION_VALUE" \
    --region ap-south-1
done

# Update a secret value later
aws secretsmanager update-secret \
  --secret-id "hiresmart/production/anthropic-api-key" \
  --secret-string "sk-ant-api03-real-prod-key..." \
  --region ap-south-1

# Verify all secrets exist
aws secretsmanager list-secrets \
  --region ap-south-1 \
  --query 'SecretList[?contains(Name, `hiresmart`)].{Name:Name,LastChanged:LastChangedDate}' \
  --output table
```

---

## 9. Phase 7 — Self-Hosted GitHub Actions Runner

The CI/CD workflow uses `runs-on: [self-hosted, linux, build-server]` for the build jobs (Maven + Docker). You need one EC2 instance registered as a GitHub Actions runner.

### Step 7.1 — Launch EC2 Runner Instance

```bash
# Get latest Amazon Linux 2023 AMI
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-*-kernel-*-x86_64" \
             "Name=state,Values=available" \
  --query "sort_by(Images, &CreationDate)[-1].ImageId" \
  --output text)

echo "Latest AL2023 AMI: $AMI_ID"

# Create a key pair for SSH access
aws ec2 create-key-pair \
  --key-name hiresmart-runner-key \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/hiresmart-runner.pem
chmod 400 ~/.ssh/hiresmart-runner.pem

# Launch EC2 (t3.medium — 2 vCPU, 4GB RAM, enough for Maven + Docker build)
aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type t3.medium \
  --key-name hiresmart-runner-key \
  --subnet-id <PUBLIC_SUBNET_ID_FROM_TERRAFORM> \
  --associate-public-ip-address \
  --security-group-ids <NEW_SG_ALLOWING_SSH_22> \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":50,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=hiresmart-github-runner},{Key=Project,Value=HireIQ}]' \
  --user-data '#!/bin/bash
yum update -y
yum install -y git docker java-21-amazon-corretto maven
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user
# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs
' \
  --count 1
```

### Step 7.2 — Register Runner with GitHub

```bash
# SSH into the runner
ssh -i ~/.ssh/hiresmart-runner.pem ec2-user@<RUNNER_PUBLIC_IP>

# On the runner instance:
mkdir -p /home/ec2-user/actions-runner && cd /home/ec2-user/actions-runner

# Download runner (get latest URL from GitHub → Repo → Settings → Actions → Runners → New Runner)
curl -o actions-runner-linux-x64-2.314.1.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.314.1/actions-runner-linux-x64-2.314.1.tar.gz

tar xzf ./actions-runner-linux-x64-2.314.1.tar.gz

# Configure — get REGISTRATION_TOKEN from:
# GitHub → Your Repo → Settings → Actions → Runners → New self-hosted runner
./config.sh \
  --url https://github.com/YOUR_ORG/SmartHire \
  --token REGISTRATION_TOKEN_FROM_GITHUB \
  --labels "self-hosted,linux,build-server" \
  --name "hiresmart-build-server" \
  --unattended \
  --replace

# Install and start as a service (runs on boot, restarts on crash)
sudo ./svc.sh install ec2-user
sudo ./svc.sh start
sudo ./svc.sh status

# Verify runner appears in GitHub
# GitHub → Repo → Settings → Actions → Runners → should show "hiresmart-build-server" as "Idle"
```

### Step 7.3 — Configure Runner IAM Permissions

```bash
# Attach an IAM role to the EC2 runner so it can authenticate to ECR and ECS
# (Back on your local machine, not the runner)

aws iam create-instance-profile --instance-profile-name hiresmart-runner-profile

aws iam create-role \
  --role-name hiresmart-runner-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

aws iam attach-role-policy \
  --role-name hiresmart-runner-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonECR_FullAccess

aws iam attach-role-policy \
  --role-name hiresmart-runner-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonECSFullAccess

aws iam add-role-to-instance-profile \
  --instance-profile-name hiresmart-runner-profile \
  --role-name hiresmart-runner-role

# Associate with EC2 runner instance
aws ec2 associate-iam-instance-profile \
  --instance-id <RUNNER_INSTANCE_ID> \
  --iam-instance-profile Name=hiresmart-runner-profile
```

---

## 10. Phase 8 — GitHub Repository Secrets

Go to: **GitHub → Your Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Value | Notes |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | From Step 1.2 | CI/CD IAM user key |
| `AWS_SECRET_ACCESS_KEY` | From Step 1.2 | CI/CD IAM user secret |
| `PROD_AWS_ACCESS_KEY_ID` | Production IAM key | Can be same if single account |
| `PROD_AWS_SECRET_ACCESS_KEY` | Production IAM secret | — |
| `STAGING_URL` | `https://staging.hireiq.ai` | Used for smoke test |
| `PROD_URL` | `https://hireiq.ai` | Used for smoke test |
| `SLACK_WEBHOOK` | `https://hooks.slack.com/...` | Optional deployment notifications |

### Configure GitHub Environments (Manual Approval Gate)

1. GitHub → Settings → Environments → **New environment** → name: `production`
2. Under **Protection rules** → check **Required reviewers** → add yourself/team
3. Set **Wait timer**: 0 minutes (approval is the gate)
4. Create environment: `staging` (no approval required)

---

## 11. Phase 9 — First Deployment

### Step 9.1 — Bootstrap: Initial Image Push

Before the ECS services can start, ECR must have at least one valid image.

```bash
# On your local machine with Docker
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="ap-south-1"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Login to ECR
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ECR_REGISTRY

# Build backend
cd backend
docker build -t hiresmart/backend:latest .
docker tag hiresmart/backend:latest ${ECR_REGISTRY}/hiresmart/backend:latest
docker push ${ECR_REGISTRY}/hiresmart/backend:latest

# Build frontend
cd ../frontend
docker build \
  --build-arg VITE_API_URL=https://staging.hireiq.ai/api/v1 \
  -t hiresmart/frontend:latest .
docker tag hiresmart/frontend:latest ${ECR_REGISTRY}/hiresmart/frontend:latest
docker push ${ECR_REGISTRY}/hiresmart/frontend:latest

echo "Images pushed. ECS services will now be able to start."
```

### Step 9.2 — Register Initial Task Definitions

```bash
# Update ACCOUNT_ID and RDS_HOST in the task definition files
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
RDS_HOST=$(terraform -chdir=infrastructure/terraform/environments/staging output -raw db_host 2>/dev/null || \
  aws rds describe-db-instances \
    --db-instance-identifier hiresmart-staging \
    --query 'DBInstances[0].Endpoint.Address' --output text)

sed -i "s/ACCOUNT_ID/${AWS_ACCOUNT_ID}/g" infrastructure/ecs-task-definitions/*.json
sed -i "s/RDS_HOST/${RDS_HOST}/g"         infrastructure/ecs-task-definitions/*.json

# Register task definitions
aws ecs register-task-definition \
  --cli-input-json file://infrastructure/ecs-task-definitions/staging-backend.json \
  --region ap-south-1

aws ecs register-task-definition \
  --cli-input-json file://infrastructure/ecs-task-definitions/staging-frontend.json \
  --region ap-south-1
```

### Step 9.3 — Trigger First Deployment

```bash
# Force a new deployment (uses latest task definition + latest images)
aws ecs update-service \
  --cluster hiresmart-staging-cluster \
  --service hiresmart-staging-backend \
  --force-new-deployment \
  --region ap-south-1

aws ecs update-service \
  --cluster hiresmart-staging-cluster \
  --service hiresmart-staging-frontend \
  --force-new-deployment \
  --region ap-south-1

# Watch deployment progress
watch -n 5 'aws ecs describe-services \
  --cluster hiresmart-staging-cluster \
  --services hiresmart-staging-backend hiresmart-staging-frontend \
  --region ap-south-1 \
  --query "services[*].{Name:serviceName,Running:runningCount,Desired:desiredCount,Pending:pendingCount,Status:deployments[0].rolloutState}"'
```

### Step 9.4 — Initialize Database

The first backend start with `SPRING_LIQUIBASE_ENABLED=true` and `ddl-auto=validate` means Liquibase runs migrations automatically on boot.

```bash
# Watch the backend logs to confirm DB migration success
aws logs tail /hiresmart/staging/backend \
  --follow \
  --filter-pattern "Liquibase|HikariPool|Started HireSmartApplication" \
  --region ap-south-1
```

**Expected output:**
```
Successfully acquired change log lock
Running Changeset: db.changelog-master.yaml::001_create_organizations
Running Changeset: db.changelog-master.yaml::002_create_users
...
Liquibase: Update has been successful.
HikariPool-1 - Start completed.
Started HireSmartApplication in 12.453 seconds
```

### Step 9.5 — Smoke Test

```bash
# Health check
curl https://staging.hireiq.ai/api/v1/health/status
# → {"status":"UP","service":"HireIQ","timestamp":"..."}

# Frontend loads
curl -s -o /dev/null -w "%{http_code}" https://staging.hireiq.ai
# → 200

# Register first admin user
curl -X POST https://staging.hireiq.ai/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Admin","lastName":"HireIQ","email":"admin@hireiq.ai","password":"Admin123!"}'
```

### Step 9.6 — Trigger Automated CI/CD

Push to `main` and watch the full pipeline:

```bash
git add .
git commit -m "feat: deploy to AWS ECS"
git push origin main

# Monitor at: GitHub → Your Repo → Actions
```

**Pipeline stages:**
```
backend-test     ─┐
frontend-test    ─┤─→ build-and-push → deploy-staging → [APPROVAL] → deploy-production
security-scan    ─┘
```

---

## 12. Phase 10 — Monitoring & Alerting

### CloudWatch Dashboard

```bash
cat > /tmp/dashboard.json << 'DASHBOARD'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "ECS Backend CPU & Memory",
        "metrics": [
          ["AWS/ECS","CPUUtilization","ServiceName","hiresmart-production-backend","ClusterName","hiresmart-production-cluster"],
          ["AWS/ECS","MemoryUtilization","ServiceName","hiresmart-production-backend","ClusterName","hiresmart-production-cluster"]
        ],
        "period": 60, "stat": "Average", "view": "timeSeries"
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "ALB Request Count & Latency",
        "metrics": [
          ["AWS/ApplicationELB","RequestCount","LoadBalancer","hiresmart-production-alb"],
          ["AWS/ApplicationELB","TargetResponseTime","LoadBalancer","hiresmart-production-alb"]
        ],
        "period": 60, "stat": "Sum", "view": "timeSeries"
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "RDS Connections & CPU",
        "metrics": [
          ["AWS/RDS","DatabaseConnections","DBInstanceIdentifier","hiresmart-production"],
          ["AWS/RDS","CPUUtilization","DBInstanceIdentifier","hiresmart-production"]
        ],
        "period": 60, "stat": "Average", "view": "timeSeries"
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "ALB 5xx Errors",
        "metrics": [
          ["AWS/ApplicationELB","HTTPCode_Target_5XX_Count","LoadBalancer","hiresmart-production-alb"]
        ],
        "period": 60, "stat": "Sum", "view": "timeSeries"
      }
    }
  ]
}
DASHBOARD

aws cloudwatch put-dashboard \
  --dashboard-name HireIQ-Production \
  --dashboard-body file:///tmp/dashboard.json \
  --region ap-south-1
```

### CloudWatch Alarms

```bash
# SNS topic for alerts
aws sns create-topic --name hiresmart-alerts --region ap-south-1
aws sns subscribe \
  --topic-arn arn:aws:sns:ap-south-1:ACCOUNT_ID:hiresmart-alerts \
  --protocol email \
  --notification-endpoint your-team@company.com \
  --region ap-south-1

ALARM_SNS="arn:aws:sns:ap-south-1:${AWS_ACCOUNT_ID}:hiresmart-alerts"

# 1. Backend CPU > 80%
aws cloudwatch put-metric-alarm \
  --alarm-name "hiresmart-prod-backend-high-cpu" \
  --alarm-description "Backend CPU over 80% for 5 minutes" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --dimensions Name=ServiceName,Value=hiresmart-production-backend Name=ClusterName,Value=hiresmart-production-cluster \
  --period 300 --evaluation-periods 2 \
  --threshold 80 --comparison-operator GreaterThanThreshold \
  --statistic Average \
  --alarm-actions $ALARM_SNS \
  --region ap-south-1

# 2. ALB 5xx errors > 10 in 5 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name "hiresmart-prod-5xx-errors" \
  --alarm-description "More than 10 HTTP 5xx errors in 5 minutes" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --dimensions Name=LoadBalancer,Value=app/hiresmart-production-alb/XXXX \
  --period 300 --evaluation-periods 1 \
  --threshold 10 --comparison-operator GreaterThanThreshold \
  --statistic Sum \
  --alarm-actions $ALARM_SNS \
  --region ap-south-1

# 3. RDS connections > 150
aws cloudwatch put-metric-alarm \
  --alarm-name "hiresmart-prod-rds-connections" \
  --alarm-description "RDS connections exceeding 150" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --dimensions Name=DBInstanceIdentifier,Value=hiresmart-production \
  --period 300 --evaluation-periods 2 \
  --threshold 150 --comparison-operator GreaterThanThreshold \
  --statistic Average \
  --alarm-actions $ALARM_SNS \
  --region ap-south-1

# 4. Health check failures
aws cloudwatch put-metric-alarm \
  --alarm-name "hiresmart-prod-unhealthy-hosts" \
  --alarm-description "Backend target group has unhealthy hosts" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --dimensions Name=TargetGroup,Value=targetgroup/hiresmart-production-backend/XXXX \
               Name=LoadBalancer,Value=app/hiresmart-production-alb/XXXX \
  --period 60 --evaluation-periods 2 \
  --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold \
  --statistic Average \
  --alarm-actions $ALARM_SNS \
  --region ap-south-1
```

### Log Insights Queries (save these in CloudWatch)

```sql
-- Backend errors in last hour
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50

-- Slow API requests (> 2 seconds)
fields @timestamp, @message
| filter @message like /took [0-9]/ and @message like /s$/
| parse @message "took *s" as duration
| filter duration > 2.0
| sort @timestamp desc

-- Resume analysis throughput
fields @timestamp, @message
| filter @message like /AnalysisService/ and @message like /completed/
| stats count() as analyses by bin(1h)
| sort @timestamp desc
```

---

## 13. Rollback Procedures

### Automated Rollback (ECS Deployment Circuit Breaker)

ECS is configured with `deployment_circuit_breaker { rollback = true }`. If a new deployment causes health check failures, ECS automatically rolls back to the last stable task definition within 10 minutes — no manual intervention needed.

### Manual Rollback — Previous Image Tag

```bash
# List recent task definition revisions
aws ecs list-task-definitions \
  --family-prefix hiresmart-production-backend \
  --sort DESC \
  --query 'taskDefinitionArns[:5]' \
  --region ap-south-1

# Roll back to a specific revision (e.g., revision 12)
aws ecs update-service \
  --cluster hiresmart-production-cluster \
  --service hiresmart-production-backend \
  --task-definition hiresmart-production-backend:12 \
  --region ap-south-1

# Watch rollback progress
aws ecs wait services-stable \
  --cluster hiresmart-production-cluster \
  --services hiresmart-production-backend \
  --region ap-south-1
echo "Rollback complete"
```

### Manual Rollback — Previous ECR Image

```bash
# List recent images by push date
aws ecr describe-images \
  --repository-name hiresmart/backend \
  --region ap-south-1 \
  --query 'sort_by(imageDetails, &imagePushedAt)[-5:].{Tag:imageTags[0],Pushed:imagePushedAt}' \
  --output table

# Re-deploy a specific image tag directly
PREV_TAG="sha-abc1234"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com"

# Update task definition with old image and re-deploy
aws ecs describe-task-definition \
  --task-definition hiresmart-production-backend \
  --query taskDefinition > /tmp/current-task.json

# Edit image tag in /tmp/current-task.json, then register + deploy
aws ecs register-task-definition --cli-input-json file:///tmp/current-task.json
```

### Database Rollback (RDS Point-in-Time Recovery)

```bash
# Restore to a point in time (up to 7 days back)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier hiresmart-production \
  --target-db-instance-identifier hiresmart-production-restored \
  --restore-time "2026-06-20T10:00:00Z" \
  --region ap-south-1

# Then update the SPRING_DATASOURCE_URL secret to point at the restored instance
```

---

## 14. Cost Estimate

### Monthly AWS Cost — Staging (ap-south-1)

| Service | Config | Est. Cost/Month |
|---|---|---|
| ECS Fargate — Backend | 0.5 vCPU · 1 GB · 730h | ~$15 |
| ECS Fargate — Frontend | 0.25 vCPU · 0.5 GB · 730h | ~$8 |
| RDS PostgreSQL | db.t3.micro · 20 GB gp3 | ~$18 |
| ALB | 1 LCU · 730h | ~$20 |
| NAT Gateway | 1 AZ · 10 GB data | ~$38 |
| ECR | 2 repos · ~5 GB storage | ~$1 |
| CloudWatch | Logs + metrics | ~$5 |
| S3 | Resumes · 10 GB | ~$1 |
| **Staging Total** | | **~$106/month** |

### Monthly AWS Cost — Production (ap-south-1)

| Service | Config | Est. Cost/Month |
|---|---|---|
| ECS Fargate — Backend | 1 vCPU · 2 GB · 2 tasks · 730h | ~$120 |
| ECS Fargate — Frontend | 0.25 vCPU · 0.5 GB · 2 tasks · 730h | ~$16 |
| RDS PostgreSQL | db.t3.medium · Multi-AZ · 50 GB | ~$110 |
| ALB | 5 LCU avg · 730h | ~$30 |
| NAT Gateway | 1 AZ · 50 GB data | ~$50 |
| ACM | Free with ALB | $0 |
| Route 53 | 1 hosted zone | ~$1 |
| CloudWatch | Enhanced monitoring | ~$15 |
| S3 | Resumes · 100 GB | ~$4 |
| SES | 10,000 emails/month | ~$1 |
| **Production Total** | | **~$347/month** |

> **Cost saving tip:** Use `FARGATE_SPOT` for staging (up to 70% cheaper). Production uses `FARGATE` for reliability.

---

## 15. Troubleshooting

### ECS Task Fails to Start

```bash
# Check stopped task reason
aws ecs describe-tasks \
  --cluster hiresmart-staging-cluster \
  --tasks $(aws ecs list-tasks \
    --cluster hiresmart-staging-cluster \
    --service-name hiresmart-staging-backend \
    --desired-status STOPPED \
    --query 'taskArns[0]' --output text) \
  --query 'tasks[0].{Status:lastStatus,Reason:stoppedReason,ContainerReason:containers[0].reason}' \
  --region ap-south-1
```

**Common causes:**

| Symptom | Cause | Fix |
|---|---|---|
| `CannotPullContainerError` | ECR login failed | Check execution role has `ecr:GetAuthorizationToken` |
| `ResourceInitializationError` | Secret not found | Verify Secrets Manager ARN matches exactly |
| Task exits code 1 immediately | App startup fails | Check CloudWatch logs for stack trace |
| `Essential container exited` | Health check fails on startup | Increase `startPeriod` in health check (60s → 120s) |
| `OutOfMemoryError` | Container OOM | Increase memory in task definition |

### Backend Can't Connect to RDS

```bash
# 1. Verify security groups allow port 5432
aws ec2 describe-security-groups \
  --group-ids <RDS_SG_ID> \
  --query 'SecurityGroups[0].IpPermissions'

# 2. Test connectivity from within the VPC (use an ECS exec session)
aws ecs execute-command \
  --cluster hiresmart-staging-cluster \
  --task <TASK_ARN> \
  --container backend \
  --command "nc -zv <RDS_ENDPOINT> 5432" \
  --interactive \
  --region ap-south-1

# 3. Check RDS instance is in the same VPC
aws rds describe-db-instances \
  --db-instance-identifier hiresmart-staging \
  --query 'DBInstances[0].{VpcId:DBSubnetGroup.VpcId,Status:DBInstanceStatus}'
```

### GitHub Actions Build Fails

```bash
# Check runner status
# GitHub → Repo → Settings → Actions → Runners → should show "Idle" or "Active"

# SSH to runner and check service
ssh -i ~/.ssh/hiresmart-runner.pem ec2-user@<RUNNER_IP>
sudo ./svc.sh status    # in /home/ec2-user/actions-runner/
sudo journalctl -u actions.runner.* -n 50

# Check Docker is running on runner
sudo systemctl status docker
docker info

# Test ECR login manually on runner
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com
```

### ALB Returns 502 Bad Gateway

```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn <BACKEND_TG_ARN> \
  --region ap-south-1

# Check backend container logs
aws logs tail /hiresmart/staging/backend \
  --follow \
  --region ap-south-1

# Common causes:
# - Container started but app crashed (OOM, config error)
# - Health check path wrong (must return 200)
# - Security group not allowing ALB → container port
```

### Certificate Not Validating

```bash
# ACM validation requires DNS records — check they exist
aws route53 list-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --query "ResourceRecordSets[?Type=='CNAME']"

# If records are missing, re-apply Terraform
terraform apply -target=module.dns_ssl

# Certificate validation can take 5-30 minutes after DNS propagation
aws acm describe-certificate \
  --certificate-arn <CERT_ARN> \
  --query 'Certificate.DomainValidationOptions[0].ValidationStatus' \
  --region ap-south-1
```

### Quick Health Check Commands

```bash
# Full system health check
echo "=== ALB ===" && \
  curl -sf https://staging.hireiq.ai/api/v1/health/status | jq .

echo "=== ECS Backend ===" && \
  aws ecs describe-services \
    --cluster hiresmart-staging-cluster \
    --services hiresmart-staging-backend \
    --query 'services[0].{Running:runningCount,Desired:desiredCount,Status:status}' \
    --region ap-south-1

echo "=== RDS ===" && \
  aws rds describe-db-instances \
    --db-instance-identifier hiresmart-staging \
    --query 'DBInstances[0].{Status:DBInstanceStatus,Connections:Endpoint.Address}' \
    --region ap-south-1

echo "=== ECR Images ===" && \
  aws ecr describe-images \
    --repository-name hiresmart/backend \
    --query 'sort_by(imageDetails,&imagePushedAt)[-1].{Tag:imageTags[0],Pushed:imagePushedAt}' \
    --region ap-south-1
```

---

## Deployment Checklist

```
PHASE 1 — AWS Setup
  [ ] AWS CLI configured (ap-south-1)
  [ ] IAM user hiresmart-cicd created with access keys saved
  [ ] IAM roles hiresmart-ecs-execution-role and hiresmart-ecs-task-role created
  [ ] SES domain hireiq.ai verified + production access approved

PHASE 2 — Terraform Bootstrap
  [ ] S3 bucket hiresmart-terraform-state created
  [ ] DynamoDB table hiresmart-terraform-locks created
  [ ] terraform init completed successfully
  [ ] ACCOUNT_ID replaced in all .tf files

PHASE 3 — Infrastructure Apply
  [ ] terraform apply staging — all resources created
  [ ] VPC, subnets, security groups verified
  [ ] RDS instance running and accessible
  [ ] ECR repositories created
  [ ] ALB created and healthy
  [ ] ACM certificate in ISSUED state
  [ ] Route 53 A record pointing to ALB

PHASE 4 — Secrets
  [ ] All 6 secrets created in Secrets Manager (staging)
  [ ] All 6 secrets created in Secrets Manager (production)
  [ ] Secrets accessible by hiresmart-ecs-execution-role

PHASE 5 — Runner
  [ ] EC2 runner instance running
  [ ] GitHub Actions runner registered (shows "Idle" in GitHub)
  [ ] Docker + Java 21 + Maven + Node 20 installed on runner
  [ ] Runner instance profile attached with ECR/ECS permissions

PHASE 6 — GitHub
  [ ] AWS_ACCESS_KEY_ID secret set
  [ ] AWS_SECRET_ACCESS_KEY secret set
  [ ] STAGING_URL secret set
  [ ] PROD_URL secret set
  [ ] production environment with manual approval gate configured

PHASE 7 — First Deploy
  [ ] Initial images pushed to ECR manually
  [ ] Task definitions registered
  [ ] ECS services force-deployed
  [ ] Backend logs show "Started HireSmartApplication"
  [ ] Liquibase migrations completed
  [ ] Smoke test: GET /api/v1/health/status returns 200
  [ ] Admin user registered and login works

PHASE 8 — CI/CD Live
  [ ] Push to main triggers GitHub Actions
  [ ] All pipeline stages pass (backend-test, frontend-test, security-scan)
  [ ] build-and-push pushes images to ECR
  [ ] deploy-staging deploys and smoke test passes
  [ ] Production deployment approved and successful

PHASE 9 — Monitoring
  [ ] CloudWatch dashboard created
  [ ] CPU/Memory alarms set
  [ ] 5xx error alarm set
  [ ] SNS topic and email subscription confirmed
```

---

*Document: HireIQ AWS Deployment Guide v1.0 · Region: ap-south-1 · June 2026*
