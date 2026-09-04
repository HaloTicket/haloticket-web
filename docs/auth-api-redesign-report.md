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

The supplied concert image is stored at `public/assets/auth-stage.png`. `AuthLayout` uses it as a full-screen background with a navy 70% overlay. Auth panels use translucent white, cyan borders, a restrained shadow, responsive sizing, and visible focus rings. The treatment applies consistently to login, registration, forgot password, and reset password.

## Verification

- `npm run build`: passed.
- Focused auth/routes lint: passed after suppressing the existing route-module Fast Refresh rule for intentional route exports.
- Full `npm run lint`: expected to retain unrelated baseline errors outside auth/routes/layout; run output is recorded in the task transcript.
