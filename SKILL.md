# Returnia Coding Standards

## File Naming Conventions

- **React Components**: Use `PascalCase` for filenames and component names (e.g., `AllocationChart.tsx`, `Sidebar.tsx`).
- **Utilities/Hooks**: Use `camelCase` for filenames (e.g., `useWindowSize.ts`, `formatDate.ts`).
- **Pages**: Follow Next.js App Router conventions (`page.tsx`, `layout.tsx`, `loading.tsx`).

## Component Structure

- **Syntax**: Use **Arrow Functions** for all components (`const Component = () => { ... }`).
- Place reusable UI components in `components/ui`.
- Place feature-specific components in `components/[feature]`.

## Styling

- Use Tailwind CSS for styling.
- Avoid inline styles.
- Use `clsx` or `tailwind-merge` for conditional classes.

## State Management

- Prefer server components for data fetching.
- Use `use client` only when interactivity is needed.
