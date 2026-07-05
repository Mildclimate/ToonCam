const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// 让 Metro 解析 .tflite 和 .bin（tf.js 权重分片）模型文件
config.resolver.assetExts.push("tflite", "bin");

module.exports = config;
