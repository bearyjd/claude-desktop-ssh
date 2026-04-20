// Copyright (C) 2025 Entrevoix, Inc.
// SPDX-License-Identifier: AGPL-3.0-only

// Expo config plugin that configures Android release signing and ProGuard/R8.
// Reads keystore credentials from gradle.properties (which in turn can
// reference environment variables). This lets the android/ directory remain
// gitignored while release builds are reproducible from env vars alone.

const { withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SIGNING_CONFIG_BLOCK = `
    signingConfigs {
        release {
            def storePath = project.hasProperty('NAVETTE_RELEASE_STORE_FILE')
                ? project.property('NAVETTE_RELEASE_STORE_FILE') : null
            if (storePath) {
                storeFile file(storePath)
                storePassword project.property('NAVETTE_RELEASE_STORE_PASSWORD')
                keyAlias project.property('NAVETTE_RELEASE_KEY_ALIAS')
                keyPassword project.property('NAVETTE_RELEASE_KEY_PASSWORD')
            }
        }
    }
`;

function addSigningConfig(buildGradle) {
  if (buildGradle.includes('signingConfigs')) return buildGradle;

  const anchor = 'buildTypes {';
  const idx = buildGradle.indexOf(anchor);
  if (idx === -1) return buildGradle;

  return buildGradle.slice(0, idx) + SIGNING_CONFIG_BLOCK.trimStart() + '\n    ' + buildGradle.slice(idx);
}

function configureReleaseBuildType(buildGradle) {
  const releaseBlockRe = /buildTypes\s*\{[^}]*release\s*\{([^}]*)}/s;
  const match = buildGradle.match(releaseBlockRe);
  if (!match) return buildGradle;

  let releaseBody = match[1];

  if (!releaseBody.includes('signingConfig signingConfigs.release')) {
    releaseBody = releaseBody.replace(
      /signingConfig\s+signingConfigs\.\w+/,
      'signingConfig signingConfigs.release',
    );
    if (!releaseBody.includes('signingConfig signingConfigs.release')) {
      releaseBody += '\n            signingConfig signingConfigs.release\n';
    }
  }

  if (!releaseBody.includes('minifyEnabled true')) {
    releaseBody = releaseBody.replace(/minifyEnabled\s+false/, 'minifyEnabled true');
    if (!releaseBody.includes('minifyEnabled true')) {
      releaseBody += '            minifyEnabled true\n';
    }
  }

  if (!releaseBody.includes('shrinkResources true')) {
    releaseBody += '            shrinkResources true\n';
  }

  if (!releaseBody.includes('proguard-rules.pro')) {
    releaseBody += '            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"\n';
  }

  return buildGradle.replace(releaseBlockRe, (full) => {
    return full.replace(match[1], releaseBody);
  });
}

function withReleaseSigning(config) {
  config = withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    gradle = addSigningConfig(gradle);
    gradle = configureReleaseBuildType(gradle);
    cfg.modResults.contents = gradle;
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const src = path.resolve(__dirname, '..', 'proguard-rules.pro');
      const dst = path.join(cfg.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }
      return cfg;
    },
  ]);

  return config;
}

module.exports = withReleaseSigning;
