'use strict';

const fs = require('node:fs');
const path = require('node:path');

const timerAliases = ['timer', '定时器', 'pwm', 'capture', 'compare'];

function commonAnalogResources() {
  return [
    { key: 'ADC', label: 'ADC', instances: [0, 1].map(number => ({ id: `ADC${number}`, display: `ADC${number}`, prefix: `A${number}_`, aliases: ['analog', '模拟输入'] })) },
    { key: 'DAC', label: 'DAC', instances: [{ id: 'DAC0', display: 'DAC0', exact: ['DAC_OUT'], aliases: ['analog out', '模拟输出'] }] },
    { key: 'Comparator', label: '比较器', instances: [0, 1, 2].map(number => ({ id: `COMP${number}`, prefix: `COMP${number}_`, aliases: ['comparator', '比较器'] })) }
  ];
}

const DEVICE_CATALOG = {
  MSPM0G3519: {
    dataFile: 'pin-data.json',
    defaultPackage: 'PZ',
    packages: {
      RHB: { pinCount: 32, defaultZoom: 100 },
      RGZ: { pinCount: 48, defaultZoom: 100 },
      PT: { pinCount: 48, defaultZoom: 100 },
      PM: { pinCount: 64, defaultZoom: 90 },
      PN: { pinCount: 80, defaultZoom: 80 },
      PZ: { pinCount: 100, defaultZoom: 70 }
    },
    resources: [
      { key: 'UART', label: 'UART', instances: ['UART0', 'UART1', 'UART3', 'UART4', 'UART5', 'UART6', 'UART7'].map(id => ({ id, prefix: `${id}_`, aliases: ['serial', '串口'] })) },
      { key: 'I2C', label: 'I2C', instances: ['I2C0', 'I2C1', 'I2C2'].map(id => ({ id, prefix: `${id}_`, aliases: ['iic', 'two wire'] })) },
      { key: 'SPI', label: 'SPI', instances: ['SPI0', 'SPI1', 'SPI2'].map(id => ({ id, prefix: `${id}_`, aliases: ['synchronous serial'] })) },
      { key: 'CAN', label: 'CAN-FD', instances: [0, 1].map(number => ({ id: `CAN${number}`, display: `CAN-FD${number}`, prefix: `CAN${number}_`, aliases: ['canfd', 'can fd'] })) },
      { key: 'Timer', label: '定时器', instances: [
        { id: 'TIMA0', prefix: 'TIMA0_', feature: 'Advanced · 4CH', aliases: [...timerAliases, 'tim0'] },
        { id: 'TIMA1', prefix: 'TIMA1_', feature: 'Advanced · 2CH', aliases: [...timerAliases, 'tim1', 'timer1'] },
        { id: 'TIMG0', prefix: 'TIMG0_', feature: 'General · 2CH', aliases: [...timerAliases, 'tim0'] },
        { id: 'TIMG6', prefix: 'TIMG6_', feature: 'General · 2CH', aliases: timerAliases },
        { id: 'TIMG7', prefix: 'TIMG7_', feature: 'General · 2CH', aliases: timerAliases },
        { id: 'TIMG8', prefix: 'TIMG8_', feature: 'QEI / Hall · 2CH', aliases: [...timerAliases, 'qei', 'encoder', '编码器', 'hall', '霍尔'] },
        { id: 'TIMG9', prefix: 'TIMG9_', feature: 'QEI / Hall · 2CH', aliases: [...timerAliases, 'qei', 'encoder', '编码器', 'hall', '霍尔'] },
        { id: 'TIMG12', prefix: 'TIMG12_', feature: 'General · 32-bit · 2CH', aliases: timerAliases },
        { id: 'TIMG14', prefix: 'TIMG14_', feature: 'General · 4CH', aliases: timerAliases }
      ] },
      ...commonAnalogResources()
    ]
  },
  MSPM0G3507: {
    dataFile: 'pin-data-3507.json',
    defaultPackage: 'PM',
    packages: {
      RHB: { pinCount: 32, defaultZoom: 100 },
      RGZ: { pinCount: 48, defaultZoom: 100 },
      PT: { pinCount: 48, defaultZoom: 100 },
      PM: { pinCount: 64, defaultZoom: 90 }
    },
    resources: [
      { key: 'UART', label: 'UART', instances: ['UART0', 'UART1', 'UART2', 'UART3'].map(id => ({ id, prefix: `${id}_`, aliases: ['serial', '串口'] })) },
      { key: 'I2C', label: 'I2C', instances: ['I2C0', 'I2C1'].map(id => ({ id, prefix: `${id}_`, aliases: ['iic', 'two wire'] })) },
      { key: 'SPI', label: 'SPI', instances: ['SPI0', 'SPI1'].map(id => ({ id, prefix: `${id}_`, aliases: ['synchronous serial'] })) },
      { key: 'CAN', label: 'CAN-FD', instances: [{ id: 'CAN0', display: 'CAN-FD', exact: ['CAN_TX', 'CAN_RX'], aliases: ['can', 'canfd', 'can fd'] }] },
      { key: 'Timer', label: '定时器', instances: [
        { id: 'TIMA0', prefix: 'TIMA0_', feature: 'Advanced · 4CH', aliases: [...timerAliases, 'tim0'] },
        { id: 'TIMA1', prefix: 'TIMA1_', feature: 'Advanced · 2CH', aliases: [...timerAliases, 'tim1', 'timer1'] },
        { id: 'TIMG0', prefix: 'TIMG0_', feature: 'General · 2CH', aliases: [...timerAliases, 'tim0'] },
        { id: 'TIMG6', prefix: 'TIMG6_', feature: 'General · 2CH', aliases: timerAliases },
        { id: 'TIMG7', prefix: 'TIMG7_', feature: 'General · 2CH', aliases: timerAliases },
        { id: 'TIMG8', prefix: 'TIMG8_', feature: 'QEI / Hall · 2CH', aliases: [...timerAliases, 'qei', 'encoder', '编码器', 'hall', '霍尔'] },
        { id: 'TIMG12', prefix: 'TIMG12_', feature: 'General · 32-bit · 2CH', aliases: timerAliases }
      ] },
      ...commonAnalogResources()
    ]
  }
};

function createRuntimeDeviceConfig(catalog = DEVICE_CATALOG) {
  return Object.fromEntries(Object.entries(catalog).map(([device, definition]) => {
    const packageOrder = Object.keys(definition.packages);
    return [device, {
      defaultPackage: definition.defaultPackage,
      packageOrder,
      defaultZoom: Object.fromEntries(packageOrder.map(code => [code, definition.packages[code].defaultZoom])),
      resources: definition.resources
    }];
  }));
}

function loadDeviceData(baseDirectory = __dirname, catalog = DEVICE_CATALOG) {
  return Object.fromEntries(Object.entries(catalog).map(([device, definition]) => {
    const dataPath = path.join(baseDirectory, definition.dataFile);
    return [device, JSON.parse(fs.readFileSync(dataPath, 'utf8'))];
  }));
}

function validateDeviceCatalog(catalog, devices) {
  const errors = [];
  const assert = (condition, message) => { if (!condition) errors.push(message); };
  const definitions = catalog && typeof catalog === 'object' && !Array.isArray(catalog) ? catalog : {};
  const deviceData = devices && typeof devices === 'object' && !Array.isArray(devices) ? devices : {};
  const dataFiles = new Set();
  assert(Object.keys(definitions).length > 0, 'device catalog must contain at least one device');
  Object.keys(deviceData).forEach(device => assert(Boolean(definitions[device]), `${device}: device data is not registered in the catalog`));

  for (const [device, definition] of Object.entries(definitions)) {
    const dataFileValid = typeof definition.dataFile === 'string' && definition.dataFile.length > 0;
    assert(dataFileValid, `${device}: dataFile is required`);
    if (dataFileValid) {
      assert(!dataFiles.has(definition.dataFile), `${device}: dataFile ${definition.dataFile} is already registered`);
      dataFiles.add(definition.dataFile);
    }
    assert(Boolean(deviceData[device]), `${device}: device data is missing`);
    assert(deviceData[device]?.device === device, `${device}: device data identity mismatch`);

    const packageDefinitions = definition.packages && typeof definition.packages === 'object' && !Array.isArray(definition.packages)
      ? definition.packages
      : {};
    const packageCodes = Object.keys(packageDefinitions);
    const dataPackageCodes = Object.keys(deviceData[device]?.packages || {});
    assert(packageCodes.length > 0, `${device}: at least one package is required`);
    assert(packageCodes.includes(definition.defaultPackage), `${device}: default package ${definition.defaultPackage} is unavailable`);
    dataPackageCodes.forEach(code => assert(packageCodes.includes(code), `${device} ${code}: data package is not registered in the catalog`));
    packageCodes.forEach(code => {
      const packageDefinition = packageDefinitions[code];
      const pkg = deviceData[device]?.packages?.[code];
      assert(Number.isInteger(packageDefinition.pinCount) && packageDefinition.pinCount > 0, `${device} ${code}: pinCount must be a positive integer`);
      assert(pkg?.pins?.length === packageDefinition.pinCount, `${device} ${code}: expected ${packageDefinition.pinCount} pins, found ${pkg?.pins?.length ?? 'none'}`);
      assert(Number.isFinite(packageDefinition.defaultZoom) && packageDefinition.defaultZoom >= 35 && packageDefinition.defaultZoom <= 180, `${device} ${code}: defaultZoom must be between 35 and 180`);
    });

    assert(Array.isArray(definition.resources), `${device}: resources must be an array`);
    if (!Array.isArray(definition.resources)) continue;
    const allSignals = new Set(Object.values(deviceData[device]?.packages || {}).flatMap(pkg =>
      (pkg.pins || []).flatMap(pin => (pin.functions || []).map(fn => fn.signal))
    ));
    const groupKeys = new Set();
    const instanceIds = new Set();
    definition.resources.forEach((group, groupIndex) => {
      const groupName = group?.key || `group ${groupIndex}`;
      assert(typeof group?.key === 'string' && group.key.length > 0, `${device}: resource group ${groupIndex} key is required`);
      if (typeof group?.key === 'string' && group.key.length > 0) {
        assert(!groupKeys.has(group.key), `${device}: duplicate resource group ${group.key}`);
        groupKeys.add(group.key);
      }
      assert(typeof group?.label === 'string' && group.label.length > 0, `${device} ${groupName}: label is required`);
      assert(Array.isArray(group?.instances) && group.instances.length > 0, `${device} ${groupName}: instances must contain at least one item`);
      if (!Array.isArray(group?.instances)) return;
      group.instances.forEach((instance, instanceIndex) => {
        const instanceName = instance?.id || `${groupName} instance ${instanceIndex}`;
        assert(typeof instance?.id === 'string' && instance.id.length > 0, `${device} ${groupName}: instance ${instanceIndex} id is required`);
        if (typeof instance?.id === 'string' && instance.id.length > 0) {
          assert(!instanceIds.has(instance.id), `${device}: duplicate resource instance ${instance.id}`);
          instanceIds.add(instance.id);
        }
        const hasPrefix = typeof instance?.prefix === 'string' && instance.prefix.length > 0;
        const hasExact = Array.isArray(instance?.exact) && instance.exact.length > 0
          && instance.exact.every(signal => typeof signal === 'string' && signal.length > 0);
        assert(hasPrefix !== hasExact, `${device} ${instanceName}: define exactly one non-empty prefix or exact list`);
        if (hasPrefix) assert([...allSignals].some(signal => signal.startsWith(instance.prefix)), `${device} ${instanceName}: prefix ${instance.prefix} matches no official signal`);
        if (hasExact) {
          assert(new Set(instance.exact).size === instance.exact.length, `${device} ${instanceName}: exact signals contain duplicates`);
          instance.exact.forEach(signal => assert(allSignals.has(signal), `${device} ${instanceName}: exact signal ${signal} is unavailable`));
        }
      });
    });
  }
  if (errors.length) {
    const error = new Error(`MSPM0 device catalog validation failed:\n- ${errors.join('\n- ')}`);
    error.validationErrors = errors;
    throw error;
  }
  return { devices: Object.keys(definitions).length, packages: Object.values(definitions).reduce((sum, item) => sum + Object.keys(item.packages || {}).length, 0) };
}

module.exports = { DEVICE_CATALOG, createRuntimeDeviceConfig, loadDeviceData, validateDeviceCatalog };
