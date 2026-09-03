# AGENTS.md - HaloTicket Web

This file defines how coding agents should work in `haloticket-web`. Visual direction lives in `DESIGN.md`; implementation must follow this file.

## 1. Project Overview

HaloTicket Web is a single React 19 + TypeScript + Vite application for:

- Public event discovery and event detail pages.
- Ticket selection, checkout, and booking success.
- Resale ticket browsing and checkout.
- Customer account and owned ticket pages.
- Future admin workflows inside the same app.

Do not split this project into separate `client/` and `admin/` applications. Admin code belongs in the existing Vite app.

## 2. Tooling

| Area | Tool |
|---|---|
| Framework | React 19 |
| Language | TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 + CSS variables |
| Routing | React Router DOM |
| State | Redux Toolkit / React Redux where shared state is needed |
| API | Axios via shared client |
| Icons | `react-icons` |

Commands:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

Run `npm run build` after code changes that affect app behavior or UI compilation.

## 3. Repository Structure

Use the structure already prepared in `src`:

```txt
src/
├── assets/
├── components/
│   └── common/
├── config/
├── context/
├── features/
│   ├── auth/
│   ├── common/
│   ├── events/
│   ├── resale/
│   ├── tickets/
│   └── user/
├── hooks/
├── layouts/
├── mock/
├── routes/
├── services/
├── store/
├── types/
└── utils/
```

Future admin structure:

```txt
src/features/admin/
├── events/
├── orders/
├── tickets/
├── users/
└── dashboard/

src/layouts/AdminLayout.tsx
```

Do not create:

```txt
client/
admin/
app/
pages/
```

This is not a Next.js project.

## 4. Import Rules

- Use `@/` for imports from `src`.
- Prefer external imports first, then internal imports, then types.
- Keep shared reusable UI in `src/components/common`.
- Keep feature-specific UI in `src/features/<feature>/components`.
- Keep route paths in `src/routes/paths.ts`.

Example:

```tsx
import { Link } from "react-router-dom";
import { FiCalendar } from "react-icons/fi";

import { Button } from "@/components/common/Button";
import type { EventItem } from "@/mock/eventData";
```

## 5. TypeScript Rules

- Use TypeScript only for source files.
- Avoid `any`; create explicit types in `src/types` or feature-local `types.ts`.
- Prefer named exports for reusable components.
- Default exports are acceptable for route-level screens when already used by the router.
- Keep component props as named interfaces or type aliases near the component.
- Do not leave unused variables or parameters; TypeScript is configured to reject them.

## 6. Styling Rules

Read `DESIGN.md` before building or refactoring UI.

- `DESIGN.md` defines how the product should look and feel.
- `src/index.css` defines runtime CSS variables and registers Tailwind v4 theme values.
- `design-system/tokens.css` is reference material only; do not import it from runtime CSS.

Use `src/index.css` token-backed classes and variables:

```tsx
<section className="app-bg-page app-text-main">
  <div className="app-bg-card app-border" />
</section>
```

Avoid hardcoded brand hex colors in components:

```tsx
// Avoid
<div className="text-[#4F46E5]" />

// Prefer
<div className="app-text-brand" />
```

Use gradients only for selected public discovery moments. Admin screens should use calm surfaces, tables, borders, and status chips.

## 7. Routing Rules

- Route definitions live in `src/routes/index.tsx`.
- Shared path helpers live in `src/routes/paths.ts`.
- Public pages use `MainLayout`.
- Auth pages use `AuthLayout`.
- Future admin pages should use `AdminLayout` inside the same router.

Do not add Next.js route groups, `metadata`, server components, middleware, or App Router conventions.

## 8. API Rules

- Use `src/services/axiosClient.ts` for HTTP calls.
- Do not create new raw Axios instances in features.
- Keep API base URL in `src/config`.
- Handle API errors at the service boundary where possible.
- Components should receive typed data and typed errors rather than raw Axios internals.

Allowed:

```ts
import axiosClient from "@/services/axiosClient";
```

Avoid:

```ts
import axios from "axios";
axios.create({ baseURL: "http://localhost:8080" });
```

## 9. Theme Rules

- Theme state is managed by `src/context/ThemeContext.tsx`.
- Dark mode is applied through the `.dark` class on `document.documentElement`.
- Components should rely on token variables so light/dark mode stays consistent.
- Do not duplicate theme logic inside feature components.

## 10. UI Implementation Checklist

Before completing UI work:

- Read `DESIGN.md`.
- Reuse existing common components when possible.
- Confirm the screen works in light and dark mode.
- Check mobile and desktop layouts.
- Ensure touch targets are at least `44px` on mobile.
- Clamp or wrap long Vietnamese event names cleanly.
- Avoid card-in-card section layouts.
- Use token-backed colors and surfaces.
- Run `npm run build`.

## 11. Code Quality Checklist

Before completing code work:

- TypeScript compiles.
- Lint passes when relevant.
- No production `console.log`.
- No unrelated refactors.
- No raw API URLs in components.
- No new top-level app folders.
- No changes that bypass the existing router, theme context, or API client.

## 12. Agent Notes

- Keep changes scoped to the user request.
- Preserve user changes in the working tree.
- Prefer the existing folder structure and naming patterns.
- If adding admin features, add them under `src/features/admin/*`.
- If changing visual design, update `DESIGN.md` and `src/index.css` when the change is meant to become system-wide.
