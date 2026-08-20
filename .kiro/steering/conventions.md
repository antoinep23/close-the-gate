---
inclusion: always
---
# Code Conventions

## TypeScript
- Strict TypeScript, no `any` except for CJS/ESM interop (`as any`)
- Use interfaces over types for object shapes
- Async functions should have proper error handling (try/catch with typed errors)

## React Components
- One component per file in `web/src/components/`
- Props interface defined at the top of the same file
- Use functional components with hooks
- State that affects multiple components should be lifted to App.tsx
- Modals follow the pattern: `isOpen`, `onClose`, `onSuccess/onError` props

## API Layer
- All API client functions live in `web/src/services/api.ts`
- Custom hooks in `web/src/hooks/` for data fetching and state management
- Return `{ success: boolean; error?: string; ... }` from API functions

## Styling
- Tailwind CSS utility classes only — no custom CSS files
- Use responsive prefixes: `md:` for tablet+, `sm:` for small screens
- Hover states with `group-hover:opacity-100` pattern for action buttons
- Consistent color scheme: blue (primary), amber (security/warning), red (destructive), gray (neutral)

## Naming
- Files: kebab-case for components (`FileCard.tsx`), camelCase for utils
- Functions: camelCase, prefixed with `handle` for event handlers
- State: `[value, setValue]` pattern
- Props callbacks: `on` prefix (`onClose`, `onSuccess`, `onError`)
