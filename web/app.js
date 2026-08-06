(() => {
  'use strict';

  const DEVICE_DATA = __DEVICE_DATA__;
  const BOARD_PRESETS = __BOARD_PRESETS__;
  const APP_META = __APP_META__;
  const STORAGE_KEY = 'mspm0g-pin-planner-v6';
  const LEGACY_V5_STORAGE_KEY = 'mspm0g-pin-planner-v5';
  const LEGACY_V4_STORAGE_KEY = 'mspm0g-pin-planner-v4';
  const LEGACY_V3_STORAGE_KEY = 'mspm0g-pin-planner-v3';
  const LEGACY_V2_STORAGE_KEY = 'mspm0g3519-pin-planner-v2';
  const LEGACY_V1_STORAGE_KEY = 'mspm0g3519-pin-planner-v1';
  const SCHEMA_VERSION = 6;
  const PROJECT_DATA_VERSION = 5;
  const DEVICE_ORDER = ['MSPM0G3519', 'MSPM0G3507'];
  const OFFICIAL_DEFAULT_SIGNALS = ['SWDIO', 'SWCLK', 'NRST'];
  const DEBUG_SIGNALS = new Set(['SWDIO', 'SWCLK']);
  const DEVICE_CONFIG = {
    MSPM0G3519: { defaultPackage: 'PZ', packageOrder: ['RHB', 'RGZ', 'PT', 'PM', 'PN', 'PZ'], defaultZoom: { RHB: 100, RGZ: 100, PT: 100, PM: 90, PN: 80, PZ: 70 } },
    MSPM0G3507: { defaultPackage: 'PM', packageOrder: ['RHB', 'RGZ', 'PT', 'PM'], defaultZoom: { RHB: 100, RGZ: 100, PT: 100, PM: 90 } }
  };
  const CATEGORY_COLORS = {
    Unassigned: 'var(--pin-unassigned)', GPIO: 'var(--pin-gpio)', UART: 'var(--pin-uart)',
    I2C: 'var(--pin-i2c)', SPI: 'var(--pin-spi)', CAN: 'var(--pin-can)',
    'Timer / Clock': 'var(--pin-timer)', ADC: 'var(--pin-adc)', DAC: 'var(--pin-dac)',
    Comparator: 'var(--pin-comparator)', Clock: 'var(--pin-clock)', Debug: 'var(--pin-debug)', System: 'var(--pin-system)',
    Power: 'var(--pin-power)', Other: 'var(--pin-other)'
  };
  const CATEGORY_LABELS = { Debug: 'Debug / 调试', System: 'System / 系统' };

  const timerAliases = ['timer', '定时器', 'pwm', 'capture', 'compare'];
  const commonAnalogResources = [
    { key: 'ADC', label: 'ADC', instances: [0, 1].map(n => ({ id: `ADC${n}`, display: `ADC${n}`, prefix: `A${n}_`, aliases: ['analog', '模拟输入'] })) },
    { key: 'DAC', label: 'DAC', instances: [{ id: 'DAC0', display: 'DAC0', exact: ['DAC_OUT'], aliases: ['analog out', '模拟输出'] }] },
    { key: 'Comparator', label: '比较器', instances: [0, 1, 2].map(n => ({ id: `COMP${n}`, prefix: `COMP${n}_`, aliases: ['comparator', '比较器'] })) }
  ];
  const RESOURCE_CATALOGS = {
    MSPM0G3519: [
      { key: 'UART', label: 'UART', instances: ['UART0', 'UART1', 'UART3', 'UART4', 'UART5', 'UART6', 'UART7'].map(id => ({ id, prefix: `${id}_`, aliases: ['serial', '串口'] })) },
      { key: 'I2C', label: 'I2C', instances: ['I2C0', 'I2C1', 'I2C2'].map(id => ({ id, prefix: `${id}_`, aliases: ['iic', 'two wire'] })) },
      { key: 'SPI', label: 'SPI', instances: ['SPI0', 'SPI1', 'SPI2'].map(id => ({ id, prefix: `${id}_`, aliases: ['synchronous serial'] })) },
      { key: 'CAN', label: 'CAN-FD', instances: [0, 1].map(n => ({ id: `CAN${n}`, display: `CAN-FD${n}`, prefix: `CAN${n}_`, aliases: ['canfd', 'can fd'] })) },
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
      ...commonAnalogResources
    ],
    MSPM0G3507: [
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
      ...commonAnalogResources
    ]
  };

  const elements = Object.fromEntries([
    'projectSelect', 'projectMenuBtn', 'projectMenu', 'deviceSelect', 'packageSelect', 'undoBtn', 'redoBtn', 'importBtn', 'importFile',
    'exportMenuBtn', 'exportMenu', 'checkBtn', 'checkBadge', 'aboutBtn', 'resetBtn', 'saveState',
    'packagePinCount', 'assignedCount', 'unassignedCount', 'fixedCount', 'systemCount', 'conflictCount', 'searchInput',
    'filterTabs', 'categoryList', 'sidebarViewTabs', 'sidebarTitle', 'pinPanel', 'resourcePanel', 'resourceSummary',
    'resourceList', 'resourceDetail', 'resourceDetailTitle', 'resourceDetailNote', 'resourceSignals', 'canvasTitle',
    'canvasSubtitle', 'boardHardwarePanel', 'boardHardwareSummary', 'boardHardwareNote', 'boardResourceControls', 'boardFixedHardwareList', 'boardSharedNote', 'zoomSlider', 'zoomValue', 'rotateCcwBtn', 'rotateCwBtn', 'fitViewBtn', 'centerViewBtn', 'canvasScroller', 'stageScale',
    'packageStage', 'topPins', 'rightPins', 'bottomPins', 'leftPins', 'chipDevice', 'chipPackage', 'chipSummary',
    'inspectorEmpty', 'inspectorContent', 'pinTitle', 'pinSubtitle', 'pinStatus', 'physicalPin', 'logicalPin',
    'iomuxRegister', 'bufferType', 'editableFields', 'functionSelect', 'functionInfo', 'aliasInput', 'connectorInput', 'noteInput',
    'conflictBox', 'clearPinBtn', 'fixedBox', 'leftResizer', 'rightResizer', 'sourceFooter',
    'boardInfoBox', 'boardInfoTitle', 'boardInfoStatus', 'boardInfoMeta', 'boardRouteList', 'boardInfoSharedNote', 'boardInfoDetail', 'checkDialog', 'checkDialogBody', 'projectDialog', 'projectDialogTitle', 'projectForm', 'projectNameInput', 'projectPresetField', 'projectPresetSelect',
    'aboutDialog', 'aboutDialogBody', 'printReport'
  ].map(id => [id, document.getElementById(id)]));

  let selectedPinNumber = null;
  let activeFilter = 'all';
  let activeCategory = 'All';
  let sidebarView = 'pins';
  let selectedResourceId = '';
  let selectedSignal = '';
  let expandedGroups = new Set(['Timer']);
  let saveTimer = null;
  let panState = null;
  let resizeState = null;
  let projectDialogMode = 'new';
  const historyByProject = new Map();
  let workspace = loadWorkspace();
  let state = currentProjectRecord().data;

  function packageOrder(device = state?.activeDevice || DEVICE_ORDER[0]) { return DEVICE_CONFIG[device].packageOrder; }
  function resourceCatalog(device = state?.activeDevice || DEVICE_ORDER[0]) { return RESOURCE_CATALOGS[device]; }
  function emptyView(device, code) {
    return { zoom: DEVICE_CONFIG[device].defaultZoom[code], x: 0, y: 0, rotation: 0, initialized: false };
  }

  function emptyAssignment(signal = '') {
    return { function: signal, alias: '', connector: '', note: '' };
  }

  function defaultAssignments(device, code) {
    const pins = DEVICE_DATA[device].packages[code].pins;
    const output = {};
    OFFICIAL_DEFAULT_SIGNALS.forEach(signal => {
      const pin = pins.find(item => !item.fixed && item.functions.some(fn => fn.signal === signal));
      if (pin) output[String(pin.number)] = emptyAssignment(signal);
    });
    return output;
  }

  function createDeviceState(device) {
    const codes = DEVICE_CONFIG[device].packageOrder;
    return {
      activePackage: DEVICE_CONFIG[device].defaultPackage,
      views: Object.fromEntries(codes.map(code => [code, emptyView(device, code)])),
      packages: Object.fromEntries(codes.map(code => [code, { assignments: defaultAssignments(device, code) }]))
    };
  }

  function createEmptyState() {
    return {
      version: PROJECT_DATA_VERSION,
      boardPresetId: '',
      enabledBoardResources: [],
      activeDevice: 'MSPM0G3519',
      layout: { leftWidth: 250, rightWidth: 330 },
      devices: Object.fromEntries(DEVICE_ORDER.map(device => [device, createDeviceState(device)]))
    };
  }

  function createPresetState(presetId) {
    const preset = BOARD_PRESETS.presets[presetId];
    const board = preset && BOARD_PRESETS.boards[preset.boardId];
    if (!preset || !board) return createEmptyState();
    const data = createEmptyState();
    data.boardPresetId = presetId;
    data.activeDevice = preset.device;
    data.devices[preset.device].activePackage = preset.package;
    const target = data.devices[preset.device].packages[preset.package].assignments;
    Object.keys(target).forEach(number => delete target[number]);
    const pins = new Map(DEVICE_DATA[preset.device].packages[preset.package].pins.map(pin => [String(pin.number), pin]));
    Object.entries(board.fixedDefaults || {}).forEach(([number, signal]) => {
      if (pins.get(number)?.functions.some(fn => fn.signal === signal)) target[number] = emptyAssignment(signal);
    });
    data.enabledBoardResources = (board.resources || []).filter(resource => resource.defaultEnabled === true).map(resource => resource.id);
    return data;
  }

  function createId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `project-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function createProject(name = '默认工程', data = createEmptyState()) {
    const now = new Date().toISOString();
    return { id: createId(), name: String(name || '未命名工程').slice(0, 48), createdAt: now, updatedAt: now, data };
  }

  function createWorkspace(data = createEmptyState()) {
    const project = createProject('默认工程', data);
    return { version: SCHEMA_VERSION, activeProjectId: project.id, projects: [project] };
  }

  function sanitizeAssignments(device, packageCode, assignments) {
    const pins = new Map(DEVICE_DATA[device].packages[packageCode].pins.map(pin => [String(pin.number), pin]));
    const output = {};
    let skipped = 0;
    Object.entries(assignments || {}).forEach(([number, value]) => {
      const pin = pins.get(String(number));
      if (!pin || pin.fixed || !value || typeof value !== 'object') { skipped += 1; return; }
      const allowed = new Set(pin.functions.map(item => item.signal));
      const next = {
        function: allowed.has(value.function) ? value.function : '',
        alias: String(value.alias || '').slice(0, 48),
        connector: String(value.connector || '').slice(0, 48),
        note: String(value.note || '').slice(0, 240)
      };
      if (next.function || next.alias.trim() || next.connector.trim() || next.note.trim()) output[String(pin.number)] = next;
    });
    return { assignments: output, skipped };
  }

  function sanitizeView(device, code, value, legacyZoom) {
    const defaultZoom = DEVICE_CONFIG[device].defaultZoom[code];
    const zoom = Math.min(180, Math.max(35, Number(value?.zoom ?? legacyZoom ?? defaultZoom) || defaultZoom));
    return {
      zoom,
      x: Number.isFinite(Number(value?.x)) ? Number(value.x) : 0,
      y: Number.isFinite(Number(value?.y)) ? Number(value.y) : 0,
      rotation: [0, 90, 180, 270].includes(Number(value?.rotation)) ? Number(value.rotation) : 0,
      initialized: Boolean(value?.initialized)
    };
  }

  function normalizeDeviceState(device, parsed, legacy = false) {
    const empty = createDeviceState(device);
    const codes = DEVICE_CONFIG[device].packageOrder;
    empty.activePackage = codes.includes(parsed?.activePackage) ? parsed.activePackage : DEVICE_CONFIG[device].defaultPackage;
    codes.forEach(code => {
      empty.packages[code].assignments = sanitizeAssignments(device, code, parsed?.packages?.[code]?.assignments || {}).assignments;
      empty.views[code] = sanitizeView(device, code, parsed?.views?.[code], legacy ? parsed?.zoom?.[code] : undefined);
    });
    return empty;
  }

  function normalizeBoardResourceIds(boardPresetId, parsed) {
    const preset = BOARD_PRESETS.presets[boardPresetId];
    const board = preset && BOARD_PRESETS.boards[preset.boardId];
    if (!board || !Array.isArray(parsed?.enabledBoardResources)) return [];
    const valid = new Set((board.resources || []).map(resource => resource.id));
    return [...new Set(parsed.enabledBoardResources.filter(id => valid.has(id)))];
  }

  function normalizeLoaded(parsed) {
    const empty = createEmptyState();
    empty.boardPresetId = BOARD_PRESETS.presets[parsed?.boardPresetId] ? parsed.boardPresetId : '';
    empty.enabledBoardResources = normalizeBoardResourceIds(empty.boardPresetId, parsed);
    empty.activeDevice = DEVICE_ORDER.includes(parsed?.activeDevice) ? parsed.activeDevice : 'MSPM0G3519';
    empty.layout.leftWidth = Math.min(460, Math.max(190, Number(parsed?.layout?.leftWidth) || 250));
    empty.layout.rightWidth = Math.min(540, Math.max(260, Number(parsed?.layout?.rightWidth) || 330));
    DEVICE_ORDER.forEach(device => { empty.devices[device] = normalizeDeviceState(device, parsed?.devices?.[device]); });
    return empty;
  }

  function normalizeProject(project, index = 0) {
    const now = new Date().toISOString();
    const data = normalizeLoaded(project?.data || project || {});
    return {
      id: String(project?.id || createId()),
      name: String(project?.name || `工程 ${index + 1}`).slice(0, 48),
      createdAt: String(project?.createdAt || now),
      updatedAt: String(project?.updatedAt || now),
      data
    };
  }

  function normalizeWorkspace(parsed) {
    const projects = Array.isArray(parsed?.projects) && parsed.projects.length
      ? parsed.projects.slice(0, 40).map(normalizeProject)
      : [createProject()];
    const activeProjectId = projects.some(project => project.id === parsed?.activeProjectId)
      ? parsed.activeProjectId
      : projects[0].id;
    return { version: SCHEMA_VERSION, activeProjectId, projects };
  }

  function migrateLegacy(parsed, legacy = false) {
    const empty = createEmptyState();
    empty.layout.leftWidth = Math.min(460, Math.max(190, Number(parsed?.layout?.leftWidth) || 250));
    empty.layout.rightWidth = Math.min(540, Math.max(260, Number(parsed?.layout?.rightWidth) || 330));
    empty.devices.MSPM0G3519 = normalizeDeviceState('MSPM0G3519', parsed, legacy);
    return empty;
  }

  function loadWorkspace() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed?.version === SCHEMA_VERSION) return normalizeWorkspace(parsed);
      const legacyV5 = JSON.parse(localStorage.getItem(LEGACY_V5_STORAGE_KEY));
      if (legacyV5?.version === 5) return normalizeWorkspace(legacyV5);
      const legacyV4 = JSON.parse(localStorage.getItem(LEGACY_V4_STORAGE_KEY));
      if (legacyV4?.version === 4) return normalizeWorkspace(legacyV4);
      const legacyV3 = JSON.parse(localStorage.getItem(LEGACY_V3_STORAGE_KEY));
      if (legacyV3?.version === 3) return createWorkspace(normalizeLoaded(legacyV3));
      const legacyV2 = JSON.parse(localStorage.getItem(LEGACY_V2_STORAGE_KEY));
      if (legacyV2?.version === 2 && legacyV2.device === 'MSPM0G3519') return createWorkspace(migrateLegacy(legacyV2));
      const legacyV1 = JSON.parse(localStorage.getItem(LEGACY_V1_STORAGE_KEY));
      if (legacyV1?.version === 1 && legacyV1.device === 'MSPM0G3519') return createWorkspace(migrateLegacy(legacyV1, true));
    } catch (error) { /* start clean */ }
    return createWorkspace();
  }

  function currentProjectRecord() {
    return workspace.projects.find(project => project.id === workspace.activeProjectId) || workspace.projects[0];
  }

  function activateProject(projectId) {
    const project = workspace.projects.find(item => item.id === projectId);
    if (!project) return;
    workspace.activeProjectId = project.id;
    state = project.data;
    resetTransientSelection();
    saveState();
    render();
  }

  function touchProject() {
    currentProjectRecord().data = state;
    currentProjectRecord().updatedAt = new Date().toISOString();
  }

  function saveState() {
    touchProject();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    elements.saveState.textContent = '已保存';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      elements.saveState.textContent = '自动保存';
    }, 900);
  }

  function currentDeviceData() { return DEVICE_DATA[state.activeDevice]; }
  function currentDeviceState() { return state.devices[state.activeDevice]; }
  function currentPackage() { return currentDeviceData().packages[currentDeviceState().activePackage]; }
  function assignments() { return currentDeviceState().packages[currentDeviceState().activePackage].assignments; }
  function assignmentFor(number) { return assignments()[String(number)] || emptyAssignment(); }
  function selectedPin() { return currentPackage().pins.find(pin => pin.number === selectedPinNumber) || null; }
  function selectedFunction(pin, value) { return pin.functions.find(item => item.signal === value.function) || null; }
  function isMeaningfulAssignment(value) { return Boolean(value.function || value.alias.trim() || value.connector?.trim() || value.note.trim()); }
  function currentView() { return currentDeviceState().views[currentDeviceState().activePackage]; }
  function functionCategory(fn) { return DEBUG_SIGNALS.has(fn?.signal) ? 'Debug' : fn?.category || ''; }
  function categoryLabel(category) { return CATEGORY_LABELS[category] || category; }
  function isPortPin(pin) { return /^P[A-Z]\d+$/.test(pin.name); }
  function officialDefaultSignal(pin) { return OFFICIAL_DEFAULT_SIGNALS.find(signal => pin.functions.some(fn => fn.signal === signal)) || ''; }
  function isOfficialDefaultAssignment(pin, value) { return value.function === officialDefaultSignal(pin); }
  function currentBoardPreset() { return BOARD_PRESETS.presets[state.boardPresetId] || null; }
  function currentBoard() { const preset = currentBoardPreset(); return preset ? BOARD_PRESETS.boards[preset.boardId] || null : null; }
  function isBoardApplicable() {
    const preset = currentBoardPreset();
    return Boolean(preset && preset.device === state.activeDevice && preset.package === currentDeviceState().activePackage);
  }
  function boardPinFor(pin) { return isBoardApplicable() ? currentBoard()?.pins?.[String(pin.number)] || null : null; }
  function enabledBoardResourceIds() { return new Set(isBoardApplicable() ? state.enabledBoardResources || [] : []); }
  function isBoardResourceEnabled(resource) { return enabledBoardResourceIds().has(resource?.id); }
  function boardDefaultSignal(pin) {
    if (!isBoardApplicable()) return '';
    const number = String(pin.number);
    return currentBoard()?.fixedDefaults?.[number]
      || (currentBoard()?.resources || []).find(resource => isBoardResourceEnabled(resource) && resource.assignments?.[number])?.assignments[number]
      || '';
  }
  function isBoardDefaultAssignment(pin, value) { return Boolean(boardDefaultSignal(pin) && value.function === boardDefaultSignal(pin)); }
  function boardStatusLabel(status) {
    return { header: '普通排针', occupied: '板载占用', special: '特殊电气条件', unexposed: '未引出' }[status] || '';
  }
  function boardResourcesForPin(pin) {
    if (!isBoardApplicable()) return [];
    return (currentBoard()?.resources || []).flatMap(resource => {
      const signal = resource.pins?.[String(pin.number)];
      return signal ? [{ ...resource, signal, expected: resource.assignments?.[String(pin.number)] || '', enabled: isBoardResourceEnabled(resource) }] : [];
    });
  }
  function activeBoardResourcesForPin(pin) { return boardResourcesForPin(pin).filter(resource => resource.enabled); }
  function boardFixedHardwareForPin(pin) {
    if (!isBoardApplicable()) return [];
    return (currentBoard()?.fixedHardware || []).filter(item => item.pins?.includes(String(pin.number)));
  }
  function boardSharedBusesForPin(pin) {
    if (!isBoardApplicable()) return [];
    return (currentBoard()?.sharedBuses || []).filter(bus => bus.pins?.includes(String(pin.number)));
  }
  function boardResourceSummary(pin) {
    return activeBoardResourcesForPin(pin).map(resource => `${resource.shortName || resource.name}:${resource.signal}`).join(' · ');
  }
  function boardExportDetail(pin) {
    const boardPin = boardPinFor(pin);
    if (!boardPin) return '';
    return [
      boardPin.detail,
      ...boardResourcesForPin(pin).map(resource => `${resource.name}[${resource.enabled ? '已启用' : '未启用'}]=${resource.signal}`),
      ...boardFixedHardwareForPin(pin).map(item => `${item.name}[固定连接]`),
      ...boardSharedBusesForPin(pin).map(bus => bus.detail)
    ].filter(Boolean).join('；');
  }

  function projectHistory(projectId = workspace.activeProjectId) {
    if (!historyByProject.has(projectId)) historyByProject.set(projectId, { undo: [], redo: [] });
    return historyByProject.get(projectId);
  }

  function commitMutation(label, mutator, options = {}) {
    const before = JSON.stringify(state);
    mutator();
    const after = JSON.stringify(state);
    if (before === after) return false;
    recordSnapshot(label, before, options.mergeKey);
    saveState();
    if (options.render !== false) render();
    else renderHistoryControls();
    return true;
  }

  function recordSnapshot(label, snapshot, mergeKey = '') {
    const history = projectHistory();
    const now = Date.now();
    const last = history.undo.at(-1);
    if (!(mergeKey && last?.mergeKey === mergeKey && now - last.time < 900)) {
      history.undo.push({ label, snapshot, mergeKey, time: now });
      if (history.undo.length > 80) history.undo.shift();
    } else {
      last.time = now;
    }
    history.redo = [];
  }

  function restoreProjectSnapshot(snapshot) {
    state = normalizeLoaded(JSON.parse(snapshot));
    currentProjectRecord().data = state;
    if (selectedPinNumber && !selectedPin()) selectedPinNumber = null;
    saveState();
    render();
  }

  function undo() {
    const history = projectHistory();
    const entry = history.undo.pop();
    if (!entry) return;
    history.redo.push({ label: entry.label, snapshot: JSON.stringify(state), time: Date.now() });
    restoreProjectSnapshot(entry.snapshot);
  }

  function redo() {
    const history = projectHistory();
    const entry = history.redo.pop();
    if (!entry) return;
    history.undo.push({ label: entry.label, snapshot: JSON.stringify(state), time: Date.now() });
    restoreProjectSnapshot(entry.snapshot);
  }

  function renderHistoryControls() {
    const history = projectHistory();
    elements.undoBtn.disabled = history.undo.length === 0;
    elements.redoBtn.disabled = history.redo.length === 0;
    elements.undoBtn.title = history.undo.length ? `撤销：${history.undo.at(-1).label} · Ctrl+Z` : '没有可撤销的操作';
    elements.redoBtn.title = history.redo.length ? `重做：${history.redo.at(-1).label} · Ctrl+Y` : '没有可重做的操作';
  }

  function planIssues() {
    const issues = [];
    const pkg = currentPackage();
    const conflicts = conflictMap();
    conflicts.forEach((pins, signal) => issues.push({
      severity: 'error',
      title: `${signal} 被重复安排`,
      detail: `同时出现在 Pin ${pins.join('、Pin ')}。除非硬件设计明确需要，否则应只保留一个。`
    }));

    const labels = new Map();
    const connectors = new Map();
    pkg.pins.forEach(pin => {
      if (pin.fixed) return;
      const value = assignmentFor(pin.number);
      if (value.alias.trim()) {
        const key = value.alias.trim().toLowerCase();
        if (!labels.has(key)) labels.set(key, []);
        labels.get(key).push(pin.number);
      }
      if (value.connector?.trim()) {
        const key = value.connector.trim().toLowerCase();
        if (!connectors.has(key)) connectors.set(key, []);
        connectors.get(key).push(pin.number);
      }
    });
    labels.forEach((pins, label) => {
      if (pins.length > 1) issues.push({ severity: 'warning', title: `自定义标签“${label}”重复`, detail: `出现在 Pin ${pins.join('、Pin ')}，导出网络标签时可能混淆。` });
    });
    connectors.forEach((pins, connector) => {
      if (pins.length > 1) issues.push({ severity: 'info', title: `连接器标记“${connector}”被多次使用`, detail: `对应 Pin ${pins.join('、Pin ')}。如果它表示同一个端子，请确认这是有意安排。` });
    });

    resourceCatalog().forEach(group => group.instances.forEach(instance => {
      const health = resourceCompleteness(group, instance);
      if (!health.active || !health.required.length || health.complete) return;
      issues.push({
        severity: 'warning',
        title: `${instance.display || instance.id} 必需信号不完整`,
        detail: `已开始安排该外设，但仍缺 ${health.missing.map(item => item.suffix).join('、')}。`
      });
    }));

    const availableDebug = new Set(pkg.pins.flatMap(pin => pin.functions.map(fn => fn.signal)).filter(signal => /SWDIO|SWCLK/.test(signal)));
    const assignedDebug = new Set(Object.values(assignments()).map(value => value.function).filter(signal => availableDebug.has(signal)));
    const boardSwdDisabled = isBoardApplicable() && !isBoardResourceEnabled(boardResourceById('swd-debug'));
    if (!boardSwdDisabled && availableDebug.size && assignedDebug.size < Math.min(2, availableDebug.size)) {
      issues.push({ severity: 'info', title: '调试接口尚未完整标记', detail: '当前封装存在 SWDIO/SWCLK 候选功能。若板上需要下载和调试，请确认对应连接。' });
    }

    const resetPin = pkg.pins.find(pin => pin.functions.some(fn => fn.signal === 'NRST'));
    const boardResetDisabled = isBoardApplicable() && !isBoardResourceEnabled(boardResourceById('nrst-reset'));
    if (!boardResetDisabled && resetPin && assignmentFor(resetPin.number).function !== 'NRST') {
      issues.push({ severity: 'info', title: 'NRST 已偏离官方默认功能', detail: `Pin ${resetPin.number} 当前未选择 NRST。若改作 WAKE 或其他用途，请确认复位和下载调试方案。` });
    }

    if (isBoardApplicable()) {
      const board = currentBoard();
      const fixedMissing = [];
      Object.entries(board.fixedDefaults || {}).forEach(([number, expected]) => {
        const pin = pkg.pins.find(item => String(item.number) === number);
        const actual = assignmentFor(Number(number)).function;
        if (actual !== expected) fixedMissing.push(`${pin?.name || `Pin ${number}`}=${expected}${actual ? `（当前 ${actual}）` : ''}`);
      });
      if (fixedMissing.length) issues.push({
        severity: 'warning',
        title: `天猛星固定时钟网络有 ${fixedMissing.length} 项偏离`,
        detail: fixedMissing.join('、')
      });

      (board.resources || []).forEach(resource => {
        const enabled = isBoardResourceEnabled(resource);
        const mismatches = Object.entries(resource.assignments || {}).flatMap(([number, expected]) => {
          const pin = pkg.pins.find(item => String(item.number) === number);
          const actual = assignmentFor(Number(number)).function;
          return actual === expected ? [] : [`${pin?.name || `Pin ${number}`} 应为 ${expected}${actual ? `，当前 ${actual}` : '，当前未安排'}`];
        });
        if (enabled && mismatches.length) issues.push({
          severity: 'warning',
          title: `${resource.name} 配置不完整`,
          detail: mismatches.join('；')
        });
        if (!enabled && resource.kind === 'onboard') {
          Object.entries(resource.assignments || {}).forEach(([number, expected]) => {
            const pin = pkg.pins.find(item => String(item.number) === number);
            const actual = assignmentFor(Number(number)).function;
            if (!actual || actual === expected) return;
            issues.push({
              severity: 'warning',
              title: `${pin?.name || `Pin ${number}`} 仍连接 ${resource.name}`,
              detail: `资源开关已关闭，但板上物理连线仍存在；当前选择 ${actual}，使用前应核对是否会与 ${resource.shortName || resource.name} 冲突。`
            });
          });
        }
      });

      ['33', '34'].forEach(number => {
        const pin = pkg.pins.find(item => String(item.number) === number);
        const value = assignmentFor(Number(number));
        const fn = selectedFunction(pin, value);
        const openDrainSafe = !value.function || fn?.signalType === 'I' || /^(I2C|BSLSDA|BSLSCL)/.test(value.function);
        if (!openDrainSafe && /O/.test(fn?.signalType || '')) issues.push({
          severity: 'warning',
          title: `${pin.name} 仅支持开漏输出`,
          detail: `${value.function} 具有输出方向。板上虽有 4.7 kΩ 上拉，但该引脚不能主动输出推挽高电平。`
        });
      });
      ['17', '24'].forEach(number => {
        const pin = pkg.pins.find(item => String(item.number) === number);
        const value = assignmentFor(Number(number));
        const fn = selectedFunction(pin, value);
        if (value.function && /O/.test(fn?.signalType || '')) issues.push({
          severity: 'warning',
          title: `${pin.name} 连接板载参考电压网络`,
          detail: `${value.function} 具有输出方向。使用前请核对天猛星板上的参考电压选择、滤波与焊接配置。`
        });
      });
    } else if (currentBoardPreset()) {
      const preset = currentBoardPreset();
      issues.push({
        severity: 'info',
        title: '当前视图不适用天猛星板卡标注',
        detail: `此工程模板对应 ${preset.device} ${preset.package}-64；切回对应芯片和封装即可恢复板卡标注。现有引脚安排未被删除。`
      });
    }

    const fixedPins = pkg.pins.filter(pin => pin.fixed);
    issues.push({ severity: 'info', title: `${fixedPins.length} 个固定电源相关引脚`, detail: `固定引脚已在封装图中标记。本工具不验证去耦、电源排序、模拟地或参考电压设计。` });
    return issues;
  }

  function renderCheckButton() {
    const actionable = planIssues().filter(issue => issue.severity !== 'info').length;
    elements.checkBadge.textContent = actionable ? String(actionable) : '';
    elements.checkBtn.classList.toggle('primary', actionable > 0);
  }

  function showCheckDialog() {
    const issues = planIssues();
    const counts = { error: 0, warning: 0, info: 0 };
    issues.forEach(issue => { counts[issue.severity] += 1; });
    const summary = document.createElement('div');
    summary.className = 'issue-summary';
    [['错误', counts.error], ['提醒', counts.warning], ['信息', counts.info]].forEach(([label, count]) => {
      const item = document.createElement('div');
      item.className = 'issue-count';
      const span = document.createElement('span');
      span.textContent = label;
      const strong = document.createElement('strong');
      strong.textContent = String(count);
      item.append(span, strong);
      summary.appendChild(item);
    });
    const list = document.createElement('div');
    list.className = 'issue-list';
    issues.forEach(issue => {
      const item = document.createElement('div');
      item.className = `issue-item ${issue.severity}`;
      const title = document.createElement('strong');
      title.textContent = issue.title;
      const detail = document.createElement('span');
      detail.textContent = issue.detail;
      item.append(title, detail);
      list.appendChild(item);
    });
    elements.checkDialogBody.replaceChildren(summary, list);
    elements.checkDialog.showModal();
  }

  function showAboutDialog() {
    const project = currentProjectRecord();
    const section = document.createElement('section');
    section.className = 'modal-section';
    const notice = document.createElement('div');
    notice.className = 'legal-notice';
    notice.textContent = '本软件是天津职业技术师范大学 电子创新协会制作的非官方第三方学习与规划工具，与 Texas Instruments Incorporated（TI）不存在隶属、授权或认可关系。TI、MSPM0及相关产品名称属于其权利人。本工具不替代数据手册、勘误表或电气设计审查。';
    const grid = document.createElement('dl');
    grid.className = 'about-grid';
    const rows = [
      ['版本', APP_META.version],
      ['作者', APP_META.author],
      ['当前工程', project.name],
      ['芯片', state.activeDevice],
      ['封装', currentPackage().label],
      ['存储结构', `v${SCHEMA_VERSION}`],
      ['许可证', '免费学习版：允许分发未修改的二进制副本，禁止冒充官方或移除声明'],
      ['第三方组件', 'Electron 31.7.7、Chromium 及其依赖；完整许可证随发行物保留']
    ];
    rows.forEach(([term, description]) => {
      const dt = document.createElement('dt'); dt.textContent = term;
      const dd = document.createElement('dd'); dd.textContent = description;
      grid.append(dt, dd);
    });
    section.append(notice, grid);
    const sourceSection = document.createElement('section');
    sourceSection.className = 'modal-section';
    const heading = document.createElement('h3');
    heading.textContent = '数据来源';
    sourceSection.appendChild(heading);
    DEVICE_ORDER.forEach(device => {
      const source = DEVICE_DATA[device].source;
      const paragraph = document.createElement('p');
      paragraph.textContent = `${device}：${source.document}，${source.revision}，页 ${source.pages}。${source.url || ''}`;
      sourceSection.appendChild(paragraph);
    });
    const licenseSection = document.createElement('section');
    licenseSection.className = 'modal-section';
    const licenseHeading = document.createElement('h3');
    licenseHeading.textContent = '使用说明';
    const licenseText = document.createElement('p');
    licenseText.textContent = '允许为学习、教学和非商业用途免费使用及传播未修改的软件。软件按现状提供，不保证引脚规划、电气连接或量产设计正确。商业使用、修改后再发布或品牌合作应另行确认授权。';
    licenseSection.append(licenseHeading, licenseText);
    elements.aboutDialogBody.replaceChildren(section, sourceSection, licenseSection);
    elements.aboutDialog.showModal();
  }

  function conflictMap() {
    const bySignal = new Map();
    currentPackage().pins.forEach(pin => {
      if (pin.fixed) return;
      const value = assignmentFor(pin.number);
      if (!value.function || value.function === pin.name) return;
      if (!bySignal.has(value.function)) bySignal.set(value.function, []);
      bySignal.get(value.function).push(pin.number);
    });
    return new Map([...bySignal].filter(([, pins]) => pins.length > 1));
  }

  function resourceInstance(id) {
    for (const group of resourceCatalog()) {
      const instance = group.instances.find(item => item.id === id);
      if (instance) return { group, instance };
    }
    return null;
  }

  function signalMatchesInstance(signal, instance) {
    return instance.exact ? instance.exact.includes(signal) : signal.startsWith(instance.prefix);
  }

  function signalsForInstance(instance) {
    const found = new Map();
    currentPackage().pins.forEach(pin => pin.functions.forEach(fn => {
      if (signalMatchesInstance(fn.signal, instance) && !found.has(fn.signal)) found.set(fn.signal, fn);
    }));
    return [...found.values()].sort((a, b) => signalSortKey(a.signal).localeCompare(signalSortKey(b.signal), undefined, { numeric: true }));
  }

  function signalSortKey(signal) {
    if (/_C0$/.test(signal)) return `00-${signal}`;
    if (/_C1$/.test(signal)) return `01-${signal}`;
    if (/_IDX$/.test(signal)) return `02-${signal}`;
    return `10-${signal}`;
  }

  function signalRole(signal) {
    if (/^TIMG[89]_C0$/.test(signal)) return 'QEI / Hall A 相';
    if (/^TIMG[89]_C1$/.test(signal)) return 'QEI / Hall B 相';
    if (/^TIMG[89]_IDX$/.test(signal)) return 'QEI Z / Index（可选）';
    const suffix = signal.split('_').slice(1).join('_');
    const roles = { TX: '发送', RX: '接收', SCL: '时钟', SDA: '数据', SCK: '串行时钟', PICO: '控制器输出', POCI: '控制器输入', RTS: '请求发送', CTS: '允许发送' };
    return roles[suffix] || '官方复用信号';
  }

  function queryVariants() {
    const query = elements.searchInput.value.trim().toLowerCase();
    if (!query) return [];
    const variants = new Set([query]);
    if (/timer|定时器/.test(query)) ['tim', 'timer', '定时器', 'pwm', 'capture', 'compare'].forEach(v => variants.add(v));
    if (/^(tim|timer)1$/.test(query)) variants.add('tima1');
    if (/^(tim|timer)0$/.test(query)) ['tima0', 'timg0'].forEach(v => variants.add(v));
    if (/qei|encoder|编码器|正交|hall|霍尔/.test(query)) {
      ['qei', 'encoder', '编码器', 'hall', '霍尔'].forEach(v => variants.add(v));
      resourceCatalog().flatMap(group => group.instances).filter(instance => /QEI/.test(instance.feature || '')).forEach(instance => variants.add(instance.id.toLowerCase()));
    }
    if (/pwm|capture|compare|捕获|比较/.test(query)) ['tima', 'timg', 'timer', '定时器'].forEach(v => variants.add(v));
    return [...variants];
  }

  function textMatchesQuery(text) {
    const variants = queryVariants();
    if (!variants.length) return true;
    const haystack = String(text).toLowerCase();
    return variants.some(term => {
      if (/^p[a-z]\d+$/.test(term)) {
        return haystack.split(/[^a-z0-9]+/).includes(term);
      }
      if (/^u\d+-\d+$/.test(term)) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(haystack);
      }
      return haystack.includes(term);
    });
  }

  function rawQuery() {
    return elements.searchInput.value.trim().toLowerCase();
  }

  function userTextMatches(value, query = rawQuery()) {
    if (!query) return false;
    return [value.alias, value.note].some(text => String(text || '').toLowerCase().includes(query));
  }

  function hasUserTextMatch() {
    const query = rawQuery();
    return Boolean(query) && Object.values(assignments()).some(value => userTextMatches(value, query));
  }

  function pinSearchText(pin) {
    const value = assignmentFor(pin.number);
    const signals = pin.functions.map(item => item.signal);
    const semantic = [];
    if (signals.some(signal => /^(TIMA|TIMG)/.test(signal))) semantic.push('timer 定时器 pwm capture compare 捕获 比较');
    if (signals.some(signal => /^TIMG[89]_(C0|C1|IDX)$/.test(signal))) semantic.push('qei encoder 编码器 hall 霍尔');
    const boardPin = boardPinFor(pin);
    const resources = boardResourcesForPin(pin);
    const fixedHardware = boardFixedHardwareForPin(pin);
    const sharedBuses = boardSharedBusesForPin(pin);
    const boardText = boardPin
      ? [
          boardPin.header, boardPin.label, boardPin.detail, boardStatusLabel(boardPin.status), ...(boardPin.aliases || []),
          ...resources.flatMap(resource => [resource.id, resource.name, resource.shortName, resource.kind, resource.bus, resource.signal, resource.detail, resource.enabled ? '已启用' : '未启用']),
          ...fixedHardware.flatMap(item => [item.id, item.name, item.detail, '固定连接']),
          ...sharedBuses.flatMap(bus => [bus.id, bus.name, bus.summary, bus.detail, ...Object.values(bus.chipSelectPins || {})])
        ]
      : [];
    return [pin.number, pin.name, value.function, value.alias, value.connector, value.note, ...signals, ...semantic, ...boardText].join(' ');
  }

  function boardTextMatches(pin, query = rawQuery()) {
    const boardPin = boardPinFor(pin);
    if (!query || !boardPin) return false;
    return [
      boardPin.header, boardPin.label, boardPin.detail, boardStatusLabel(boardPin.status), ...(boardPin.aliases || []),
      ...boardResourcesForPin(pin).flatMap(resource => [resource.id, resource.name, resource.shortName, resource.kind, resource.bus, resource.signal, resource.detail, resource.enabled ? '已启用' : '未启用']),
      ...boardFixedHardwareForPin(pin).flatMap(item => [item.id, item.name, item.detail, '固定连接']),
      ...boardSharedBusesForPin(pin).flatMap(bus => [bus.id, bus.name, bus.summary, bus.detail, ...Object.values(bus.chipSelectPins || {})])
    ]
      .some(text => String(text || '').toLowerCase().includes(query));
  }

  function activeResourceMatch(pin) {
    if (selectedSignal) return pin.functions.some(fn => fn.signal === selectedSignal);
    const selected = resourceInstance(selectedResourceId);
    if (!selected) return true;
    return pin.functions.some(fn => signalMatchesInstance(fn.signal, selected.instance));
  }

  function pinMatches(pin, conflicts) {
    const value = assignmentFor(pin.number);
    const assigned = pin.fixed || isMeaningfulAssignment(value);
    const filterMatch = activeFilter === 'all'
      || (activeFilter === 'assigned' && assigned)
      || (activeFilter === 'unassigned' && !assigned)
      || (activeFilter === 'conflict' && conflicts.has(value.function))
      || (activeFilter === 'board' && Boolean(boardPinFor(pin) && boardPinFor(pin).status !== 'header'));
    const categoryMatch = activeCategory === 'All'
      || (value.function ? functionCategory(selectedFunction(pin, value)) === activeCategory : pin.functions.some(item => functionCategory(item) === activeCategory));
    const resourceMatch = sidebarView !== 'resources' || activeResourceMatch(pin);
    const searchMatch = hasUserTextMatch()
      ? userTextMatches(value) || boardTextMatches(pin)
      : textMatchesQuery(pinSearchText(pin));
    return filterMatch && categoryMatch && resourceMatch && searchMatch;
  }

  function uniqueProjectName(base) {
    const names = new Set(workspace.projects.map(project => project.name.toLowerCase()));
    if (!names.has(base.toLowerCase())) return base;
    let index = 2;
    while (names.has(`${base} ${index}`.toLowerCase())) index += 1;
    return `${base} ${index}`;
  }

  function renderProjectSelect() {
    elements.projectSelect.replaceChildren(...workspace.projects.map(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      option.selected = project.id === workspace.activeProjectId;
      return option;
    }));
    const restoreButton = elements.projectMenu.querySelector('[data-project-action="restore-preset"]');
    if (restoreButton) restoreButton.classList.toggle('hidden', !currentBoardPreset());
  }

  function createNewProject() {
    const suggested = uniqueProjectName('新工程');
    projectDialogMode = 'new';
    elements.projectDialogTitle.textContent = '新建工程';
    elements.projectNameInput.value = suggested;
    elements.projectPresetField.classList.remove('hidden');
    elements.projectPresetSelect.value = '';
    elements.projectDialog.showModal();
    elements.projectNameInput.focus();
    elements.projectNameInput.select();
  }

  function renameCurrentProject() {
    const project = currentProjectRecord();
    projectDialogMode = 'rename';
    elements.projectDialogTitle.textContent = '重命名工程';
    elements.projectNameInput.value = project.name;
    elements.projectPresetField.classList.add('hidden');
    elements.projectDialog.showModal();
    elements.projectNameInput.focus();
    elements.projectNameInput.select();
  }

  function duplicateCurrentProject() {
    const source = currentProjectRecord();
    const project = createProject(uniqueProjectName(`${source.name} 副本`), normalizeLoaded(JSON.parse(JSON.stringify(state))));
    workspace.projects.push(project);
    workspace.activeProjectId = project.id;
    state = project.data;
    resetTransientSelection();
    saveState();
    render();
  }

  function deleteCurrentProject() {
    if (workspace.projects.length === 1) {
      window.alert('至少需要保留一个工程。');
      return;
    }
    const project = currentProjectRecord();
    if (!window.confirm(`确定删除工程“${project.name}”吗？正式发布文件不会受影响。`)) return;
    const index = workspace.projects.findIndex(item => item.id === project.id);
    workspace.projects.splice(index, 1);
    historyByProject.delete(project.id);
    const next = workspace.projects[Math.min(index, workspace.projects.length - 1)];
    workspace.activeProjectId = next.id;
    state = next.data;
    resetTransientSelection();
    saveState();
    render();
  }

  function boardResourceById(resourceId) {
    return currentBoard()?.resources?.find(resource => resource.id === resourceId) || null;
  }

  function anotherEnabledResourceNeeds(number, signal, excludedId = '') {
    const enabled = enabledBoardResourceIds();
    return (currentBoard()?.resources || []).some(resource => resource.id !== excludedId
      && enabled.has(resource.id)
      && resource.assignments?.[String(number)] === signal);
  }

  function boardResourceConflicts(resource) {
    return Object.entries(resource.assignments || {}).flatMap(([number, expected]) => {
      const value = assignmentFor(Number(number));
      if (!isMeaningfulAssignment(value)) return [];
      if (anotherEnabledResourceNeeds(number, expected, resource.id) && value.function === expected) return [];
      const cleanExpected = value.function === expected && !value.alias.trim() && !value.connector?.trim() && !value.note.trim();
      if (cleanExpected) return [];
      const pin = currentPackage().pins.find(item => String(item.number) === number);
      return [{ number, pin, value, expected }];
    });
  }

  function setBoardResourceEnabled(resourceId, enabled) {
    if (!isBoardApplicable()) return;
    const resource = boardResourceById(resourceId);
    if (!resource || isBoardResourceEnabled(resource) === enabled) return;
    if (enabled) {
      const conflicts = boardResourceConflicts(resource);
      if (conflicts.length) {
        const list = conflicts.map(item => `${item.pin?.name || `Pin ${item.number}`}（当前 ${item.value.function || '仅有文字记录'}）`).join('、');
        if (!window.confirm(`启用“${resource.name}”将完整替换以下引脚的功能、标签、端子和备注：${list}。是否继续？`)) return;
      }
      commitMutation(`启用板载资源 ${resource.name}`, () => {
        const previouslyEnabled = enabledBoardResourceIds();
        state.enabledBoardResources = [...previouslyEnabled, resource.id];
        Object.entries(resource.assignments || {}).forEach(([number, signal]) => {
          const value = assignmentFor(Number(number));
          const sharedCompatible = (currentBoard()?.resources || []).some(other => other.id !== resource.id
            && previouslyEnabled.has(other.id)
            && other.assignments?.[number] === signal)
            && value.function === signal;
          if (!sharedCompatible) assignments()[number] = emptyAssignment(signal);
        });
      });
      return;
    }
    commitMutation(`关闭板载资源 ${resource.name}`, () => {
      state.enabledBoardResources = (state.enabledBoardResources || []).filter(id => id !== resource.id);
      Object.entries(resource.assignments || {}).forEach(([number, signal]) => {
        if (anotherEnabledResourceNeeds(number, signal, resource.id)) return;
        if (assignmentFor(Number(number)).function === signal) delete assignments()[number];
      });
    });
  }

  function restoreBoardDefaults() {
    if (!isBoardApplicable()) {
      const preset = currentBoardPreset();
      window.alert(preset
        ? `此模板对应 ${preset.device} ${preset.package}-64，请先切换到对应芯片和封装。`
        : '当前工程没有板卡模板。');
      return;
    }
    const board = currentBoard();
    if (!window.confirm(`恢复“${board.name}”的初始配置吗？将关闭全部板载资源、清除仍使用资源预设功能的引脚，并恢复 5 项固定时钟功能。`)) return;
    commitMutation('恢复天猛星板卡初始配置', () => {
      state.enabledBoardResources = [];
      (board.resources || []).forEach(resource => Object.entries(resource.assignments || {}).forEach(([number, signal]) => {
        if (assignmentFor(Number(number)).function === signal) delete assignments()[number];
      }));
      Object.entries(board.fixedDefaults || {}).forEach(([number, signal]) => {
        assignments()[number] = emptyAssignment(signal);
      });
    });
  }

  function closeMenus() {
    elements.projectMenu.classList.add('hidden');
    elements.exportMenu.classList.add('hidden');
    elements.projectMenuBtn.setAttribute('aria-expanded', 'false');
    elements.exportMenuBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu(button, menu) {
    const opening = menu.classList.contains('hidden');
    closeMenus();
    if (opening) {
      menu.classList.remove('hidden');
      button.setAttribute('aria-expanded', 'true');
    }
  }

  function renderDeviceSelect() {
    elements.deviceSelect.replaceChildren(...DEVICE_ORDER.map(device => {
      const option = document.createElement('option');
      option.value = device;
      option.textContent = device;
      option.selected = device === state.activeDevice;
      return option;
    }));
  }

  function renderPackageSelect() {
    elements.packageSelect.replaceChildren(...packageOrder().map(code => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = currentDeviceData().packages[code].label;
      option.selected = code === currentDeviceState().activePackage;
      return option;
    }));
  }

  function sidePins(pins) {
    const quarter = pins.length / 4;
    const byNumber = new Map(pins.map(pin => [pin.number, pin]));
    const range = (start, end, step) => {
      const result = [];
      for (let value = start; step > 0 ? value <= end : value >= end; value += step) result.push(byNumber.get(value));
      return result;
    };
    return {
      left: range(1, quarter, 1), bottom: range(quarter + 1, quarter * 2, 1),
      right: range(quarter * 3, quarter * 2 + 1, -1), top: range(pins.length, quarter * 3 + 1, -1)
    };
  }

  function rotatedSides(sides, rotation) {
    let result = sides;
    const steps = ((rotation % 360) + 360) % 360 / 90;
    for (let index = 0; index < steps; index += 1) {
      result = {
        top: [...result.left].reverse(),
        right: [...result.top],
        bottom: [...result.right].reverse(),
        left: [...result.bottom]
      };
    }
    return result;
  }

  function assignSignalToPin(pin, signal) {
    if (!pin.functions.some(fn => fn.signal === signal)) return false;
    const key = String(pin.number);
    const changed = commitMutation(`安排 ${signal} 到 Pin ${pin.number}`, () => {
      assignments()[key] = { ...assignmentFor(pin.number), function: signal };
    }, { render: false });
    if (!changed) return false;
    selectedPinNumber = pin.number;
    return true;
  }

  function makePinButton(pin, conflicts) {
    const value = assignmentFor(pin.number);
    const fn = selectedFunction(pin, value);
    const category = pin.fixed ? 'Power' : functionCategory(fn) || (isMeaningfulAssignment(value) ? 'GPIO' : 'Unassigned');
    const candidate = Boolean(selectedSignal && pin.functions.some(item => item.signal === selectedSignal));
    const boardPin = boardPinFor(pin);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pin-button';
    button.dataset.pin = String(pin.number);
    button.style.setProperty('--pin-color', CATEGORY_COLORS[category] || CATEGORY_COLORS.Other);
    const resourceSummary = boardResourceSummary(pin);
    const boardSummary = boardPin ? `${boardStatusLabel(boardPin.status)}${boardPin.header ? ` ${boardPin.header}` : ''}${boardPin.label ? ` ${boardPin.label}` : ''}${resourceSummary ? ` ${resourceSummary}` : ''}` : '';
    button.setAttribute('aria-label', `Pin ${pin.number} ${pin.name}${value.function ? ` ${value.function}` : ''}${value.alias ? ` ${value.alias}` : ''}${value.connector ? ` ${value.connector}` : ''}${boardSummary ? ` ${boardSummary}` : ''}`);
    button.title = `Pin ${pin.number} · ${pin.name}${value.function ? ` · ${value.function}` : ''}${value.alias ? ` · ${value.alias}` : ''}${value.connector ? ` · ${value.connector}` : ''}${boardSummary ? ` · ${boardSummary}` : ''}`;
    if (pin.fixed) button.classList.add('fixed');
    if (pin.number === selectedPinNumber) button.classList.add('selected');
    if (!pinMatches(pin, conflicts)) button.classList.add('dimmed');
    if (value.function && conflicts.has(value.function)) button.classList.add('conflict');
    if (candidate) button.classList.add(isMeaningfulAssignment(value) && value.function !== selectedSignal ? 'candidate-occupied' : 'candidate');
    if (boardPin) button.classList.add(`board-${boardPin.status}`);

    const pad = document.createElement('span');
    pad.className = 'pin-pad';
    const number = document.createElement('span');
    number.className = 'pin-number';
    number.textContent = `PIN ${pin.number}`;
    const name = document.createElement('span');
    name.className = 'pin-name';
    name.textContent = pin.name;
    pad.append(number, name);
    if (boardPin) {
      const marker = document.createElement('span');
      marker.className = 'board-pin-marker';
      marker.textContent = { header: 'H', occupied: 'B', special: '!', unexposed: '×' }[boardPin.status];
      marker.title = boardStatusLabel(boardPin.status);
      pad.appendChild(marker);
    }

    const external = document.createElement('span');
    external.className = 'pin-external-label';
    const functionLabel = document.createElement('span');
    functionLabel.className = 'pin-function-label';
    functionLabel.textContent = pin.fixed ? pin.name : value.function || '—';
    external.appendChild(functionLabel);
    if (boardPin) {
      activeBoardResourcesForPin(pin).forEach(resource => {
        const boardLabel = document.createElement('span');
        boardLabel.className = 'pin-board-label';
        boardLabel.dataset.resource = resource.id;
        boardLabel.textContent = `${resource.shortName || resource.name} · ${resource.signal}`;
        boardLabel.title = `${resource.name}：${resource.signal}`;
        external.appendChild(boardLabel);
      });
    }
    if (!pin.fixed && value.alias) {
      const custom = document.createElement('span');
      custom.className = 'pin-custom-label';
      custom.textContent = value.alias;
      external.appendChild(custom);
    }
    button.append(pad, external);
    button.addEventListener('click', () => {
      if (!pin.fixed && selectedSignal && value.function !== selectedSignal && assignSignalToPin(pin, selectedSignal)) { render(); return; }
      if (selectedPinNumber === pin.number) {
        selectedPinNumber = null;
        renderStage();
        renderInspector();
        return;
      }
      selectedPinNumber = pin.number;
      renderStage();
      renderInspector();
    });
    return button;
  }

  function renderStage() {
    const pkg = currentPackage();
    const view = currentView();
    const sides = rotatedSides(sidePins(pkg.pins), view.rotation);
    const conflicts = conflictMap();
    elements.packageStage.dataset.rotation = String(view.rotation);
    elements.packageStage.style.setProperty('--side-count', String(pkg.pinCount / 4));
    elements.topPins.replaceChildren(...sides.top.map(pin => makePinButton(pin, conflicts)));
    elements.rightPins.replaceChildren(...sides.right.map(pin => makePinButton(pin, conflicts)));
    elements.bottomPins.replaceChildren(...sides.bottom.map(pin => makePinButton(pin, conflicts)));
    elements.leftPins.replaceChildren(...sides.left.map(pin => makePinButton(pin, conflicts)));
    const assigned = pkg.pins.filter(pin => !pin.fixed && isMeaningfulAssignment(assignmentFor(pin.number))).length;
    const portPins = pkg.pins.filter(pin => !pin.fixed && isPortPin(pin));
    const systemPins = pkg.pins.filter(pin => !pin.fixed && !isPortPin(pin));
    const fixedPins = pkg.pins.filter(pin => pin.fixed);
    elements.canvasTitle.textContent = `${state.activeDevice} · ${pkg.label}`;
    elements.canvasSubtitle.textContent = selectedSignal
      ? `正在安排 ${selectedSignal}：点击绿色候选引脚，橙色表示将替换已有安排`
      : isBoardApplicable()
        ? `${currentBoard().name} · H 排针 · B 板载占用 · ! 特殊限制 · × 未引出`
        : currentBoardPreset()
          ? `模板对应 ${currentBoardPreset().device} ${currentBoardPreset().package}-64，当前视图仅显示芯片官方数据`
          : `${pkg.pinCount} 个物理引脚 · ${portPins.length} 个 GPIO/复用引脚 · ${systemPins.length} 个系统引脚 · ${fixedPins.length} 个电源/地`;
    elements.chipDevice.textContent = state.activeDevice;
    elements.chipPackage.textContent = pkg.label;
    elements.chipSummary.textContent = `${assigned} pins assigned · ${view.rotation}°${conflicts.size ? ` · ${conflicts.size} conflicts` : ''}`;
  }

  function renderBoardHardwarePanel() {
    const preset = currentBoardPreset();
    const board = currentBoard();
    elements.boardHardwarePanel.classList.toggle('hidden', !preset || !board);
    if (!preset || !board) return;
    const applicable = isBoardApplicable();
    const enabled = new Set(state.enabledBoardResources || []);
    const resourceMismatchCount = resource => Object.entries(resource.assignments || {})
      .filter(([number, signal]) => assignmentFor(Number(number)).function !== signal).length;
    const conflicts = applicable
      ? (board.resources || []).filter(resource => enabled.has(resource.id)).reduce((sum, resource) => sum + resourceMismatchCount(resource), 0)
      : 0;
    elements.boardHardwareSummary.textContent = applicable
      ? `${enabled.size}/${(board.resources || []).length} 启用${conflicts ? ` · ${conflicts} 项需处理` : ''}`
      : `对应 ${preset.device} ${preset.package}-64 · 当前不可用`;
    elements.boardHardwareNote.textContent = applicable
      ? '开关控制当前规划和自动安排，不会断开板上的真实器件与走线。'
      : `切回 ${preset.device} ${preset.package}-64 后可以继续配置，现有安排不会删除。`;

    const pinByNumber = new Map(Object.entries(board.pins || {}));
    const resourceRows = (board.resources || []).map(resource => {
      const row = document.createElement('label');
      row.className = `board-resource-row${enabled.has(resource.id) ? ' enabled' : ''}`;
      row.dataset.resource = resource.id;
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.className = 'board-resource-toggle';
      toggle.checked = enabled.has(resource.id);
      toggle.disabled = !applicable;
      toggle.setAttribute('aria-label', `${toggle.checked ? '关闭' : '启用'}${resource.name}`);
      const copy = document.createElement('span');
      copy.className = 'board-resource-copy';
      const title = document.createElement('strong');
      title.textContent = resource.name;
      const pins = document.createElement('span');
      pins.textContent = Object.entries(resource.pins || {}).map(([number, role]) => `${pinByNumber.get(number)?.name || `Pin ${number}`} ${role}`).join(' · ');
      copy.append(title, pins);
      const status = document.createElement('span');
      status.className = 'board-resource-state';
      const mismatchCount = applicable && enabled.has(resource.id) ? resourceMismatchCount(resource) : 0;
      status.textContent = enabled.has(resource.id)
        ? mismatchCount ? `需处理 ${mismatchCount}` : '已启用'
        : resource.kind === 'optional' ? '未启用' : '未纳入规划';
      if (mismatchCount) row.classList.add('warning');
      row.append(toggle, copy, status);
      toggle.addEventListener('change', () => {
        setBoardResourceEnabled(resource.id, toggle.checked);
        if (isBoardResourceEnabled(resource) !== toggle.checked) renderBoardHardwarePanel();
      });
      return row;
    });
    elements.boardResourceControls.replaceChildren(...resourceRows);

    const activeSharedBuses = applicable ? (board.sharedBuses || []).filter(bus => bus.resources.every(id => enabled.has(id))) : [];
    elements.boardSharedNote.classList.toggle('hidden', activeSharedBuses.length === 0);
    elements.boardSharedNote.textContent = activeSharedBuses.map(bus => `${bus.name}：${bus.summary}；${Object.values(bus.chipSelectPins || {}).join(' · ')}`).join(' ');

    const fixedRows = (board.fixedHardware || []).map(item => {
      const row = document.createElement('div');
      row.className = 'board-fixed-row';
      const title = document.createElement('strong');
      title.textContent = item.name;
      const detail = document.createElement('span');
      detail.textContent = item.detail;
      row.append(title, detail);
      return row;
    });
    elements.boardFixedHardwareList.replaceChildren(...fixedRows);
  }

  function renderCategories() {
    const counts = new Map();
    currentPackage().pins.forEach(pin => new Set(pin.functions.map(functionCategory)).forEach(category => counts.set(category, (counts.get(category) || 0) + 1)));
    const categories = ['All', ...Object.keys(CATEGORY_COLORS).filter(category => counts.has(category))];
    elements.categoryList.replaceChildren(...categories.map(category => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `category-btn${category === activeCategory ? ' active' : ''}`;
      button.style.setProperty('--category-color', category === 'All' ? '#9aa7af' : CATEGORY_COLORS[category]);
      button.innerHTML = `<span class="category-dot"></span><span>${category === 'All' ? '全部类别' : categoryLabel(category)}</span><span class="category-count">${category === 'All' ? currentPackage().pins.length : counts.get(category)}</span>`;
      button.addEventListener('click', () => { activeCategory = category; render(); });
      return button;
    }));
  }

  function resourceSearchText(group, instance) {
    return [group.key, group.label, instance.id, instance.display, instance.feature, ...(instance.aliases || []), ...signalsForInstance(instance).map(fn => `${fn.signal} ${signalRole(fn.signal)}`)].join(' ');
  }

  function assignedSignals(instance) {
    return new Set(Object.values(assignments()).map(value => value.function).filter(signal => signalMatchesInstance(signal, instance)));
  }

  function resourceRequiredSuffixes(group, instance) {
    if (group.key === 'UART') return ['TX', 'RX'];
    if (group.key === 'I2C') return ['SCL', 'SDA'];
    if (group.key === 'SPI') return ['SCK', 'PICO', 'POCI'];
    if (group.key === 'CAN') return ['TX', 'RX'];
    if (group.key === 'Timer' && /QEI/.test(instance.feature || '')) return ['C0', 'C1'];
    return [];
  }

  function resourceCompleteness(group, instance) {
    const available = signalsForInstance(instance).map(fn => fn.signal);
    const assigned = assignedSignals(instance);
    const required = resourceRequiredSuffixes(group, instance).map(suffix => {
      const signal = available.find(item => item === `${instance.id}_${suffix}` || item.endsWith(`_${suffix}`)) || `${instance.id}_${suffix}`;
      return { suffix, signal, available: available.includes(signal), assigned: assigned.has(signal) };
    });
    const missing = required.filter(item => !item.assigned);
    return { required, missing, complete: required.length > 0 && missing.length === 0, active: assigned.size > 0, assignedCount: assigned.size, availableCount: available.length };
  }

  function preserveSidebarScroll(update) {
    const sidebar = elements.resourcePanel.closest('.sidebar');
    const scrollTop = sidebar ? sidebar.scrollTop : 0;
    update();
    if (!sidebar) return;
    sidebar.scrollTop = scrollTop;
    requestAnimationFrame(() => { sidebar.scrollTop = scrollTop; });
  }

  function renderResources() {
    const catalog = resourceCatalog();
    const total = catalog.reduce((sum, group) => sum + group.instances.length, 0);
    elements.resourceSummary.textContent = `芯片共 ${total} 个可引出外设实例；数量表示硬件实例，不是候选引脚数量。`;
    const queryActive = queryVariants().length > 0;
    const nodes = [];
    catalog.forEach(group => {
      const visibleInstances = group.instances.filter(instance => !queryActive || textMatchesQuery(resourceSearchText(group, instance)));
      if (queryActive && !visibleInstances.length) return;
      const wrapper = document.createElement('section');
      wrapper.className = 'resource-group';
      const title = document.createElement('button');
      title.type = 'button';
      title.className = 'resource-group-title';
      title.innerHTML = `<span>${group.label}</span><span>${group.instances.length} 个</span>`;
      title.addEventListener('click', () => {
        expandedGroups.has(group.key) ? expandedGroups.delete(group.key) : expandedGroups.add(group.key);
        renderResources();
      });
      wrapper.appendChild(title);
      if (expandedGroups.has(group.key) || queryActive || group.instances.some(item => item.id === selectedResourceId)) {
        const list = document.createElement('div');
        list.className = 'resource-instances';
        visibleInstances.forEach(instance => {
          const signals = signalsForInstance(instance);
          const health = resourceCompleteness(group, instance);
          const button = document.createElement('button');
          button.type = 'button';
          button.className = `resource-instance${instance.id === selectedResourceId ? ' active' : ''}`;
          button.dataset.resource = instance.id;
          const name = document.createElement('span');
          const healthText = health.required.length && health.active
            ? `<span class="resource-health${health.complete ? '' : ' incomplete'}">${health.complete ? '完整' : `缺 ${health.missing.length}`}</span>`
            : '';
          name.innerHTML = `${instance.display || instance.id}${instance.feature ? ` <span class="resource-instance-feature">${instance.feature}</span>` : ''}${healthText}`;
          const meta = document.createElement('span');
          meta.className = 'resource-instance-meta';
          meta.textContent = `${health.assignedCount}/${signals.length}`;
          button.append(name, meta);
          button.addEventListener('click', () => {
            button.blur();
            preserveSidebarScroll(() => {
              selectedResourceId = selectedResourceId === instance.id ? '' : instance.id;
              selectedSignal = '';
              if (selectedResourceId) expandedGroups.add(group.key);
              elements.resourceList.querySelectorAll('.resource-instance').forEach(item => {
                item.classList.toggle('active', item.dataset.resource === selectedResourceId);
              });
              renderResourceDetail();
              renderStage();
            });
          });
          list.appendChild(button);
        });
        wrapper.appendChild(list);
      }
      nodes.push(wrapper);
    });
    if (!nodes.length) {
      const empty = document.createElement('div');
      empty.className = 'resource-empty';
      empty.textContent = '没有匹配的外设资源。可尝试 TIMER、TIM1、QEI、编码器、PWM 等关键词。';
      nodes.push(empty);
    }
    elements.resourceList.replaceChildren(...nodes);
    renderResourceDetail();
  }

  function renderResourceDetail() {
    const selected = resourceInstance(selectedResourceId);
    elements.resourceDetail.classList.toggle('hidden', !selected);
    if (!selected) return;
    const { group, instance } = selected;
    const health = resourceCompleteness(group, instance);
    elements.resourceDetailTitle.textContent = `${instance.display || instance.id}${instance.feature ? ` · ${instance.feature}` : ''}`;
    const baseNote = /^TIMG[89]$/.test(instance.id)
      ? 'QEI/Hall 模式使用 C0 作为 A 相、C1 作为 B 相，IDX 作为可选 Z 索引。先选信号，再点封装图中的候选引脚。'
      : '选择一个官方信号，再点击封装图中高亮的候选引脚完成安排。';
    const completenessNote = health.required.length
      ? health.complete
        ? ' 必需信号已完整安排。'
        : health.active
          ? ` 尚缺：${health.missing.map(item => item.suffix).join('、')}。`
          : ` 建议至少安排：${health.required.map(item => item.suffix).join('、')}。`
      : '';
    elements.resourceDetailNote.textContent = baseNote + completenessNote;
    const nodes = signalsForInstance(instance).map(fn => {
      const pins = currentPackage().pins.filter(pin => pin.functions.some(item => item.signal === fn.signal));
      const assignedPins = currentPackage().pins.filter(pin => assignmentFor(pin.number).function === fn.signal).map(pin => pin.number);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `resource-signal${selectedSignal === fn.signal ? ' active' : ''}`;
      button.dataset.signal = fn.signal;
      const label = document.createElement('span');
      label.innerHTML = `<span class="resource-signal-role">${signalRole(fn.signal)}</span><span class="resource-signal-name">${fn.signal}</span>`;
      const meta = document.createElement('span');
      meta.className = 'resource-signal-meta';
      meta.textContent = assignedPins.length ? `Pin ${assignedPins.join('、')}` : `${pins.length} 可选`;
      button.append(label, meta);
      button.addEventListener('click', () => {
        selectedSignal = selectedSignal === fn.signal ? '' : fn.signal;
        elements.resourceSignals.querySelectorAll('.resource-signal').forEach(item => {
          item.classList.toggle('active', item.dataset.signal === selectedSignal);
        });
        renderStage();
      });
      return button;
    });
    elements.resourceSignals.replaceChildren(...nodes);
  }

  function renderStats() {
    const pkg = currentPackage();
    const configurable = pkg.pins.filter(pin => !pin.fixed);
    const systemPins = configurable.filter(pin => !isPortPin(pin));
    const assigned = configurable.filter(pin => isMeaningfulAssignment(assignmentFor(pin.number))).length;
    const conflicts = conflictMap();
    elements.packagePinCount.textContent = `${pkg.pinCount} pins`;
    elements.assignedCount.textContent = assigned;
    elements.unassignedCount.textContent = configurable.length - assigned;
    elements.fixedCount.textContent = pkg.pins.length - configurable.length;
    elements.systemCount.textContent = systemPins.length;
    elements.conflictCount.textContent = [...conflicts.values()].reduce((sum, pins) => sum + pins.length, 0);
  }

  function buildFunctionSelect(pin, value) {
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '未安排';
    const nodes = [empty];
    const groups = new Map();
    pin.functions.forEach(fn => {
      const category = functionCategory(fn);
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(fn);
    });
    groups.forEach((functions, category) => {
      const group = document.createElement('optgroup');
      group.label = categoryLabel(category);
      functions.forEach(fn => {
        const option = document.createElement('option');
        option.value = fn.signal;
        option.textContent = `${fn.signal}${fn.signalType ? ` · ${fn.signalType}` : ''}`;
        group.appendChild(option);
      });
      nodes.push(group);
    });
    elements.functionSelect.replaceChildren(...nodes);
    elements.functionSelect.value = value.function;
  }

  function renderInspector() {
    const pin = selectedPin();
    elements.inspectorEmpty.classList.toggle('hidden', Boolean(pin));
    elements.inspectorContent.classList.toggle('hidden', !pin);
    if (!pin) return;
    const value = assignmentFor(pin.number);
    const fn = selectedFunction(pin, value);
    const boardPin = boardPinFor(pin);
    const conflictPins = value.function ? conflictMap().get(value.function) || [] : [];
    elements.pinTitle.textContent = `Pin ${pin.number} · ${pin.name}`;
    elements.pinSubtitle.textContent = `${state.activeDevice} · ${currentPackage().label}`;
    elements.physicalPin.textContent = String(pin.number);
    elements.logicalPin.textContent = pin.name;
    elements.iomuxRegister.textContent = pin.iomuxRegister || '—';
    elements.bufferType.textContent = pin.bufferType || '—';
    elements.boardInfoBox.classList.toggle('hidden', !boardPin);
    if (boardPin) {
      const resources = boardResourcesForPin(pin);
      const fixedHardware = boardFixedHardwareForPin(pin);
      const sharedBuses = boardSharedBusesForPin(pin).filter(bus => bus.resources.every(id => enabledBoardResourceIds().has(id)));
      elements.boardInfoBox.dataset.status = boardPin.status;
      elements.boardInfoTitle.textContent = resources.length + fixedHardware.length > 1
        ? `${pin.name} · ${resources.length + fixedHardware.length} 路板卡连接`
        : boardPin.label || boardStatusLabel(boardPin.status);
      elements.boardInfoStatus.textContent = boardStatusLabel(boardPin.status);
      elements.boardInfoMeta.textContent = [
        currentBoard().name,
        boardPin.header ? `排针 ${boardPin.header}` : '未连接 U21/U22 排针',
        (boardPin.aliases || []).length ? `丝印 ${(boardPin.aliases || []).join('、')}` : ''
      ].filter(Boolean).join(' · ');
      const routeNodes = resources.map(resource => {
        const row = document.createElement('div');
        row.className = `board-route${resource.enabled ? ' enabled' : ''}`;
        const kind = document.createElement('span');
        kind.className = `board-route-kind ${resource.enabled ? 'enabled' : 'disabled'}`;
        kind.textContent = resource.enabled ? '已启用' : '未启用';
        const copy = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = resource.name;
        const signal = document.createElement('span');
        signal.textContent = `${resource.signal}${resource.expected ? ` → ${resource.expected}` : ''}${resource.bus ? ` · ${resource.bus}` : ''}`;
        copy.append(title, signal);
        row.append(kind, copy);
        return row;
      });
      fixedHardware.forEach(item => {
        const row = document.createElement('div');
        row.className = 'board-route fixed';
        const kind = document.createElement('span');
        kind.className = 'board-route-kind fixed';
        kind.textContent = '固定';
        const copy = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = item.name;
        const detail = document.createElement('span');
        detail.textContent = item.detail;
        copy.append(title, detail);
        row.append(kind, copy);
        routeNodes.push(row);
      });
      elements.boardRouteList.classList.toggle('hidden', routeNodes.length === 0);
      elements.boardRouteList.replaceChildren(...routeNodes);
      elements.boardInfoSharedNote.classList.toggle('hidden', sharedBuses.length === 0);
      elements.boardInfoSharedNote.textContent = sharedBuses.map(bus => bus.detail).join(' ');
      elements.boardInfoDetail.textContent = boardPin.detail || (resources.length
        ? resources.map(resource => resource.detail).filter(Boolean).join(' ')
        : '该引脚已引到板卡排针，模板没有预设额外板载功能。');
    }
    elements.editableFields.classList.toggle('hidden', pin.fixed);
    elements.fixedBox.classList.toggle('hidden', !pin.fixed);
    if (pin.fixed) {
      elements.pinStatus.textContent = '固定功能';
      elements.fixedBox.textContent = `${pin.name} 是该封装的固定电源相关引脚，不参与复用规划。`;
      return;
    }
    elements.pinStatus.textContent = isBoardDefaultAssignment(pin, value)
      ? '模板默认 · 可修改'
      : isOfficialDefaultAssignment(pin, value) ? '官方默认 · 可修改' : isMeaningfulAssignment(value) ? '已安排' : '未安排';
    buildFunctionSelect(pin, value);
    elements.aliasInput.value = value.alias;
    elements.connectorInput.value = value.connector || '';
    elements.noteInput.value = value.note;
    elements.functionInfo.classList.toggle('hidden', !fn);
    if (fn) elements.functionInfo.textContent = `${categoryLabel(functionCategory(fn))} · ${fn.signalType || '未标注方向'} · ${fn.iomuxManaged ? `IOMUX PF ${fn.pf}` : fn.pfLabel || 'Non-IOMUX'}`;
    elements.conflictBox.classList.toggle('hidden', conflictPins.length < 2);
    if (conflictPins.length >= 2) elements.conflictBox.textContent = `${value.function} 同时安排在 Pin ${conflictPins.join('、Pin ')}。这是提示性冲突，请自行确认是否有意重复。`;
  }

  function updateSelectedAssignment(patch, refreshInspector = true, mergeKey = '') {
    const pin = selectedPin();
    if (!pin || pin.fixed) return;
    const key = String(pin.number);
    let next;
    const changed = commitMutation(`编辑 Pin ${pin.number}`, () => {
      next = { ...assignmentFor(pin.number), ...patch };
      isMeaningfulAssignment(next) ? assignments()[key] = next : delete assignments()[key];
    }, { render: false, mergeKey });
    if (!changed) return;
    if (refreshInspector) render();
    else {
      renderStats(); renderCategories(); renderResources(); renderStage();
      renderCheckButton();
      elements.pinStatus.textContent = isBoardDefaultAssignment(selectedPin(), next)
        ? '模板默认 · 可修改'
        : isOfficialDefaultAssignment(selectedPin(), next) ? '官方默认 · 可修改' : isMeaningfulAssignment(next) ? '已安排' : '未安排';
    }
  }

  function applyView() {
    const view = currentView();
    const scale = view.zoom / 100;
    const gridSize = 24 * scale;
    const gridX = ((view.x % gridSize) + gridSize) % gridSize;
    const gridY = ((view.y % gridSize) + gridSize) % gridSize;
    elements.stageScale.style.transform = `translate(${view.x}px, ${view.y}px) scale(${scale})`;
    elements.canvasScroller.style.backgroundSize = `${gridSize}px ${gridSize}px`;
    elements.canvasScroller.style.backgroundPosition = `${gridX}px ${gridY}px`;
    elements.zoomSlider.value = String(Math.round(view.zoom));
    elements.zoomValue.textContent = `${Math.round(view.zoom)}%`;
  }

  function applyLayout() {
    const minimumCenterWidth = 420;
    const availableForPanels = Math.max(450, window.innerWidth - minimumCenterWidth - 14);
    state.layout.leftWidth = Math.min(460, Math.max(190, state.layout.leftWidth));
    state.layout.rightWidth = Math.min(540, Math.max(260, state.layout.rightWidth));
    let excess = state.layout.leftWidth + state.layout.rightWidth - availableForPanels;
    if (excess > 0) {
      const leftReduction = Math.min(excess, state.layout.leftWidth - 190);
      state.layout.leftWidth -= leftReduction;
      excess -= leftReduction;
      if (excess > 0) state.layout.rightWidth = Math.max(260, state.layout.rightWidth - excess);
    }
    document.documentElement.style.setProperty('--left-panel-width', `${state.layout.leftWidth}px`);
    document.documentElement.style.setProperty('--right-panel-width', `${state.layout.rightWidth}px`);
  }

  function centerView(save = true) {
    const view = currentView();
    const width = elements.packageStage.offsetWidth;
    const height = elements.packageStage.offsetHeight;
    const scale = view.zoom / 100;
    view.x = (elements.canvasScroller.clientWidth - width * scale) / 2;
    view.y = (elements.canvasScroller.clientHeight - height * scale) / 2;
    view.initialized = true;
    applyView();
    if (save) saveState();
  }

  function fitView(save = true) {
    const view = currentView();
    const width = elements.packageStage.offsetWidth;
    const height = elements.packageStage.offsetHeight;
    const availableWidth = Math.max(100, elements.canvasScroller.clientWidth - 48);
    const availableHeight = Math.max(100, elements.canvasScroller.clientHeight - 48);
    view.zoom = Math.min(180, Math.max(35, Math.min(availableWidth / width, availableHeight / height) * 100));
    centerView(false);
    if (save) saveState();
  }

  function setZoom(zoom, anchor) {
    const view = currentView();
    const oldScale = view.zoom / 100;
    const newZoom = Math.min(180, Math.max(35, zoom));
    const newScale = newZoom / 100;
    const point = anchor || { x: elements.canvasScroller.clientWidth / 2, y: elements.canvasScroller.clientHeight / 2 };
    const worldX = (point.x - view.x) / oldScale;
    const worldY = (point.y - view.y) / oldScale;
    view.x = point.x - worldX * newScale;
    view.y = point.y - worldY * newScale;
    view.zoom = newZoom;
    view.initialized = true;
    applyView();
    saveState();
  }

  function renderSidebarMode() {
    elements.pinPanel.classList.toggle('hidden', sidebarView !== 'pins');
    elements.resourcePanel.classList.toggle('hidden', sidebarView !== 'resources');
    elements.sidebarTitle.textContent = sidebarView === 'pins' ? '引脚筛选' : '外设资源';
    elements.sidebarViewTabs.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === sidebarView));
  }

  function render() {
    applyLayout();
    renderProjectSelect();
    renderDeviceSelect();
    renderPackageSelect();
    const source = currentDeviceData().source;
    elements.sourceFooter.textContent = `非 TI 官方工具 · 数据来源：${source.document}，${source.revision}，页 ${source.pages} · v${APP_META.version}`;
    renderSidebarMode();
    renderStats();
    renderCategories();
    renderResources();
    renderBoardHardwarePanel();
    renderStage();
    renderInspector();
    renderHistoryControls();
    renderCheckButton();
    elements.filterTabs.querySelectorAll('[data-filter]').forEach(button => button.classList.toggle('active', button.dataset.filter === activeFilter));
    requestAnimationFrame(() => currentView().initialized ? applyView() : fitView(false));
  }

  function downloadFile(name, content, type) {
    if (window.mspm0Desktop?.saveFile) {
      window.mspm0Desktop.saveFile({ name, content, type }).catch(error => {
        window.alert(error?.message || '文件保存失败。');
      });
      return;
    }
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function safeFileName(value) {
    return String(value || 'project').trim().replace(/[<>:"/\\|?*\x00-\x1f]+/g, '-').replace(/\s+/g, '-').slice(0, 64) || 'project';
  }

  function exportProjectJson() {
    const project = currentProjectRecord();
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      kind: 'mspm0-pin-project',
      exportedAt: new Date().toISOString(),
      project: { ...project, data: state }
    };
    downloadFile(`${safeFileName(project.name)}-mspm0-project.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  }

  function exportWorkspaceJson() {
    const payload = { ...workspace, exportedAt: new Date().toISOString(), kind: 'mspm0-pin-workspace' };
    downloadFile('mspm0-pin-planner-workspace.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  }

  function csvEscape(value) {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function exportCsv() {
    const pkg = currentPackage();
    const rows = [['Project', 'Device', 'Package', 'Board Preset', 'Physical Pin', 'Pin Name', 'Selected Function', 'Custom Label', 'User Connector', 'Note', 'Board Connector', 'Board Status', 'Board Detail', 'Category', 'Signal Type', 'IOMUX PF', 'IOMUX Register', 'Buffer Type']];
    pkg.pins.forEach(pin => {
      const value = assignmentFor(pin.number);
      const fn = selectedFunction(pin, value);
      const boardPin = boardPinFor(pin);
      rows.push([currentProjectRecord().name, state.activeDevice, pkg.code, isBoardApplicable() ? currentBoard().name : '', pin.number, pin.name, pin.fixed ? pin.name : value.function, value.alias, value.connector, value.note, boardPin?.header || '', boardStatusLabel(boardPin?.status), boardExportDetail(pin), pin.fixed ? 'Power' : functionCategory(fn), fn?.signalType || '', fn ? (fn.iomuxManaged ? fn.pf : fn.pfLabel) : '', pin.iomuxRegister, pin.bufferType]);
    });
    downloadFile(`${state.activeDevice.toLowerCase()}-${pkg.code.toLowerCase()}-pin-plan.csv`, '\ufeff' + rows.map(row => row.map(csvEscape).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  }

  function resourceForSignal(signal) {
    for (const group of resourceCatalog()) {
      const instance = group.instances.find(item => signalMatchesInstance(signal, item));
      if (instance) return { group, instance };
    }
    return null;
  }

  function exportGroupedCsv() {
    const header = ['Peripheral Group', 'Instance', 'Signal', 'Pin', 'GPIO', 'Custom Label', 'User Connector', 'Note', 'Board Connector', 'Board Status', 'Board Detail'];
    const body = [];
    currentPackage().pins.forEach(pin => {
      if (pin.fixed) return;
      const value = assignmentFor(pin.number);
      if (!value.function) return;
      const resource = resourceForSignal(value.function);
      const boardPin = boardPinFor(pin);
      body.push([resource?.group.label || functionCategory(selectedFunction(pin, value)) || 'Other', resource?.instance.display || resource?.instance.id || '', value.function, pin.number, pin.name, value.alias, value.connector, value.note, boardPin?.header || '', boardStatusLabel(boardPin?.status), boardExportDetail(pin)]);
    });
    body.sort((a, b) => `${a[0]}-${a[1]}-${a[2]}`.localeCompare(`${b[0]}-${b[1]}-${b[2]}`, undefined, { numeric: true }));
    const rows = [header, ...body];
    downloadFile(`${safeFileName(currentProjectRecord().name)}-peripherals.csv`, '\ufeff' + rows.map(row => row.map(csvEscape).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  }

  function exportConnectorCsv() {
    const rows = [['User Connector', 'Board Connector', 'Physical Pin', 'GPIO', 'Function', 'Net Label', 'Note', 'Board Status', 'Board Detail']];
    currentPackage().pins.forEach(pin => {
      if (pin.fixed) return;
      const value = assignmentFor(pin.number);
      const boardPin = boardPinFor(pin);
      if (!value.connector?.trim() && !boardPin?.header) return;
      rows.push([value.connector, boardPin?.header || '', pin.number, pin.name, value.function, value.alias || value.function || pin.name, value.note, boardStatusLabel(boardPin?.status), boardExportDetail(pin)]);
    });
    rows.splice(1, rows.length - 1, ...rows.slice(1).sort((a, b) => (a[1] || a[0]).localeCompare(b[1] || b[0], undefined, { numeric: true })));
    downloadFile(`${safeFileName(currentProjectRecord().name)}-connectors.csv`, '\ufeff' + rows.map(row => row.map(csvEscape).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  }

  function exportKicadCsv() {
    const rows = [['Physical Pin', 'GPIO', 'Net Label', 'Selected Function', 'User Connector', 'Board Connector', 'Board Status']];
    currentPackage().pins.forEach(pin => {
      if (pin.fixed) return;
      const value = assignmentFor(pin.number);
      const boardPin = boardPinFor(pin);
      if (!isMeaningfulAssignment(value) && !boardPin) return;
      rows.push([pin.number, pin.name, value.alias || value.function || pin.name, value.function, value.connector, boardPin?.header || '', boardStatusLabel(boardPin?.status)]);
    });
    downloadFile(`${safeFileName(currentProjectRecord().name)}-kicad-net-labels.csv`, '\ufeff' + rows.map(row => row.map(csvEscape).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function printReport() {
    const project = currentProjectRecord();
    const pkg = currentPackage();
    const issues = planIssues().filter(issue => issue.severity !== 'info');
    const assignedRows = pkg.pins.filter(pin => pin.fixed || isMeaningfulAssignment(assignmentFor(pin.number)) || boardPinFor(pin)).map(pin => {
      const value = assignmentFor(pin.number);
      const boardPin = boardPinFor(pin);
      return `<tr><td>${pin.number}</td><td>${escapeHtml(pin.name)}</td><td>${escapeHtml(pin.fixed ? pin.name : value.function)}</td><td>${escapeHtml(value.alias)}</td><td>${escapeHtml(value.connector)}</td><td>${escapeHtml(value.note)}</td><td>${escapeHtml(boardPin?.header || '')}</td><td>${escapeHtml(boardStatusLabel(boardPin?.status))}</td><td>${escapeHtml(boardExportDetail(pin))}</td></tr>`;
    }).join('');
    const issueRows = issues.length
      ? issues.map(issue => `<p class="print-warning"><strong>${escapeHtml(issue.title)}</strong>：${escapeHtml(issue.detail)}</p>`).join('')
      : '<p>未发现错误或缺失提醒。</p>';
    elements.printReport.innerHTML = `
      <h1>MSPM0 引脚规划报告</h1>
      <p>工程：${escapeHtml(project.name)} · 芯片：${escapeHtml(state.activeDevice)} · 封装：${escapeHtml(pkg.label)}${isBoardApplicable() ? ` · 板卡：${escapeHtml(currentBoard().name)}` : ''}</p>
      <p>生成时间：${escapeHtml(new Date().toLocaleString())} · 软件版本：${escapeHtml(APP_META.version)}</p>
      <p>非 TI 官方工具。本报告仅用于规划，不替代数据手册和电气设计审查。</p>
      <h2>检查摘要</h2>${issueRows}
      <h2>引脚安排</h2>
      <table><thead><tr><th>Pin</th><th>GPIO</th><th>功能</th><th>标签</th><th>用户连接器</th><th>备注</th><th>板卡端子</th><th>板卡状态</th><th>板卡说明</th></tr></thead><tbody>${assignedRows}</tbody></table>`;
    window.print();
  }

  function runExport(action) {
    const actions = {
      json: exportProjectJson,
      workspace: exportWorkspaceJson,
      csv: exportCsv,
      grouped: exportGroupedCsv,
      connector: exportConnectorCsv,
      kicad: exportKicadCsv,
      print: printReport
    };
    closeMenus();
    actions[action]?.();
  }

  function dataFromLegacyExport(parsed) {
    if (!DEVICE_ORDER.includes(parsed.device) || ![1, 2, 3].includes(parsed.schemaVersion)) throw new Error('文件不是兼容的 MSPM0G 引脚规划 JSON。');
    if ([1, 2].includes(parsed.schemaVersion) && parsed.device !== 'MSPM0G3519') throw new Error('旧版 JSON 只支持 MSPM0G3519。');
    const data = createEmptyState();
    const device = parsed.device;
    const deviceState = data.devices[device];
    const codes = DEVICE_CONFIG[device].packageOrder;
    let skipped = 0;
    codes.forEach(code => {
      const result = sanitizeAssignments(device, code, parsed.packages?.[code]?.assignments || {});
      deviceState.packages[code].assignments = result.assignments;
      skipped += result.skipped;
      if (parsed.schemaVersion >= 2 && parsed.views?.[code]) deviceState.views[code] = sanitizeView(device, code, parsed.views[code]);
      if (parsed.schemaVersion === 1 && parsed.zoom?.[code]) deviceState.views[code] = sanitizeView(device, code, null, parsed.zoom[code]);
    });
    deviceState.activePackage = codes.includes(parsed.activePackage) ? parsed.activePackage : deviceState.activePackage;
    if (parsed.schemaVersion >= 2) {
      data.layout.leftWidth = Math.min(460, Math.max(190, Number(parsed.layout?.leftWidth) || data.layout.leftWidth));
      data.layout.rightWidth = Math.min(540, Math.max(260, Number(parsed.layout?.rightWidth) || data.layout.rightWidth));
    }
    data.activeDevice = device;
    return { data, skipped };
  }

  async function importJson(file) {
    try {
      const parsed = JSON.parse(await file.text());
      const imported = [];
      let skipped = 0;
      if ([4, 5, SCHEMA_VERSION].includes(parsed?.schemaVersion) && parsed.kind === 'mspm0-pin-project' && parsed.project) {
        imported.push(normalizeProject({ ...parsed.project, id: createId(), name: uniqueProjectName(parsed.project.name || file.name.replace(/\.json$/i, '')) }));
      } else if ([4, 5, SCHEMA_VERSION].includes(parsed?.version) && parsed.kind === 'mspm0-pin-workspace' && Array.isArray(parsed.projects)) {
        parsed.projects.slice(0, 40).forEach(project => imported.push(normalizeProject({ ...project, id: createId(), name: uniqueProjectName(project.name || '导入工程') })));
      } else {
        const legacy = dataFromLegacyExport(parsed);
        skipped = legacy.skipped;
        imported.push(createProject(uniqueProjectName(file.name.replace(/\.json$/i, '') || '导入工程'), legacy.data));
      }
      if (!imported.length) throw new Error('文件中没有可导入的工程。');
      workspace.projects.push(...imported);
      workspace.activeProjectId = imported[0].id;
      state = imported[0].data;
      resetTransientSelection();
      saveState();
      render();
      window.alert(`${imported.length} 个工程已导入为新工程${skipped ? `，忽略 ${skipped} 条不兼容记录` : ''}。`);
    } catch (error) {
      window.alert(error.message || 'JSON 导入失败。');
    } finally {
      elements.importFile.value = '';
      setTimeout(restoreImportFocus, 0);
    }
  }

  async function restoreImportFocus() {
    try {
      await window.mspm0Desktop?.focusWindow?.();
    } catch { /* browser fallback below */ }
    window.focus();
    requestAnimationFrame(() => elements.searchInput.focus({ preventScroll: true }));
  }

  function resetTransientSelection() {
    selectedPinNumber = null;
    selectedResourceId = '';
    selectedSignal = '';
    activeFilter = 'all';
    activeCategory = 'All';
    elements.searchInput.value = '';
  }

  elements.projectSelect.addEventListener('change', () => activateProject(elements.projectSelect.value));
  elements.projectMenuBtn.addEventListener('click', event => { event.stopPropagation(); toggleMenu(elements.projectMenuBtn, elements.projectMenu); });
  elements.projectMenu.addEventListener('click', event => {
    const button = event.target.closest('[data-project-action]');
    if (!button) return;
    closeMenus();
    const actions = { new: createNewProject, rename: renameCurrentProject, duplicate: duplicateCurrentProject, 'restore-preset': restoreBoardDefaults, delete: deleteCurrentProject };
    actions[button.dataset.projectAction]?.();
  });
  elements.projectForm.addEventListener('submit', event => {
    event.preventDefault();
    const name = elements.projectNameInput.value.trim();
    if (!name) return;
    if (projectDialogMode === 'new') {
      const presetId = elements.projectPresetSelect.value;
      const project = createProject(uniqueProjectName(name), presetId ? createPresetState(presetId) : createEmptyState());
      workspace.projects.push(project);
      workspace.activeProjectId = project.id;
      state = project.data;
      resetTransientSelection();
      saveState();
      render();
    } else {
      const project = currentProjectRecord();
      project.name = name.slice(0, 48);
      project.updatedAt = new Date().toISOString();
      saveState();
      renderProjectSelect();
    }
    elements.projectDialog.close();
  });
  elements.deviceSelect.addEventListener('change', () => {
    state.activeDevice = elements.deviceSelect.value;
    expandedGroups = new Set(['Timer']);
    resetTransientSelection();
    saveState();
    render();
  });
  elements.packageSelect.addEventListener('change', () => {
    currentDeviceState().activePackage = elements.packageSelect.value;
    resetTransientSelection();
    saveState();
    render();
  });
  elements.sidebarViewTabs.addEventListener('click', event => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    sidebarView = button.dataset.view;
    if (sidebarView === 'pins') { selectedResourceId = ''; selectedSignal = ''; }
    render();
  });
  elements.searchInput.addEventListener('input', () => {
    if (sidebarView === 'resources') resourceCatalog().forEach(group => expandedGroups.add(group.key));
    render();
  });
  elements.filterTabs.addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    activeFilter = button.dataset.filter;
    render();
  });
  elements.zoomSlider.addEventListener('input', () => setZoom(Number(elements.zoomSlider.value)));
  elements.rotateCcwBtn.addEventListener('click', () => {
    currentView().rotation = (currentView().rotation + 270) % 360;
    saveState();
    render();
  });
  elements.rotateCwBtn.addEventListener('click', () => {
    currentView().rotation = (currentView().rotation + 90) % 360;
    saveState();
    render();
  });
  elements.fitViewBtn.addEventListener('click', () => fitView());
  elements.centerViewBtn.addEventListener('click', () => centerView());
  elements.canvasScroller.addEventListener('wheel', event => {
    event.preventDefault();
    const rect = elements.canvasScroller.getBoundingClientRect();
    const factor = Math.exp(-event.deltaY * 0.0015);
    setZoom(currentView().zoom * factor, { x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, { passive: false });
  elements.canvasScroller.addEventListener('contextmenu', event => event.preventDefault());
  elements.canvasScroller.addEventListener('pointerdown', event => {
    const touchPan = event.pointerType === 'touch' && !event.target.closest('.pin-button');
    if (event.button !== 2 && !touchPan) return;
    panState = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: currentView().x, y: currentView().y };
    elements.canvasScroller.setPointerCapture(event.pointerId);
    elements.canvasScroller.classList.add('panning');
    event.preventDefault();
  });
  elements.canvasScroller.addEventListener('pointermove', event => {
    if (!panState || panState.pointerId !== event.pointerId) return;
    currentView().x = panState.x + event.clientX - panState.startX;
    currentView().y = panState.y + event.clientY - panState.startY;
    currentView().initialized = true;
    applyView();
  });
  const endPan = event => {
    if (!panState || panState.pointerId !== event.pointerId) return;
    panState = null;
    elements.canvasScroller.classList.remove('panning');
    saveState();
  };
  elements.canvasScroller.addEventListener('pointerup', endPan);
  elements.canvasScroller.addEventListener('pointercancel', endPan);
  elements.undoBtn.addEventListener('click', undo);
  elements.redoBtn.addEventListener('click', redo);
  elements.exportMenuBtn.addEventListener('click', event => { event.stopPropagation(); toggleMenu(elements.exportMenuBtn, elements.exportMenu); });
  elements.exportMenu.addEventListener('click', event => {
    const button = event.target.closest('[data-export]');
    if (button) runExport(button.dataset.export);
  });
  elements.checkBtn.addEventListener('click', showCheckDialog);
  elements.aboutBtn.addEventListener('click', showAboutDialog);
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.closeDialog)?.close()));
  document.addEventListener('click', event => {
    if (!event.target.closest('.menu-wrap')) closeMenus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenus();
    const editing = event.target.matches?.('input, textarea, select');
    if (editing || !(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
    if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) { event.preventDefault(); redo(); }
  });

  function beginResize(event, side) {
    resizeState = {
      side,
      startX: event.clientX,
      leftWidth: state.layout.leftWidth,
      rightWidth: state.layout.rightWidth
    };
    const handle = side === 'left' ? elements.leftResizer : elements.rightResizer;
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    event.preventDefault();
  }

  function moveResize(event) {
    if (!resizeState) return;
    const delta = event.clientX - resizeState.startX;
    if (resizeState.side === 'left') {
      const maxLeft = Math.max(190, Math.min(460, window.innerWidth - state.layout.rightWidth - 434));
      state.layout.leftWidth = Math.min(maxLeft, Math.max(190, resizeState.leftWidth + delta));
    } else {
      const maxRight = Math.max(260, Math.min(540, window.innerWidth - state.layout.leftWidth - 434));
      state.layout.rightWidth = Math.min(maxRight, Math.max(260, resizeState.rightWidth - delta));
    }
    applyLayout();
  }

  function endResize(event) {
    if (!resizeState) return;
    elements.leftResizer.classList.remove('dragging');
    elements.rightResizer.classList.remove('dragging');
    document.body.style.cursor = '';
    resizeState = null;
    saveState();
  }

  elements.leftResizer.addEventListener('mousedown', event => beginResize(event, 'left'));
  elements.rightResizer.addEventListener('mousedown', event => beginResize(event, 'right'));
  window.addEventListener('mousemove', moveResize);
  window.addEventListener('mouseup', endResize);
  elements.functionSelect.addEventListener('change', () => updateSelectedAssignment({ function: elements.functionSelect.value }));
  elements.aliasInput.addEventListener('input', () => updateSelectedAssignment({ alias: elements.aliasInput.value }, false, `alias-${selectedPinNumber}`));
  elements.connectorInput.addEventListener('input', () => updateSelectedAssignment({ connector: elements.connectorInput.value }, false, `connector-${selectedPinNumber}`));
  elements.noteInput.addEventListener('input', () => updateSelectedAssignment({ note: elements.noteInput.value }, false, `note-${selectedPinNumber}`));
  elements.clearPinBtn.addEventListener('click', () => {
    const pin = selectedPin();
    if (!pin) return;
    commitMutation(`清除 Pin ${pin.number}`, () => { delete assignments()[String(pin.number)]; });
  });
  elements.importBtn.addEventListener('click', () => elements.importFile.click());
  elements.importFile.addEventListener('change', () => { const file = elements.importFile.files?.[0]; if (file) importJson(file); });
  elements.resetBtn.addEventListener('click', () => {
    const pkg = currentPackage();
    if (!window.confirm(`确定清空 ${state.activeDevice} ${pkg.label} 的全部引脚安排吗？其他芯片和封装不会受影响。`)) return;
    selectedPinNumber = null;
    selectedSignal = '';
    commitMutation(`清空 ${state.activeDevice} ${pkg.label}`, () => {
      currentDeviceState().packages[currentDeviceState().activePackage].assignments = {};
      // Clearing a package also clears board-resource planning state. Keep the
      // board identity and its permanent annotations so switching back remains
      // informative without silently re-enabling hardware.
      state.enabledBoardResources = [];
    });
  });
  new ResizeObserver(() => { if (!currentView().initialized) fitView(false); }).observe(elements.canvasScroller);

  render();
  saveState();
})();
