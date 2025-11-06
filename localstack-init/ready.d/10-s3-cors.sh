#!/usr/bin/env bash
set -euo pipefail

# Configure S3 CORS for LocalStack so browsers can PUT directly to presigned URLs
# Uses AWS_BUCKET_NAME if provided; otherwise applies to all existing buckets.

CORS_CFG='{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag", "x-amz-request-id", "x-amz-version-id"],
      "MaxAgeSeconds": 3000
    }
  ]
}'

# Wait briefly for LocalStack to be fully ready
sleep 1

if command -v awslocal >/dev/null 2>&1; then
  AWSL=awslocal
else
  AWSL=aws
fi

BUCKET_NAME="${AWS_BUCKET_NAME:-}"

if [ -n "$BUCKET_NAME" ]; then
  echo "[init] Ensuring bucket '$BUCKET_NAME' exists and setting CORS"
  if ! $AWSL s3api head-bucket --bucket "$BUCKET_NAME" >/dev/null 2>&1; then
    $AWSL s3 mb "s3://$BUCKET_NAME" || true
  fi
  $AWSL s3api put-bucket-cors \
    --bucket "$BUCKET_NAME" \
    --cors-configuration "$CORS_CFG"
else
  echo "[init] No AWS_BUCKET_NAME provided; applying CORS to all buckets"
  # List all buckets and set CORS
  $AWSL s3api list-buckets --query 'Buckets[].Name' --output text | tr '\t' '\n' | while read -r name; do
    [ -z "$name" ] && continue
    echo "[init] Setting CORS on bucket '$name'"
    $AWSL s3api put-bucket-cors \
      --bucket "$name" \
      --cors-configuration "$CORS_CFG" || true
  done
fi
