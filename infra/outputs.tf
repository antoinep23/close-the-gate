output "s3_bucket_name" {
  description = "S3 bucket for encrypted objects + shared blobs. Set as S3_BUCKET."
  value       = aws_s3_bucket.store.id
}

output "dynamodb_table_name" {
  description = "DynamoDB metadata table. Set as DYNAMO_TABLE."
  value       = aws_dynamodb_table.files.name
}

output "lambda_function_name" {
  description = "Share Lambda function name. Set as LAMBDA_FUNCTION."
  value       = aws_lambda_function.share.function_name
}

output "share_base_url" {
  description = "Public base URL for share links (CloudFront). Set as LAMBDA_URL / SHARE_BASE_URL. Links look like <this>/s/<token>#<key>."
  value       = "https://${aws_cloudfront_distribution.share.domain_name}"
}

output "api_gateway_endpoint" {
  description = "Direct HTTP API endpoint (origin behind CloudFront). Usually you should use share_base_url instead."
  value       = aws_apigatewayv2_api.share.api_endpoint
}

output "app_policy_arn" {
  description = "ARN of the least-privilege policy for the app principal. Attach it to your app's IAM user/role."
  value       = aws_iam_policy.app.arn
}

output "region" {
  description = "Region the infra was deployed to. Set as AWS_REGION."
  value       = var.region
}
