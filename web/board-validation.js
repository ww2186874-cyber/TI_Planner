'use strict';

const EXPECTED_DEFAULTS = {
  11: 'BSL_invoke', 12: 'SWDIO', 13: 'SWCLK', 20: 'PB21', 21: 'PB22', 38: 'NRST',
  42: 'ROSC', 43: 'LFXIN', 44: 'LFXOUT', 45: 'HFXIN', 46: 'HFXOUT',
  56: 'UART0_TX', 57: 'UART0_RX', 58: 'SPI1_CS0', 59: 'SPI1_POCI', 60: 'SPI1_PICO', 61: 'SPI1_SCK'
};

function validateBoardPresets(data, devices) {
  const errors = [];
  const assert = (condition, message) => { if (!condition) errors.push(message); };
  const board = data?.boards?.['tianmengxing-pm64'];
  assert(data?.version === 1, 'board presets: version must be 1');
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

  assert(JSON.stringify(board.defaults) === JSON.stringify(Object.fromEntries(Object.entries(EXPECTED_DEFAULTS).map(([key, value]) => [key, value]))), 'Tianmengxing: default assignments mismatch');
  assert(board.pins?.['38']?.header === 'U22-35', 'Tianmengxing: NRST header mapping mismatch');
  const flash = board.resources?.find(item => item.id === 'spi-flash');
  const h8 = board.resources?.find(item => item.id === 'h8-lcd');
  assert(flash?.kind === 'onboard' && flash?.bus === 'SPI1', 'Tianmengxing: onboard SPI Flash resource missing');
  assert(JSON.stringify(flash?.pins) === JSON.stringify({ 58: 'CS#', 59: 'MISO', 60: 'MOSI', 61: 'CLK' }), 'Tianmengxing: SPI Flash mapping mismatch');
  assert(h8?.kind === 'optional' && h8?.bus === 'SPI1', 'Tianmengxing: optional H8 LCD resource missing');
  assert(JSON.stringify(h8?.pins) === JSON.stringify({ 2: 'CS', 28: 'BL', 60: 'SDA', 61: 'SCL', 62: 'RES', 63: 'DC' }), 'Tianmengxing: H8 mapping mismatch');
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
    Object.entries(board.defaults).forEach(([number, signal]) => {
      const pin = byNumber.get(number);
      assert(pin?.functions?.some(fn => fn.signal === signal), `${presetId}: ${signal} is unavailable on Pin ${number}`);
    });
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
