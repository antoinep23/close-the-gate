provider "aws" {
  region = var.region
}

# CloudFront-scoped provider. ACM certs consumed by CloudFront must live in
# us-east-1. Not used unless you attach a custom domain + ACM cert later.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
