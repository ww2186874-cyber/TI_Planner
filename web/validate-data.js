'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateDevices } = require('./data-validation');

const devices = {
  MSPM0G3519: JSON.parse(fs.readFileSync(path.join(__dirname, 'pin-data.json'), 'utf8')),
  MSPM0G3507: JSON.parse(fs.readFileSync(path.join(__dirname, 'pin-data-3507.json'), 'utf8'))
};

const summary = validateDevices(devices);
for (const [device, result] of Object.entries(summary)) {
  const packages = Object.entries(result.packages).map(([code, item]) => `${code}:${item.pins}`).join(', ');
  console.log(`${device} OK | ${packages} | ${result.uniqueSignals} unique signals`);
}
