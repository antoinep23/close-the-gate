resource "aws_s3_bucket" "store" {
  bucket = local.bucket_name
  tags   = var.tags
}

resource "aws_s3_bucket_public_access_block" "store" {
  bucket                  = aws_s3_bucket.store.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "store" {
  bucket = aws_s3_bucket.store.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "store" {
  bucket = aws_s3_bucket.store.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# versioning: mitigates accidental/malicious deletion (THREAT_MODEL N8)
resource "aws_s3_bucket_versioning" "store" {
  bucket = aws_s3_bucket.store.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "store" {
  bucket = aws_s3_bucket.store.id

  # ephemeral share blobs under /shared
  rule {
    id     = "expire-shared"
    status = "Enabled"

    filter {
      prefix = var.share_prefix
    }

    expiration {
      days = var.share_expiration_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 1
    }
  }

  # housekeeping for the whole bucket
  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "store" {
  bucket = aws_s3_bucket.store.id

  cors_rule {
    allowed_origins = ["https://${aws_cloudfront_distribution.share.domain_name}"]
    allowed_methods = ["GET", "HEAD"]
    allowed_headers = ["*"]
    expose_headers  = ["Content-Length", "Content-Type", "Content-Range", "Accept-Ranges", "ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_policy" "store" {
  bucket = aws_s3_bucket.store.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.store.arn,
          "${aws_s3_bucket.store.arn}/*"
        ]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.store]
}
