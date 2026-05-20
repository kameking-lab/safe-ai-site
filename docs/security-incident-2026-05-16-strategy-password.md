# Security Incident Report — Hardcoded Credential in /strategy

**Date:** 2026-05-16  
**Severity:** High  
**Status:** Code-side fix merged (credential rotation required — see owner actions below)

---

## Summary

A hardcoded authentication credential was found in three server-side files and one documentation file. The most critical exposure was in `web/src/app/(main)/strategy/page.tsx`, where the credential was passed as a React prop to a `"use client"` component (`StrategyGate`), causing it to be serialized into the client-side JavaScript bundle and visible to anyone who inspects the page source.

---

## Exposure Paths

| Path | Severity | Mechanism |
|------|----------|-----------|
| `web/src/app/(main)/strategy/page.tsx` | **Critical** | Prop passed to `use client` component → client JS bundle |
| `web/src/app/admin/env-audit/page.tsx` | Medium | Hardcoded in server-side comparison (not in client bundle, but in server bundle and git history) |
| `web/src/app/admin/status/page.tsx` | Medium | Same as above |
| `web/src/app/admin/status/report.md` | Medium | Plain text documentation (git history, Vercel build logs) |

Additional exposure vectors (assume compromised):
- **Anthropic conversation logs** — credential appeared in AI assistant chat
- **Git history** — all above files committed with the plaintext value
- **Vercel build logs** — server bundle may include the string

---

## Code Changes (this PR)

| File | Change |
|------|--------|
| `web/src/components/strategy-gate.tsx` | Removed `password` prop entirely. Component now receives `hasKeyAttempt: boolean` only. Authentication logic moved to server. |
| `web/src/app/(main)/strategy/page.tsx` | Converted to `async` server component. Reads `process.env.STRATEGY_AUTH_PASSWORD` server-side. Renders content or gate form based on server-side check — credential never reaches client bundle. |
| `web/src/app/admin/env-audit/page.tsx` | Replaced hardcoded value with `process.env.STRATEGY_AUTH_PASSWORD ?? ""`. |
| `web/src/app/admin/status/page.tsx` | Same as above. |
| `web/src/app/admin/status/report.md` | Redacted credential value to `***` in two locations. |

**Behavior when `STRATEGY_AUTH_PASSWORD` env var is not set:**  
`VALID_KEY` / `expected` evaluates to `""`, so any `?key=...` attempt fails (authentication denied). Pages remain accessible but locked. No crash or server error.

---

## Owner Action Required (not done by Claude — irreversible operations)

### 1. Generate a new password
Create a new strong password. **Do not share or paste it in Claude chat or PR comments.**  
Example (run locally): `openssl rand -base64 24`

### 2. Set the Vercel environment variable
In Vercel Dashboard → Project → Settings → Environment Variables:
- **Name:** `STRATEGY_AUTH_PASSWORD`
- **Value:** (new password generated in step 1)
- **Environments:** Production, Preview (not needed for Development unless testing)
- **Sensitive:** ✅ ON (prevents value from appearing in build logs)

### 3. Trigger a Vercel redeploy
After setting the env var, trigger a new deployment so the server picks it up.  
The old credential is now invalidated by the code change (it no longer matches anything in code).

### 4. Purge credential from git history (recommended, owner decision)
The old credential value exists in git history for all modified files.  
Tools: [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) or `git filter-repo`.  
**This is a destructive, irreversible operation — force-push required. Coordinate with any collaborators before proceeding.**

Steps (example with BFG):
```bash
# 1. Clone a fresh mirror
git clone --mirror https://github.com/kameking-lab/safe-ai-site.git

# 2. Create a file with the credential to replace (one value per line)
echo "<REDACTED-旧鍵値>" > credentials.txt

# 3. Run BFG
java -jar bfg.jar --replace-text credentials.txt safe-ai-site.git

# 4. Clean up and force-push
cd safe-ai-site.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

---

## Prevention — Recommended CI Gate

Add secret scanning to CI to prevent future hardcoded credentials. GitHub offers built-in secret scanning for public repos; for private repos or custom patterns, consider:
- `git-secrets` (AWS Labs)
- `truffleHog` / `gitleaks` in a GitHub Actions pre-commit or PR check

Suggested pattern to block: any string matching `const (VALID_KEY|PASSWORD|SECRET|TOKEN) = "[^"]{6,}"` in `.tsx?` files.

---

## Timeline

| Time (JST) | Event |
|------------|-------|
| 2026-05-16 pre-audit | Credential introduced in `/strategy` page implementation |
| 2026-05-16 PR #182 | Audit doc noted `/strategy` hardcoded password as P2 finding |
| 2026-05-16 (this PR) | Code-side fix: credential removed from all source files, env var pattern applied |
| Pending | Owner: generate new credential, set Vercel env var, redeploy |
| Pending (optional) | Owner: git history purge with BFG |
