'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildApplicationSource } = require('./app-bundle');
const { createRuntimeDeviceConfig, loadDeviceData } = require('./device-catalog');

const webRoot = __dirname;
const devices = loadDeviceData();
const deviceConfig = createRuntimeDeviceConfig();
const boardPresets = JSON.parse(fs.readFileSync(path.join(webRoot, 'board-presets.json'), 'utf8'));
const appSource = buildApplicationSource()
  .replace('__DEVICE_DATA__', JSON.stringify(devices))
  .replace('__DEVICE_CONFIG__', JSON.stringify(deviceConfig))
  .replace('__BOARD_PRESETS__', JSON.stringify(boardPresets))
  .replace('__APP_META__', JSON.stringify({ version: 'test', author: 'test', productName: 'test' }));

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadApp(storageValues = {}) {
  const storage = new Map(Object.entries(storageValues));
  const elements = new Map();
  const downloads = [];
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
    },
    window: {
      alert() {},
      mspm0Desktop: {
        saveFile(payload) {
          downloads.push(JSON.parse(JSON.stringify(payload)));
          return Promise.resolve();
        }
      }
    }
  });
  vm.runInContext(appSource, context, { filename: 'app.js' });
  return { api: context.__MSPM0_TEST_API__, downloads, storage };
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

test('versions and supported targets use the fixed-project schema', () => {
  const { api } = loadApp();
  assert.equal(api.SCHEMA_VERSION, 7);
  assert.equal(api.PROJECT_DATA_VERSION, 6);
  assert.equal(api.STORAGE_KEY, 'mspm0g-pin-planner-v7');
  assert.deepEqual(plain(api.DEVICE_ORDER), ['MSPM0G3519', 'MSPM0G3507']);
  assert.deepEqual(plain(api.DEVICE_CONFIG.MSPM0G3519.packageOrder), ['RHB', 'RGZ', 'PT', 'PM', 'PN', 'PZ']);
  assert.deepEqual(plain(api.DEVICE_CONFIG.MSPM0G3507.packageOrder), ['RHB', 'RGZ', 'PT', 'PM']);
});

test('a new workspace starts empty and ignores prerelease v6 storage', () => {
  const oldProject = { version: 6, activeProjectId: 'old', projects: [{ id: 'old', data: {} }] };
  const { api, storage } = loadApp({ 'mspm0g-pin-planner-v6': JSON.stringify(oldProject) });
  const workspace = plain(api.loadWorkspace());
  assert.equal(workspace.version, 7);
  assert.equal(workspace.activeProjectId, '');
  assert.deepEqual(workspace.projects, []);
  assert.equal(api.projectCreationRequired(), true);
  assert.equal(storage.get('mspm0g-pin-planner-v6'), JSON.stringify(oldProject));
});

test('project capacity rejects operations that would vanish after restart', () => {
  const { api } = loadApp();
  assert.equal(api.MAX_PROJECTS, 40);
  api.setState(api.createProjectState('MSPM0G3519', 'PM'));
  assert.doesNotThrow(() => api.ensureProjectCapacity(39));
  assert.throws(() => api.ensureProjectCapacity(40), /40/);
  assert.throws(() => api.ensureProjectCapacity(-1), /40/);
});

test('each device and package creates only one immutable target', () => {
  const { api } = loadApp();
  const expectedPins = {
    RHB: { NRST: '3', SWDIO: '23', SWCLK: '24' },
    RGZ: { NRST: '4', SWDIO: '34', SWCLK: '35' },
    PT: { NRST: '4', SWDIO: '34', SWCLK: '35' },
    PM: { NRST: '38', SWDIO: '12', SWCLK: '13' },
    PN: { NRST: '6', SWDIO: '56', SWCLK: '57' },
    PZ: { NRST: '6', SWDIO: '71', SWCLK: '72' }
  };
  Object.entries(deviceConfig).forEach(([device, config]) => config.packageOrder.forEach(packageCode => {
    const state = plain(api.createProjectState(device, packageCode));
    assert.equal(state.version, 6);
    assert.equal(state.device, device);
    assert.equal(state.package, packageCode);
    assert.equal('activeDevice' in state, false);
    assert.equal('activePackage' in state, false);
    assert.equal('devices' in state, false);
    assert.equal(Object.keys(state.assignments).length, 3, `${device} ${packageCode}`);
    Object.entries(expectedPins[packageCode]).forEach(([signal, number]) => {
      assert.equal(state.assignments[number].function, signal, `${device} ${packageCode} ${signal}`);
    });
  }));
});

test('creation target validation accepts blank targets and locks presets', () => {
  const { api } = loadApp();
  assert.deepEqual(plain(api.resolveProjectTarget({ device: 'MSPM0G3519', packageCode: 'PZ' })), {
    templateId: '', device: 'MSPM0G3519', package: 'PZ'
  });
  assert.deepEqual(plain(api.resolveProjectTarget({
    templateId: 'tianmengxing-g3507-pm64', device: 'MSPM0G3507', packageCode: 'PM'
  })), {
    templateId: 'tianmengxing-g3507-pm64', device: 'MSPM0G3507', package: 'PM'
  });
  assert.throws(() => api.resolveProjectTarget({ device: 'MSPM0G3507', packageCode: 'PZ' }), /有效/);
  assert.throws(() => api.resolveProjectTarget({
    templateId: 'tianmengxing-g3507-pm64', device: 'MSPM0G3519', packageCode: 'PM'
  }), /不匹配/);
  assert.throws(() => api.resolveProjectTarget({ templateId: 'missing', device: 'MSPM0G3507', packageCode: 'PM' }), /不存在/);
});

test('resource detail expands the left region without overlaying the canvas budget', () => {
  const { api } = loadApp();
  [1100, 1300, 1440, 2048].forEach(width => {
    const closed = plain(api.calculateLayoutMetrics(width, 250, 330, false));
    const open = plain(api.calculateLayoutMetrics(width, 250, 330, true));
    assert.equal(closed.detailWidth, 0, `${width} closed detail`);
    assert.ok(open.detailWidth > 0, `${width} open detail`);
    assert.equal(open.leftRegionWidth, open.leftWidth + open.detailWidth, `${width} left region`);
    assert.ok(open.centerWidth < closed.centerWidth, `${width} canvas must shrink`);
    assert.ok(open.centerWidth >= 360, `${width} canvas remains usable`);
    assert.equal(closed.leftWidth, 250, `${width} saved base sidebar remains unchanged`);
    if (width >= 1300) assert.equal(open.leftWidth, 250, `${width} wide sidebar remains stable`);
  });
  const desktopMinimum = plain(api.calculateLayoutMetrics(1100, 250, 330, true));
  assert.equal(desktopMinimum.inspectorStacked, false);
  assert.equal(desktopMinimum.rightWidth, 260);
  const breakpointWide = plain(api.calculateLayoutMetrics(1065, 250, 330, true));
  assert.equal(breakpointWide.inspectorStacked, false);
  assert.ok(breakpointWide.detailWidth >= 180);
  assert.ok(breakpointWide.centerWidth >= 420);
  const stacked = plain(api.calculateLayoutMetrics(1064, 250, 330, true));
  assert.equal(stacked.inspectorStacked, true);
  assert.equal(stacked.rightWidth, 0);
  assert.ok(stacked.detailWidth >= 220);
  assert.ok(stacked.centerWidth >= 360);
  const wide = plain(api.calculateLayoutMetrics(2048, 250, 330, true));
  assert.equal(wide.inspectorStacked, false);
  assert.equal(wide.rightWidth, 330);
  assert.equal(wide.detailWidth, 270);
});

test('resource instance and signal selection drive one transient detail pane', () => {
  const { api } = loadApp();
  api.setState(api.createProjectState('MSPM0G3519', 'PM'));
  api.setSidebarMode('resources');
  assert.equal(api.selectResourceInstance('UART0'), true);
  assert.deepEqual(plain(api.resourceSelection()), {
    sidebarView: 'resources', selectedResourceId: 'UART0', selectedSignal: '', open: true
  });
  assert.equal(api.selectResourceSignal('UART0_TX'), true);
  assert.equal(api.resourceSelection().selectedSignal, 'UART0_TX');
  assert.equal(api.selectResourceSignal('UART0_TX'), true);
  assert.equal(api.resourceSelection().selectedSignal, '');
  assert.equal(api.selectResourceInstance('UART1'), true);
  assert.equal(api.resourceSelection().selectedResourceId, 'UART1');
  assert.equal(api.resourceSelection().open, true);
  assert.equal(api.selectResourceInstance('UART1'), true);
  assert.equal(api.resourceSelection().open, false);
  api.selectResourceInstance('missing');
  assert.equal(api.resourceSelection().open, false);
  api.selectResourceInstance('UART0');
  api.setSidebarMode('pins');
  assert.deepEqual(plain(api.resourceSelection()), {
    sidebarView: 'pins', selectedResourceId: '', selectedSignal: '', open: false
  });
});

test('board templates fix one PM target and keep their defaults', () => {
  const { api } = loadApp();
  for (const [presetId, device] of [
    ['tianmengxing-g3507-pm64', 'MSPM0G3507'],
    ['tianmengxing-g3519-pm64', 'MSPM0G3519']
  ]) {
    const state = plain(api.createPresetState(presetId));
    assert.equal(state.boardPresetId, presetId);
    assert.equal(state.device, device);
    assert.equal(state.package, 'PM');
    assert.deepEqual(state.enabledBoardResources, ['swd-debug', 'bsl-button', 'nrst-reset']);
    assert.equal(Object.keys(state.assignments).length, 9);
    assert.equal(state.assignments['42'].function, 'ROSC');
    assert.equal(state.assignments['43'].function, 'LFXIN');
    assert.equal(state.assignments['44'].function, 'LFXOUT');
    assert.equal(state.assignments['45'].function, 'HFXIN');
    assert.equal(state.assignments['46'].function, 'HFXOUT');
    assert.equal(state.assignments['12'].function, 'SWDIO');
    assert.equal(state.assignments['13'].function, 'SWCLK');
    assert.equal(state.assignments['11'].function, 'BSL_invoke');
    assert.equal(state.assignments['38'].function, 'NRST');
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

test('loading fixed project data does not add creation defaults', () => {
  const { api } = loadApp();
  const state = plain(api.normalizeLoaded({
    version: 6,
    device: 'MSPM0G3519',
    package: 'PM',
    boardPresetId: 'tianmengxing-g3519-pm64',
    enabledBoardResources: ['h8-lcd', 'bad-resource', 'h8-lcd'],
    layout: { leftWidth: 9999, rightWidth: 1 },
    assignments: { 33: { function: 'PA0', alias: 'saved' } }
  }));
  assert.equal(state.layout.leftWidth, 460);
  assert.equal(state.layout.rightWidth, 260);
  assert.deepEqual(state.enabledBoardResources, ['h8-lcd']);
  assert.equal(state.assignments['33'].alias, 'saved');
  assert.equal(state.assignments['12'], undefined);
});

test('v7 workspaces preserve fixed targets and discard invalid projects', () => {
  const { api } = loadApp();
  const good = api.createProject('固定工程', api.createProjectState('MSPM0G3507', 'PT'));
  good.data.assignments = { 1: { function: 'UART0_TX', alias: '保存内容', connector: 'J4-1', note: 'fixed' } };
  const workspace = plain(api.normalizeWorkspace({
    version: 7,
    activeProjectId: good.id,
    projects: [good, { id: 'bad', name: '坏工程', data: { version: 5 } }]
  }));
  assert.equal(workspace.projects.length, 1);
  assert.equal(workspace.activeProjectId, good.id);
  assert.equal(workspace.projects[0].data.device, 'MSPM0G3507');
  assert.equal(workspace.projects[0].data.package, 'PT');
  assert.equal(workspace.projects[0].data.assignments['1'].alias, '保存内容');
  assert.deepEqual(plain(api.normalizeWorkspace({ version: 6, projects: [good] }).projects), []);
});

test('normalization rejects invalid targets and mismatched board identity', () => {
  const { api } = loadApp();
  assert.throws(() => api.normalizeLoaded({ version: 6, device: 'MSPM0G3507', package: 'PZ' }), /无效/);
  assert.throws(() => api.normalizeLoaded({ version: 5, device: 'MSPM0G3507', package: 'PM' }), /版本/);
  const state = plain(api.normalizeLoaded({
    version: 6,
    device: 'MSPM0G3507',
    package: 'PT',
    boardPresetId: 'tianmengxing-g3507-pm64',
    enabledBoardResources: ['swd-debug'],
    assignments: {}
  }));
  assert.equal(state.boardPresetId, '');
  assert.deepEqual(state.enabledBoardResources, []);
});

test('duplicate-style copies preserve target and user data without defaults', () => {
  const { api } = loadApp();
  const source = api.createProjectState('MSPM0G3519', 'RHB');
  const validSignal = devices.MSPM0G3519.packages.RHB.pins.find(pin => pin.number === 1).functions[0].signal;
  source.assignments = { 1: { function: validSignal, alias: '复制内容', connector: 'J1', note: 'keep' } };
  const copiedData = plain(api.normalizeLoaded(plain(source)));
  const copy = plain(api.createProject('副本', copiedData));
  assert.equal(copy.name, '副本');
  assert.equal(copy.data.device, 'MSPM0G3519');
  assert.equal(copy.data.package, 'RHB');
  assert.deepEqual(copy.data.assignments, source.assignments);
  assert.equal(copy.data.assignments['3'], undefined);
});

test('new import envelopes accept v7/v6 and reject prerelease formats', () => {
  const { api } = loadApp();
  const project = api.createProject('导入工程', api.createProjectState('MSPM0G3507', 'PM'));
  assert.equal(api.projectSourcesFromImportPayload({
    schemaVersion: 7,
    projectDataVersion: 6,
    kind: 'mspm0-pin-project',
    project
  }).length, 1);
  assert.equal(api.projectSourcesFromImportPayload({
    version: 7,
    projectDataVersion: 6,
    kind: 'mspm0-pin-workspace',
    projects: [project]
  }).length, 1);
  assert.throws(() => api.projectSourcesFromImportPayload({ schemaVersion: 6, kind: 'mspm0-pin-project', project }), /不支持/);
  assert.throws(() => api.projectSourcesFromImportPayload({ version: 7, kind: 'mspm0-pin-workspace', projects: [project] }), /不支持/);
});

test('structured GPIO search matches PB1 but not PB10 or PB11', () => {
  const { api } = loadApp();
  api.setState(api.createProjectState('MSPM0G3519', 'PZ'));
  assert.deepEqual(plain(api.searchPinNames('PB1')), ['PB1']);
});

test('short board keywords match token starts without treating OLED as LED', () => {
  const { api } = loadApp();
  api.setState(api.createPresetState('tianmengxing-g3519-pm64'));
  assert.deepEqual(plain(api.searchPinNames('LED')), ['PB22']);
  assert.deepEqual(plain(api.searchPinNames('led')), ['PB22']);
  assert.deepEqual(plain(api.searchPinNames('OLED')).sort(), ['PB10', 'PB11', 'PB14', 'PB26', 'PB8', 'PB9']);
  assert.deepEqual(plain(api.searchPinNames('LCD')).sort(), ['PB10', 'PB11', 'PB14', 'PB26', 'PB8', 'PB9']);
  assert.deepEqual(plain(api.searchPinNames('U21-3')), ['PA0']);
  ['TIM', 'PWM', 'QEI', 'I2C'].forEach(query => assert.ok(api.searchPinNames(query).length > 0, query));
});

test('board resource conflicts and shared SPI lines stay predictable', () => {
  const { api } = loadApp();
  api.setState(api.createPresetState('tianmengxing-g3519-pm64'));
  api.setAssignment(58, { function: 'PB6', alias: '用户片选', connector: 'J9', note: 'keep until confirmed' });
  assert.deepEqual(plain(api.boardResourceConflictPins('spi-flash')), ['58']);

  let state = plain(api.applyBoardResource('spi-flash', true));
  let assignments = state.assignments;
  assert.equal(assignments['58'].function, 'SPI1_CS0');
  assert.equal(assignments['58'].alias, '');
  assert.equal(assignments['60'].function, 'SPI1_PICO');
  assert.equal(assignments['61'].function, 'SPI1_SCK');

  state = plain(api.applyBoardResource('h8-lcd', true));
  assert.ok(state.enabledBoardResources.includes('spi-flash'));
  assert.ok(state.enabledBoardResources.includes('h8-lcd'));
  assignments = state.assignments;
  assert.equal(assignments['60'].function, 'SPI1_PICO');
  assert.equal(assignments['61'].function, 'SPI1_SCK');

  state = plain(api.applyBoardResource('spi-flash', false));
  assignments = state.assignments;
  assert.equal(assignments['58'], undefined);
  assert.equal(assignments['59'], undefined);
  assert.equal(assignments['60'].function, 'SPI1_PICO');
  assert.equal(assignments['61'].function, 'SPI1_SCK');

  state = plain(api.applyBoardResource('h8-lcd', false));
  assignments = state.assignments;
  assert.equal(assignments['2'], undefined);
  assert.equal(assignments['28'], undefined);
  assert.equal(assignments['60'], undefined);
  assert.equal(assignments['61'], undefined);
  assert.equal(assignments['62'], undefined);
  assert.equal(assignments['63'], undefined);
  assert.equal(assignments['42'].function, 'ROSC');
});

test('shared board resources preserve text until the final resource is disabled', () => {
  const { api } = loadApp();
  api.setState(api.createPresetState('tianmengxing-g3519-pm64'));
  api.applyBoardResource('spi-flash', true);
  api.applyBoardResource('h8-lcd', true);
  api.setAssignment(60, { function: 'SPI1_PICO', alias: '共享数据线', connector: 'J8-3', note: 'Flash 与 LCD 共用' });

  let state = plain(api.applyBoardResource('spi-flash', false));
  assert.deepEqual(state.assignments['60'], {
    function: 'SPI1_PICO', alias: '共享数据线', connector: 'J8-3', note: 'Flash 与 LCD 共用'
  });

  state = plain(api.applyBoardResource('h8-lcd', false));
  assert.deepEqual(state.assignments['60'], {
    function: '', alias: '共享数据线', connector: 'J8-3', note: 'Flash 与 LCD 共用'
  });
});

test('disabling a board resource preserves preset text and replacements', () => {
  const { api } = loadApp();
  api.setState(api.createPresetState('tianmengxing-g3519-pm64'));
  api.applyBoardResource('user-led', true);
  api.setAssignment(21, { function: 'PB22', alias: '状态灯', connector: 'J2', note: '保留说明' });
  let state = plain(api.applyBoardResource('user-led', false));
  assert.deepEqual(state.assignments['21'], { function: '', alias: '状态灯', connector: 'J2', note: '保留说明' });

  api.applyBoardResource('user-led', true);
  const pin = devices.MSPM0G3519.packages.PM.pins.find(item => item.number === 21);
  const replacement = pin.functions.find(item => item.signal !== 'PB22').signal;
  api.setAssignment(21, { function: replacement, alias: '用户功能', connector: 'J2', note: 'must survive' });
  state = plain(api.applyBoardResource('user-led', false));
  assert.deepEqual(state.assignments['21'], {
    function: replacement, alias: '用户功能', connector: 'J2', note: 'must survive'
  });
});

test('planning report detects duplicate peripheral signals and labels', () => {
  const { api } = loadApp();
  api.setState(api.createProjectState('MSPM0G3519', 'PZ'));
  const pins = devices.MSPM0G3519.packages.PZ.pins.filter(pin => !pin.fixed);
  const bySignal = new Map();
  pins.forEach(pin => pin.functions.forEach(fn => {
    if (fn.signal === pin.name) return;
    if (!bySignal.has(fn.signal)) bySignal.set(fn.signal, []);
    bySignal.get(fn.signal).push(pin.number);
  }));
  const duplicate = [...bySignal].find(([, numbers]) => numbers.length > 1);
  assert.ok(duplicate, 'test package must expose a signal on multiple pins');
  const [signal, numbers] = duplicate;
  api.setAssignment(numbers[0], { function: signal, alias: '重复标签' });
  api.setAssignment(numbers[1], { function: signal, alias: '重复标签' });
  const issues = plain(api.planIssues());
  assert.ok(issues.some(issue => issue.severity === 'error' && issue.title.includes(`${signal} 被重复安排`)));
  assert.ok(issues.some(issue => issue.severity === 'warning' && issue.title.includes('重复标签')));
});

test('history keeps 80 entries and merges rapid text edits', () => {
  const { api } = loadApp();
  api.setState(api.createProjectState('MSPM0G3519', 'PM'));
  api.resetHistory();
  for (let index = 0; index < 85; index += 1) api.recordHistory(`step-${index}`);
  let summary = plain(api.historySummary());
  assert.equal(summary.undo.length, 80);
  assert.equal(summary.undo[0].label, 'step-5');
  assert.equal(summary.undo.at(-1).label, 'step-84');
  assert.equal(summary.redoCount, 0);

  api.resetHistory();
  api.recordHistory('编辑 Pin 1', 'alias-1');
  api.recordHistory('编辑 Pin 1', 'alias-1');
  api.recordHistory('编辑 Pin 1', 'note-1');
  summary = plain(api.historySummary());
  assert.equal(summary.undo.length, 2);
  assert.deepEqual(summary.undo.map(entry => entry.mergeKey), ['alias-1', 'note-1']);
});

test('project and workspace JSON exports keep one fixed target', () => {
  const { api, downloads } = loadApp();
  api.setState(api.createProjectState('MSPM0G3507', 'PM'), '固定导出');
  api.setAssignment(33, { function: 'PA0', alias: '编码器,A', connector: 'J1-1', note: '第一路\n输入' });
  api.exportProjectJson();
  api.exportWorkspaceJson();
  api.exportCsv();
  assert.equal(downloads.length, 3);
  const projectPayload = JSON.parse(downloads[0].content);
  const workspacePayload = JSON.parse(downloads[1].content);
  assert.equal(projectPayload.schemaVersion, 7);
  assert.equal(projectPayload.projectDataVersion, 6);
  assert.equal(projectPayload.kind, 'mspm0-pin-project');
  assert.equal(projectPayload.project.data.device, 'MSPM0G3507');
  assert.equal(projectPayload.project.data.package, 'PM');
  assert.equal(projectPayload.project.data.assignments['33'].alias, '编码器,A');
  assert.equal('devices' in projectPayload.project.data, false);
  assert.equal(workspacePayload.version, 7);
  assert.equal(workspacePayload.projectDataVersion, 6);
  assert.ok(downloads[2].content.startsWith('\ufeffProject,Device,Package'));
  assert.ok(downloads[2].content.includes('"编码器,A"'));
  assert.ok(downloads[2].content.includes('"第一路\n输入"'));
});

test('all CSV exports neutralize formulas without changing project data', () => {
  const { api, downloads } = loadApp();
  api.setState(api.createProjectState('MSPM0G3507', 'PM'));
  api.setAssignment(33, { function: 'PA0', alias: '=1+1', connector: '+SUM(A1:A2)', note: '  @danger' });
  api.exportCsv();
  api.exportGroupedCsv();
  api.exportConnectorCsv();
  api.exportKicadCsv();
  assert.equal(downloads.length, 4);
  downloads.forEach(download => {
    assert.ok(download.content.includes("'=1+1"), download.name);
    assert.ok(download.content.includes("'+SUM(A1:A2)"), download.name);
  });
  assert.ok(downloads.slice(0, 3).every(download => download.content.includes("'  @danger")));
  assert.deepEqual(plain(api.getState().assignments['33']), {
    function: 'PA0', alias: '=1+1', connector: '+SUM(A1:A2)', note: '  @danger'
  });
});

test('export text helpers keep CSV file names and HTML safe', () => {
  const { api } = loadApp();
  assert.equal(api.csvEscape('a,"b"'), '"a,""b"""');
  assert.equal(api.csvEscape('=1+1'), '"\'=1+1"');
  assert.equal(api.csvEscape('  @danger'), '"\'  @danger"');
  assert.equal(api.csvEscape('-42'), '"\'-42"');
  assert.equal(api.csvEscape('\t=hidden'), '"\'\t=hidden"');
  assert.equal(api.safeFileName('  bad:name / project  '), 'bad-name---project');
  assert.equal(api.escapeHtml('<b title="x">&\'</b>'), '&lt;b title=&quot;x&quot;&gt;&amp;&#39;&lt;/b&gt;');
});

console.log(`App regression checks passed: ${passed}`);
