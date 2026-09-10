resource "aws_apigatewayv2_api" "share" {
  name          = "${var.name_prefix}-share-api"
  protocol_type = "HTTP"
  tags          = var.tags
}

resource "aws_apigatewayv2_integration" "share" {
  api_id                 = aws_apigatewayv2_api.share.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.share.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Catch-all route. The Lambda does its own routing on rawPath
# (/s/<token>, /shared/<token>).
resource "aws_apigatewayv2_route" "share_default" {
  api_id    = aws_apigatewayv2_api.share.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.share.id}"
}

resource "aws_apigatewayv2_stage" "share" {
  api_id      = aws_apigatewayv2_api.share.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 20
    throttling_rate_limit  = 10
  }

  tags = var.tags
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.share.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.share.execution_arn}/*/*"
}
