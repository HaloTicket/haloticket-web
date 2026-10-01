# HaloTicket Design System

HaloTicket is a shared React 19 + TypeScript + Vite web app for public event discovery, ticket purchase, resale flows, customer account pages, and admin operations. This file is the root-level visual source of truth for AI agents and UI work.

The system follows the `HaloTicket_Clone` palette and homepage mood as the canonical visual baseline: clean white discovery pages, slate typography, blue primary actions, amber highlights, and restrained slate dark mode. `awesome-design-md` references may inform layout craft, density, and component behavior, but must not replace the HaloTicket_Clone color system. The app is not split into separate Next.js client and admin projects; all UI lives inside the existing `src` structure.

## 1. Visual Theme & Atmosphere

HaloTicket should feel energetic, commercial, and reliable. Public pages should sell the excitement of live events through poster art, artist imagery, hot/resale badges, and fast scanning. Checkout, ticket ownership, resale checkout, and admin screens should feel calm, explicit, and operationally precise.

Density:

- Public discovery: medium density, image-led, strong card rhythm.
- Ticket selection and checkout: medium-low density, clear hierarchy, low anxiety.
- Customer account: calm and readable, focused on ownership and next action.
- Admin: high density, table-first, compact filters, minimal decoration.

Surface philosophy:

- Use full-width page bands with constrained inner containers.
- Use cards for repeated items such as events, tickets, summaries, and stats.
- Use panels, tables, drawers, and dialogs for admin operations.
- Do not nest decorative cards inside page-section cards.

## 2. Color Palette & Functional Roles

| Token | Hex | Role / Usage |
|---|---:|---|
| `{colors.canvas}` | `#ffffff` | Light app background |
| `{colors.canvas-dark}` | `#020817` | Dark app background |
| `{colors.surface-1}` | `#ffffff` | Cards, panels, modals, checkout blocks |
| `{colors.surface-2}` | `#f8fafc` | Hover surfaces, quiet rows, filter backgrounds |
| `{colors.surface-3}` | `#f1f5f9` | Subnavs, dividers, inactive controls |
| `{colors.surface-dark}` | `#0f172a` | Dark cards, popovers, elevated surfaces |
| `{colors.surface-dark-2}` | `#1e293b` | Dark subnavs, muted rows, hover surfaces |
| `{colors.ink}` | `#0f172a` | Headings, primary copy, table values |
| `{colors.ink-dark}` | `#f8fafc` | Primary dark-mode text |
| `{colors.ink-muted}` | `#64748b` | Metadata, helper copy, timestamps |
| `{colors.ink-muted-dark}` | `#94a3b8` | Dark-mode metadata and helper text |
| `{colors.border}` | `#e2e8f0` | Default borders and separators |
| `{colors.border-dark}` | `#1e293b` | Dark-mode borders and separators |
| `{colors.primary}` | `#2563eb` | Main CTA, active nav, selected filters, focus rings |
| `{colors.primary-dark}` | `#3b82f6` | Dark-mode primary and focus rings |
| `{colors.primary-hover}` | `#1d4ed8` | Primary hover and pressed states |
| `{colors.accent}` | `#f59e0b` | Featured-star marker, highlighted discovery affordances |
| `{colors.urgent}` | `#ef4444` | HOT events, resale emphasis, destructive attention |
| `{colors.success}` | `#16a34a` | Paid, active, published, completed |
| `{colors.warning}` | `#f59e0b` | Pending, low stock, review needed |
| `{colors.danger}` | `#ef4444` | Failed, cancelled, expired, destructive actions |
| `{colors.info}` | `#2563eb` | Processing, neutral notes, resale guidance |

Rules:

- Blue means trust, progression, booking, navigation, and focus.
- Amber means featured discovery, star moments, warning, and selective highlights.
- Red means urgency, resale, hot status, danger, or destructive attention.
- Admin screens should rely on neutral surfaces, borders, and status chips rather than gradients.
- Runtime UI variables live in `src/index.css`. `design-system/tokens.css` is a reference document only and must not be imported from runtime CSS.
- When using `awesome-design-md`, keep HaloTicket_Clone colors as the palette source. Do not adopt preset brand colors from Linear, Stripe, Airbnb, or other references.

## 3. Typography Rules

Primary typeface: `Plus Jakarta Sans`.

Fallback stack:

```css
"Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

| Style | Size | Weight | Line Height | Usage |
|---|---:|---:|---:|---|
| Display-XL | `48px` | `800` | `56px` | Rare public hero headings |
| Display-LG | `36px` | `800` | `44px` | Home/search top sections |
| Headline-MD | `24px` | `700` | `32px` | Page titles and section headings |
| Title-LG | `18px` | `700` | `24px` | Event cards and panel headings |
| Body-MD | `15px` | `400` | `22px` | Descriptions and form help |
| Body-SM | `14px` | `400` | `20px` | Admin cells and compact metadata |
| Price-LG | `20px` | `800` | `24px` | Ticket prices and checkout totals |
| Label-SM | `12px` | `600` | `16px` | Badges, tags, table labels |

Typography rules:

- Keep letter spacing at `0em` by default.
- Do not scale fonts with viewport width.
- Clamp event titles to 2 lines in cards.
- Use uppercase only for short badges.
- Use weight and spacing for admin hierarchy instead of oversized headings.

## 4. Component Stylings

### Buttons

Primary buttons use `{colors.primary}` background, white text, `12px` to `16px` radius, and a minimum height of `40px`. Use them for booking, checkout continuation, save, publish, and confirmed admin actions.

Secondary buttons use neutral surfaces and borders for alternate actions. Outline buttons are for filters, secondary navigation, and admin toolbars. Ghost buttons are for headers, table rows, and low-emphasis actions. Destructive buttons use `{colors.danger}` and must only appear for irreversible actions. Gradient buttons are allowed for selective public discovery moments, not admin defaults.

### Containers & Cards

Default cards use white surface, `1px` border, `16px` radius, and subtle shadow. Event cards require stable image ratios, 2-line titles, date/location metadata, clear starting price, and optional hot/resale/category badges. Admin panels use border-first depth with minimal shadow.

### Inputs & Forms

Inputs use `40px` desktop height and `44px` mobile height, `12px` radius, strong border, tokenized focus ring, readable placeholder, and explicit invalid/disabled states. Do not hide required payment, voucher, or ticket constraints in placeholders.

### Navigation

The public header is sticky, translucent, and token-backed with `14px` blur. Future admin navigation must live in the same Vite app, under `src/features/admin/*` and `src/layouts/AdminLayout.tsx`.

The admin shell follows the Homespace layout: a 256px sidebar (80px collapsed) and a solid 80px topbar. The topbar contains the sidebar toggle and pill search on the left, with language, theme, notification and a bordered account pill on the right. Breadcrumbs belong in the content above the single page heading, not in the topbar. Below 1024px the sidebar becomes a 256px overlay drawer with a backdrop, focus containment, Escape dismissal, and 44px mobile targets. Single-item navigation groups navigate directly. Multi-item groups expand independently; opening or navigating through one must preserve other expanded groups. The navigation region scrolls without a visible scrollbar; Settings stays in the sidebar footer. Event moderation and venue management belong under Event Management; automatic eKYC has no manual moderation menu. All sidebar destinations remain clickable for viewing their screens, without availability badges. Missing server actions must not report success. Route metadata drives selected navigation and breadcrumbs, including event detail IDs. Do not display health or review counts unless they come from a successful data source.

Account settings uses section navigation beside a settings panel, stacking on mobile. Privacy and notification preferences use accessible toggle switches, never checkboxes. Browser-only preferences must state their scope and affect actual UI behavior; they must not claim to change server privacy, audit logging, permissions or security. Disabling background notification toasts must preserve notification history and all transactional feedback and critical dialogs.

Admin navigation has eight groups: system overview, events, users, finance, ticket marketplace, content, AI support, and system settings. System settings stays in the sidebar footer; personal account settings opens from the account menu. Use sentence case for group labels and breadcrumbs. Each multi-item group has a landing page with links and short descriptions of its child functions; the group breadcrumb links to that page.

Unfinished destinations show purpose-specific interactive wireframes, never disabled navigation or availability badges. Wireframe pages use the existing surfaces, tables, filters and accessible dialogs. Label illustrative data and local preview changes clearly. Preview interactions do not call APIs, grant permissions, publish content or move money. Existing moderation and venue routes retain their live API behavior. AI wireframes identify demonstration answers and the absence of connected sources; they do not imply a running model.

Admin-specific runtime rules live in `src/layouts/admin/admin.css` under `.admin-shell`. Page headings use 25px, body and forms 14–15px, and metadata 13px. Content fills the workspace with 24px gutters, increasing to 32px on desktop. List headings pair with compact statistics; search, filters and actions share a toolbar panel. Table and pagination share one 16px-radius surface. Dialogs use a centered 24px-radius panel, 24px padding, an icon tile and separated header, with a dark blurred overlay. Keep Radix focus handling and pending guards. Its motion tokens are fast 150ms, normal 190ms, and layout 280ms. Reduced-motion preference covers dialog portals too. Ordinary feedback uses the same stock Sonner rich-color, close-button presentation as Homespace: 356px width, 8px radius, 32px top/right desktop offsets and 16px mobile offsets. Critical action errors stay in dialogs; dangerous actions retain AlertDialog confirmation.

### Badges & Status Chips

Badges are pill-shaped. Use red for hot/resale emphasis, success for paid/active/published/completed, amber for pending/low stock/review needed, red for failed/cancelled/expired, and blue for draft/processing/system notes.

### Tables

Admin tables use compact `14px` body text, sticky headers where useful, row hover states, status chips, tokenized borders, and short row actions. Tables may horizontally scroll on mobile.

## 5. Layout Principles

Spacing scale:

| Token | Value | Usage |
|---|---:|---|
| `{spacing.1}` | `4px` | Icon/text space, micro gaps |
| `{spacing.2}` | `8px` | Compact stacks and badge padding |
| `{spacing.3}` | `12px` | Card inner gaps and form rows |
| `{spacing.4}` | `16px` | Mobile gutters and common padding |
| `{spacing.6}` | `24px` | Panel padding and checkout groups |
| `{spacing.8}` | `32px` | Page blocks |
| `{spacing.10}` | `40px` | Major public section spacing |
| `{spacing.16}` | `64px` | Large page separation |

Layout rules:

- Public container max width is `1200px`.
- Admin content fills its workspace; `1440px` is a verification viewport, not a content width cap.
- Mobile gutter is `16px`.
- Public header height is `72px`; admin topbar height is `80px`.
- Event grids collapse by reducing columns, not by shrinking text below token scale.
- Checkout is one column on mobile and content + summary on desktop.
- Admin is sidebar/topbar/content; keep filters and tables aligned.

## 6. Depth & Elevation

| Level | Treatment | Usage |
|---|---|---|
| Level 0 | Canvas background | App/page base |
| Level 1 | Surface + border | Cards, checkout panels, admin panels |
| Level 2 | Surface + soft shadow | Hovered event cards, popovers, menus |
| Level 3 | Overlay + elevated panel | Dialogs, mobile filter drawers |
| Brand glow | Blue/amber/red shadow | Rare public promotional emphasis |

Public event cards may lift slightly and zoom images on hover. Admin screens should prefer borders, row states, and compact density over shadows.

## 7. Do's and Don'ts

Do:

- Use `src/index.css` as the runtime token source.
- Treat `design-system/tokens.css` as a non-runtime reference when comparing or documenting token changes.
- Use `app-bg-page`, `app-bg-card`, `app-text-main`, `app-text-muted`, `app-text-brand`, and `gradient-btn` where appropriate.
- Keep event cards and ticket controls stable in size.
- Reuse `src/components/common` before creating new primitives.
- Build public, resale, account, and admin UI inside the same Vite app.
- Use `src/services/axiosClient.ts` for API calls.

Don't:

- Do not create `haloticket-web/client` or `haloticket-web/admin`.
- Do not copy NexaTech Next.js App Router rules.
- Do not hardcode brand hex colors in components.
- Do not use arbitrary Tailwind colors like `text-[#4F46E5]` for normal UI.
- Do not use gradients as default admin styling.
- Do not let long Vietnamese event names resize cards or controls.

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|---|---:|---|
| `sm` | `640px` | Two-column compact grids when readable |
| `md` | `768px` | Split checkout panels and tablet filters |
| `lg` | `1024px` | Desktop event grids and sticky side regions |
| `xl` | `1280px` | Full public container and admin comfort width |
| `2xl` | `1536px` | Preserve max widths; do not stretch endlessly |

Responsive rules:

- Touch targets should be at least `44px`.
- Avoid hover-only information.
- Filters become drawers or modals on mobile.
- Admin tables can scroll horizontally.
- Long titles wrap or clamp cleanly.

## 9. Agent Prompt Guide

Quick reference:

- Product: HaloTicket, event ticketing + resale + admin.
- Stack: React 19, TypeScript, Vite, Tailwind CSS v4, React Router.
- Mood: energetic discovery, calm checkout, dense admin operations.
- Primary: `#2563eb` light, `#3b82f6` dark.
- Accent: `#f59e0b`.
- Urgent/resale: `#ef4444`.
- Surface: `#ffffff` on `#ffffff` light, `#0f172a` on `#020817` dark.
- Font: `Plus Jakarta Sans`.
- Public radius: `16px` cards, pill badges.
- Admin radius: `12px` controls, `16px` panels, `24px` dialogs/account popovers, bordered account pill.
- Folder rule: use the existing `src` structure; do not split apps.

Sample prompts:

```txt
Build a HaloTicket event card grid using DESIGN.md: image-led cards, 2-line titles, date/location metadata, blue price emphasis, and red hot/resale badges.
```

```txt
Create an admin event management table for HaloTicket using DESIGN.md: compact typography, tokenized table surfaces, status badges, filters, and row actions inside src/features/admin.
```

```txt
Redesign the checkout page using DESIGN.md: calm two-column desktop layout, mobile single-column flow, clear totals, voucher input, and primary CTA hierarchy.
```
