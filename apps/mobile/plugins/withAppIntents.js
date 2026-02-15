const { withInfoPlist, withXcodeProject } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Expo config plugin to add App Intents support for Quick Capture
 */
const withAppIntents = (config) => {
  // Add API URL to Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults.API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.lucidity.app';
    return config;
  });

  // Add Swift file to Xcode project
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const swiftFilePath = 'QuickCaptureIntent.swift';

    // Add the Swift file to the project
    if (!xcodeProject.hasFile(swiftFilePath)) {
      const group = xcodeProject.getFirstProject().firstProject.mainGroup;
      const file = xcodeProject.addSourceFile(swiftFilePath, {}, group);

      if (file) {
        console.log('✅ Added QuickCaptureIntent.swift to Xcode project');
      }
    }

    return config;
  });

  return config;
};

module.exports = withAppIntents;
