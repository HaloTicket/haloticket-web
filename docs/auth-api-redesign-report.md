# Web Auth API Fix and Redesign

## Scope

Implemented on `feature/keycloak-auth` from `bb7287f`. Backend was not modified.

## API contract

The web client now uses explicit gateway paths in `src/features/auth/authApi.ts`:

- `POST /api/auth/login`
- `POST /api/auth/register/start`, `/verify`, `/resend`
- `POST /api/auth/password/forgot`, `/verify`, `/resend`, `/reset`

Registration and recovery keep only challenge metadata in React state. Password reset receives a backend-issued `resetToken`; the OTP itself is never forwarded through the reset route. Success screens are reachable only after the corresponding API promise resolves.

Error mapping handles HTTP 429 rate limits, 410 expiry, and 423 OTP lock responses. Cooldown and expiry are calculated from server timestamps, with client-side input gating as an additional UX guard.

## Visual implementation

The supplied concert image is stored at `public/assets/auth-stage.png`. `AuthLayout` uses it as a full-screen background with the canonical `#020817` overlay. Auth panels use the canonical white surface, blue primary border/focus treatment, restrained shadow, responsive sizing, and visible keyboard focus rings. Login, registration, forgot password, and reset password share the same panel, input, link, button, and semantic success/danger state tokens from `src/index.css`.

## Token alignment follow-up

- Replaced the previous cyan/teal auth palette with `--color-brand-primary`, `--color-brand-hover`, `--color-brand-accent`, `--color-canvas-dark`, surface, ink, success, and danger variables.
- Updated the shared light/dark app variables to the canonical HaloTicket values from `DESIGN.md`.
- Added token-backed semantic helpers for validation and recovery feedback; no auth screen uses hardcoded cyan, green, purple, or ad-hoc brand colors.
- Kept the image composition responsive: desktop centers the quiet right side of the supplied artwork, while mobile shifts toward the stage with a stronger dark overlay so the panel remains readable.

## Verification

- `npm run build`: passed.
- Focused auth/routes lint: passed after suppressing the existing route-module Fast Refresh rule for intentional route exports.
- Full `npm run lint`: expected to retain unrelated baseline errors outside auth/routes/layout; run output is recorded in the task transcript.
