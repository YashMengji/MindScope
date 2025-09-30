module.exports = {
  presets: ['@react-native/babel-preset'], // Updated preset
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
      },
    ],
  ],
};