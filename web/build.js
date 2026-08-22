'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { buildApplicationSource } = require('./app-bundle');
const { validateDevices } = require('./data-validation');
const { validateBoardPresets } = require('./board-validation');
const { DEVICE_CATALOG, createRuntimeDeviceConfig, loadDeviceData, validateDeviceCatalog } = require('./device-catalog');

const APP_BUNDLE_MARKER = '<!--__APP_BUNDLE__-->';
const DATA_PLACEHOLDERS = ['__DEVICE_DATA__', '__DEVICE_CONFIG__', '__BOARD_PRESETS__', '__APP_META__'];

function occurrenceCount(source, value) {
  return source.split(value).length - 1;
}

function safeInlineJson(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function safeInlineApplicationSource(source) {
  return source.replace(/<\/script/gi, '<\\/script');
}

function buildHtml({ template, appSource, devices, deviceConfig, boardPresets, appMeta }) {
  if (occurrenceCount(template, APP_BUNDLE_MARKER) !== 1) {
    throw new Error(`Expected exactly one app bundle marker, found ${occurrenceCount(template, APP_BUNDLE_MARKER)}`);
  }
  const replacements = {
    __DEVICE_DATA__: safeInlineJson(devices),
    __DEVICE_CONFIG__: safeInlineJson(deviceConfig),
    __BOARD_PRESETS__: safeInlineJson(boardPresets),
    __APP_META__: safeInlineJson(appMeta)
  };
  DATA_PLACEHOLDERS.forEach(placeholder => {
    const count = occurrenceCount(appSource, placeholder);
    if (count !== 1) throw new Error(`Expected exactly one ${placeholder} placeholder, found ${count}`);
  });
  const placeholderPattern = new RegExp(DATA_PLACEHOLDERS.join('|'), 'g');
  const bundledSource = appSource.replace(placeholderPattern, placeholder => replacements[placeholder]);
  const html = template.replace(APP_BUNDLE_MARKER, () => `<script>\n${safeInlineApplicationSource(bundledSource)}\n</script>`);
  if (html.includes(APP_BUNDLE_MARKER)) throw new Error('App bundle marker was not replaced');
  return html;
}

function loadBuildInputs(root = path.resolve(__dirname, '..')) {
  const devices = loadDeviceData();
  const deviceConfig = createRuntimeDeviceConfig();
  const boardPresets = JSON.parse(fs.readFileSync(path.join(__dirname, 'board-presets.json'), 'utf8'));
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'desktop', 'package.json'), 'utf8'));
  validateDeviceCatalog(DEVICE_CATALOG, devices);
  validateDevices(devices);
  validateBoardPresets(boardPresets, devices);
  return {
    template: fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8'),
    appSource: buildApplicationSource(),
    devices,
    deviceConfig,
    boardPresets,
    appMeta: { version: packageJson.version, author: packageJson.author, productName: packageJson.build.productName }
  };
}

function writeBuild(root = path.resolve(__dirname, '..')) {
  const outputPath = path.join(root, 'outputs', 'mspm0g3519-pin-planner.html');
  const html = buildHtml(loadBuildInputs(root));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(outputPath);
  return outputPath;
}

if (require.main === module) writeBuild();

module.exports = {
  APP_BUNDLE_MARKER,
  DATA_PLACEHOLDERS,
  buildHtml,
  loadBuildInputs,
  safeInlineApplicationSource,
  safeInlineJson,
  writeBuild
};
