variable "region" {
  description = "AWS region for S3, DynamoDB, Lambda and the HTTP API."
  type        = string
  default     = "eu-west-1"
}

variable "name_prefix" {
  description = "Prefix applied to all resource names (bucket, table, lambda, roles)."
  type        = string
  default     = "close-the-gate"
}

variable "bucket_name" {
  description = "Exact S3 bucket name. If empty, one is derived from name_prefix + account id (globally unique)."
  type        = string
  default     = ""
}

variable "table_name" {
  description = "Exact DynamoDB table name. If empty, derived from name_prefix."
  type        = string
  default     = ""
}

variable "share_prefix" {
  description = "S3 key prefix that holds shared blobs. The Lambda can read ONLY this prefix. Must match SHARE_PREFIX in the code."
  type        = string
  default     = "shared/"
}

variable "share_expiration_days" {
  description = "Days after which objects under share_prefix expire (effective share-link lifetime)."
  type        = number
  default     = 2
}

variable "presign_ttl_seconds" {
  description = "Lifetime of the presigned S3 URLs the Lambda hands out."
  type        = number
  default     = 300
}

variable "lambda_runtime" {
  description = "Node.js runtime for the share Lambda."
  type        = string
  default     = "nodejs22.x"
}

variable "lambda_memory_mb" {
  description = "Memory for the share Lambda."
  type        = number
  default     = 256
}

variable "lambda_timeout_seconds" {
  description = "Timeout for the share Lambda."
  type        = number
  default     = 10
}

variable "lambda_reserved_concurrency" {
  description = "Reserved concurrent executions for the share Lambda. Caps cost/blast radius of the public endpoint (THREAT_MODEL N10). -1 = no reservation."
  type        = number
  default     = 10
}

variable "app_principal_arns" {
  description = "IAM principal ARNs (users/roles) that run the app and need bucket+table access. If empty, only the managed policy is created (attach it yourself)."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default = {
    Project   = "close-the-gate"
    ManagedBy = "terraform"
  }
}
