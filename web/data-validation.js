'use strict';

const EXPECTATIONS = {
  MSPM0G3519: {
    packages: { RHB: [32, 29], RGZ: [48, 45], PT: [48, 45], PM: [64, 61], PN: [80, 75], PZ: [100, 95] },
    uart: ['UART0', 'UART1', 'UART3', 'UART4', 'UART5', 'UART6', 'UART7'],
    i2c: ['I2C0', 'I2C1', 'I2C2'],
    spi: ['SPI0', 'SPI1', 'SPI2'],
    timers: ['TIMA0', 'TIMA1', 'TIMG0', 'TIMG6', 'TIMG7', 'TIMG8', 'TIMG9', 'TIMG12', 'TIMG14'],
    qei: ['TIMG8', 'TIMG9']
  },
  MSPM0G3507: {
    packages: { RHB: [32, 29], RGZ: [48, 45], PT: [48, 45], PM: [64, 61] },
    uart: ['UART0', 'UART1', 'UART2', 'UART3'],
    i2c: ['I2C0', 'I2C1'],
    spi: ['SPI0', 'SPI1'],
    timers: ['TIMA0', 'TIMA1', 'TIMG0', 'TIMG6', 'TIMG7', 'TIMG8', 'TIMG12'],
    qei: ['TIMG8']
  }
};

const RHB_PIN_NAMES = [
  'PA0', 'PA1', 'NRST', 'VDD', 'VSS',
  ...Array.from({ length: 26 }, (_, index) => `PA${index + 2}`),
  'VCORE'
];

function pinDefinition(pin) {
  const { number, ...definition } = pin;
  return definition;
}

function validateDevices(devices) {
  const errors = [];
  const summary = {};
  const assert = (condition, message) => { if (!condition) errors.push(message); };

  for (const [deviceName, expected] of Object.entries(EXPECTATIONS)) {
    const device = devices[deviceName];
    assert(device?.device === deviceName, `${deviceName}: device identity mismatch`);
    if (!device) continue;
    for (const field of ['document', 'revision', 'pages', 'url', 'retrieved']) {
      assert(Boolean(device.source?.[field]), `${deviceName}: source.${field} is required`);
    }

    const allSignals = new Set();
    const packageSummary = {};
    for (const [packageCode, [pinCount, gpioCount]] of Object.entries(expected.packages)) {
      const pkg = device.packages?.[packageCode];
      assert(Boolean(pkg), `${deviceName} ${packageCode}: package missing`);
      if (!pkg) continue;
      assert(pkg.pins.length === pinCount, `${deviceName} ${packageCode}: expected ${pinCount} pins, found ${pkg.pins.length}`);
      assert(pkg.pinCount === pinCount, `${deviceName} ${packageCode}: pinCount metadata mismatch`);
      const numbers = pkg.pins.map(pin => pin.number);
      assert(new Set(numbers).size === pinCount, `${deviceName} ${packageCode}: duplicate physical pin numbers`);
      assert(numbers.every((number, index) => number === index + 1), `${deviceName} ${packageCode}: physical pin numbers are not continuous`);
      const configurable = pkg.pins.filter(pin => !pin.fixed);
      assert(configurable.length === gpioCount, `${deviceName} ${packageCode}: expected ${gpioCount} configurable pins, found ${configurable.length}`);
      for (const pin of pkg.pins) {
        assert(Boolean(pin.name), `${deviceName} ${packageCode} Pin ${pin.number}: pin name missing`);
        if (pin.fixed) continue;
        assert(Array.isArray(pin.functions) && pin.functions.length > 0, `${deviceName} ${packageCode} Pin ${pin.number}: functions missing`);
        assert(pin.functions.some(fn => fn.signal === pin.name), `${deviceName} ${packageCode} Pin ${pin.number}: base function missing`);
        if (/^P[A-Z]\d+$/.test(pin.name)) {
          assert(pin.functions.some(fn => fn.signal === pin.name && fn.category === 'GPIO'), `${deviceName} ${packageCode} Pin ${pin.number}: GPIO base function missing`);
        }
        const signals = pin.functions.map(fn => fn.signal);
        assert(new Set(signals).size === signals.length, `${deviceName} ${packageCode} Pin ${pin.number}: duplicate function signals`);
        pin.functions.forEach(fn => {
          assert(Boolean(fn.signal && fn.category), `${deviceName} ${packageCode} Pin ${pin.number}: invalid function record`);
          allSignals.add(fn.signal);
        });
      }
      packageSummary[packageCode] = { pins: pinCount, configurable: configurable.length, fixed: pinCount - configurable.length };
    }

    assert(
      JSON.stringify(device.packages.RGZ.pins) === JSON.stringify(device.packages.PT.pins),
      `${deviceName}: RGZ pin data must match PT pin data`
    );
    assert(
      device.packages.RHB.pins.every((pin, index) => pin.name === RHB_PIN_NAMES[index]),
      `${deviceName}: RHB physical pin mapping does not match the official package diagram`
    );
    for (const rhbPin of device.packages.RHB.pins) {
      const ptPin = device.packages.PT.pins.find(pin => pin.name === rhbPin.name);
      assert(Boolean(ptPin), `${deviceName}: PT source pin ${rhbPin.name} is missing for RHB`);
      if (ptPin) {
        assert(
          JSON.stringify(pinDefinition(rhbPin)) === JSON.stringify(pinDefinition(ptPin)),
          `${deviceName}: RHB ${rhbPin.name} does not match the same-device PT function data`
        );
      }
    }

    const expectPrefix = instance => assert([...allSignals].some(signal => signal.startsWith(`${instance}_`)), `${deviceName}: peripheral instance ${instance} has no signals`);
    [...expected.uart, ...expected.i2c, ...expected.spi, ...expected.timers].forEach(expectPrefix);
    if (deviceName === 'MSPM0G3519') {
      ['CAN0_TX', 'CAN0_RX', 'CAN1_TX', 'CAN1_RX'].forEach(signal => assert(allSignals.has(signal), `${deviceName}: ${signal} missing`));
    } else {
      ['CAN_TX', 'CAN_RX'].forEach(signal => assert(allSignals.has(signal), `${deviceName}: ${signal} missing`));
    }
    expected.qei.forEach(instance => ['C0', 'C1', 'IDX'].forEach(suffix => assert(allSignals.has(`${instance}_${suffix}`), `${deviceName}: ${instance}_${suffix} missing`)));
    summary[deviceName] = { source: device.source, packages: packageSummary, uniqueSignals: allSignals.size };
  }

  if (errors.length) {
    const error = new Error(`MSPM0 data validation failed:\n- ${errors.join('\n- ')}`);
    error.validationErrors = errors;
    throw error;
  }
  return summary;
}

module.exports = { EXPECTATIONS, validateDevices };
