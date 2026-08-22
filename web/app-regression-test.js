'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const webRoot = __dirname;
const devices = {
  MSPM0G3519: JSON.parse(fs.readFileSync(path.join(webRoot, 'pin-data.json'), 'utf8')),
  MSPM0G3507: JSON.parse(fs.readFileSync(path.join(webRoot, 'pin-data-3507.json'), 'utf8'))
};
const boardPresets = JSON.parse(fs.readFileSync(path.join(webRoot, 'board-presets.json'), 'utf8'));
const appSource = fs.readFileSync(path.join(webRoot, 'app.js'), 'utf8')
  .replace('__DEVICE_DATA__', JSON.stringify(devices))
  .replace('__BOARD_PRESETS__', JSON.stringify(boardPresets))
  .replace('__APP_META__', JSON.stringify({ version: 'test', author: 'test', productName: 'test' }));

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadApp(storageValues = {}) {
  const storage = new Map(Object.entries(storageValues));
  const elements = new Map();
  const context = vm.createContext({
    __MSPM0_TEST_MODE__: true,
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, { value: '', textContent: '' });
        return elements.get(id);
      }
    },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    }
  });
  vm.runInContext(appSource, context, { filename: 'app.js' });
  return { api: context.__MSPM0_TEST_API__, storage };
}

let passed = 0;
function test(name, run) {
  try {
    run();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test('versions and supported devices stay compatible', () => {
  const { api } = loadApp();
  assert.equal(api.SCHEMA_VERSION, 6);
  assert.equal(api.PROJECT_DATA_VERSION, 5);
  assert.deepEqual(plain(api.DEVICE_ORDER), ['MSPM0G3519', 'MSPM0G3507']);
  assert.deepEqual(plain(api.DEVICE_CONFIG.MSPM0G3519.packageOrder), ['RHB', 'RGZ', 'PT', 'PM', 'PN', 'PZ']);
  assert.deepEqual(plain(api.DEVICE_CONFIG.MSPM0G3507.packageOrder), ['RHB', 'RGZ', 'PT', 'PM']);
});

test('new projects keep official SWD and reset defaults', () => {
  const { api } = loadApp();
  const state = plain(api.createEmptyState());
  assert.equal(state.version, 5);
  assert.equal(state.activeDevice, 'MSPM0G3519');
  assert.equal(state.boardPresetId, '');
  assert.deepEqual(state.enabledBoardResources, []);
  const expectedPins = {
    RHB: { NRST: '3', SWDIO: '23', SWCLK: '24' },
    RGZ: { NRST: '4', SWDIO: '34', SWCLK: '35' },
    PT: { NRST: '4', SWDIO: '34', SWCLK: '35' },
    PM: { NRST: '38', SWDIO: '12', SWCLK: '13' },
    PN: { NRST: '6', SWDIO: '56', SWCLK: '57' },
    PZ: { NRST: '6', SWDIO: '71', SWCLK: '72' }
  };
  Object.entries(state.devices).forEach(([device, deviceState]) => {
    Object.entries(deviceState.packages).forEach(([packageCode, packageState]) => {
      const expected = expectedPins[packageCode];
      assert.equal(Object.keys(packageState.assignments).length, 3, `${device} ${packageCode}`);
      Object.entries(expected).forEach(([signal, number]) => {
        assert.equal(packageState.assignments[number].function, signal, `${device} ${packageCode} ${signal}`);
      });
    });
  });
});

test('board presets keep five clocks and three enabled resources', () => {
  const { api } = loadApp();
  for (const [presetId, device] of [
    ['tianmengxing-g3507-pm64', 'MSPM0G3507'],
    ['tianmengxing-g3519-pm64', 'MSPM0G3519']
  ]) {
    const state = plain(api.createPresetState(presetId));
    assert.equal(state.boardPresetId, presetId);
    assert.equal(state.activeDevice, device);
    assert.equal(state.devices[device].activePackage, 'PM');
    assert.deepEqual(state.enabledBoardResources, ['swd-debug', 'bsl-button', 'nrst-reset']);
    const assignments = state.devices[device].packages.PM.assignments;
    assert.equal(Object.keys(assignments).length, 9);
    assert.equal(assignments['42'].function, 'ROSC');
    assert.equal(assignments['43'].function, 'LFXIN');
    assert.equal(assignments['44'].function, 'LFXOUT');
    assert.equal(assignments['45'].function, 'HFXIN');
    assert.equal(assignments['46'].function, 'HFXOUT');
    assert.equal(assignments['12'].function, 'SWDIO');
    assert.equal(assignments['13'].function, 'SWCLK');
    assert.equal(assignments['11'].function, 'BSL_invoke');
    assert.equal(assignments['38'].function, 'NRST');
  }
});

test('assignment cleanup rejects bad pins and limits user text', () => {
  const { api } = loadApp();
  const result = plain(api.sanitizeAssignments('MSPM0G3519', 'PM', {
    33: { function: 'PA0', alias: 'A'.repeat(60), connector: 'J'.repeat(60), note: 'N'.repeat(300) },
    34: { function: 'NOT_A_REAL_SIGNAL', alias: 'kept note' },
    40: { function: 'VDD' },
    999: { function: 'PA0' }
  }));
  assert.equal(result.skipped, 2);
  assert.equal(result.assignments['33'].function, 'PA0');
  assert.equal(result.assignments['33'].alias.length, 48);
  assert.equal(result.assignments['33'].connector.length, 48);
  assert.equal(result.assignments['33'].note.length, 240);
  assert.equal(result.assignments['34'].function, '');
  assert.equal(result.assignments['34'].alias, 'kept note');
  assert.equal(result.assignments['40'], undefined);
  assert.equal(result.assignments['999'], undefined);
});

test('loading saved data does not add new-project defaults', () => {
  const { api } = loadApp();
  const state = plain(api.normalizeLoaded({
    boardPresetId: 'tianmengxing-g3519-pm64',
    enabledBoardResources: ['h8-lcd', 'bad-resource', 'h8-lcd'],
    activeDevice: 'MSPM0G3519',
    layout: { leftWidth: 9999, rightWidth: 1 },
    devices: {
      MSPM0G3519: {
        activePackage: 'PM',
        packages: { PM: { assignments: { 33: { function: 'PA0', alias: 'saved' } } } }
      }
    }
  }));
  assert.equal(state.layout.leftWidth, 460);
  assert.equal(state.layout.rightWidth, 260);
  assert.deepEqual(state.enabledBoardResources, ['h8-lcd']);
  assert.equal(state.devices.MSPM0G3519.packages.PM.assignments['33'].alias, 'saved');
  assert.equal(state.devices.MSPM0G3519.packages.PM.assignments['12'], undefined);
  assert.equal(state.devices.MSPM0G3507.packages.PM.assignments['12'], undefined);
});

test('version 4 workspace migration preserves user data', () => {
  const project = {
    id: 'legacy-project',
    name: '旧工程',
    data: {
      activeDevice: 'MSPM0G3507',
      layout: { leftWidth: 280, rightWidth: 360 },
      devices: {
        MSPM0G3507: {
          activePackage: 'PT',
          packages: { PT: { assignments: { 1: { function: 'UART0_TX', alias: '旧标签', connector: 'J4-1', note: 'migration' } } } }
        }
      }
    }
  };
  const { api } = loadApp({
    'mspm0g-pin-planner-v4': JSON.stringify({ version: 4, activeProjectId: project.id, projects: [project] })
  });
  const workspace = plain(api.loadWorkspace());
  assert.equal(workspace.version, 6);
  assert.equal(workspace.activeProjectId, 'legacy-project');
  const data = workspace.projects[0].data;
  assert.equal(data.activeDevice, 'MSPM0G3507');
  assert.equal(data.devices.MSPM0G3507.activePackage, 'PT');
  assert.deepEqual(data.devices.MSPM0G3507.packages.PT.assignments['1'], {
    function: 'UART0_TX', alias: '旧标签', connector: 'J4-1', note: 'migration'
  });
  assert.equal(data.boardPresetId, '');
  assert.deepEqual(data.enabledBoardResources, []);
});

test('legacy project imports stay compatible', () => {
  const { api } = loadApp();
  const imported = plain(api.dataFromLegacyExport({
    schemaVersion: 3,
    device: 'MSPM0G3507',
    activePackage: 'PT',
    packages: { PT: { assignments: { 1: { function: 'UART0_TX', alias: '导入标签', connector: 'J1', note: 'legacy' } } } },
    views: { PT: { zoom: 123, x: 14, y: -8, rotation: 90, initialized: true } },
    layout: { leftWidth: 300, rightWidth: 370 }
  }));
  assert.equal(imported.skipped, 0);
  assert.equal(imported.data.activeDevice, 'MSPM0G3507');
  assert.equal(imported.data.devices.MSPM0G3507.activePackage, 'PT');
  assert.equal(imported.data.devices.MSPM0G3507.packages.PT.assignments['1'].connector, 'J1');
  assert.deepEqual(imported.data.devices.MSPM0G3507.views.PT, { zoom: 123, x: 14, y: -8, rotation: 90, initialized: true });
  assert.throws(() => api.dataFromLegacyExport({ schemaVersion: 1, device: 'MSPM0G3507' }), /旧版 JSON/);
});

test('structured GPIO search matches PB1 but not PB10 or PB11', () => {
  const { api } = loadApp();
  const state = api.createEmptyState();
  state.activeDevice = 'MSPM0G3519';
  state.devices.MSPM0G3519.activePackage = 'PZ';
  api.setState(state);
  assert.deepEqual(plain(api.searchPinNames('PB1')), ['PB1']);
});

test('board resource conflicts and shared SPI lines stay predictable', () => {
  const { api } = loadApp();
  api.setState(api.createPresetState('tianmengxing-g3519-pm64'));
  api.setAssignment(58, { function: 'PB6', alias: '用户片选', connector: 'J9', note: 'keep until confirmed' });
  assert.deepEqual(plain(api.boardResourceConflictPins('spi-flash')), ['58']);

  let state = plain(api.applyBoardResource('spi-flash', true));
  let assignments = state.devices.MSPM0G3519.packages.PM.assignments;
  assert.equal(assignments['58'].function, 'SPI1_CS0');
  assert.equal(assignments['58'].alias, '');
  assert.equal(assignments['60'].function, 'SPI1_PICO');
  assert.equal(assignments['61'].function, 'SPI1_SCK');

  state = plain(api.applyBoardResource('h8-lcd', true));
  assert.ok(state.enabledBoardResources.includes('spi-flash'));
  assert.ok(state.enabledBoardResources.includes('h8-lcd'));
  assignments = state.devices.MSPM0G3519.packages.PM.assignments;
  assert.equal(assignments['60'].function, 'SPI1_PICO');
  assert.equal(assignments['61'].function, 'SPI1_SCK');

  state = plain(api.applyBoardResource('spi-flash', false));
  assignments = state.devices.MSPM0G3519.packages.PM.assignments;
  assert.equal(assignments['58'], undefined);
  assert.equal(assignments['59'], undefined);
  assert.equal(assignments['60'].function, 'SPI1_PICO');
  assert.equal(assignments['61'].function, 'SPI1_SCK');

  state = plain(api.applyBoardResource('h8-lcd', false));
  assignments = state.devices.MSPM0G3519.packages.PM.assignments;
  assert.equal(assignments['2'], undefined);
  assert.equal(assignments['28'], undefined);
  assert.equal(assignments['60'], undefined);
  assert.equal(assignments['61'], undefined);
  assert.equal(assignments['62'], undefined);
  assert.equal(assignments['63'], undefined);
  assert.equal(assignments['42'].function, 'ROSC');
});

test('disabling a board resource preserves a user-selected replacement', () => {
  const { api } = loadApp();
  api.setState(api.createPresetState('tianmengxing-g3519-pm64'));
  api.applyBoardResource('user-led', true);
  const pin = devices.MSPM0G3519.packages.PM.pins.find(item => item.number === 21);
  const replacement = pin.functions.find(item => item.signal !== 'PB22').signal;
  api.setAssignment(21, { function: replacement, alias: '用户功能', connector: 'J2', note: 'must survive' });
  const state = plain(api.applyBoardResource('user-led', false));
  assert.deepEqual(state.devices.MSPM0G3519.packages.PM.assignments['21'], {
    function: replacement, alias: '用户功能', connector: 'J2', note: 'must survive'
  });
});

test('export text helpers keep CSV, file names and HTML safe', () => {
  const { api } = loadApp();
  assert.equal(api.csvEscape('a,"b"'), '"a,""b"""');
  assert.equal(api.safeFileName('  bad:name / project  '), 'bad-name---project');
  assert.equal(api.escapeHtml('<b title="x">&\'</b>'), '&lt;b title=&quot;x&quot;&gt;&amp;&#39;&lt;/b&gt;');
});

console.log(`App regression checks passed: ${passed}`);
