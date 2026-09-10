data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id   = data.aws_caller_identity.current.account_id
  bucket_name  = var.bucket_name != "" ? var.bucket_name : "${var.name_prefix}-${local.account_id}"
  table_name   = var.table_name != "" ? var.table_name : "${var.name_prefix}-files"
  lambda_name  = "${var.name_prefix}-share"
  share_origin = "shared" # prefix without trailing slash, for readability
}
