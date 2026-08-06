'use strict';

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

function validateBoardPresets(data, devices) {
  const errors = [];
  const assert = (condition, message) => { if (!condition) errors.push(message); };
  const board = data?.boards?.['tianmengxing-pm64'];
  assert(data?.version === 2, 'board presets: version must be 2');
  assert(Boolean(board), 'board presets: tianmengxing-pm64 is missing');
  if (!board) throw new Error(errors.join('\n'));

  assert(board.package === 'PM', 'Tianmengxing: package must be PM');
  assert(JSON.stringify(board.compatibleDevices) === JSON.stringify(['MSPM0G3507', 'MSPM0G3519']), 'Tianmengxing: compatible devices mismatch');
  for (const field of ['document', 'revision', 'pages', 'retrieved']) {
    assert(Boolean(board.source?.[field]), `Tianmengxing: source.${field} is required`);
  }

  const records = Object.entries(board.pins || {});
  const headerGpios = records.filter(([, item]) => item.header && /^P[A-Z]\d+$/.test(item.name));
  assert(headerGpios.length === 56, `Tianmengxing: expected 56 GPIO header mappings, found ${headerGpios.length}`);
  assert(new Set(headerGpios.map(([, item]) => item.header)).size === 56, 'Tianmengxing: duplicate GPIO header terminal');
  assert(new Set(headerGpios.map(([, item]) => item.name)).size === 56, 'Tianmengxing: duplicate GPIO header name');

  const unexposed = records.filter(([, item]) => item.status === 'unexposed').map(([, item]) => item.name).sort();
  assert(JSON.stringify(unexposed) === JSON.stringify(['PA3', 'PA4', 'PA5', 'PA6']), 'Tianmengxing: unexposed oscillator pins mismatch');
  records.forEach(([number, item]) => {
    assert(['header', 'occupied', 'special', 'unexposed'].includes(item.status), `Tianmengxing Pin ${number}: invalid board status`);
    assert(Boolean(item.name), `Tianmengxing Pin ${number}: name missing`);
    if (item.status === 'unexposed') assert(!item.header, `Tianmengxing Pin ${number}: unexposed pin cannot have a header terminal`);
  });

  assert(JSON.stringify(board.fixedDefaults) === JSON.stringify(EXPECTED_FIXED_DEFAULTS), 'Tianmengxing: fixed default assignments mismatch');
  assert(Array.isArray(board.fixedHardware) && board.fixedHardware.length === 5, 'Tianmengxing: fixed hardware records mismatch');
  assert(board.pins?.['38']?.header === 'U22-35', 'Tianmengxing: NRST header mapping mismatch');
  const resources = new Map((board.resources || []).map(item => [item.id, item]));
  assert(resources.size === Object.keys(EXPECTED_RESOURCES).length, 'Tianmengxing: expected eight switchable resources');
  Object.entries(EXPECTED_RESOURCES).forEach(([id, expected]) => {
    const resource = resources.get(id);
    assert(Boolean(resource), `Tianmengxing: resource ${id} is missing`);
    if (!resource) return;
    assert(resource.kind === expected.kind, `Tianmengxing: resource ${id} kind mismatch`);
    assert(resource.defaultEnabled === false, `Tianmengxing: resource ${id} must default disabled`);
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

  for (const [presetId, preset] of Object.entries(data.presets || {})) {
    assert(preset.id === presetId, `${presetId}: preset identity mismatch`);
    assert(preset.boardId === board.id, `${presetId}: board reference mismatch`);
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
  assert(Object.keys(data.presets || {}).length === 2, 'Tianmengxing: exactly two device presets are required');

  if (errors.length) {
    const error = new Error(`MSPM0 board preset validation failed:\n- ${errors.join('\n- ')}`);
    error.validationErrors = errors;
    throw error;
  }
  return { boards: Object.keys(data.boards).length, presets: Object.keys(data.presets).length, headerGpios: headerGpios.length };
}

module.exports = { validateBoardPresets };
