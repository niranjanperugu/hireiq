# ── Global ────────────────────────────────────────────────────────────────────
variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment (staging | production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'."
  }
}

variable "project_name" {
  description = "Short project identifier used in resource names"
  type        = string
  default     = "hiresmart"
}

# ── VPC ───────────────────────────────────────────────────────────────────────
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway (cheaper for staging; use false in production)"
  type        = bool
  default     = true
}

# ── RDS ───────────────────────────────────────────────────────────────────────
variable "db_instance_class" {
  type    = string
  default = "db.t3.medium"
}

variable "db_name" {
  type    = string
  default = "hiresmart_db"
}

variable "db_username" {
  type    = string
  default = "hiresmart_user"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "db_max_allocated_storage" {
  type    = number
  default = 100
}

variable "db_multi_az" {
  description = "Enable Multi-AZ for RDS (recommended for production)"
  type        = bool
  default     = false
}

variable "db_backup_retention_days" {
  type    = number
  default = 7
}

# ── ECS ───────────────────────────────────────────────────────────────────────
variable "backend_cpu" {
  type    = number
  default = 512
}

variable "backend_memory" {
  type    = number
  default = 1024
}

variable "backend_desired_count" {
  type    = number
  default = 2
}

variable "frontend_cpu" {
  type    = number
  default = 256
}

variable "frontend_memory" {
  type    = number
  default = 512
}

variable "frontend_desired_count" {
  type    = number
  default = 2
}

variable "backend_port" {
  type    = number
  default = 8080
}

variable "frontend_port" {
  type    = number
  default = 80
}

# ── EC2 Build Server ──────────────────────────────────────────────────────────
variable "build_instance_type" {
  type    = string
  default = "t3.medium"
}

variable "build_key_pair_name" {
  description = "Name of an existing EC2 key pair for SSH access to the build server"
  type        = string
  default     = "hiresmart-build-key"
}

variable "allowed_ssh_cidrs" {
  description = "CIDR blocks allowed to SSH into the build server"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# ── ALB / HTTPS ───────────────────────────────────────────────────────────────
variable "domain_name" {
  description = "Root domain name (e.g. hireiq.ai). Leave empty to skip ACM/HTTPS."
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ARN of an existing ACM certificate. If empty, HTTP-only ALB is created."
  type        = string
  default     = ""
}

# ── App config ────────────────────────────────────────────────────────────────
variable "jwt_expiration_ms" {
  type    = number
  default = 86400000
}

variable "anthropic_model" {
  type    = string
  default = "claude-haiku-4-5-20251001"
}

variable "github_actions_runner_token" {
  description = "GitHub Actions runner registration token for the EC2 self-hosted runner"
  type        = string
  sensitive   = true
  default     = ""
}

variable "github_repo_url" {
  description = "GitHub repository URL for the self-hosted runner"
  type        = string
  default     = "https://github.com/your-org/SmartHire"
}
