const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Expo monorepo: watch workspace packages + resolve from app then root.
config.watchFolders = [
  path.resolve(monorepoRoot, "packages/schema"),
  path.resolve(monorepoRoot, "packages/runtime"),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// pnpm uses symlinks into the store.
config.resolver.unstable_enableSymlinks = true;

// Single-instance resolution for native modules under pnpm.
const singleton = (name) =>
  path.dirname(require.resolve(`${name}/package.json`, { paths: [projectRoot] }));

config.resolver.extraNodeModules = {
  react: singleton("react"),
  "react-native": singleton("react-native"),
  "react-native-reanimated": singleton("react-native-reanimated"),
  "react-native-worklets": singleton("react-native-worklets"),
  "react-native-gesture-handler": singleton("react-native-gesture-handler"),
  "react-native-safe-area-context": singleton("react-native-safe-area-context"),
  "@shopify/react-native-skia": singleton("@shopify/react-native-skia"),
  zod: singleton("zod"),
  "@gamekit/schema": path.resolve(monorepoRoot, "packages/schema"),
  "@gamekit/runtime": path.resolve(monorepoRoot, "packages/runtime"),
};

module.exports = config;
