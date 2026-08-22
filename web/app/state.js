const elements = Object.fromEntries([
  'projectSelect', 'projectMenuBtn', 'projectMenu', 'undoBtn', 'redoBtn', 'importBtn', 'importFile',
  'exportMenuBtn', 'exportMenu', 'checkBtn', 'checkBadge', 'aboutBtn', 'resetBtn', 'saveState',
  'packagePinCount', 'assignedCount', 'unassignedCount', 'fixedCount', 'systemCount', 'conflictCount', 'searchInput',
  'filterTabs', 'categoryList', 'sidebarViewTabs', 'sidebarTitle', 'pinPanel', 'resourcePanel', 'resourceSummary',
  'resourceList', 'resourceDetail', 'resourceDetailTitle', 'resourceDetailNote', 'resourceSignals', 'canvasTitle',
  'canvasSubtitle', 'boardHardwarePanel', 'boardHardwareSummary', 'boardHardwareNote', 'boardResourceControls', 'boardFixedHardwareList', 'boardSharedNote', 'zoomSlider', 'zoomValue', 'rotateCcwBtn', 'rotateCwBtn', 'fitViewBtn', 'centerViewBtn', 'canvasScroller', 'stageScale',
  'packageStage', 'topPins', 'rightPins', 'bottomPins', 'leftPins', 'chipDevice', 'chipPackage', 'chipSummary',
  'inspectorEmpty', 'inspectorContent', 'pinTitle', 'pinSubtitle', 'pinStatus', 'physicalPin', 'logicalPin',
  'iomuxRegister', 'bufferType', 'editableFields', 'functionSelect', 'functionInfo', 'aliasInput', 'connectorInput', 'noteInput',
  'conflictBox', 'clearPinBtn', 'fixedBox', 'leftResizer', 'rightResizer', 'sourceFooter',
  'boardInfoBox', 'boardInfoTitle', 'boardInfoStatus', 'boardInfoMeta', 'boardRouteList', 'boardInfoSharedNote', 'boardInfoDetail', 'checkDialog', 'checkDialogBody', 'projectDialog', 'projectDialogTitle', 'projectForm', 'projectNameInput', 'projectCreationFields', 'projectTemplateSelect', 'projectDeviceSelect', 'projectPackageSelect', 'projectTargetHint', 'projectDialogClose', 'projectDialogCancel',
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
let state = currentProjectRecord()?.data || null;

function packageOrder(device = state?.device || DEVICE_ORDER[0]) { return DEVICE_CONFIG[device].packageOrder; }
function resourceCatalog(device = state?.device || DEVICE_ORDER[0]) { return RESOURCE_CATALOGS[device]; }
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

function isValidProjectTarget(device, packageCode) {
  return DEVICE_ORDER.includes(device) && packageOrder(device).includes(packageCode);
}

function resolveProjectTarget({ templateId = '', device, packageCode }) {
  if (templateId) {
    const preset = BOARD_PRESETS.presets[templateId];
    if (!preset) throw new Error('所选模板不存在。');
    if (device !== preset.device || packageCode !== preset.package) throw new Error('芯片型号或封装与所选模板不匹配。');
    if (!isValidProjectTarget(preset.device, preset.package)) throw new Error('模板指定的芯片型号或封装不可用。');
    return { templateId, device: preset.device, package: preset.package };
  }
  if (!isValidProjectTarget(device, packageCode)) throw new Error('请选择有效的芯片型号和封装。');
  return { templateId: '', device, package: packageCode };
}

function createProjectState(device, packageCode) {
  if (!isValidProjectTarget(device, packageCode)) throw new Error('无法为无效的芯片型号或封装创建工程。');
  return {
    version: PROJECT_DATA_VERSION,
    device,
    package: packageCode,
    boardPresetId: '',
    enabledBoardResources: [],
    layout: { leftWidth: 250, rightWidth: 330 },
    view: emptyView(device, packageCode),
    assignments: defaultAssignments(device, packageCode)
  };
}

function createPresetState(presetId) {
  const preset = BOARD_PRESETS.presets[presetId];
  const board = preset && BOARD_PRESETS.boards[preset.boardId];
  if (!preset || !board || !isValidProjectTarget(preset.device, preset.package)) throw new Error('所选模板不可用。');
  const data = createProjectState(preset.device, preset.package);
  data.boardPresetId = presetId;
  data.assignments = {};
  const pins = new Map(DEVICE_DATA[preset.device].packages[preset.package].pins.map(pin => [String(pin.number), pin]));
  Object.entries(board.fixedDefaults || {}).forEach(([number, signal]) => {
    if (pins.get(number)?.functions.some(fn => fn.signal === signal)) data.assignments[number] = emptyAssignment(signal);
  });
  const defaultResources = (board.resources || []).filter(resource => resource.defaultEnabled === true);
  data.enabledBoardResources = defaultResources.map(resource => resource.id);
  defaultResources.forEach(resource => Object.entries(resource.assignments || {}).forEach(([number, signal]) => {
    if (pins.get(number)?.functions.some(fn => fn.signal === signal)) data.assignments[number] = emptyAssignment(signal);
  }));
  return data;
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `project-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createProject(name, data) {
  if (!data || data.version !== PROJECT_DATA_VERSION || !isValidProjectTarget(data.device, data.package)) {
    throw new Error('创建工程时缺少有效的芯片和封装。');
  }
  const now = new Date().toISOString();
  return { id: createId(), name: String(name || '未命名工程').slice(0, 48), createdAt: now, updatedAt: now, data };
}

function createWorkspace() {
  return { version: SCHEMA_VERSION, activeProjectId: '', projects: [] };
}

function ensureProjectCapacity(additionalCount = 1) {
  const count = Number(additionalCount);
  if (!Number.isSafeInteger(count) || count < 0 || workspace.projects.length + count > MAX_PROJECTS) {
    throw new Error(`最多只能保留 ${MAX_PROJECTS} 个工程。`);
  }
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

function sanitizeView(device, code, value) {
  const defaultZoom = DEVICE_CONFIG[device].defaultZoom[code];
  const zoom = Math.min(180, Math.max(35, Number(value?.zoom ?? defaultZoom) || defaultZoom));
  return {
    zoom,
    x: Number.isFinite(Number(value?.x)) ? Number(value.x) : 0,
    y: Number.isFinite(Number(value?.y)) ? Number(value.y) : 0,
    rotation: [0, 90, 180, 270].includes(Number(value?.rotation)) ? Number(value.rotation) : 0,
    initialized: Boolean(value?.initialized)
  };
}

function normalizeBoardResourceIds(boardPresetId, parsed) {
  const preset = BOARD_PRESETS.presets[boardPresetId];
  const board = preset && BOARD_PRESETS.boards[preset.boardId];
  if (!board || !Array.isArray(parsed?.enabledBoardResources)) return [];
  const valid = new Set((board.resources || []).map(resource => resource.id));
  return [...new Set(parsed.enabledBoardResources.filter(id => valid.has(id)))];
}

function normalizeLoaded(parsed) {
  if (parsed?.version !== PROJECT_DATA_VERSION) throw new Error('工程数据版本不受支持。');
  const device = parsed.device;
  const packageCode = parsed.package;
  if (!isValidProjectTarget(device, packageCode)) throw new Error('工程的芯片型号或封装无效。');
  const preset = BOARD_PRESETS.presets[parsed.boardPresetId];
  const boardPresetId = preset && preset.device === device && preset.package === packageCode ? preset.id : '';
  return {
    version: PROJECT_DATA_VERSION,
    device,
    package: packageCode,
    boardPresetId,
    enabledBoardResources: normalizeBoardResourceIds(boardPresetId, parsed),
    layout: {
      leftWidth: Math.min(460, Math.max(190, Number(parsed?.layout?.leftWidth) || 250)),
      rightWidth: Math.min(540, Math.max(260, Number(parsed?.layout?.rightWidth) || 330))
    },
    view: sanitizeView(device, packageCode, parsed.view),
    assignments: sanitizeAssignments(device, packageCode, parsed.assignments).assignments
  };
}

function normalizeProject(project, index = 0) {
  const now = new Date().toISOString();
  return {
    id: String(project?.id || createId()),
    name: String(project?.name || `工程 ${index + 1}`).slice(0, 48),
    createdAt: String(project?.createdAt || now),
    updatedAt: String(project?.updatedAt || now),
    data: normalizeLoaded(project?.data)
  };
}

function normalizeWorkspace(parsed) {
  if (parsed?.version !== SCHEMA_VERSION) return createWorkspace();
  const projects = [];
  const ids = new Set();
  (Array.isArray(parsed.projects) ? parsed.projects.slice(0, MAX_PROJECTS) : []).forEach((project, index) => {
    try {
      const normalized = normalizeProject(project, index);
      if (ids.has(normalized.id)) normalized.id = createId();
      ids.add(normalized.id);
      projects.push(normalized);
    } catch { /* ignore invalid prerelease projects */ }
  });
  const activeProjectId = projects.some(project => project.id === parsed.activeProjectId)
    ? parsed.activeProjectId
    : projects[0]?.id || '';
  return { version: SCHEMA_VERSION, activeProjectId, projects };
}

function loadWorkspace() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return normalizeWorkspace(parsed);
  } catch { return createWorkspace(); }
}

function currentProjectRecord() {
  return workspace.projects.find(project => project.id === workspace.activeProjectId) || workspace.projects[0] || null;
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
  const project = currentProjectRecord();
  if (!project || !state) return;
  project.data = state;
  project.updatedAt = new Date().toISOString();
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

function currentDeviceData() { return DEVICE_DATA[state.device]; }
function currentPackage() { return currentDeviceData().packages[state.package]; }
function assignments() { return state.assignments; }
function assignmentFor(number) { return assignments()[String(number)] || emptyAssignment(); }
function selectedPin() { return currentPackage().pins.find(pin => pin.number === selectedPinNumber) || null; }
function selectedFunction(pin, value) { return pin.functions.find(item => item.signal === value.function) || null; }
function isMeaningfulAssignment(value) { return Boolean(value.function || value.alias.trim() || value.connector?.trim() || value.note.trim()); }
function currentView() { return state.view; }
function functionCategory(fn) { return DEBUG_SIGNALS.has(fn?.signal) ? 'Debug' : fn?.category || ''; }
function categoryLabel(category) { return CATEGORY_LABELS[category] || category; }
function isPortPin(pin) { return /^P[A-Z]\d+$/.test(pin.name); }
function officialDefaultSignal(pin) { return OFFICIAL_DEFAULT_SIGNALS.find(signal => pin.functions.some(fn => fn.signal === signal)) || ''; }
function isOfficialDefaultAssignment(pin, value) { return value.function === officialDefaultSignal(pin); }
function currentBoardPreset() { return BOARD_PRESETS.presets[state.boardPresetId] || null; }
function currentBoard() { const preset = currentBoardPreset(); return preset ? BOARD_PRESETS.boards[preset.boardId] || null : null; }
function isBoardApplicable() {
  const preset = currentBoardPreset();
  return Boolean(preset && preset.device === state.device && preset.package === state.package);
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
