variable "name_prefix"             { type = string }
variable "aws_region"              { type = string }
variable "environment"             { type = string }
variable "vpc_id"                  { type = string }
variable "private_subnet_ids"      { type = list(string) }
variable "backend_sg_id"           { type = string }
variable "frontend_sg_id"          { type = string }

variable "backend_ecr_url"         { type = string }
variable "frontend_ecr_url"        { type = string }

variable "backend_target_group_arn"  { type = string }
variable "frontend_target_group_arn" { type = string }

variable "backend_cpu"             { type = number }
variable "backend_memory"          { type = number }
variable "backend_desired_count"   { type = number }
variable "backend_port"            { type = number }

variable "frontend_cpu"            { type = number }
variable "frontend_memory"         { type = number }
variable "frontend_desired_count"  { type = number }
variable "frontend_port"           { type = number }

variable "db_url"                  { type = string }
variable "db_username"             { type = string }
variable "db_password_secret_arn"  { type = string }
variable "jwt_secret_arn"          { type = string }
variable "app_secrets_arn"         { type = string }

variable "alb_dns_name"            { type = string }
variable "jwt_expiration_ms"       { type = number }
variable "anthropic_model"         { type = string }
variable "liquibase_enabled" {
  type    = string
  default = "false"
}
variable "db_ddl_auto" {
  type    = string
  default = "update"
}
