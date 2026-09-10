resource "aws_dynamodb_table" "files" {
  name         = local.table_name
  billing_mode = "PAY_PER_REQUEST" # on-demand; matches the app's scan-heavy, low-volume pattern
  hash_key     = "fileName"

  attribute {
    name = "fileName"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = var.tags
}
