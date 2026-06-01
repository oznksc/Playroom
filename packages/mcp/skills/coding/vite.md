# Vite Best Practices

## Configuration

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4177",
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
  },
});
```

- Use `defineConfig` for type-safe config
- Set `build.target` to match your browser support
- Use `esbuild` minifier (faster than Terser)

## Plugin System

- Use official plugins: `@vitejs/plugin-react`, `@vitejs/plugin-react-swc`
- SWC plugin is faster than Babel for large projects
- Lazy-load plugins with `import()` for dev-only features

## Development Server

- Vite starts fast because it only transforms files on demand
- Use `server.hmr` for custom HMR behavior
- `server.proxy` for backend API proxying
- `server.fs.allow` for serving files outside root

## Build Optimization

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ["react", "react-dom"],
        ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown"],
      },
    },
  },
}
```

- Split large vendor chunks with `manualChunks`
- Use dynamic `import()` for route-based code splitting
- Analyze bundle with `rollup-plugin-visualizer`

## Environment Variables

- `.env` — loaded in all cases
- `.env.local` — local overrides (gitignored)
- `.env.development` — development only
- `.env.production` — production only

```ts
// Access via import.meta.env
const apiUrl = import.meta.env.VITE_API_URL;
```

- Prefix client-exposed vars with `VITE_`
- Use `import.meta.env` (not `process.env`)

## CSS

- CSS Modules: `*.module.css` — scoped by default
- CSS-in-JS: use `vanilla-extract` or `panda css` for zero-runtime
- PostCSS: configure via `postcss.config.js`
- Sass: install `sass` — Vite supports `.scss` natively

## Path Aliases

```ts
// vite.config.ts
resolve: {
  alias: {
    "@": "/src",
  },
}
```

- Match aliases in `tsconfig.json` paths for TypeScript support
- Use `~/` or `@/` convention for imports

## Performance

- Vite uses native ESM in dev — no bundling step
- Use `optimizeDeps.include` to pre-bundle large dependencies
- `esbuild` for fast TypeScript stripping (not full type-checking)
- Use `build.cssCodeSplit: true` for CSS code splitting

## Testing

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

- Use Vitest — native Vite integration, faster than Jest
- `globals: true` for describe/it/expect without imports
- Use `@testing-library/react` for component tests

## Monorepo

- Use `workspace:*` protocol for local packages
- `pnpm-workspace.yaml` for workspace definition
- Shared Vite config via `packages/vite-config/`
