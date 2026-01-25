module.exports = function (api) {
  api.cache(true);
  
  const plugins = [
    // Must be last
    'react-native-reanimated/plugin',
  ];

  // Only use tamagui babel plugin in production builds (not during development)
  // The plugin has compatibility issues with Windows ESM/CJS interop
  // The app works fine without it - static extraction is just an optimization
  if (process.env.TAMAGUI_ENABLE_STATIC === 'true') {
    plugins.unshift([
      '@tamagui/babel-plugin',
      {
        components: ['tamagui'],
        config: './tamagui.config.ts',
        logTimings: false,
        disableExtraction: false,
      },
    ]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
