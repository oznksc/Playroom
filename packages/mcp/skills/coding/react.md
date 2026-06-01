# React Best Practices

## Component Patterns

### Functional Components Only

```tsx
// Good
function UserCard({ name, avatar }: UserCardProps) {
  return (
    <div className="card">
      <img src={avatar} alt={name} />
      <span>{name}</span>
    </div>
  );
}
```

- Never use class components in new code
- Destructure props in the function signature
- Use TypeScript interfaces for prop types

### Composition over Configuration

```tsx
// Good — compositional
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>

// Bad — prop explosion
<Card title="Title" body="Content" footer="Footer" icon={...} badge={...} />
```

## Hooks Rules

- Only call hooks at the top level — never inside loops, conditions, or nested functions
- Only call hooks from React functions (components or custom hooks)
- Custom hooks must start with `use`

## State Management

### Local State

```tsx
const [count, setCount] = useState(0);
const doubled = useMemo(() => count * 2, [count]);
```

- `useState` for simple local state
- `useReducer` for complex state logic
- `useMemo` for expensive computations
- `useCallback` for stable function references

### Global State

- Zustand for simple global state (smallest bundle)
- Jotai for atomic state (fine-grained reactivity)
- TanStack Query for server state (caching, deduplication)

## Performance

### Memoization

```tsx
const MemoizedChild = React.memo(Child, (prev, next) => {
  return prev.id === next.id;
});

const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

- `React.memo` — skip re-render if props haven't changed
- `useCallback` — stable function reference for child props
- `useMemo` — cache expensive computations

### Avoid Common Mistakes

- Don't create objects/arrays inline in JSX props
- Don't call hooks conditionally
- Don't use `index` as key for dynamic lists
- Don't put everything in one context — split by concern

## Data Fetching

```tsx
// TanStack Query pattern
const { data, isLoading, error } = useQuery({
  queryKey: ["user", userId],
  queryFn: () => fetchUser(userId),
  staleTime: 5 * 60 * 1000,
});
```

- Use TanStack Query for server state — don't manage cache manually
- Set `staleTime` to control refetch frequency
- Use `select` to transform data at the cache level
- Prefetch with `queryClient.prefetchQuery`

## Error Handling

```tsx
<ErrorBoundary fallback={<ErrorScreen />}>
  <App />
</ErrorBoundary>
```

- Wrap feature boundaries in `ErrorBoundary`
- Use `ErrorBoundary` from `react-error-boundary` (not raw class)
- Log errors to monitoring service in `componentDidCatch`

## TypeScript Integration

- Define props interfaces — never use `any`
- Use `React.FC` sparingly — prefer explicit return types
- Use `React.ComponentPropsWithoutRef` for forwarded props
- Discriminated unions for variant props:

```tsx
type ButtonProps =
  | { variant: "primary"; onClick: () => void }
  | { variant: "link"; href: string };
```

## Testing

- Test behavior, not implementation
- Use `@testing-library/react` — query by role, label, text
- Mock modules with `vi.mock` (Vitest) or `jest.mock`
- Test error boundaries separately
