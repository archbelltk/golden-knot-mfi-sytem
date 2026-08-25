# Forgot Password — How It Currently Works

Status as of 2026-08-25. Describes the actual implemented behavior, not a design proposal.

## Summary

A real, working token-based password reset flow exists end to end — but **no email is actually sent**. This app has no SMTP/email infrastructure configured, so outside production the reset link is returned directly in the API response (and logged server-side) instead of being emailed. See [Delivery](#delivery--the-part-thats-stubbed) below for what that means in practice.

## Flow

1. User clicks **Forgot password?** on the login page (`/login`) → lands on `/forgot-password`.
2. They enter their email and submit. The frontend posts to `/api/auth/forgot-password` (a Next.js route handler with no auth check), which forwards to the NestJS API's `POST /auth/forgot-password`.
3. The API always returns the same generic message, regardless of whether the email exists:
   > "If an account exists for that email, a password reset link has been generated."
   If the email *does* match an active user, it additionally generates a reset link — see below.
4. The user opens the reset link, landing on `/reset-password?token=<token>`. They enter a new password (with confirmation), which posts to `/api/auth/reset-password` → NestJS `POST /auth/reset-password`.
5. On success, the password is updated immediately and the token is invalidated. The old password stops working right away.

## Token mechanics (`apps/api/src/auth/auth.service.ts`)

- **Generation**: `crypto.randomBytes(32).toString('hex')` — a 256-bit random token, sent to the user.
- **Storage**: only a SHA-256 hash of the token (`resetTokenHash`) is stored on the `User` row, never the raw token — mirrors how KYC national IDs are handled elsewhere in this codebase (hash for lookup, never store/query the plaintext).
- **Expiry**: `resetTokenExpiresAt` set to 1 hour from generation. Reset attempts after that are rejected with "This reset link is invalid or has expired."
- **Single-use**: on successful reset, `resetTokenHash`/`resetTokenExpiresAt` are cleared, so the same link can't be replayed.
- **No account-existence leak**: the `forgot-password` response shape and message are identical whether or not the email matches a user — only the *dev-mode* `resetLink` field (see below) differs, which does not exist in production.
- **Audit trail**: a successful reset writes an `AuditLog` entry (`entityType: "User"`, `action: "STATUS_CHANGE"`), attributed to the user themselves as actor (self-service action).

Schema: added in migration `20260825062709_add_password_reset_token` — `User.resetTokenHash String?` and `User.resetTokenExpiresAt DateTime?`.

## Delivery — the part that's stubbed

There is no email service wired into this project (no nodemailer/SendGrid/etc., and the local Supabase stack's Mailpit catcher isn't exposed to the API for SMTP use). Instead:

- The API **always logs** the reset link server-side: `console.log(`[password reset] ${user.email}: ${resetLink}`)`.
- The API **also returns** `resetLink` in the JSON response, but **only when `NODE_ENV !== 'production'`**. In a real production deployment this field is simply absent — the generic message is all that's returned, matching what a real "check your email" flow would show.
- The frontend's `/forgot-password` page displays `resetLink` directly on the confirmation screen (labeled "Local dev build — no email is sent, so here's the link directly") whenever the API includes it.

**In other words: this works fully end-to-end in local/dev, but shipping it to production as-is means users would see the generic confirmation message and then never receive anything** — the link would only exist in the server logs, not reach them. Wiring up a real email/SMS provider is required before this is production-ready; see [Not implemented](#not-implemented--follow-up-work).

## Endpoints

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/auth/forgot-password` | Public | `{ email }` | Always 201, generic message; `resetLink` included only outside production and only if the email matched an active user |
| POST | `/auth/reset-password` | Public | `{ token, password }` | 201 on success; 400 if token invalid/expired/already used |

Both are exempted from the Next.js auth-redirect middleware (`apps/web/src/proxy.ts`), alongside `/login`, so they're reachable while signed out.

## Frontend pages

- `apps/web/src/app/(auth)/forgot-password/page.tsx` — email form → confirmation (+ dev-mode link).
- `apps/web/src/app/(auth)/reset-password/page.tsx` — reads `?token=` from the URL, new-password + confirm form, client-side "passwords match" validation via zod `.refine()` before submit.
- `apps/web/src/app/(auth)/login/page.tsx` — "Forgot password?" link next to the password field.

## Not implemented / follow-up work

- **Real email delivery** — the whole reason this is dev-only right now. Needs an actual transport (SMTP via Mailpit for local dev, a real provider for production) before this can ship.
- **Rate limiting** — `forgot-password` can currently be called repeatedly for the same or different emails with no throttling; each call generates a fresh token invalidating the previous one, but there's nothing stopping abuse/enumeration-by-timing.
- **"Check your email" UX regardless of dev/prod** — currently the frontend conditionally shows a dev link; once email delivery exists, the confirmation screen should read the same in both environments (link never rendered client-side in a shipped build).
- **Self-service only** — there's no admin-initiated "send this user a reset link" action from the Users page; an admin can only deactivate/reactivate/edit a user today.

## Testing it locally

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.goldenknot.local"}'
# → { "message": "...", "resetLink": "http://localhost:3001/reset-password?token=..." }

curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<token from above>","password":"NewPass123!"}'
```

Or through the UI: `/login` → **Forgot password?** → enter a demo account email → the dev-mode link appears directly on the page → click it → set a new password.
