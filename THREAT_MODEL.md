# Threat Model - Close the Gate

This document describes the security model of Close the Gate: what it protects against, what it explicitly does not, and the trust boundaries involved. It is intended for security reviewers evaluating whether the tool fits a given use case.

Close the Gate is a **zero-knowledge** encrypted storage layer over AWS S3. All cryptography happens client-side (on the machine running the tool). The cloud provider never receives plaintext or key material.

## Design Goals

1. The cloud provider (AWS S3, DynamoDB) must never be able to read file contents.
2. The user must retain sole ownership and control of the encryption keys.
3. Compromise of the cloud account alone must not expose plaintext.
4. File operations must be auditable in a tamper-evident way.

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
| N7  | Multi-user / access control                 | The tool is single-user. There is no per-user authorization, RBAC, or key sharing model.                                                                                                                                        |
| N8  | Denial of service                           | Nothing prevents an attacker with cloud credentials from deleting objects. Use S3 versioning / Object Lock at the infrastructure layer.                                                                                         |

## Recommended Hardening for Production Use

These are outside the current scope but represent the path to a production-grade deployment:

- **S3 bucket policy**: deny non-TLS requests, enable Block Public Access, enable default encryption as defense-in-depth.
- **S3 Object Lock (WORM)** for the audit log and/or critical objects to prevent deletion/tampering even with valid credentials.
- **Least-privilege IAM**: scope the tool's credentials to a single bucket and table, no wildcard actions.
- **External audit signing**: sign the log chain with AWS KMS or an HSM so the signing key is never on the same host as the logs.
- **Salted / encrypted name mapping** to eliminate the deterministic filename correlation (N2).
- **CloudTrail + GuardDuty** on the account for defense-in-depth monitoring of the S3/DynamoDB API surface.

## Summary

Close the Gate defends primarily against an **honest-but-curious or compromised cloud provider**. Its guarantees hold as long as the client machine and the encryption keys remain uncompromised. It is not a substitute for endpoint security, and its threat coverage should be extended with AWS infrastructure controls (Object Lock, IAM, KMS) for regulated production workloads.
