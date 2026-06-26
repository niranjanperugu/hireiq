# HireIQ — Test Deployment Script (Windows PowerShell)
# Deploys all infrastructure tagged ResourceGroup=hiresmart-test
# Run from the repo root: .\infrastructure\deploy-test.ps1

param(
  [string]$AnthropicApiKey = "",
  [string]$AwsSesEmail     = "noreply@hireiq.ai",
  [switch]$DestroyAll      = $false
)

$ErrorActionPreference = "Stop"
$AWS_REGION    = "ap-south-1"
$PROJECT       = "hiresmart-test"
$INFRA_DIR     = "$PSScriptRoot\terraform"
$TFVARS        = "$INFRA_DIR\environments\test.tfvars"
$STATE_BUCKET  = "hiresmart-terraform-state"
$LOCK_TABLE    = "hiresmart-terraform-locks"
$AWS_EXE       = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
$TF_EXE        = (Get-Command terraform -ErrorAction SilentlyContinue)?.Source
if (-not $TF_EXE) {
  $TF_EXE = "C:\Users\niran\AppData\Local\Microsoft\WinGet\Packages\Hashicorp.Terraform_Microsoft.Winget.Source_8wekyb3d8bbwe\terraform.exe"
}
Set-Alias terraform $TF_EXE -Scope Script

function Invoke-AWS {
  & $AWS_EXE @args
  if ($LASTEXITCODE -ne 0) { throw "AWS CLI command failed: aws $args" }
}

function Log-Step { param($msg) Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Log-OK   { param($msg) Write-Host "    [OK] $msg" -ForegroundColor Green }
function Log-Warn { param($msg) Write-Host "    [!!] $msg" -ForegroundColor Yellow }

# ── 0. DESTROY MODE ───────────────────────────────────────────────────────────
if ($DestroyAll) {
  Log-Step "DESTROY MODE — tearing down all hiresmart-test resources"
  Set-Location $INFRA_DIR
  terraform destroy -var-file="$TFVARS" -auto-approve
  Log-OK "All resources destroyed. Cleaning up ECR images..."
  & $AWS_EXE ecr delete-repository --repository-name hiresmart-test/backend  --force --region $AWS_REGION 2>$null
  & $AWS_EXE ecr delete-repository --repository-name hiresmart-test/frontend --force --region $AWS_REGION 2>$null
  & $AWS_EXE s3 rb s3://$STATE_BUCKET --force 2>$null
  & $AWS_EXE dynamodb delete-table --table-name $LOCK_TABLE --region $AWS_REGION 2>$null
  Log-OK "Teardown complete."
  exit 0
}

# ── 1. CHECK TERRAFORM ────────────────────────────────────────────────────────
Log-Step "Step 1: Checking Terraform..."
$tfPath = (Get-Command terraform -ErrorAction SilentlyContinue)?.Source
if (-not $tfPath) {
  Log-Warn "Terraform not found. Installing via winget..."
  winget install --id HashiCorp.Terraform -e --accept-source-agreements --accept-package-agreements
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" +
              [System.Environment]::GetEnvironmentVariable("PATH", "User")
  $tfPath = (Get-Command terraform -ErrorAction SilentlyContinue)?.Source
  if (-not $tfPath) {
    throw "Terraform install failed. Please install manually from https://developer.hashicorp.com/terraform/downloads and re-run."
  }
}
$tfVer = terraform version -json | ConvertFrom-Json
Log-OK "Terraform $($tfVer.terraform_version) found at $tfPath"

# ── 2. CHECK AWS CREDENTIALS ──────────────────────────────────────────────────
Log-Step "Step 2: Verifying AWS credentials..."
$identity = & $AWS_EXE sts get-caller-identity | ConvertFrom-Json
$ACCOUNT_ID = $identity.Account
Log-OK "Authenticated as $($identity.Arn)"
Log-OK "Account ID: $ACCOUNT_ID"

# ── 3. BOOTSTRAP STATE BACKEND ───────────────────────────────────────────────
Log-Step "Step 3: Bootstrapping Terraform state backend..."

$bucketExists = & $AWS_EXE s3api head-bucket --bucket $STATE_BUCKET --region $AWS_REGION 2>&1
if ($LASTEXITCODE -ne 0) {
  Log-Warn "Creating S3 state bucket: $STATE_BUCKET"
  & $AWS_EXE s3api create-bucket `
    --bucket $STATE_BUCKET `
    --region $AWS_REGION `
    --create-bucket-configuration LocationConstraint=$AWS_REGION | Out-Null
  & $AWS_EXE s3api put-bucket-versioning `
    --bucket $STATE_BUCKET `
    --versioning-configuration Status=Enabled | Out-Null
  & $AWS_EXE s3api put-bucket-encryption `
    --bucket $STATE_BUCKET `
    --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' | Out-Null
  & $AWS_EXE s3api put-public-access-block `
    --bucket $STATE_BUCKET `
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" | Out-Null
  Log-OK "S3 bucket created: $STATE_BUCKET"
} else {
  Log-OK "S3 state bucket already exists: $STATE_BUCKET"
}

$tableExists = & $AWS_EXE dynamodb describe-table --table-name $LOCK_TABLE --region $AWS_REGION 2>&1
if ($LASTEXITCODE -ne 0) {
  Log-Warn "Creating DynamoDB lock table: $LOCK_TABLE"
  & $AWS_EXE dynamodb create-table `
    --table-name $LOCK_TABLE `
    --attribute-definitions AttributeName=LockID,AttributeType=S `
    --key-schema AttributeName=LockID,KeyType=HASH `
    --billing-mode PAY_PER_REQUEST `
    --region $AWS_REGION | Out-Null
  Log-OK "DynamoDB table created: $LOCK_TABLE"
} else {
  Log-OK "DynamoDB lock table already exists: $LOCK_TABLE"
}

# ── 4. TERRAFORM INIT ─────────────────────────────────────────────────────────
Log-Step "Step 4: Terraform init..."
Set-Location $INFRA_DIR
terraform init -upgrade -reconfigure
if ($LASTEXITCODE -ne 0) { throw "terraform init failed" }
Log-OK "Terraform initialized"

# ── 5. TERRAFORM PLAN ────────────────────────────────────────────────────────
Log-Step "Step 5: Terraform plan (review before apply)..."
terraform plan -var-file="$TFVARS" -out=tfplan
if ($LASTEXITCODE -ne 0) { throw "terraform plan failed" }
Log-OK "Plan saved to tfplan"

# ── 6. TERRAFORM APPLY ────────────────────────────────────────────────────────
Log-Step "Step 6: Terraform apply (this takes ~10 minutes)..."
terraform apply tfplan
if ($LASTEXITCODE -ne 0) { throw "terraform apply failed" }
Log-OK "Infrastructure deployed!"

# Capture outputs
$TF_OUTPUTS = terraform output -json | ConvertFrom-Json
$ALB_DNS        = $TF_OUTPUTS.alb_dns_name.value
$ECR_BACKEND    = $TF_OUTPUTS.ecr_backend_url.value
$ECR_FRONTEND   = $TF_OUTPUTS.ecr_frontend_url.value
$RDS_SECRET_ARN = $TF_OUTPUTS.db_secret_arn.value
$JWT_SECRET_ARN = $TF_OUTPUTS.jwt_secret_arn.value
$APP_SECRET_ARN = $TF_OUTPUTS.app_secrets_arn.value

Write-Host "`n    ALB URL:      http://$ALB_DNS" -ForegroundColor White
Write-Host "    ECR Backend:  $ECR_BACKEND"     -ForegroundColor White
Write-Host "    ECR Frontend: $ECR_FRONTEND"    -ForegroundColor White

# ── 7. STORE APP SECRETS ──────────────────────────────────────────────────────
Log-Step "Step 7: Storing application secrets in Secrets Manager..."

if (-not $AnthropicApiKey) {
  $AnthropicApiKey = Read-Host "Enter your Anthropic API key (sk-ant-...)"
}

$appSecretValue = @{
  AWS_ACCESS_KEY_ID     = (& $AWS_EXE configure get aws_access_key_id)
  AWS_SECRET_ACCESS_KEY = (& $AWS_EXE configure get aws_secret_access_key)
  AWS_REGION            = $AWS_REGION
  AWS_SES_EMAIL         = $AwsSesEmail
  ANTHROPIC_API_KEY     = $AnthropicApiKey
  AWS_S3_BUCKET         = "hiresmart-test-resumes"
} | ConvertTo-Json -Compress

& $AWS_EXE secretsmanager update-secret `
  --secret-id $APP_SECRET_ARN `
  --secret-string $appSecretValue `
  --region $AWS_REGION | Out-Null
Log-OK "App secrets stored in Secrets Manager"

# ── 8. CREATE S3 RESUME BUCKET ────────────────────────────────────────────────
Log-Step "Step 8: Creating resume storage bucket..."
$resumeBucket = "hiresmart-test-resumes"
$bucketCheck = & $AWS_EXE s3api head-bucket --bucket $resumeBucket --region $AWS_REGION 2>&1
if ($LASTEXITCODE -ne 0) {
  & $AWS_EXE s3api create-bucket `
    --bucket $resumeBucket `
    --region $AWS_REGION `
    --create-bucket-configuration LocationConstraint=$AWS_REGION | Out-Null
  & $AWS_EXE s3api put-public-access-block `
    --bucket $resumeBucket `
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" | Out-Null

  # Tag the bucket so it appears in the Resource Group
  & $AWS_EXE s3api put-bucket-tagging `
    --bucket $resumeBucket `
    --tagging "TagSet=[{Key=ResourceGroup,Value=hiresmart-test},{Key=Project,Value=HireIQ},{Key=ManagedBy,Value=Terraform}]" | Out-Null
  Log-OK "Resume bucket created: $resumeBucket"
} else {
  Log-OK "Resume bucket already exists: $resumeBucket"
}

# ── 9. BUILD & PUSH DOCKER IMAGES ────────────────────────────────────────────
Log-Step "Step 9: Building and pushing Docker images to ECR..."

# ECR login
& $AWS_EXE ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
if ($LASTEXITCODE -ne 0) { throw "ECR login failed" }
Log-OK "Logged in to ECR"

$REPO_ROOT = (Resolve-Path "$PSScriptRoot\..")

# Build backend
Log-Warn "Building backend image (~3-5 minutes)..."
docker build -t hiresmart-test/backend:latest "$REPO_ROOT\backend"
docker tag hiresmart-test/backend:latest "${ECR_BACKEND}:latest"
docker push "${ECR_BACKEND}:latest"
Log-OK "Backend image pushed to ECR"

# Build frontend
Log-Warn "Building frontend image (~2-3 minutes)..."
docker build `
  --build-arg VITE_API_URL="http://${ALB_DNS}/api/v1" `
  -t hiresmart-test/frontend:latest `
  "$REPO_ROOT\frontend"
docker tag hiresmart-test/frontend:latest "${ECR_FRONTEND}:latest"
docker push "${ECR_FRONTEND}:latest"
Log-OK "Frontend image pushed to ECR"

# ── 10. FORCE ECS REDEPLOYMENT ────────────────────────────────────────────────
Log-Step "Step 10: Triggering ECS deployment with new images..."
$CLUSTER = "hiresmart-test-staging-cluster"

& $AWS_EXE ecs update-service `
  --cluster $CLUSTER `
  --service hiresmart-test-staging-backend `
  --force-new-deployment `
  --region $AWS_REGION | Out-Null

& $AWS_EXE ecs update-service `
  --cluster $CLUSTER `
  --service hiresmart-test-staging-frontend `
  --force-new-deployment `
  --region $AWS_REGION | Out-Null

Log-OK "ECS services redeploying (takes ~3-5 minutes)..."
Log-Warn "Waiting for backend service to stabilize..."
& $AWS_EXE ecs wait services-stable `
  --cluster $CLUSTER `
  --services hiresmart-test-staging-backend `
  --region $AWS_REGION
Log-OK "Backend service is stable"

# ── 11. SMOKE TEST ────────────────────────────────────────────────────────────
Log-Step "Step 11: Running smoke test..."
Start-Sleep -Seconds 15
try {
  $health = Invoke-RestMethod "http://$ALB_DNS/api/v1/health/status"
  Log-OK "Health check passed: $($health | ConvertTo-Json -Compress)"
} catch {
  Log-Warn "Health check not yet ready — backend may still be starting. Check logs with:"
  Log-Warn "  aws logs tail /ecs/hiresmart-test-staging/backend --follow --region $AWS_REGION"
}

# ── DONE ──────────────────────────────────────────────────────────────────────
Write-Host @"

==========================================================================
  HireIQ Test Deployment Complete!
==========================================================================

  App URL:        http://$ALB_DNS
  API Health:     http://$ALB_DNS/api/v1/health/status
  Swagger UI:     http://$ALB_DNS/api/v1/swagger-ui.html

  AWS Resource Group: hiresmart-test
  (AWS Console -> Resource Groups & Tag Editor -> hiresmart-test)

  To view logs:
    aws logs tail /ecs/hiresmart-test-staging/backend --follow --region $AWS_REGION
    aws logs tail /ecs/hiresmart-test-staging/frontend --follow --region $AWS_REGION

  To DESTROY all test resources when done:
    .\infrastructure\deploy-test.ps1 -DestroyAll

==========================================================================
"@ -ForegroundColor Cyan
