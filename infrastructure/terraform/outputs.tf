output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer — point your domain's CNAME here"
  value       = module.alb.alb_dns_name
}

output "ecr_backend_url" {
  description = "ECR URL for the backend image"
  value       = module.ecr.backend_repository_url
}

output "ecr_frontend_url" {
  description = "ECR URL for the frontend image"
  value       = module.ecr.frontend_repository_url
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "rds_port" {
  value = module.rds.port
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "ecs_backend_service_name" {
  value = module.ecs.backend_service_name
}

output "ecs_frontend_service_name" {
  value = module.ecs.frontend_service_name
}

output "build_server_public_ip" {
  description = "Public IP of the EC2 build/CI server"
  value       = module.ec2_build.public_ip
}

output "build_server_instance_id" {
  value = module.ec2_build.instance_id
}

output "db_secret_arn" {
  description = "ARN of Secrets Manager secret holding DB password"
  value       = aws_secretsmanager_secret.db_password.arn
  sensitive   = true
}

output "jwt_secret_arn" {
  description = "ARN of Secrets Manager secret holding JWT signing secret"
  value       = aws_secretsmanager_secret.jwt_secret.arn
  sensitive   = true
}

output "app_secrets_arn" {
  description = "ARN of Secrets Manager secret for AWS/Anthropic credentials (update manually)"
  value       = aws_secretsmanager_secret.app_secrets.arn
  sensitive   = true
}

output "vpc_id" {
  value = module.vpc.vpc_id
}
