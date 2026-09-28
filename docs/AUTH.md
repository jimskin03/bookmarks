# Authentication Guide — Bookmarks

## 1. CryptGreg Identity Integration

Bookmarks integrates directly with the unified CryptGreg Supabase project. Users do not need a separate account for Bookmarks.

### Supabase Configuration:
- **Project URL**: `https://vlnocfdiexkqcnfbjhqt.supabase.co` (or `VITE_SUPABASE_URL`)
- **Publishable Key**: `sb_publishable_ys0Cl98LLqAdNEiNY1f7Mg_lddIzr6F` (or `VITE_SUPABASE_PUBLISHABLE_KEY`)
- **Root Domain**: `cryptgregresearch.org`

## 2. Shared Cookie Strategy

In production on `bookmarks.cryptgregresearch.org`, authentication tokens are stored in a root-domain cookie:
```text
Set-Cookie: sb-access-token=...; Domain=cryptgregresearch.org; Path=/; Secure; SameSite=Lax
```
This ensures seamless single-sign-on across all CryptGreg services (Portfolio, Ledger, Bookmarks).

For local development (`localhost:5173`), the storage adapter automatically mirrors the session to `localStorage` where secure cross-subdomain cookies are unavailable.

## 3. Demo / Guest Vault Mode

For testing and offline evaluation without an active CryptGreg network session, users can click **"Launch Instant Demo Vault"** on the sign-in screen. This boots up a pre-seeded, fully functional local vault.
