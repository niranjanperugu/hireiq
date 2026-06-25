output "instance_id" { value = aws_instance.build_server.id }
output "public_ip"   { value = aws_instance.build_server.public_ip }
output "private_ip"  { value = aws_instance.build_server.private_ip }
