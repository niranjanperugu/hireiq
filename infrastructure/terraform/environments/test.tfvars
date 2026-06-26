# ── Test Environment — minimal cost, easy to delete ──────────────────────────
environment         = "staging"
project_name        = "hiresmart-test"
resource_group_name = "hiresmart-test"
aws_region          = "ap-south-1"

# VPC — single NAT GW, 2 AZs (enough for test)
single_nat_gateway   = true
availability_zones   = ["ap-south-1a", "ap-south-1b"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]

# RDS — smallest instance, no multi-AZ, minimal backup
db_instance_class        = "db.t3.micro"
db_allocated_storage     = 20
db_max_allocated_storage = 20
db_multi_az              = false
db_backup_retention_days = 1

# ECS — single task per service (saves cost)
backend_cpu            = 512
backend_memory         = 1024
backend_desired_count  = 1
backend_port           = 8080
frontend_cpu           = 256
frontend_memory        = 512
frontend_desired_count = 1

# No build server for test (CI/CD runner not needed)
enable_build_server = false

# No HTTPS for test (skip ACM + domain setup)
acm_certificate_arn = ""
domain_name         = ""

# RDS — no deletion protection, skip final snapshot so destroy works cleanly
db_deletion_protection  = false
db_skip_final_snapshot  = true
db_performance_insights = false   # not supported on db.t3.micro

# AI model — use cost-efficient model for test
anthropic_model = "claude-haiku-4-5-20251001"
