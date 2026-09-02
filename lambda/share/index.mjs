/**
 * Close the Gate — public share Lambda (zero-knowledge).
 *
 * Invoked via a Lambda Function URL. It serves two things:
 *   GET /s/<token>       → an HTML page that decrypts the file in the browser
 *   GET /shared/<token>  → the raw encrypted blob (verbatim S3 object)
 *
 * The decryption key lives ONLY in the URL fragment (`#...`), which browsers
 * never send to the server. This Lambda therefore never sees the key, the
 * file name, or the plaintext — it only ever handles ciphertext. It is
 * granted read-only access to the `shared/` prefix of the bucket and nothing
 * else (least privilege).
 *
 * Env:
 *   SHARE_BUCKET  — the S3 bucket holding shared/<token> objects (required)
 *   AWS_REGION    — provided automatically by the Lambda runtime
 */
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.SHARE_BUCKET;
// Presigned URL lifetime (seconds). Short-lived: just long enough to start
// the download/stream. The object itself is deleted by S3 lifecycle after 2d.
const PRESIGN_TTL = Number(process.env.PRESIGN_TTL || 300);
const SHARE_PREFIX = 'shared/';
const TOKEN_RE = /^[A-Za-z0-9_-]{1,64}$/;

const s3 = new S3Client({});

function html(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    body,
  };
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(obj),
  };
}

export const handler = async (event) => {
  // Lambda Function URL event format.
  const method = event?.requestContext?.http?.method || 'GET';
  const rawPath = event?.rawPath || '/';

  if (method !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  if (!BUCKET) {
    return json(500, { error: 'SHARE_BUCKET is not configured' });
  }

  // Route: /shared/<token> → redirect to a short-lived presigned S3 URL.
  //
  // The Lambda does NOT stream the bytes itself: a Lambda Function URL response
  // is capped at 6 MB (and base64 inflates it ~33%), which 502s on larger
  // files. Instead we hand the browser a presigned GET URL and 302 to it, so
  // S3 serves the (still-encrypted) blob directly — no size limit, and Range
  // requests work for video streaming. The key stays in the fragment; the blob
  // stays ciphertext; zero-knowledge is preserved.
  const sharedMatch = rawPath.match(/^\/shared\/([^/]+)$/);
  if (sharedMatch) {
    const token = decodeURIComponent(sharedMatch[1]);
    if (!TOKEN_RE.test(token)) return json(400, { error: 'Invalid token' });

    const Key = `${SHARE_PREFIX}${token}`;

    try {
      // Cheap existence check so we can still return a clean 404 for
      // missing/expired shares (a presigned URL to a missing key would only
      // fail later, on S3, with an opaque error).
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key }));

      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key }),
        { expiresIn: PRESIGN_TTL }
      );

      return {
        statusCode: 302,
        headers: { Location: url, 'Cache-Control': 'no-store' },
        body: '',
      };
    } catch (err) {
      const name = err?.name || '';
      const status = err?.$metadata?.httpStatusCode;
      const code = err?.Code || status || '';
      if (name === 'NoSuchKey' || name === 'NotFound' || status === 404) {
        return json(404, { error: 'Share not found or expired' });
      }
      // Surface the real S3 error so failures are diagnosable without digging
      // through CloudWatch (e.g. AccessDenied points at the IAM policy).
      console.error('Presign error:', name, code, err?.message, 'key=', Key, 'bucket=', BUCKET);
      return json(500, { error: 'Failed to load share', detail: name || String(err), code: String(code) });
    }
  }

  // Route: /s/<token> → serve the decryption page.
  const pageMatch = rawPath.match(/^\/s\/([^/]+)$/);
  if (pageMatch) {
    const token = decodeURIComponent(pageMatch[1]);
    if (!TOKEN_RE.test(token)) return html(400, '<h1>Invalid share link</h1>');
    return html(200, PAGE_HTML);
  }

  return html(404, '<h1>Not found</h1>');
};

/**
 * Client-side decryption page. Fetches /shared/<token>, reads the key from
 * location.hash, decrypts with WebCrypto AES-256-GCM, renders inline.
 *
 * Blob layout:        IV(12B) ‖ ciphertext ‖ tag(16B)
 * Decrypted payload:  headerLen(4B BE) ‖ headerJSON{name,contentType} ‖ fileBytes
 */
const PAGE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Shared file · Close the Gate</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f5f5f5; color: #1f1f1f; }
  header { padding: 14px 20px; background: #fff; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; gap: 10px; }
  header .name { font-weight: 600; }
  header .meta { color: #666; font-size: 13px; }
  main { padding: 20px; display: flex; justify-content: center; }
  .viewer { max-width: 900px; width: 100%; }
  .viewer img, .viewer video { max-width: 100%; border-radius: 8px; display: block; margin: 0 auto; }
  .viewer iframe { width: 100%; height: 80vh; border: none; border-radius: 8px; background: #fff; }
  pre { background: #fff; padding: 16px; border-radius: 8px; overflow: auto; white-space: pre-wrap; word-break: break-word; }
  .status { text-align: center; padding: 60px 20px; color: #666; }
  .error { color: #c0392b; }
  .actions { margin-top: 16px; text-align: center; }
  a.btn { display: inline-block; padding: 8px 16px; background: #1a73e8; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; }
</style>
</head>
<body>
<header>
  <span class="name" id="fileName">Shared file</span>
  <span class="meta" id="fileMeta"></span>
  <a id="downloadBtn" class="btn" style="margin-left:auto;display:none">Download</a>
</header>
<main><div class="viewer" id="viewer"><div class="status">Decrypting…</div></div></main>
<script>
(async () => {
  const viewer = document.getElementById('viewer');
  const nameEl = document.getElementById('fileName');
  const metaEl = document.getElementById('fileMeta');
  const fail = (msg) => { viewer.innerHTML = '<div class="status error">' + msg + '</div>'; };

  try {
    const token = location.pathname.split('/').pop();
    const keyB64Url = location.hash.slice(1);
    if (!keyB64Url) return fail('Missing decryption key in the link.');

    const b64 = keyB64Url.replace(/-/g, '+').replace(/_/g, '/');
    const rawKey = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    if (rawKey.length !== 32) return fail('Invalid key length.');

    const resp = await fetch('/shared/' + token);
    if (!resp.ok) return fail(resp.status === 404 ? 'This share does not exist or has expired.' : 'Failed to load the shared file.');
    const blob = new Uint8Array(await resp.arrayBuffer());
    if (blob.length < 12 + 16) return fail('Corrupted share.');

    const iv = blob.slice(0, 12);
    const cipherAndTag = blob.slice(12);

    const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);
    let plainBuf;
    try {
      plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherAndTag);
    } catch {
      return fail('Decryption failed — wrong key or tampered data.');
    }
    const plain = new Uint8Array(plainBuf);

    const view = new DataView(plain.buffer, plain.byteOffset, plain.byteLength);
    const headerLen = view.getUint32(0, false);
    const headerJson = new TextDecoder().decode(plain.slice(4, 4 + headerLen));
    const header = JSON.parse(headerJson);
    const fileBytes = plain.slice(4 + headerLen);

    const name = header.name || 'file';
    const contentType = header.contentType || 'application/octet-stream';
    nameEl.textContent = name;
    metaEl.textContent = '· ' + (fileBytes.length / 1024).toFixed(1) + ' KB';

    const fileBlob = new Blob([fileBytes], { type: contentType });
    const url = URL.createObjectURL(fileBlob);

    // Wire the header Download button for every file type.
    const dl = document.getElementById('downloadBtn');
    if (dl) {
      dl.href = url;
      dl.setAttribute('download', name);
      dl.style.display = 'inline-block';
    }

    if (contentType.startsWith('image/')) {
      viewer.innerHTML = '<img alt="" />';
      viewer.querySelector('img').src = url;
    } else if (contentType.startsWith('video/')) {
      viewer.innerHTML = '<video controls></video>';
      viewer.querySelector('video').src = url;
    } else if (contentType === 'application/pdf') {
      viewer.innerHTML = '<iframe></iframe>';
      viewer.querySelector('iframe').src = url;
    } else if (contentType.startsWith('text/') || contentType === 'application/json') {
      const text = new TextDecoder().decode(fileBytes);
      const pre = document.createElement('pre');
      pre.textContent = text;
      viewer.innerHTML = '';
      viewer.appendChild(pre);
    } else {
      viewer.innerHTML = '<div class="status">Preview not available for this file type. Use the Download button above.</div>';
    }
  } catch (e) {
    fail('Unexpected error: ' + (e && e.message ? e.message : String(e)));
  }
})();
</script>
</body>
</html>`;
