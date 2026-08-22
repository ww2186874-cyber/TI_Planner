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
  const defaultResources = (board.resources || []).filter(resource => resource.defaultEnabled === true);
  data.enabledBoardResources = defaultResources.map(resource => resource.id);
  defaultResources.forEach(resource => Object.entries(resource.assignments || {}).forEach(([number, signal]) => {
    if (pins.get(number)?.functions.some(fn => fn.signal === signal)) target[number] = emptyAssignment(signal);
  }));
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
  return { header: '普通排针', occupied: '板载占用', special: '特殊电气条件', unexposed: '未引出', fixed: '固定板载连接' }[status] || '';
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
