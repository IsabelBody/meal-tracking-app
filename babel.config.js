module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Tamagui babel plugin disabled for now - will work without optimization
      // [
      //   '@tamagui/babel-plugin',
      //   {
      //     components: ['tamagui'],
      //     config: './tamagui.config.ts',
      //     disableExtraction: true,
      //   },
      // ],
      'react-native-reanimated/plugin',
    ],
  };
};
