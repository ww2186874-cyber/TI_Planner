'use strict';

const { validateBoardSchema } = require('./board-schema-validation');

const TIANMENGXING_BOARD_ID = 'tianmengxing-pm64';
const EXPECTED_TIANMENGXING_PRESETS = {
  'tianmengxing-g3507-pm64': 'MSPM0G3507',
  'tianmengxing-g3519-pm64': 'MSPM0G3519'
};
const EXPECTED_FIXED_DEFAULTS = {
  42: 'ROSC', 43: 'LFXIN', 44: 'LFXOUT', 45: 'HFXIN', 46: 'HFXOUT'
};

const EXPECTED_RESOURCES = {
  'spi-flash': {
    kind: 'onboard', bus: 'SPI1', pins: { 58: 'CS#', 59: 'MISO', 60: 'MOSI', 61: 'CLK' },
    assignments: { 58: 'SPI1_CS0', 59: 'SPI1_POCI', 60: 'SPI1_PICO', 61: 'SPI1_SCK' }
  },
  'h8-lcd': {
    kind: 'optional', bus: 'SPI1', pins: { 2: 'CS', 28: 'BL', 60: 'SDA', 61: 'SCL', 62: 'RES', 63: 'DC' },
    assignments: { 2: 'SPI1_CS3', 28: 'PB26', 60: 'SPI1_PICO', 61: 'SPI1_SCK', 62: 'PB10', 63: 'PB11' }
  },
  'ch340-uart': {
    kind: 'onboard', pins: { 56: 'TX', 57: 'RX' },
    assignments: { 56: 'UART0_TX', 57: 'UART0_RX' }
  },
  'swd-debug': {
    kind: 'onboard', pins: { 12: 'DIO', 13: 'CLK' },
    assignments: { 12: 'SWDIO', 13: 'SWCLK' }
  },
  'bsl-button': { kind: 'onboard', pins: { 11: 'BSL' }, assignments: { 11: 'BSL_invoke' } },
  'user-button': { kind: 'onboard', pins: { 20: 'KEY' }, assignments: { 20: 'PB21' } },
  'user-led': { kind: 'onboard', pins: { 21: 'LED' }, assignments: { 21: 'PB22' } },
  'nrst-reset': { kind: 'onboard', pins: { 38: 'RESET' }, assignments: { 38: 'NRST' } }
};

function validateTianmengxingBoardContract(data, devices) {
  const errors = [];
  const assert = (condition, message) => { if (!condition) errors.push(message); };
  const board = data?.boards?.[TIANMENGXING_BOARD_ID];
  assert(Boolean(board), `board presets: ${TIANMENGXING_BOARD_ID} is missing`);
  if (!board) {
    const error = new Error(`MSPM0 Tianmengxing board validation failed:\n- ${errors.join('\n- ')}`);
    error.validationErrors = errors;
    throw error;
  }

  assert(board.package === 'PM', 'Tianmengxing: package must be PM');
  assert(JSON.stringify(board.compatibleDevices) === JSON.stringify(['MSPM0G3507', 'MSPM0G3519']), 'Tianmengxing: compatible devices mismatch');

  const records = Object.entries(board.pins || {});
  const headerGpios = records.filter(([, item]) => item.header && /^P[A-Z]\d+$/.test(item.name));
  assert(headerGpios.length === 56, `Tianmengxing: expected 56 GPIO header mappings, found ${headerGpios.length}`);
  assert(new Set(headerGpios.map(([, item]) => item.header)).size === 56, 'Tianmengxing: duplicate GPIO header terminal');
  assert(new Set(headerGpios.map(([, item]) => item.name)).size === 56, 'Tianmengxing: duplicate GPIO header name');

  const unexposed = records.filter(([, item]) => item.status === 'unexposed').map(([, item]) => item.name).sort();
  assert(JSON.stringify(unexposed) === JSON.stringify(['PA3', 'PA4', 'PA5', 'PA6']), 'Tianmengxing: unexposed oscillator pins mismatch');
  assert(JSON.stringify(board.fixedDefaults) === JSON.stringify(EXPECTED_FIXED_DEFAULTS), 'Tianmengxing: fixed default assignments mismatch');
  assert(Array.isArray(board.fixedHardware) && board.fixedHardware.length === 5, 'Tianmengxing: fixed hardware records mismatch');
  assert(board.pins?.['32']?.name === 'VCORE' && board.pins?.['32']?.status === 'fixed', 'Tianmengxing: VCORE board connection missing');
  assert(board.pins?.['40']?.name === 'VDD' && board.pins?.['40']?.status === 'fixed', 'Tianmengxing: VDD board connection missing');
  assert(board.pins?.['41']?.name === 'VSS' && board.pins?.['41']?.status === 'fixed', 'Tianmengxing: VSS board connection missing');
  assert(board.pins?.['38']?.header === 'U22-35', 'Tianmengxing: NRST header mapping mismatch');

  const resources = new Map((board.resources || []).map(item => [item.id, item]));
  assert(resources.size === Object.keys(EXPECTED_RESOURCES).length, 'Tianmengxing: expected eight switchable resources');
  Object.entries(EXPECTED_RESOURCES).forEach(([id, expected]) => {
    const resource = resources.get(id);
    assert(Boolean(resource), `Tianmengxing: resource ${id} is missing`);
    if (!resource) return;
    assert(resource.kind === expected.kind, `Tianmengxing: resource ${id} kind mismatch`);
    const expectedDefaultEnabled = id === 'swd-debug' || id === 'bsl-button' || id === 'nrst-reset';
    assert(resource.defaultEnabled === expectedDefaultEnabled, `Tianmengxing: resource ${id} default state mismatch`);
    const expectedRecommended = id === 'swd-debug' || id === 'nrst-reset';
    assert(Boolean(resource.recommended) === expectedRecommended, `Tianmengxing: resource ${id} recommendation mismatch`);
    assert(JSON.stringify(resource.pins) === JSON.stringify(expected.pins), `Tianmengxing: resource ${id} pin mapping mismatch`);
    assert(JSON.stringify(resource.assignments) === JSON.stringify(expected.assignments), `Tianmengxing: resource ${id} assignments mismatch`);
  });

  const flash = resources.get('spi-flash');
  const h8 = resources.get('h8-lcd');
  assert(flash?.bus === 'SPI1' && h8?.bus === 'SPI1', 'Tianmengxing: SPI1 board resources missing');
  const sharedSpi = board.sharedBuses?.find(item => item.id === 'SPI1');
  assert(JSON.stringify(sharedSpi?.resources) === JSON.stringify(['spi-flash', 'h8-lcd']), 'Tianmengxing: SPI1 shared resources mismatch');
  assert(JSON.stringify(sharedSpi?.pins) === JSON.stringify(['60', '61']), 'Tianmengxing: SPI1 shared pins mismatch');
  assert(sharedSpi?.chipSelectPins?.['spi-flash']?.includes('PB6'), 'Tianmengxing: SPI Flash chip select description missing');
  assert(sharedSpi?.chipSelectPins?.['h8-lcd']?.includes('PB14'), 'Tianmengxing: LCD chip select description missing');

  const tianmengxingPresets = Object.entries(data.presets || {}).filter(([, preset]) => preset?.boardId === TIANMENGXING_BOARD_ID);
  assert(tianmengxingPresets.length === Object.keys(EXPECTED_TIANMENGXING_PRESETS).length, 'Tianmengxing: exactly two device presets must reference tianmengxing-pm64');
  for (const [expectedId, expectedDevice] of Object.entries(EXPECTED_TIANMENGXING_PRESETS)) {
    const preset = data.presets?.[expectedId];
    assert(preset?.boardId === TIANMENGXING_BOARD_ID, `${expectedId}: Tianmengxing preset is missing`);
    assert(preset?.device === expectedDevice, `${expectedId}: expected device ${expectedDevice}`);
  }

  for (const [presetId, preset] of tianmengxingPresets) {
    assert(Object.hasOwn(EXPECTED_TIANMENGXING_PRESETS, presetId), `${presetId}: unexpected Tianmengxing preset`);
    assert(preset.package === 'PM', `${presetId}: package must be PM`);
    const pins = devices[preset.device]?.packages?.PM?.pins || [];
    const byNumber = new Map(pins.map(pin => [String(pin.number), pin]));
    records.forEach(([number, item]) => assert(byNumber.get(number)?.name === item.name, `${presetId}: Pin ${number} expected ${item.name}, found ${byNumber.get(number)?.name || 'none'}`));
    Object.entries(board.fixedDefaults).forEach(([number, signal]) => {
      const pin = byNumber.get(number);
      assert(pin?.functions?.some(fn => fn.signal === signal), `${presetId}: ${signal} is unavailable on Pin ${number}`);
    });
    Object.entries(EXPECTED_RESOURCES).forEach(([id, expected]) => Object.entries(expected.assignments).forEach(([number, signal]) => {
      const pin = byNumber.get(number);
      assert(pin?.functions?.some(fn => fn.signal === signal), `${presetId}: ${id} ${signal} is unavailable on Pin ${number}`);
    }));
  }

  if (errors.length) {
    const error = new Error(`MSPM0 Tianmengxing board validation failed:\n- ${errors.join('\n- ')}`);
    error.validationErrors = errors;
    throw error;
  }
  return { headerGpios: headerGpios.length, presets: tianmengxingPresets.length };
}

function validateBoardPresets(data, devices) {
  const summary = validateBoardSchema(data, devices);
  const tianmengxing = validateTianmengxingBoardContract(data, devices);
  return { ...summary, headerGpios: tianmengxing.headerGpios };
}

module.exports = {
  EXPECTED_FIXED_DEFAULTS,
  EXPECTED_RESOURCES,
  TIANMENGXING_BOARD_ID,
  validateBoardPresets,
  validateTianmengxingBoardContract
};
