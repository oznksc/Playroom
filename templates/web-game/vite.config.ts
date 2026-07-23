import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5174,
  },
  // Runtime-web only needs pure JS subpaths from @gamekit/runtime.
  // Never pull the React Native entry (view/game) into the browser bundle.
  optimizeDeps: {
    exclude: [
      "react-native",
      "react-native-reanimated",
      "react-native-gesture-handler",
      "@shopify/react-native-skia",
    ],
  },
  resolve: {
    conditions: ["import", "module", "browser", "default"],
  },
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },
});
