data "aws_iam_policy_document" "app" {
  statement {
    sid = "S3Objects"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.store.arn,
      "${aws_s3_bucket.store.arn}/*",
    ]
  }

  statement {
    sid = "DynamoMetadata"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Scan",
      "dynamodb:Query",
    ]
    resources = [aws_dynamodb_table.files.arn]
  }
}

resource "aws_iam_policy" "app" {
  name        = "${var.name_prefix}-app"
  description = "Least-privilege access for the Close the Gate app (bucket + table)."
  policy      = data.aws_iam_policy_document.app.json
  tags        = var.tags
}

# Optionally attach the policy to the principals that run the app.
resource "aws_iam_policy_attachment" "app" {
  count      = length(var.app_principal_arns) > 0 ? 1 : 0
  name       = "${var.name_prefix}-app-attach"
  policy_arn = aws_iam_policy.app.arn

  # Split ARNs by type so the right attachment argument is used.
  users = [
    for arn in var.app_principal_arns : element(split("/", arn), length(split("/", arn)) - 1)
    if length(regexall(":user/", arn)) > 0
  ]
  roles = [
    for arn in var.app_principal_arns : element(split("/", arn), length(split("/", arn)) - 1)
    if length(regexall(":role/", arn)) > 0
  ]
}
