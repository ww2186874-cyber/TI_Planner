'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateDevices } = require('./data-validation');
const { validateBoardPresets } = require('./board-validation');
const { DEVICE_CATALOG, loadDeviceData, validateDeviceCatalog } = require('./device-catalog');

const devices = loadDeviceData();
validateDeviceCatalog(DEVICE_CATALOG, devices);

const summary = validateDevices(devices);
const boardPresets = JSON.parse(fs.readFileSync(path.join(__dirname, 'board-presets.json'), 'utf8'));
const boardSummary = validateBoardPresets(boardPresets, devices);
for (const [device, result] of Object.entries(summary)) {
  const packages = Object.entries(result.packages).map(([code, item]) => `${code}:${item.pins}`).join(', ');
  console.log(`${device} OK | ${packages} | ${result.uniqueSignals} unique signals`);
}
console.log(`Board presets OK | ${boardSummary.boards} board | ${boardSummary.presets} presets | ${boardSummary.headerGpios} GPIO header mappings`);
