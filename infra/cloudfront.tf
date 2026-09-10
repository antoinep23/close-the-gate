locals {
  # api_endpoint looks like https://<id>.execute-api.<region>.amazonaws.com
  api_domain = replace(aws_apigatewayv2_api.share.api_endpoint, "https://", "")
}

# Don't cache share responses: the page is served with no-store and the blob
# route is a 302 to a short-lived presigned URL.
resource "aws_cloudfront_distribution" "share" {
  enabled         = true
  comment         = "${var.name_prefix} share endpoint"
  is_ipv6_enabled = true

  origin {
    domain_name = local.api_domain
    origin_id   = "share-http-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "share-http-api"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]

    # AWS managed policies: CachingDisabled + AllViewerExceptHostHeader.
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # Managed-AllViewerExceptHostHeader
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  price_class = "PriceClass_100"

  tags = var.tags
}
