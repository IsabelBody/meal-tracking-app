module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './tamagui.config.ts',
          logTimings: false,
          // Disable extraction to avoid parse errors on native
          disableExtraction: true,
        },
      ],
      // Must be last
      'react-native-reanimated/plugin',
    ],
  };
};
