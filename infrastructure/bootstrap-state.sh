#!/usr/bin/env bash
# Run this ONCE before the first `terraform init` to create the S3 + DynamoDB
# remote state backend.  Requires AWS CLI configured with admin credentials.
set -euo pipefail

AWS_REGION="${1:-ap-south-1}"
BUCKET_NAME="hiresmart-terraform-state"
DYNAMO_TABLE="hiresmart-terraform-locks"

echo "==> Creating S3 bucket for Terraform state: ${BUCKET_NAME}"
aws s3api create-bucket \
  --bucket "${BUCKET_NAME}" \
  --region "${AWS_REGION}" \
  --create-bucket-configuration LocationConstraint="${AWS_REGION}"

aws s3api put-bucket-versioning \
  --bucket "${BUCKET_NAME}" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket "${BUCKET_NAME}" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

aws s3api put-public-access-block \
  --bucket "${BUCKET_NAME}" \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "==> Creating DynamoDB table for state locking: ${DYNAMO_TABLE}"
aws dynamodb create-table \
  --table-name "${DYNAMO_TABLE}" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "${AWS_REGION}"

echo ""
echo "Bootstrap complete. Run the following to deploy:"
echo ""
echo "  cd infrastructure/terraform"
echo "  terraform init"
echo "  terraform plan -var-file=environments/staging.tfvars"
echo "  terraform apply -var-file=environments/staging.tfvars"
