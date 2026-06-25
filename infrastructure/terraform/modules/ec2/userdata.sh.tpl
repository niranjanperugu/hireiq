#!/bin/bash
set -euo pipefail
exec > >(tee /var/log/userdata.log) 2>&1

echo "==> Updating system packages"
dnf update -y

echo "==> Installing base tools"
dnf install -y git curl wget unzip jq htop

# ── Docker ─────────────────────────────────────────────────────────────────────
echo "==> Installing Docker"
dnf install -y docker
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# ── AWS CLI v2 ─────────────────────────────────────────────────────────────────
echo "==> Installing AWS CLI v2"
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp/
/tmp/aws/install
rm -rf /tmp/awscliv2.zip /tmp/aws/

# ── Java 21 (for Maven builds on the runner) ───────────────────────────────────
echo "==> Installing Java 21"
dnf install -y java-21-amazon-corretto-devel

# ── Maven ─────────────────────────────────────────────────────────────────────
echo "==> Installing Maven 3.9"
MVN_VERSION="3.9.6"
curl -fsSL "https://archive.apache.org/dist/maven/maven-3/${MVN_VERSION}/binaries/apache-maven-${MVN_VERSION}-bin.tar.gz" \
  -o /tmp/maven.tar.gz
tar -xzf /tmp/maven.tar.gz -C /opt/
ln -sf /opt/apache-maven-${MVN_VERSION}/bin/mvn /usr/local/bin/mvn
rm /tmp/maven.tar.gz

# ── Node.js 20 ────────────────────────────────────────────────────────────────
echo "==> Installing Node.js 20"
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# ── GitHub Actions self-hosted runner ─────────────────────────────────────────
%{ if github_actions_token != "" }
echo "==> Registering GitHub Actions self-hosted runner"
RUNNER_VERSION="2.319.1"
mkdir -p /home/ec2-user/actions-runner
cd /home/ec2-user/actions-runner

curl -fsSL "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" \
  -o actions-runner.tar.gz
tar -xzf actions-runner.tar.gz
rm actions-runner.tar.gz

chown -R ec2-user:ec2-user /home/ec2-user/actions-runner

# Configure runner as ec2-user
sudo -u ec2-user ./config.sh \
  --url "${github_repo_url}" \
  --token "${github_actions_token}" \
  --name "$(hostname)-aws-ec2" \
  --labels "self-hosted,linux,x64,aws,build-server" \
  --unattended \
  --replace

# Install as systemd service
./svc.sh install ec2-user
./svc.sh start

echo "==> GitHub Actions runner registered and started"
%{ else }
echo "==> Skipping GitHub Actions runner registration (no token provided)"
echo "    Set github_actions_runner_token in terraform.tfvars to enable auto-registration"
%{ endif }

# ── ECR login helper ───────────────────────────────────────────────────────────
cat >> /home/ec2-user/.bashrc << 'BASHRC'

# ECR helpers
export AWS_DEFAULT_REGION="${aws_region}"
alias ecr-login='aws ecr get-login-password --region ${aws_region} | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.${aws_region}.amazonaws.com'
alias ecs-deploy-backend='aws ecs update-service --cluster ${ecs_cluster_name} --service ${ecs_backend_service} --force-new-deployment'
alias ecs-deploy-frontend='aws ecs update-service --cluster ${ecs_cluster_name} --service ${ecs_frontend_service} --force-new-deployment'
BASHRC

echo "==> EC2 build server setup complete"
