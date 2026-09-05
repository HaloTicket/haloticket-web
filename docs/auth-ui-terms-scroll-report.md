# Auth UI Terms and Scroll Report

Date: 2026-09-04

## Scope

- Added the HaloTicket terms and privacy notice to the login and registration forms.
- Linked the notice to the approved Ticketbox terms and privacy policy pages.
- Made the auth shell and panel usable when the form is taller than the viewport.
- Reduced auth spacing while preserving the existing token palette, concert background, API flow, and touch target sizing.

## Implementation

- Added `src/features/auth/TermsNotice.tsx` for the shared legal notice.
- Added compact auth heading/form/switch styles in `src/index.css`.
- Updated `AuthLayout` to use `100dvh`, flexible content sizing, and compact header/footer spacing.
- Added responsive panel scrolling and retained 44px minimum input/button dimensions.

## Verification

- `git diff --check`: pass.
- `npm run build`: pass.
- Existing bundle-size warning remains: the generated JavaScript bundle is over 500 kB.
