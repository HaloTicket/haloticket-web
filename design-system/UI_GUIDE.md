# HaloTicket UI Guide

This guide translates `DESIGN.md` into day-to-day UI rules for HaloTicket. Use it before creating or refactoring screens in `haloticket-web`.

HaloTicket is one shared React 19 + TypeScript + Vite app. Client, resale, customer account, and admin UI must all follow the existing `src` structure. Do not create separate `client/` or `admin/` apps.

## What awesome-design-md Is For

The `awesome-design-md` skill is used to create Google Stitch-style `DESIGN.md` files: a structured design specification that tells agents and developers how a product should look and behave.

For HaloTicket, it defines:

- The visual mood: energetic event discovery, calm checkout, dense admin operations.
- The token system: colors, typography, spacing, radius, shadows, and state roles.
- Component rules: buttons, event cards, forms, badges, navigation, tables, modals.
- Layout rules: grids, containers, admin shells, mobile collapse behavior.
- Guardrails: what to do, what to avoid, and how future UI should be prompted.

Primary source of truth:

- `design-system/DESIGN.md` for design intent and UI rules.
- `design-system/tokens.css` for runtime CSS variables.
- `src/index.css` for importing tokens into the app.

## UI Personality

HaloTicket should feel like a polished event commerce platform:

- Public pages are image-led, lively, and fast to scan.
- Ticket selection and checkout are calm, explicit, and trust-focused.
- Customer account pages are clear and reassuring.
- Admin pages are compact, quiet, and optimized for repeated work.

Use event artwork for emotion. Let the interface provide structure.

## Color Rules

Use token-backed colors instead of hardcoded hex values in components.

Main roles:

- `--color-brand-primary`: primary CTA, active nav, selected filters, progress.
- `--color-brand-accent`: discovery accents, gradients, focus details.
- `--color-brand-rose`: hot events, resale, urgency, destructive emphasis.
- `--bg-page`: app background.
- `--bg-card`: cards and panels.
- `--text-main`: headings and primary content.
- `--text-muted`: metadata and secondary copy.
- `--border-color`: default borders.

Use rose carefully. It should mean urgency, resale, destructive action, or high-attention status.

## Typography Rules

Use `Plus Jakarta Sans` everywhere.

Suggested usage:

- Page title: `text-2xl` or `text-3xl`, bold.
- Section title: `text-xl` or `text-2xl`, bold.
- Card title: `text-sm` to `text-base`, bold, max 2 lines.
- Body: `text-sm` or `text-base`.
- Metadata: `text-xs` or `text-sm`, muted.
- Price: bold or extra-bold, primary or rose depending on context.

Do not use viewport-scaled type. Keep letter spacing at normal unless a tiny label truly needs uppercase treatment.

## Layout Rules

Public layout:

- Use a centered container with max width around `1200px`.
- Use full-width page sections, not floating section cards.
- Event grids collapse by reducing columns, not by shrinking text too far.
- Keep image ratios stable: `16 / 9` for standard cards, `3 / 4` for poster cards.

Checkout layout:

- Mobile: single-column flow.
- Desktop: content + summary columns.
- Totals, vouchers, fees, and final CTA must stay visually obvious.

Admin layout:

- Future admin features live under `src/features/admin/*`.
- Use admin layout components under `src/layouts`, still inside the same Vite app.
- Prefer tables, filter bars, compact panels, and status chips.
- Use borders and row hover states more than shadows.

## Component Rules

### Buttons

Use `src/components/common/Button.tsx` first.

- Primary: booking, checkout, save, publish.
- Secondary: alternate action.
- Outline: filters, admin toolbars, secondary navigation.
- Ghost: header actions, table actions, icon actions.
- Gradient: public discovery moments only.
- Destructive: cancel, delete, fail-state confirmation.

### Event Cards

Event cards must include:

- Stable image ratio.
- Title clamped to 2 lines.
- Date and location metadata.
- Price or starting price.
- Badges for hot, resale, or category when relevant.

Hover can lift and zoom image slightly, but card size must not change.

### Forms

Forms should use:

- Clear labels.
- Tokenized focus ring.
- Visible invalid state.
- Helpful error copy.
- Disabled state that is visually distinct.

Do not hide required payment, voucher, or ticket constraints in placeholder text.

### Badges

Use status colors consistently:

- Success: paid, active, published, completed.
- Warning: pending, low stock, review needed.
- Danger: failed, cancelled, expired.
- Info: draft, processing, note.
- Rose: hot or resale emphasis.

### Tables

Admin tables should have:

- Compact 14px body text.
- Sticky headers for long lists where useful.
- Row hover state.
- Status badges.
- Short actions or icon buttons with accessible names.

## Folder Rules

Use the existing structure:

```txt
src/components/common       shared primitives
src/features/<feature>      route-level feature screens
src/features/<feature>/components
src/layouts                 public and future admin shells
src/routes                  route definitions and path helpers
src/services                API clients and service utilities
src/types                   shared TypeScript types
src/utils                   formatting and pure helpers
```

Future admin example:

```txt
src/features/admin/events/EventManagement.tsx
src/features/admin/events/components/EventTable.tsx
src/features/admin/orders/OrderManagement.tsx
src/layouts/AdminLayout.tsx
```

Do not use:

```txt
haloticket-web/client
haloticket-web/admin
```

## Responsive Rules

- Mobile touch targets should be at least `44px`.
- Avoid hover-only information.
- Filters become drawers/modals on mobile.
- Tables may scroll horizontally on mobile.
- Cards should not resize when content loads or badges appear.
- Long Vietnamese event names must wrap or clamp cleanly.

## Quick Checklist

Before finishing UI work:

- Read `design-system/DESIGN.md`.
- Use tokens from `design-system/tokens.css`.
- Follow the current `src` folder structure.
- Reuse `src/components/common` before creating new primitives.
- Check light and dark mode.
- Check mobile and desktop layouts.
- Run `npm run build` for UI changes that affect the app.
