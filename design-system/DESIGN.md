# HaloTicket Design System

HaloTicket is a shared React 19 + TypeScript + Vite web app for public event discovery, ticket purchase, resale flows, customer account pages, and admin operations. This file is the visual source of truth for UI agents and implementation work in `haloticket-web`.

This system blends three reference moods from `awesome-design-md`: Airbnb/Pinterest-style image-led discovery for events, Stripe-style trust and polish for checkout, and Linear-style density for admin workflows. It must not copy the NexaTech `client/` + `admin/` split; HaloTicket uses one Vite app and the folder structure already prepared in `src`.

## 1. Visual Theme & Atmosphere

HaloTicket should feel energetic, commercial, and reliable. Public pages need the excitement of event posters, artist images, badges, and fast browsing. Checkout, ticket ownership, resale, and admin surfaces need calm hierarchy, legible forms, and predictable controls.

The default atmosphere is a soft off-white canvas with crisp white surfaces and a vivid indigo/cyan/rose brand system. Event artwork carries emotion; the interface stays organized around search, cards, ticket selection, payment confidence, and operational clarity.

Density rules:

- Public discovery: medium density, image-led, strong card rhythm, visible metadata.
- Checkout and ticket flows: medium-low density, calm panels, clear totals and states.
- Admin workflows: high density, table-first, compact controls, minimal decoration.

Surface philosophy:

- Use full-width sections and constrained inner containers for public pages.
- Use panels, tables, drawers, and dialogs for admin.
- Use cards for repeated event/ticket/status items only.
- Do not nest decorative cards inside other cards.

## 2. Color Palette & Functional Roles

| Token | Hex | Role / Usage |
|---|---:|---|
| `{colors.canvas}` | `#f4f4f5` | Main light page background, app base canvas |
| `{colors.canvas-dark}` | `#27272a` | Main dark page background |
| `{colors.surface-1}` | `#ffffff` | Cards, panels, modals, checkout blocks |
| `{colors.surface-2}` | `#fafafa` | Hover surfaces, subtle nested rows, filter backgrounds |
| `{colors.surface-3}` | `#e4e4e7` | Subnavs, dividers, inactive controls |
| `{colors.ink}` | `#18181b` | Primary text, headings, table values |
| `{colors.ink-muted}` | `#71717a` | Metadata, helper copy, timestamps, secondary table columns |
| `{colors.ink-subtle}` | `#a1a1aa` | Placeholders, disabled text, quiet captions |
| `{colors.border}` | `#e4e4e7` | Default borders and separators |
| `{colors.border-strong}` | `#d4d4d8` | Inputs, selected cards, admin panel boundaries |
| `{colors.primary}` | `#4f46e5` | Main CTA, active navigation, selected filters, focus rings |
| `{colors.primary-hover}` | `#4338ca` | Primary button hover, pressed links |
| `{colors.accent}` | `#06b6d4` | Discovery accents, gradient partner, search/focus highlights |
| `{colors.urgent}` | `#f43f5e` | HOT events, resale emphasis, destructive highlights |
| `{colors.success}` | `#16a34a` | Paid, active, completed, published |
| `{colors.warning}` | `#f59e0b` | Pending, low stock, review needed |
| `{colors.danger}` | `#dc2626` | Failed, cancelled, expired, destructive actions |
| `{colors.info}` | `#0891b2` | Processing, informational notes, neutral resale guidance |

Functional usage:

- Use indigo for trust and progression: book, continue, save, publish.
- Use cyan for discovery and affordance: search focus, gradient highlights, active carousel details.
- Use rose only for urgency: hot labels, resale indicators, cancellation, destructive states.
- Use neutral zinc surfaces for admin screens so data stays readable.
- Never use raw hex values in React components when a token or token-backed utility exists.

Dark mode:

- Preserve token roles; do not invent separate component color rules.
- Surfaces shift to `#18181b` / `#27272a`.
- Primary shifts brighter to `#818cf8`, accent to `#22d3ee`, urgent to `#fb7185`.

## 3. Typography Rules

Primary font: `Plus Jakarta Sans`, loaded once from `src/index.css`.

Fallback stack:

```css
"Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Typography table:

| Style | Size | Weight | Line Height | Usage |
|---|---:|---:|---:|---|
| Display-XL | `48px` | `800` | `56px` | Rare public hero headings only |
| Display-LG | `36px` | `800` | `44px` | Home/search page top sections |
| Headline-MD | `24px` | `700` | `32px` | Page titles, section headings |
| Title-LG | `18px` | `700` | `24px` | Event card titles, panel headings |
| Body-MD | `15px` | `400` | `22px` | Descriptions, checkout copy, form help |
| Body-SM | `14px` | `400` | `20px` | Dense admin cells, metadata blocks |
| Price-LG | `20px` | `800` | `24px` | Ticket price and checkout totals |
| Label-SM | `12px` | `600` | `16px` | Badges, tags, table labels |

Rules:

- Letter spacing is `0em` by default.
- Do not scale font size with viewport width.
- Event titles inside cards clamp to 2 lines.
- Admin table text should prefer `14px` with strong hierarchy via weight, not oversized headings.
- Use uppercase only for short badges, never long Vietnamese labels.

## 4. Component Stylings

### Buttons

Primary:

- Background `{colors.primary}`, foreground white.
- Hover `{colors.primary-hover}`.
- Radius `12px` to `16px` depending on density.
- Minimum height `40px`; mobile touch target should reach `44px`.
- Use for booking, checkout continuation, save, publish, and confirmed admin actions.

Secondary:

- Background `{colors.surface-2}` or white, border `{colors.border}`.
- Use for alternate actions and non-critical flows.

Outline:

- Transparent or white background.
- Border `{colors.border-strong}`.
- Text `{colors.primary}` for actionable filters and admin toolbars.

Ghost:

- No border by default.
- Hover uses `{colors.surface-2}`.
- Use for header, icon, table row, and low-emphasis actions.

Destructive:

- Background `{colors.danger}` with white text.
- Use only for irreversible or cancellation actions.

Gradient:

- `linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)`.
- Use selectively on public discovery surfaces, not admin defaults.

### Containers & Cards

Default card:

- Background `{colors.surface-1}`.
- Border `1px solid {colors.border}`.
- Radius `16px`.
- Shadow `0 1px 2px rgb(24 24 27 / 0.05)`.

Event card:

- Image ratio: `16 / 9` standard, `3 / 4` poster.
- Radius `16px` to `24px`.
- Title max 2 lines.
- Footer metadata uses muted text and icons.
- Hover may lift `translateY(-2px)` and scale image to `1.05`; card dimensions must not change.

Admin panel:

- Background `{colors.surface-1}`.
- Radius `12px`.
- Border-first depth, minimal shadow.
- Keep action groups compact and aligned.

Modal / drawer:

- Background `{colors.surface-1}`.
- Overlay `rgb(9 9 11 / 0.52)`.
- Radius `16px` desktop, top-radius only for mobile bottom sheets.

### Inputs & Forms

Default:

- Height `40px` desktop, `44px` mobile.
- Border `{colors.border-strong}`.
- Radius `12px`.
- Background `{colors.surface-1}`.
- Placeholder `{colors.ink-muted}`.

Focus:

- Border `{colors.primary}`.
- Ring `2px` with 2px offset.

Error:

- Border `{colors.danger}`.
- Helper text uses `{colors.danger}` and clear text, not color alone.

Disabled:

- Background `{colors.surface-3}`.
- Text `{colors.ink-subtle}`.
- Cursor disabled and opacity reduced.

### Navigation

Public header:

- Sticky translucent surface using `--bg-header`.
- Backdrop blur `14px`.
- Search and account/ticket actions remain visible at desktop widths.

Admin navigation:

- Lives inside the same Vite app.
- Future admin routes use `src/features/admin/*` and a layout under `src/layouts`.
- Sidebar width token: `272px`, collapsed width token: `76px`.

### Badges, Pills & Status Chips

Badge radius is always pill-shaped.

- Hot: rose/danger background, white text.
- Resale: rose or info token depending on urgency.
- Category: neutral dark or soft indigo.
- Success: paid, active, published, completed.
- Warning: pending, low stock, review needed.
- Danger: cancelled, failed, expired.
- Info: processing, draft, note, neutral system state.

### Tables

Admin tables:

- Header background `{colors.surface-2}`.
- Row hover `{colors.surface-2}`.
- Border `{colors.border}`.
- Sticky headers allowed for long management views.
- Actions should be icon buttons or short labels with accessible names.

## 5. Layout Principles

Spacing scale:

| Token | Value | Usage |
|---|---:|---|
| `{spacing.1}` | `4px` | Micro gaps, icon/text space |
| `{spacing.2}` | `8px` | Compact stacks, badge padding |
| `{spacing.3}` | `12px` | Card inner gaps, form rows |
| `{spacing.4}` | `16px` | Mobile gutters, common padding |
| `{spacing.6}` | `24px` | Panel padding, checkout groups |
| `{spacing.8}` | `32px` | Page blocks, section internals |
| `{spacing.10}` | `40px` | Major public section margin |
| `{spacing.16}` | `64px` | Large page separation |

Widths:

- Public container max: `1200px`.
- Admin app shell max reference: `1440px`.
- Mobile gutter: `16px`.
- Header height: `72px`.
- Admin topbar height: `64px`.

Grid rules:

- Public event grids: 1 column mobile, 2 columns small, 3 columns tablet, 4 columns desktop when card content remains readable.
- Poster grids: preserve image aspect ratio over density.
- Checkout: single column mobile, two-column summary/content layout on desktop.
- Admin: sidebar + content shell; tables and filters align to a compact 12-column or flex grid.

Repository layout rules:

- Shared primitives: `src/components/common`.
- Feature UI: `src/features/<feature>/components`.
- Page-level feature screens: `src/features/<feature>/<Screen>.tsx`.
- API calls: `src/services/axiosClient.ts`.
- Routes: `src/routes`.
- Theme: `src/context/ThemeContext.tsx` and `src/hooks/useTheme.ts`.
- Future admin code: `src/features/admin/*`, not `admin/` or `client/` top-level apps.

## 6. Depth & Elevation

| Level | Surface | Usage |
|---|---|---|
| Level 0 | `{colors.canvas}` | App background, page canvas |
| Level 1 | `{colors.surface-1}` + border | Cards, checkout panels, admin panels |
| Level 2 | `{colors.surface-1}` + soft shadow | Hovered event cards, popovers, menus |
| Level 3 | Overlay + elevated panel | Dialogs, filters, mobile drawers |
| Brand glow | Indigo/cyan/rose shadow | Rare public promotional emphasis |

Shadow tokens:

- Subtle: `0 1px 2px rgb(24 24 27 / 0.05)`.
- Card hover: `0 24px 60px rgb(24 24 27 / 0.18)`.
- Brand: `0 12px 32px rgb(79 70 229 / 0.22)`.
- Accent: `0 12px 32px rgb(6 182 212 / 0.22)`.
- Rose: `0 12px 32px rgb(244 63 94 / 0.22)`.

Rules:

- Public event cards may use hover lift and image zoom.
- Admin views should use borders, row states, and density over shadow.
- Do not add decorative glow to data tables or form-heavy screens.

## 7. Do's and Don'ts

Do:

- Use `design-system/tokens.css` as the source of truth.
- Use existing token-backed utilities: `app-bg-page`, `app-bg-card`, `app-text-main`, `app-text-muted`, `app-text-brand`, `gradient-btn`.
- Keep cards stable in size on hover and loading.
- Prefer reusable components in `src/components/common`.
- Build future admin screens inside the current Vite app structure.
- Use `src/services/axiosClient.ts` for API integration.
- Test responsive behavior at mobile, tablet, and desktop sizes.

Don't:

- Do not create `haloticket-web/client` or `haloticket-web/admin`.
- Do not copy Next.js App Router rules from NexaTech.
- Do not hardcode brand hex colors in components when a token exists.
- Do not use one-off arbitrary Tailwind colors like `text-[#4F46E5]`.
- Do not nest cards inside cards for page sections.
- Do not use gradients as the default admin treatment.
- Do not let dynamic Vietnamese event names resize cards or controls.

Allowed exception:

- Static brand documentation in this `DESIGN.md` may list hex values. Runtime UI code should use tokens.

## 8. Responsive Behavior

Breakpoints follow Tailwind defaults:

| Breakpoint | Width | Behavior |
|---|---:|---|
| `sm` | `640px` | Two-column compact grids where content remains readable |
| `md` | `768px` | Split checkout panels, denser filters, tablet nav adjustments |
| `lg` | `1024px` | Desktop event grids, sticky detail/sidebar regions |
| `xl` | `1280px` | Full public container, admin shell comfort width |
| `2xl` | `1536px` | Preserve max widths; do not stretch content endlessly |

Collapse strategies:

- Event grid collapses by reducing columns, not shrinking text below token scale.
- Checkout summary moves below content on mobile unless it is sticky and non-overlapping.
- Admin sidebar may collapse to icons; tables should scroll horizontally when necessary.
- Filters use modal/drawer patterns on mobile and inline controls on desktop.

Touch rules:

- Interactive controls should be at least `44px` tall on mobile.
- Icon-only buttons require accessible names and hover/focus states.
- Avoid hover-only disclosure for ticketing-critical information.

## 9. Agent Prompt Guide

Quick reference:

- Product: HaloTicket, event ticketing + resale + admin.
- Stack: React 19, TypeScript, Vite, Tailwind CSS v4, React Router.
- Mood: energetic public discovery, calm checkout, dense admin operations.
- Primary: `#4f46e5`.
- Accent: `#06b6d4`.
- Urgent/resale: `#f43f5e`.
- Surface: `#ffffff` on `#f4f4f5`.
- Dark surface: `#18181b` / `#27272a`.
- Font: `Plus Jakarta Sans`.
- Public radius: `16px` cards, pill badges.
- Admin radius: `8px` to `12px`, border-first surfaces.
- Folder rule: use the existing `src` structure; do not split apps.

Sample prompts for agents:

```txt
Build a HaloTicket event card grid using DESIGN.md: image-led cards, 2-line titles, date/location metadata, price emphasis, and hot/resale badges.
```

```txt
Create an admin event management table for HaloTicket using DESIGN.md: compact typography, tokenized table surfaces, status badges, filters, and row actions inside src/features/admin.
```

```txt
Redesign the checkout page using DESIGN.md: calm two-column desktop layout, mobile single-column flow, clear totals, voucher input, and primary CTA hierarchy.
```

Implementation reminder:

- Import tokens from `design-system/tokens.css` via `src/index.css`.
- Map new UI to existing components before creating new primitives.
- Keep visual decisions aligned with this file before reaching for external brand styles.
