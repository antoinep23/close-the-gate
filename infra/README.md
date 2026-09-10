# Close the Gate AWS Infrastructure (Terraform)

A Terraform module that provisions the full AWS backend for Close the Gate, hardened per [`../THREAT_MODEL.md`](../THREAT_MODEL.md). The configuration is split into one file per concern (all in this folder, loaded together as a single module).

## What it creates

| Resource                       | Purpose                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **S3 bucket**                  | Ciphertext objects at the root (HMAC names) + `shared/<token>` blobs. Block Public Access, TLS-only bucket policy, SSE (AES256), versioning, lifecycle expiring `shared/`, CORS for the share front-end. |
| **DynamoDB table**             | File metadata, partition key `fileName` (String). On-demand billing, PITR, SSE.                           |
| **Share Lambda**               | Packaged from [`../lambda/share`](../lambda/share). Zero-knowledge share endpoint. Reserved concurrency to cap cost. |
| **Lambda execution role**      | Least privilege: `s3:GetObject` on `shared/*` **only** + CloudWatch Logs. Cannot read the real user objects. |
| **API Gateway HTTP API**       | Fronts the Lambda (v2 payload, the Lambda code runs unchanged). Replaces a public Lambda Function URL.   |
| **CloudFront distribution**    | Public entry point for share links; keeps the API/Lambda off the open internet as the advertised endpoint and gives you a place to attach WAF/rate-limiting. |
| **App IAM policy**             | Least-privilege bucket + table access for the principal running the app. Optionally auto-attached.        |

## File layout

| File             | Contents                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `versions.tf`    | Terraform + provider version constraints                             |
| `providers.tf`   | `aws` provider (+ `us_east_1` alias for a future CloudFront ACM cert) |
| `variables.tf`   | Input variables                                                      |
| `locals.tf`      | Data sources (account id, region) + computed locals                  |
| `s3.tf`          | Hardened S3 bucket and all its configuration                         |
| `dynamodb.tf`    | Metadata table                                                       |
| `lambda.tf`      | Share Lambda package, execution role, log group                      |
| `apigateway.tf`  | HTTP API, integration, route, stage, invoke permission               |
| `cloudfront.tf`  | CloudFront distribution                                              |
| `iam.tf`         | Least-privilege app policy (+ optional attachment)                   |
| `outputs.tf`     | Outputs mapped to the app's `.env`                                   |

Terraform loads every `.tf` in this folder as one module, so cross-file references resolve automatically. `terraform.tfvars.example` and this README are the only non-`.tf` extras.

## Prerequisites

- Terraform >= 1.5
- AWS credentials with permission to create the above (S3, DynamoDB, Lambda, API Gateway, CloudFront, IAM).
- The Lambda dependencies must be present before `apply`, the archive is built from the folder as-is (see [`../lambda/share/README.md`](../lambda/share/README.md)):

  ```bash
  cd ../lambda/share && npm install
  ```

  `@aws-sdk/s3-request-presigner` is not in the Lambda runtime, so it must be bundled. `npm install` puts it in `node_modules`, which the archive includes.

## Deploy

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # optional, edit as needed
terraform init
terraform plan
terraform apply
```

## Wire the app to the outputs

After `apply`, map the outputs to the root `.env`:

| Output                 | .env variable                    |
| ---------------------- | -------------------------------- |
| `s3_bucket_name`       | `S3_BUCKET`                      |
| `dynamodb_table_name`  | `DYNAMO_TABLE`                   |
| `lambda_function_name` | `LAMBDA_FUNCTION`                |
| `share_base_url`       | `LAMBDA_URL` (or `SHARE_BASE_URL`) |
| `region`               | `AWS_REGION`                     |

```bash
terraform output
```

Share links then look like `https://<cloudfront-domain>/s/<token>#<key>`, with the key only ever in the URL fragment; the endpoint stays zero-knowledge.

## Design notes

- **Why API Gateway + CloudFront instead of a Lambda Function URL?** To keep the Lambda from being directly public. The share Lambda parses the API Gateway v2 event shape (`event.requestContext.http.method`, `event.rawPath`), which the HTTP API produces natively, so no code change is needed. CloudFront is the advertised endpoint and the hook point for WAF / per-IP rate-limiting (N10).
- **CORS depends on the CloudFront domain.** The bucket CORS rule allows the CloudFront distribution origin so the share page's cross-origin `fetch` to the presigned S3 URL succeeds.
- **Least privilege.** The Lambda role can only `GetObject` under `shared/*`. The app policy is scoped to this one bucket and table, no wildcards.
- **Hardening applied:** Block Public Access, deny-non-TLS bucket policy, default SSE, versioning, and a short `shared/` lifecycle. Object Lock / KMS / WAF are left as opt-in follow-ups (see THREAT_MODEL "Recommended Hardening").

## Custom domain (optional)

To serve share links from your own domain, request an ACM certificate in **us-east-1** (the `aws.us_east_1` provider alias is already declared), add `aliases` + `viewer_certificate` to the CloudFront distribution, and point DNS at the distribution.
