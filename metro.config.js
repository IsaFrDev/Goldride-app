// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Force Metro to ignore .mjs files, falling back to CommonJS (.js) which doesn't use import.meta
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'mjs');
config.resolver.sourceExts.push('cjs');

// Ensure that libraries using import.meta are processed correctly in web
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

config.maxWorkers = 1;

module.exports = config;
