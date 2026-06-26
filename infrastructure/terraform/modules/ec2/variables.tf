variable "name_prefix"                 { type = string }
variable "instance_type"               { type = string }
variable "key_pair_name"               { type = string }
variable "subnet_id"                   { type = string }
variable "security_group_id"           { type = string }
variable "ecr_backend_repo_url"        { type = string }
variable "ecr_frontend_repo_url"       { type = string }
variable "aws_region"                  { type = string }
variable "github_actions_runner_token" {
  type      = string
  sensitive = true
}
variable "github_repo_url"             { type = string }
variable "ecs_backend_service"         { type = string }
variable "ecs_frontend_service"        { type = string }
variable "ecs_cluster_name"            { type = string }
