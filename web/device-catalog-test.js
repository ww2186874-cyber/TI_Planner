'use strict';

const assert = require('node:assert/strict');
const { EXPECTATIONS } = require('./data-validation');
const {
  DEVICE_CATALOG,
  createRuntimeDeviceConfig,
  loadDeviceData,
  validateDeviceCatalog
} = require('./device-catalog');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function run(name, action) {
  action();
  console.log(`OK | ${name}`);
}

const devices = loadDeviceData();

run('catalog loads both supported devices', () => {
  const summary = validateDeviceCatalog(DEVICE_CATALOG, devices);
  assert.deepEqual(summary, { devices: 2, packages: 10 });
  assert.deepEqual(Object.keys(DEVICE_CATALOG), ['MSPM0G3519', 'MSPM0G3507']);
});

run('catalog and independent official expectations cover the same packages', () => {
  assert.deepEqual(Object.keys(DEVICE_CATALOG), Object.keys(EXPECTATIONS));
  for (const device of Object.keys(DEVICE_CATALOG)) {
    assert.deepEqual(Object.keys(DEVICE_CATALOG[device].packages), Object.keys(EXPECTATIONS[device].packages));
  }
});

run('runtime configuration keeps defaults, order and zoom values', () => {
  const runtime = createRuntimeDeviceConfig();
  assert.deepEqual(runtime.MSPM0G3519.packageOrder, ['RHB', 'RGZ', 'PT', 'PM', 'PN', 'PZ']);
  assert.equal(runtime.MSPM0G3519.defaultPackage, 'PZ');
  assert.equal(runtime.MSPM0G3519.defaultZoom.PZ, 70);
  assert.deepEqual(runtime.MSPM0G3507.packageOrder, ['RHB', 'RGZ', 'PT', 'PM']);
  assert.equal(runtime.MSPM0G3507.defaultPackage, 'PM');
  assert.equal(runtime.MSPM0G3507.defaultZoom.PM, 90);
  assert.ok(runtime.MSPM0G3519.resources.some(group => group.key === 'UART' && group.instances.length === 7));
  assert.ok(runtime.MSPM0G3507.resources.some(group => group.key === 'UART' && group.instances.length === 4));
});

run('catalog rejects a wrong package pin count', () => {
  const catalog = clone(DEVICE_CATALOG);
  catalog.MSPM0G3507.packages.PM.pinCount = 63;
  assert.throws(
    () => validateDeviceCatalog(catalog, devices),
    error => error.validationErrors?.some(message => message.includes('MSPM0G3507 PM: expected 63 pins'))
  );
});

run('catalog rejects an unavailable default package', () => {
  const catalog = clone(DEVICE_CATALOG);
  catalog.MSPM0G3519.defaultPackage = 'BAD';
  assert.throws(
    () => validateDeviceCatalog(catalog, devices),
    error => error.validationErrors?.some(message => message.includes('default package BAD is unavailable'))
  );
});

run('catalog rejects resource prefixes that match no official signal', () => {
  const catalog = clone(DEVICE_CATALOG);
  catalog.MSPM0G3519.resources[0].instances[0].prefix = 'BROKEN_';
  assert.throws(
    () => validateDeviceCatalog(catalog, devices),
    error => error.validationErrors?.some(message => message.includes('prefix BROKEN_ matches no official signal'))
  );
});

run('catalog rejects unavailable exact signals', () => {
  const catalog = clone(DEVICE_CATALOG);
  catalog.MSPM0G3507.resources.find(group => group.key === 'CAN').instances[0].exact.push('CAN_BAD');
  assert.throws(
    () => validateDeviceCatalog(catalog, devices),
    error => error.validationErrors?.some(message => message.includes('exact signal CAN_BAD is unavailable'))
  );
});

run('catalog rejects duplicate resource groups and instances', () => {
  const catalog = clone(DEVICE_CATALOG);
  catalog.MSPM0G3507.resources.push(clone(catalog.MSPM0G3507.resources[0]));
  assert.throws(
    () => validateDeviceCatalog(catalog, devices),
    error => error.validationErrors?.some(message => message.includes('duplicate resource group UART'))
      && error.validationErrors?.some(message => message.includes('duplicate resource instance UART0'))
  );
});

run('catalog rejects zoom outside the supported range', () => {
  const catalog = clone(DEVICE_CATALOG);
  catalog.MSPM0G3519.packages.PZ.defaultZoom = 20;
  assert.throws(
    () => validateDeviceCatalog(catalog, devices),
    error => error.validationErrors?.some(message => message.includes('defaultZoom must be between 35 and 180'))
  );
});
