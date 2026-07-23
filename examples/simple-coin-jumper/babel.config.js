module.exports = function babel(api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated 4 re-exports the worklets babel plugin — must be last.
    plugins: ["react-native-reanimated/plugin"],
  };
};
