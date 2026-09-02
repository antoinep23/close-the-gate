# Threat Model - Close the Gate

This document describes the security model of Close the Gate: what it protects against, what it explicitly does not, and the trust boundaries involved. It is intended for security reviewers evaluating whether the tool fits a given use case.

Close the Gate is a **zero-knowledge** encrypted storage layer over AWS S3. All cryptography happens client-side (on the machine running the tool). The cloud provider never receives plaintext or key material.

## Design Goals

1. The cloud provider (AWS S3, DynamoDB) must never be able to read file contents.
2. The user must retain sole ownership and control of the encryption keys.
3. Compromise of the cloud account alone must not expose plaintext.
4. File operations must be auditable in a tamper-evident way.
5. Sharing a file must not require handing plaintext or the user's own key to any server, including the share endpoint.

## System Overview

```
┌───────────────────────────────────────────┐        ┌──────────────────────────┐
│  Client (trusted)                         │        │  AWS Cloud (untrusted)   │
│                                           │        │                          │
│  ┌─────────┐   plaintext    ┌──────────┐  │        │   ┌──────────────────┐   │
│  │  File   │──────────────▶ │ Encrypt  │  │        │   │  S3 Bucket       │   │
│  └─────────┘                │ AES-256  │  │ cipher │   │ (ciphertext only,│   │
│                             │  -GCM    │──┼───────▶│   │   HMAC'd keys)   │   │
│  ┌─────────┐                └──────────┘  │        │   └──────────────────┘   │
│  │  Keys   │  (local, 0600 /              │        │   ┌──────────────────┐   │
│  │  *.pem  │   RAM in HS mode)            │        │   │  DynamoDB        │   │
│  └─────────┘                              │metadata│   │  (metadata only) │   │
│                                          ─┼───────▶│   └──────────────────┘   │
│  ┌──────────────┐                         │        │                          │
│  │ Audit log    │  (HMAC hash chain)      │        │                          │
│  │ /log         │                         │        │                          │
│  └──────────────┘                         │        │                          │
└───────────────────────────────────────────┘        └──────────────────────────┘
        ▲ trust boundary ─────────────────────────────────────────┘
```

## Trust Boundaries

| Boundary                           | Trusted side                                                         | Untrusted side                                 |
| ---------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| Client ↔ AWS                       | The machine running Close the Gate, local key files, local audit log | S3 objects, DynamoDB items, network in transit |
| Memory ↔ Disk (High Security mode) | Keys held in RAM while unlocked                                      | Keys never persisted in plaintext to disk      |

## Cryptographic Primitives

| Purpose             | Algorithm                                       | Notes                                                       |
| ------------------- | ----------------------------------------------- | ----------------------------------------------------------- |
| File encryption     | AES-256-GCM                                     | Random 12-byte IV per file; GCM auth tag provides integrity |
| Payload format      | `IV (12B) ‖ ciphertext ‖ GCM tag`               | Written as a single opaque S3 object                        |
| File name hashing   | HMAC-SHA256(key, fileName)                      | Deterministic; used as the S3 object key                    |
| Key backup          | AES-256-GCM + PBKDF2 (600k iterations, SHA-512) | Password-derived key encrypts the backup bundle             |
| Share link          | AES-256-GCM under a single-use ephemeral key    | Per-share re-encryption; key carried in the URL fragment    |
| Audit log integrity | HMAC-SHA256 hash chain                          | Each entry signs `content ‖ prevHash`                       |

## Threats Addressed

| #   | Threat                                           | Mitigation                                                                                                            |
| --- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| T1  | Cloud provider reads file contents               | Files are AES-256-GCM encrypted client-side; S3 only ever stores ciphertext                                           |
| T2  | Cloud provider or DB reads file names            | File names are replaced by an HMAC-SHA256 digest before upload; DynamoDB stores app metadata, not the raw object body |
| T3  | Ciphertext tampering in the bucket               | AES-GCM authentication tag causes decryption to fail on any modification                                              |
| T4  | AWS account/credential compromise (read)         | Attacker obtains only ciphertext and opaque names; no key material lives in AWS                                       |
| T5  | Stolen key backup file                           | Backup is encrypted with a PBKDF2-derived key (600k iterations); useless without the password                         |
| T6  | Keys left on disk on a shared/seized machine     | High Security mode keeps keys in RAM only, wipes them on inactivity timeout, and stores an encrypted backup at rest   |
| T7  | Silent modification or deletion of audit history | HMAC hash chain: altering or removing any entry breaks the chain and fails verification                               |
| T8  | Data interception in transit                     | AWS SDK uses TLS for all S3/DynamoDB calls                                                                            |
| T9  | Share endpoint reads shared file contents        | Shared files are re-encrypted under a single-use ephemeral key; the key lives only in the URL fragment (never sent to the server) and decryption happens in the recipient's browser. The public share Lambda only ever handles ciphertext and has read-only IAM access to the `shared/` prefix. |
| T10 | Sharing one file exposes other files             | Each share uses a fresh ephemeral key and an independent re-encrypted copy under a random opaque token; a leaked share link exposes only that one file, never the master key or other objects. |

## Sharing (Zero-Knowledge Share Links)

Sharing is opt-in and preserves the zero-knowledge model. When the user shares a file:

1. The local app decrypts the file in memory with the user's key, then re-encrypts it with a fresh **single-use ephemeral key** (AES-256-GCM). The user's own key is never shared and never leaves the trusted machine.
2. The re-encrypted blob is written to a dedicated `shared/<token>` prefix, where `<token>` is a 144-bit random opaque id (not the deterministic HMAC name).
3. The link is `https://<share-endpoint>/s/<token>#<ephemeral-key>`. The key travels in the URL **fragment** (`#...`), which browsers do not transmit to servers.
4. A public AWS Lambda (Function URL) serves a static page and redirects the browser to a short-lived presigned S3 URL for the ciphertext. Decryption happens in the recipient's browser.

**New trust boundary:** the share Lambda is an untrusted, public, unauthenticated component. It only ever handles ciphertext and has read-only IAM access scoped to the `shared/` prefix. It never receives the ephemeral key or the plaintext. The recipient's browser becomes a transient trusted party for the single shared file only.

The residual risks specific to this feature (link leakage, public endpoint abuse/cost) are tracked as N9 and N10 below.

## Threats NOT Addressed (Out of Scope)

Being explicit here is deliberate — these are known limitations, not oversights.

| #   | Threat                                      | Why out of scope / residual risk                                                                                                                                                                                                |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | Compromise of the client machine            | If the host is compromised while keys are unlocked, plaintext and keys are exposed. The client is the root of trust.                                                                                                            |
| N2  | Filename correlation via deterministic HMAC | Two files with the same name and key produce the same S3 key. An observer with bucket access can detect duplicate names and, over time, infer access patterns. A salted or fully-encrypted name mapping would remove this.      |
| N3  | Audit secret co-located with logs           | `.audit-secret` lives beside the log file. An attacker with local disk access can recompute the chain and forge a consistent history. True tamper-proofing needs an external signer (KMS/HSM) or WORM storage (S3 Object Lock). |
| N4  | Metadata leakage                            | Object sizes, upload timestamps, access frequency, and folder structure remain observable to anyone with cloud access.                                                                                                          |
| N5  | Traffic analysis                            | Upload/download timing and volume are visible at the network layer.                                                                                                                                                             |
| N6  | Password strength for backups               | Backup security depends entirely on password entropy. Weak passwords are brute-forceable offline.                                                                                                                               |
| N7  | Multi-user / access control                 | The tool is single-user. There is no per-user authorization or RBAC. Share links (below) provide capability-based sharing of individual files, but not identity-based access control.                                            |
| N9  | Share link leakage                          | Anyone with the full link (token + key fragment) can read the shared file — inherent to capability-based sharing. Treat links as secrets, keep a short lifecycle (S3 lifecycle on `shared/`), and revoke by deleting the shared object. Fragments are not sent to servers but may persist in the recipient's browser history or clipboard.                        |
| N10 | Public share endpoint abuse / cost          | The share Lambda Function URL is public and unauthenticated by design. Without controls it is exposed to enumeration, invocation floods, and S3 egress cost. Confidentiality still holds (144-bit tokens, ciphertext-only responses), but production should add reserved Lambda concurrency, a billing budget/alarm, and a CloudFront + WAF front with rate-limiting. |
| N8  | Denial of service                           | Nothing prevents an attacker with cloud credentials from deleting objects. Use S3 versioning / Object Lock at the infrastructure layer.                                                                                         |

## Recommended Hardening for Production Use

These are outside the current scope but represent the path to a production-grade deployment:

- **S3 bucket policy**: deny non-TLS requests, enable Block Public Access, enable default encryption as defense-in-depth.
- **S3 Object Lock (WORM)** for the audit log and/or critical objects to prevent deletion/tampering even with valid credentials.
- **Least-privilege IAM**: scope the tool's credentials to a single bucket and table, no wildcard actions.
- **External audit signing**: sign the log chain with AWS KMS or an HSM so the signing key is never on the same host as the logs.
- **Salted / encrypted name mapping** to eliminate the deterministic filename correlation (N2).
- **CloudTrail + GuardDuty** on the account for defense-in-depth monitoring of the S3/DynamoDB API surface.
- **Share endpoint controls** (if sharing is enabled): reserved Lambda concurrency to cap cost and blast radius, an AWS Budgets alarm on the account, and a CloudFront + WAF front with per-IP rate-limiting to blunt enumeration and invocation floods (N10). Keep a short S3 lifecycle on the `shared/` prefix so links expire quickly (N9).

## Summary

Close the Gate defends primarily against an **honest-but-curious or compromised cloud provider**. Its guarantees hold as long as the client machine and the encryption keys remain uncompromised. The optional share-link feature extends the zero-knowledge model to file sharing by re-encrypting each shared file under a single-use ephemeral key that never reaches the (public, untrusted) share endpoint; its residual risks are capability-based link leakage and public-endpoint abuse (N9, N10), to be mitigated with a short link lifecycle and endpoint rate-limiting/monitoring in production. It is not a substitute for endpoint security, and its threat coverage should be extended with AWS infrastructure controls (Object Lock, IAM, KMS) for regulated production workloads.
