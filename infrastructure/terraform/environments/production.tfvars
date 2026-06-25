# ── Production Environment ────────────────────────────────────────────────────
environment  = "production"
aws_region   = "ap-south-1"
project_name = "hiresmart"

# VPC — 3 NAT GWs for AZ-level resilience
single_nat_gateway   = false
availability_zones   = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

# RDS — production sizing with Multi-AZ
db_instance_class        = "db.t3.medium"
db_allocated_storage     = 50
db_max_allocated_storage = 200
db_multi_az              = true
db_backup_retention_days = 14

# ECS — HA with 2 tasks minimum
backend_cpu            = 1024
backend_memory         = 2048
backend_desired_count  = 2
frontend_cpu           = 512
frontend_memory        = 1024
frontend_desired_count = 2

# EC2 Build Server
build_instance_type = "t3.large"
build_key_pair_name = "hiresmart-prod-build-key"
allowed_ssh_cidrs   = ["YOUR_OFFICE_IP/32"]   # replace with actual IP

# Domain / TLS
acm_certificate_arn = "arn:aws:acm:ap-south-1:YOUR_ACCOUNT_ID:certificate/YOUR_CERT_ID"
domain_name         = "hireiq.ai"

# GitHub Actions self-hosted runner
github_actions_runner_token = ""   # set via TF_VAR_github_actions_runner_token env var
github_repo_url             = "https://github.com/your-org/SmartHire"
