# Close the Gate — Share Lambda

Public, zero-knowledge endpoint for shared files. It serves:

- `GET /s/<token>` → an HTML page that decrypts the file **in the recipient's browser**
- `GET /shared/<token>` → a **302 redirect** to a short-lived presigned S3 URL for the encrypted blob

The decryption key lives only in the URL fragment (`#...`), which browsers never
transmit. This Lambda therefore never sees the key, the file name, or the
plaintext — it only ever handles ciphertext (and, for the blob, never even that:
it just signs a URL and redirects).

## Why a presigned redirect (not streaming through the Lambda)

A Lambda Function URL response body is capped at **6 MB**, and base64 encoding
inflates binary ~33%, so returning the blob through the Lambda 502s on anything
larger than ~4.5 MB. Instead, `/shared/<token>` returns a 302 to a presigned S3
GET URL, so **S3 serves the blob directly** — no size limit, and byte-range
requests work (video streaming). Zero-knowledge is preserved: the blob stays
encrypted, the key stays in the fragment, decryption stays in the browser.

## Runtime

Node.js **18.x or 20.x+**. `@aws-sdk/client-s3` is in the runtime, but
`@aws-sdk/s3-request-presigner` is **not**, so it must be bundled (it's in this
folder's `node_modules` and included in the deploy zip). Invoked via a **Lambda
Function URL** (`AuthType: NONE`).

## Environment

| Variable       | Purpose                                                     |
| -------------- | ----------------------------------------------------------- |
| `SHARE_BUCKET` | The S3 bucket that holds `shared/<token>` objects.          |
| `PRESIGN_TTL`  | Presigned URL lifetime in seconds (optional, default 300).  |
| `AWS_REGION`   | Provided automatically by the Lambda runtime.               |

## Least-privilege IAM

The execution role needs read access to the `shared/` prefix ONLY. `GetObject`
covers both the existence check (HEAD) and the presigned URL:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::<YOUR_BUCKET>/shared/*"
    }
  ]
}
```

Do **not** grant access to the rest of the bucket — the real user objects live
under HMAC names at the bucket root, and the Lambda must never be able to read
them.

## S3 CORS (required)

The page does `fetch('/shared/<token>')`, follows the 302 to S3, and reads the
response cross-origin. S3 must return CORS headers for the Function URL origin.
Apply `s3-cors.json` (scoped to the Function URL origin, GET/HEAD, exposing the
Range/streaming headers):

```bash
aws s3api put-bucket-cors --bucket "$S3_BUCKET" \
  --cors-configuration file://s3-cors.json
```

## Object lifecycle

Shared blobs are ephemeral. An S3 lifecycle rule on the `shared/` prefix expires
them (e.g. 2 days), which is the effective link expiration.

## Deploy

```bash
# from lambda/share/
npm install                          # ensures s3-request-presigner is present
zip -r function.zip index.mjs package.json node_modules
aws lambda update-function-code \
  --function-name "$LAMBDA_FUNCTION" \
  --zip-file fileb://function.zip

# config (once): env + a bit of headroom
aws lambda update-function-configuration \
  --function-name "$LAMBDA_FUNCTION" \
  --timeout 10 --memory-size 256 \
  --environment "Variables={SHARE_BUCKET=$S3_BUCKET}"
```

The app server (`web/server`) points share links at `LAMBDA_URL` from the root
`.env`, so links look like `<LAMBDA_URL>/s/<token>#<key>`.
