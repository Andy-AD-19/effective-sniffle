# FMOH Inventory UI Design System

## Principles

- Desktop-first enterprise layouts with dense but readable information.
- Workflow context is always visible through the horizontal inventory workflow rail.
- Actions use icon-plus-label buttons when the command is business-critical.
- Status is never text-only: badges include color, shape, and a leading dot.
- Tables include local search, sorting, pagination, row selection, column visibility, sticky headers, sticky first columns, and CSV export.

## Shell

- Sidebar: collapsible, searchable, icon-led, animated, active-state highlighted, and badge-ready.
- Header: user context, global search trigger, notification center, theme toggle, and sign-out.
- Global search: `Ctrl+K` opens a command palette covering modules, items, GRNs, suppliers, warehouses, users, and reports when the user's role can access those records.
- Workflow rail: preserves the required process order from Login through Analytics Dashboard without changing backend workflows.

## Visual Tokens

- Radius: 8px for cards, panels, tables, modals, and controls.
- Color: balanced teal, blue, amber, rose, emerald, and neutral surfaces for status and hierarchy.
- Motion: short transitions on hover/focus, with `prefers-reduced-motion` support.
- Focus: visible outlines on keyboard focus for form fields, buttons, and interactive controls.

## Accessibility

- Dialogs use `role="dialog"` and `aria-modal`.
- Icon-only buttons include `aria-label` or `title`.
- Focus indicators are visible in light and dark mode.
- Table controls include labels for row selection and search.

## Current Scope

This design pass changes presentation only. It does not modify database schema, backend logic, API contracts, business rules, inventory calculations, approvals, or authentication behavior.
