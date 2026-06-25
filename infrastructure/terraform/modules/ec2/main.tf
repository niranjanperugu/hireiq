# ── Latest Amazon Linux 2023 AMI ──────────────────────────────────────────────
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── IAM Role for EC2 build server ─────────────────────────────────────────────
resource "aws_iam_role" "build_ec2" {
  name = "${var.name_prefix}-build-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "build_ec2_policy" {
  name = "${var.name_prefix}-build-ec2-policy"
  role = aws_iam_role.build_ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Push images to ECR
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
        ]
        Resource = "*"
      },
      {
        # Deploy to ECS
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:RegisterTaskDefinition",
          "ecs:DescribeTaskDefinition",
          "ecs:ListTaskDefinitions",
        ]
        Resource = "*"
      },
      {
        # Pass IAM roles to ECS tasks
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = "*"
        Condition = {
          StringLike = {
            "iam:PassedToService" = "ecs-tasks.amazonaws.com"
          }
        }
      },
      {
        # CloudWatch logs
        Effect = "Allow"
        Action = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "*"
      },
      {
        # SSM Session Manager (no SSH key needed)
        Effect = "Allow"
        Action = [
          "ssm:UpdateInstanceInformation",
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel",
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "build_ec2" {
  name = "${var.name_prefix}-build-ec2-profile"
  role = aws_iam_role.build_ec2.name
}

# ── EC2 Instance ───────────────────────────────────────────────────────────────
resource "aws_instance" "build_server" {
  ami                         = data.aws_ami.amazon_linux_2023.id
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [var.security_group_id]
  iam_instance_profile        = aws_iam_instance_profile.build_ec2.name
  key_name                    = var.key_pair_name
  associate_public_ip_address = true

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 50
    delete_on_termination = true
    encrypted             = true
  }

  user_data = base64encode(templatefile("${path.module}/userdata.sh.tpl", {
    aws_region            = var.aws_region
    ecr_backend_repo_url  = var.ecr_backend_repo_url
    ecr_frontend_repo_url = var.ecr_frontend_repo_url
    ecs_cluster_name      = var.ecs_cluster_name
    ecs_backend_service   = var.ecs_backend_service
    ecs_frontend_service  = var.ecs_frontend_service
    github_actions_token  = var.github_actions_runner_token
    github_repo_url       = var.github_repo_url
  }))

  tags = { Name = "${var.name_prefix}-build-server", Role = "CI-CD-Build" }
}

# ── CloudWatch monitoring ──────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "build_cpu_high" {
  alarm_name          = "${var.name_prefix}-build-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Build server CPU above 90%"

  dimensions = {
    InstanceId = aws_instance.build_server.id
  }
}
