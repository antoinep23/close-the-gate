# Zip the Lambda source. node_modules must be present in lambda/share (the
# README notes s3-request-presigner has to be bundled). Run `npm install` in
# lambda/share before `terraform apply`.
data "archive_file" "share_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/share"
  output_path = "${path.module}/.build/share-lambda.zip"

  excludes = [
    "README.md",
    "iam-policy.json",
    "s3-cors.json",
    "package-lock.json"
  ]
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "share_lambda" {
  name               = "${local.lambda_name}-exec"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
  tags               = var.tags
}

# The ONLY data permission: read objects under shared/*. Nothing else in the
# bucket is reachable; the real user objects at the bucket root stay opaque
# to the public Lambda (THREAT_MODEL T9 / least privilege)
data "aws_iam_policy_document" "share_lambda_s3" {
  statement {
    sid       = "ReadSharedPrefixOnly"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.store.arn}/${var.share_prefix}*"]
  }
}

resource "aws_iam_role_policy" "share_lambda_s3" {
  name   = "read-shared-prefix"
  role   = aws_iam_role.share_lambda.id
  policy = data.aws_iam_policy_document.share_lambda_s3.json
}

# CloudWatch Logs for the Lambda (basic execution)
resource "aws_iam_role_policy_attachment" "share_lambda_logs" {
  role       = aws_iam_role.share_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "share_lambda" {
  name              = "/aws/lambda/${local.lambda_name}"
  retention_in_days = 30
  tags              = var.tags
}

resource "aws_lambda_function" "share" {
  function_name = local.lambda_name
  role          = aws_iam_role.share_lambda.arn
  runtime       = var.lambda_runtime
  handler       = "index.handler"
  memory_size   = var.lambda_memory_mb
  timeout       = var.lambda_timeout_seconds

  filename         = data.archive_file.share_lambda.output_path
  source_code_hash = data.archive_file.share_lambda.output_base64sha256

  reserved_concurrent_executions = var.lambda_reserved_concurrency

  environment {
    variables = {
      SHARE_BUCKET = aws_s3_bucket.store.id
      PRESIGN_TTL  = tostring(var.presign_ttl_seconds)
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.share_lambda_logs,
    aws_cloudwatch_log_group.share_lambda,
  ]

  tags = var.tags
}
