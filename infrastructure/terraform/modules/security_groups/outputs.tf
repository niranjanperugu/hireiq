output "alb_sg_id"           { value = aws_security_group.alb.id }
output "backend_ecs_sg_id"   { value = aws_security_group.backend_ecs.id }
output "frontend_ecs_sg_id"  { value = aws_security_group.frontend_ecs.id }
output "rds_sg_id"           { value = aws_security_group.rds.id }
output "build_ec2_sg_id"     { value = aws_security_group.build_ec2.id }
