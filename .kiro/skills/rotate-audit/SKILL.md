---
name: rotate-audit
description: Audit key rotation status and identify files with outdated encryption keys. Use when checking security posture or verifying rotation compliance.
---

# Key Rotation Audit

## Purpose
Verify that all files comply with the configured rotation policy and identify any stale keys.

## Steps

### 1. Check Rotation Configuration
Read `config.json` and report:
- Is auto-rotation enabled?
- What is the interval (days)?
- What is the target key (specific or auto-generate)?

### 2. List All Keys
Enumerate available keys (from disk or RAM store depending on mode):
- Report total count
- Identify any `auto-rotation-*` keys and their creation dates
- Flag keys that are not used by any file

### 3. Scan Files
For each file in DynamoDB, check:
- `uploadDate` vs current date → age in days
- Compare age against `autoRotation.intervalDays`
- Flag files exceeding the threshold

### 4. Report

Generate a summary:
```
Rotation Policy: enabled, 90 days, auto-generate
Total Keys: 5
Total Files: 12
Files needing rotation: 3
  - document.pdf (key: old-key.pem, age: 120 days)
  - backup.zip (key: old-key.pem, age: 95 days)
  - report.xlsx (key: another-key.pem, age: 91 days)
Unused keys: 1
  - deprecated-key.pem (no files reference this key)
```

### 5. Recommendations
- If files need rotation: suggest running emergency rotation or enabling auto-rotation
- If unused keys exist: suggest deletion (with backup first)
- If high-security mode is off: remind about the security benefits
