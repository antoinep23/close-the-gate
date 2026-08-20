---
name: design
description: Apply Google Drive-inspired design system to the UI. Use when redesigning components, fixing visual inconsistencies, or creating new UI elements.
---

# Design System — Google Drive Inspired

## Philosophy

Clean, minimal, content-first. The UI should feel like a professional file manager — familiar to anyone who has used Google Drive, but with its own identity as a security-focused tool.

## Typography

- Font family: `'Google Sans', 'Inter', -apple-system, sans-serif` (use Inter as the available web font)
- Page titles: 22px / font-medium / text-gray-900
- Section headers: 14px / font-medium / text-gray-700
- Body text / file names: 14px / font-normal / text-gray-800
- Secondary text (dates, sizes): 13px / font-normal / text-gray-500
- Sidebar labels: 14px / font-medium when active, font-normal when inactive
- Small labels (uppercase sections): 11px / font-medium / text-gray-400 / uppercase / tracking-wide

## Colors

- Background: white (`bg-white`)
- Sidebar background: `bg-gray-50` or `bg-[#f8f9fa]`
- Primary accent: `#1a73e8` (Google Blue) — use for active sidebar item bg `bg-blue-50 text-blue-700`
- Sidebar active item: `bg-[#c2e7ff]` with `text-[#001d35]` (Drive's light blue pill)
- Borders: `border-gray-200` (subtle, 1px)
- Hover rows: `bg-gray-50` (very subtle)
- Folder icon fill: `#5f6368` (gray-600, solid filled folder)
- Destructive: `text-red-600` for delete actions only
- Security/warning: `text-amber-600`
- Success: `text-green-600`

## Folder Icons

- Use a **solid filled** folder icon (not outline) in `text-gray-500` or `#5f6368`
- Folder rows should feel heavier than file rows (the icon is the differentiator)
- In grid view: larger filled folder icon (w-10 h-10) centered, no background container
- In list view: w-5 h-5 filled folder inline with text

## File Icons

- Use outline-style icons colored by file type
- Keep existing color coding (images: blue, documents: orange, code: green, etc.)
- Size: w-5 h-5 in list, w-8 h-8 in grid

## List View (Primary)

- Table header: 13px / font-medium / text-gray-500 (no uppercase)
- Columns: Name (flex), Upload Date, File size
- Row height: ~48px (py-3)
- Row separator: `border-b border-gray-300`
- Row hover: `bg-gray-50` (no ring, no shadow)
- Action buttons: appear on hover, aligned right, use `text-gray-500` icons
- Folder rows: same height as file rows, filled folder icon, name in font-medium
- No checkbox column (we don't have multi-select)

## Grid View

- Cards: `rounded-xl border border-gray-200` with `hover:shadow-sm hover:border-gray-300`
- File cards: centered icon + filename below + date/size footer
- Folder cards: centered solid folder icon (larger) + name below, background `bg-gray-50`
- Grid gap: `gap-4`
- Columns: responsive, 2/3/4/5 depending on viewport

## Sidebar

- Width: 220px (`w-56`)
- Upload button: rounded pill with `+` icon, bordered, shadow-sm on hover
- Nav items: rounded-full pills, 14px, icon + label
- Active item: `bg-[#c2e7ff] text-[#001d35] font-medium` (Drive's blue highlight)
- Inactive item: `text-gray-700 hover:bg-gray-100`
- Section dividers: use spacing (mt-4 mb-2) + small label, not lines
- Keys section: smaller items with key icon in amber

## Header

- Height: 64px
- Search bar: rounded-full, `bg-gray-100`, expands on focus with `ring-2 ring-blue-200`
- Right actions: icon buttons in `text-gray-600`, 40x40 hit area
- Logo + title left-aligned

## Modals

- Max-width: `max-w-md` (most), `max-w-4xl` (preview)
- Rounded: `rounded-2xl`
- Shadow: `shadow-xl`
- Backdrop: `bg-black/40`
- Title: 18px font-medium
- Buttons: rounded-lg, primary blue `bg-[#1a73e8] hover:bg-[#1557b0]`
- Destructive buttons: `bg-red-600`

## Spacing

- Page padding: `px-6 pt-5`
- Between sections: `mt-4`
- Card padding: `p-4`
- Consistent 4px grid (use Tailwind's spacing scale)

## Transitions

- All interactive elements: `transition-colors` or `transition-all`
- Duration: default (150ms) for hovers, `duration-200` for transforms
- No bouncy or spring animations — keep it professional

## Do NOT

- Use colored backgrounds on file type icons (no bg-blue-100 containers around icons)
- Use rings or outlines on hover for rows (just bg change)
- Use bold text for filenames (font-medium max)
- Add unnecessary shadows
- Use gradients except for the folder cards in grid (subtle only)
