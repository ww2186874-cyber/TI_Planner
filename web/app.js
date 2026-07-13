(() => {
  'use strict';

  const DEVICE_DATA = __DEVICE_DATA__;
  const STORAGE_KEY = 'mspm0g-pin-planner-v3';
  const LEGACY_V2_STORAGE_KEY = 'mspm0g3519-pin-planner-v2';
  const LEGACY_V1_STORAGE_KEY = 'mspm0g3519-pin-planner-v1';
  const SCHEMA_VERSION = 3;
  const DEVICE_ORDER = ['MSPM0G3519', 'MSPM0G3507'];
  const DEVICE_CONFIG = {
    MSPM0G3519: { defaultPackage: 'PZ', packageOrder: ['PT', 'PM', 'PN', 'PZ'], defaultZoom: { PT: 100, PM: 90, PN: 80, PZ: 70 } },
    MSPM0G3507: { defaultPackage: 'PM', packageOrder: ['PT', 'PM'], defaultZoom: { PT: 100, PM: 90 } }
  };
  const CATEGORY_COLORS = {
    Unassigned: 'var(--pin-unassigned)', GPIO: 'var(--pin-gpio)', UART: 'var(--pin-uart)',
    I2C: 'var(--pin-i2c)', SPI: 'var(--pin-spi)', CAN: 'var(--pin-can)',
    'Timer / Clock': 'var(--pin-timer)', ADC: 'var(--pin-adc)', DAC: 'var(--pin-dac)',
    Comparator: 'var(--pin-comparator)', Clock: 'var(--pin-clock)', System: 'var(--pin-system)',
    Power: 'var(--pin-power)', Other: 'var(--pin-other)'
  };

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
    'deviceSelect', 'packageSelect', 'themeToggleBtn', 'importBtn', 'importFile', 'exportJsonBtn', 'exportCsvBtn', 'resetBtn', 'saveState',
    'packagePinCount', 'assignedCount', 'unassignedCount', 'fixedCount', 'conflictCount', 'searchInput',
    'filterTabs', 'categoryList', 'sidebarViewTabs', 'sidebarTitle', 'pinPanel', 'resourcePanel', 'resourceSummary',
    'resourceList', 'resourceDetail', 'resourceDetailTitle', 'resourceDetailNote', 'resourceSignals', 'canvasTitle',
    'canvasSubtitle', 'zoomSlider', 'zoomValue', 'rotateCcwBtn', 'rotateCwBtn', 'fitViewBtn', 'centerViewBtn', 'canvasScroller', 'stageScale',
    'packageStage', 'topPins', 'rightPins', 'bottomPins', 'leftPins', 'chipDevice', 'chipPackage', 'chipSummary',
    'inspectorEmpty', 'inspectorContent', 'pinTitle', 'pinSubtitle', 'pinStatus', 'physicalPin', 'logicalPin',
    'iomuxRegister', 'bufferType', 'editableFields', 'functionSelect', 'functionInfo', 'aliasInput', 'noteInput',
    'conflictBox', 'clearPinBtn', 'fixedBox', 'leftResizer', 'rightResizer', 'sourceFooter'
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
  let state = loadState();

  function packageOrder(device = state?.activeDevice || DEVICE_ORDER[0]) { return DEVICE_CONFIG[device].packageOrder; }
  function resourceCatalog(device = state?.activeDevice || DEVICE_ORDER[0]) { return RESOURCE_CATALOGS[device]; }
  function emptyView(device, code) {
    return { zoom: DEVICE_CONFIG[device].defaultZoom[code], x: 0, y: 0, rotation: 0, initialized: false };
  }

  function createDeviceState(device) {
    const codes = DEVICE_CONFIG[device].packageOrder;
    return {
      activePackage: DEVICE_CONFIG[device].defaultPackage,
      views: Object.fromEntries(codes.map(code => [code, emptyView(device, code)])),
      packages: Object.fromEntries(codes.map(code => [code, { assignments: {} }]))
    };
  }

  function createEmptyState() {
    return {
      version: SCHEMA_VERSION,
      activeDevice: 'MSPM0G3519',
      theme: 'light',
      layout: { leftWidth: 250, rightWidth: 330 },
      devices: Object.fromEntries(DEVICE_ORDER.map(device => [device, createDeviceState(device)]))
    };
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
        note: String(value.note || '').slice(0, 240)
      };
      if (next.function || next.alias.trim() || next.note.trim()) output[String(pin.number)] = next;
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

  function normalizeLoaded(parsed) {
    const empty = createEmptyState();
    empty.activeDevice = DEVICE_ORDER.includes(parsed?.activeDevice) ? parsed.activeDevice : 'MSPM0G3519';
    empty.theme = parsed?.theme === 'dark' ? 'dark' : 'light';
    empty.layout.leftWidth = Math.min(460, Math.max(190, Number(parsed?.layout?.leftWidth) || 250));
    empty.layout.rightWidth = Math.min(540, Math.max(260, Number(parsed?.layout?.rightWidth) || 330));
    DEVICE_ORDER.forEach(device => { empty.devices[device] = normalizeDeviceState(device, parsed?.devices?.[device]); });
    return empty;
  }

  function migrateLegacy(parsed, legacy = false) {
    const empty = createEmptyState();
    empty.theme = parsed?.theme === 'dark' ? 'dark' : 'light';
    empty.layout.leftWidth = Math.min(460, Math.max(190, Number(parsed?.layout?.leftWidth) || 250));
    empty.layout.rightWidth = Math.min(540, Math.max(260, Number(parsed?.layout?.rightWidth) || 330));
    empty.devices.MSPM0G3519 = normalizeDeviceState('MSPM0G3519', parsed, legacy);
    return empty;
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed?.version === SCHEMA_VERSION) return normalizeLoaded(parsed);
      const legacyV2 = JSON.parse(localStorage.getItem(LEGACY_V2_STORAGE_KEY));
      if (legacyV2?.version === 2 && legacyV2.device === 'MSPM0G3519') return migrateLegacy(legacyV2);
      const legacyV1 = JSON.parse(localStorage.getItem(LEGACY_V1_STORAGE_KEY));
      if (legacyV1?.version === 1 && legacyV1.device === 'MSPM0G3519') return migrateLegacy(legacyV1, true);
    } catch (error) { /* start clean */ }
    return createEmptyState();
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  function assignmentFor(number) { return assignments()[String(number)] || { function: '', alias: '', note: '' }; }
  function selectedPin() { return currentPackage().pins.find(pin => pin.number === selectedPinNumber) || null; }
  function selectedFunction(pin, value) { return pin.functions.find(item => item.signal === value.function) || null; }
  function isMeaningfulAssignment(value) { return Boolean(value.function || value.alias.trim() || value.note.trim()); }
  function currentView() { return currentDeviceState().views[currentDeviceState().activePackage]; }

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
    return variants.some(term => haystack.includes(term));
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
    return [pin.number, pin.name, value.function, value.alias, value.note, ...signals, ...semantic].join(' ');
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
      || (activeFilter === 'conflict' && conflicts.has(value.function));
    const categoryMatch = activeCategory === 'All'
      || (value.function ? selectedFunction(pin, value)?.category === activeCategory : pin.functions.some(item => item.category === activeCategory));
    const resourceMatch = sidebarView !== 'resources' || activeResourceMatch(pin);
    const searchMatch = hasUserTextMatch()
      ? userTextMatches(value)
      : textMatchesQuery(pinSearchText(pin));
    return filterMatch && categoryMatch && resourceMatch && searchMatch;
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
    assignments()[key] = { ...assignmentFor(pin.number), function: signal };
    selectedPinNumber = pin.number;
    saveState();
    return true;
  }

  function makePinButton(pin, conflicts) {
    const value = assignmentFor(pin.number);
    const fn = selectedFunction(pin, value);
    const category = pin.fixed ? 'Power' : fn?.category || (isMeaningfulAssignment(value) ? 'GPIO' : 'Unassigned');
    const candidate = Boolean(selectedSignal && pin.functions.some(item => item.signal === selectedSignal));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pin-button';
    button.dataset.pin = String(pin.number);
    button.style.setProperty('--pin-color', CATEGORY_COLORS[category] || CATEGORY_COLORS.Other);
    button.setAttribute('aria-label', `Pin ${pin.number} ${pin.name}${value.function ? ` ${value.function}` : ''}${value.alias ? ` ${value.alias}` : ''}`);
    button.title = `Pin ${pin.number} · ${pin.name}${value.function ? ` · ${value.function}` : ''}${value.alias ? ` · ${value.alias}` : ''}`;
    if (pin.fixed) button.classList.add('fixed');
    if (pin.number === selectedPinNumber) button.classList.add('selected');
    if (!pinMatches(pin, conflicts)) button.classList.add('dimmed');
    if (value.function && conflicts.has(value.function)) button.classList.add('conflict');
    if (candidate) button.classList.add(isMeaningfulAssignment(value) && value.function !== selectedSignal ? 'candidate-occupied' : 'candidate');

    const pad = document.createElement('span');
    pad.className = 'pin-pad';
    const number = document.createElement('span');
    number.className = 'pin-number';
    number.textContent = `PIN ${pin.number}`;
    const name = document.createElement('span');
    name.className = 'pin-name';
    name.textContent = pin.name;
    pad.append(number, name);

    const external = document.createElement('span');
    external.className = 'pin-external-label';
    const functionLabel = document.createElement('span');
    functionLabel.className = 'pin-function-label';
    functionLabel.textContent = pin.fixed ? pin.name : value.function || '—';
    external.appendChild(functionLabel);
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
    elements.canvasTitle.textContent = `${state.activeDevice} · ${pkg.label}`;
    elements.canvasSubtitle.textContent = selectedSignal
      ? `正在安排 ${selectedSignal}：点击绿色候选引脚，橙色表示将替换已有安排`
      : `${pkg.pinCount} 个物理引脚 · ${pkg.pins.filter(pin => !pin.fixed).length} 个可规划引脚 · 滚轮缩放 / 右键拖动`;
    elements.chipDevice.textContent = state.activeDevice;
    elements.chipPackage.textContent = `${pkg.code} · ${pkg.pinCount}-pin LQFP`;
    elements.chipSummary.textContent = `${assigned} pins assigned · ${view.rotation}°${conflicts.size ? ` · ${conflicts.size} conflicts` : ''}`;
  }

  function renderCategories() {
    const counts = new Map();
    currentPackage().pins.forEach(pin => new Set(pin.functions.map(item => item.category)).forEach(category => counts.set(category, (counts.get(category) || 0) + 1)));
    const categories = ['All', ...Object.keys(CATEGORY_COLORS).filter(category => counts.has(category))];
    elements.categoryList.replaceChildren(...categories.map(category => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `category-btn${category === activeCategory ? ' active' : ''}`;
      button.style.setProperty('--category-color', category === 'All' ? '#9aa7af' : CATEGORY_COLORS[category]);
      button.innerHTML = `<span class="category-dot"></span><span>${category === 'All' ? '全部类别' : category}</span><span class="category-count">${category === 'All' ? currentPackage().pins.length : counts.get(category)}</span>`;
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
          const assigned = assignedSignals(instance).size;
          const button = document.createElement('button');
          button.type = 'button';
          button.className = `resource-instance${instance.id === selectedResourceId ? ' active' : ''}`;
          button.dataset.resource = instance.id;
          const name = document.createElement('span');
          name.innerHTML = `${instance.display || instance.id}${instance.feature ? ` <span class="resource-instance-feature">${instance.feature}</span>` : ''}`;
          const meta = document.createElement('span');
          meta.className = 'resource-instance-meta';
          meta.textContent = `${assigned}/${signals.length}`;
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
    const { instance } = selected;
    elements.resourceDetailTitle.textContent = `${instance.display || instance.id}${instance.feature ? ` · ${instance.feature}` : ''}`;
    elements.resourceDetailNote.textContent = /^TIMG[89]$/.test(instance.id)
      ? 'QEI/Hall 模式使用 C0 作为 A 相、C1 作为 B 相，IDX 作为可选 Z 索引。先选信号，再点封装图中的候选引脚。'
      : '选择一个官方信号，再点击封装图中高亮的候选引脚完成安排。';
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
    const assigned = configurable.filter(pin => isMeaningfulAssignment(assignmentFor(pin.number))).length;
    const conflicts = conflictMap();
    elements.packagePinCount.textContent = `${pkg.pinCount} pins`;
    elements.assignedCount.textContent = assigned;
    elements.unassignedCount.textContent = configurable.length - assigned;
    elements.fixedCount.textContent = pkg.pins.length - configurable.length;
    elements.conflictCount.textContent = [...conflicts.values()].reduce((sum, pins) => sum + pins.length, 0);
  }

  function buildFunctionSelect(pin, value) {
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '未安排';
    const nodes = [empty];
    const groups = new Map();
    pin.functions.forEach(fn => {
      if (!groups.has(fn.category)) groups.set(fn.category, []);
      groups.get(fn.category).push(fn);
    });
    groups.forEach((functions, category) => {
      const group = document.createElement('optgroup');
      group.label = category;
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
    const conflictPins = value.function ? conflictMap().get(value.function) || [] : [];
    elements.pinTitle.textContent = `Pin ${pin.number} · ${pin.name}`;
    elements.pinSubtitle.textContent = `${state.activeDevice} · ${currentPackage().label}`;
    elements.physicalPin.textContent = String(pin.number);
    elements.logicalPin.textContent = pin.name;
    elements.iomuxRegister.textContent = pin.iomuxRegister || '—';
    elements.bufferType.textContent = pin.bufferType || '—';
    elements.editableFields.classList.toggle('hidden', pin.fixed);
    elements.fixedBox.classList.toggle('hidden', !pin.fixed);
    if (pin.fixed) {
      elements.pinStatus.textContent = '固定功能';
      elements.fixedBox.textContent = `${pin.name} 是该封装的固定电源相关引脚，不参与复用规划。`;
      return;
    }
    elements.pinStatus.textContent = isMeaningfulAssignment(value) ? '已安排' : '未安排';
    buildFunctionSelect(pin, value);
    elements.aliasInput.value = value.alias;
    elements.noteInput.value = value.note;
    elements.functionInfo.classList.toggle('hidden', !fn);
    if (fn) elements.functionInfo.textContent = `${fn.category} · ${fn.signalType || '未标注方向'} · ${fn.iomuxManaged ? `IOMUX PF ${fn.pf}` : fn.pfLabel || 'Non-IOMUX'}`;
    elements.conflictBox.classList.toggle('hidden', conflictPins.length < 2);
    if (conflictPins.length >= 2) elements.conflictBox.textContent = `${value.function} 同时安排在 Pin ${conflictPins.join('、Pin ')}。这是提示性冲突，请自行确认是否有意重复。`;
  }

  function updateSelectedAssignment(patch, refreshInspector = true) {
    const pin = selectedPin();
    if (!pin || pin.fixed) return;
    const key = String(pin.number);
    const next = { ...assignmentFor(pin.number), ...patch };
    isMeaningfulAssignment(next) ? assignments()[key] = next : delete assignments()[key];
    saveState();
    if (refreshInspector) render();
    else {
      renderStats(); renderCategories(); renderResources(); renderStage();
      elements.pinStatus.textContent = isMeaningfulAssignment(next) ? '已安排' : '未安排';
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

  function applyThemeAndLayout() {
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
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.style.setProperty('--left-panel-width', `${state.layout.leftWidth}px`);
    document.documentElement.style.setProperty('--right-panel-width', `${state.layout.rightWidth}px`);
    elements.themeToggleBtn.textContent = state.theme === 'dark' ? '日间模式' : '夜间模式';
    elements.themeToggleBtn.setAttribute('aria-pressed', String(state.theme === 'dark'));
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
    applyThemeAndLayout();
    renderDeviceSelect();
    renderPackageSelect();
    const source = currentDeviceData().source;
    elements.sourceFooter.textContent = `数据来源：TI ${source.document}，${source.revision}，页 ${source.pages}。`;
    renderSidebarMode();
    renderStats();
    renderCategories();
    renderResources();
    renderStage();
    renderInspector();
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

  function exportJson() {
    const deviceState = currentDeviceState();
    const payload = { schemaVersion: SCHEMA_VERSION, device: state.activeDevice, exportedAt: new Date().toISOString(), activePackage: deviceState.activePackage, theme: state.theme, layout: state.layout, packages: deviceState.packages, views: deviceState.views };
    downloadFile(`${state.activeDevice.toLowerCase()}-pin-plan.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  }

  function csvEscape(value) {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function exportCsv() {
    const pkg = currentPackage();
    const rows = [['Device', 'Package', 'Physical Pin', 'Pin Name', 'Selected Function', 'Custom Label', 'Note', 'Category', 'Signal Type', 'IOMUX PF', 'IOMUX Register', 'Buffer Type']];
    pkg.pins.forEach(pin => {
      const value = assignmentFor(pin.number);
      const fn = selectedFunction(pin, value);
      rows.push([state.activeDevice, pkg.code, pin.number, pin.name, pin.fixed ? pin.name : value.function, value.alias, value.note, pin.fixed ? 'Power' : fn?.category || '', fn?.signalType || '', fn ? (fn.iomuxManaged ? fn.pf : fn.pfLabel) : '', pin.iomuxRegister, pin.bufferType]);
    });
    downloadFile(`${state.activeDevice.toLowerCase()}-${pkg.code.toLowerCase()}-pin-plan.csv`, '\ufeff' + rows.map(row => row.map(csvEscape).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  }

  async function importJson(file) {
    try {
      const parsed = JSON.parse(await file.text());
      if (!DEVICE_ORDER.includes(parsed.device) || ![1, 2, 3].includes(parsed.schemaVersion)) throw new Error('文件不是兼容的 MSPM0G 引脚规划 JSON。');
      if ([1, 2].includes(parsed.schemaVersion) && parsed.device !== 'MSPM0G3519') throw new Error('旧版 JSON 只支持 MSPM0G3519。');
      const device = parsed.device;
      const deviceState = state.devices[device];
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
        state.theme = parsed.theme === 'dark' ? 'dark' : state.theme;
        state.layout.leftWidth = Math.min(460, Math.max(190, Number(parsed.layout?.leftWidth) || state.layout.leftWidth));
        state.layout.rightWidth = Math.min(540, Math.max(260, Number(parsed.layout?.rightWidth) || state.layout.rightWidth));
      }
      state.activeDevice = device;
      selectedPinNumber = null;
      selectedResourceId = '';
      selectedSignal = '';
      saveState();
      render();
      window.alert(skipped ? `导入完成，忽略了 ${skipped} 条不兼容记录。` : '导入完成。');
    } catch (error) {
      window.alert(error.message || 'JSON 导入失败。');
    } finally {
      elements.importFile.value = '';
    }
  }

  function resetTransientSelection() {
    selectedPinNumber = null;
    selectedResourceId = '';
    selectedSignal = '';
    activeFilter = 'all';
    activeCategory = 'All';
    elements.searchInput.value = '';
  }

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
  elements.themeToggleBtn.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyThemeAndLayout();
    saveState();
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
    applyThemeAndLayout();
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
  elements.aliasInput.addEventListener('input', () => updateSelectedAssignment({ alias: elements.aliasInput.value }, false));
  elements.noteInput.addEventListener('input', () => updateSelectedAssignment({ note: elements.noteInput.value }, false));
  elements.clearPinBtn.addEventListener('click', () => {
    const pin = selectedPin();
    if (!pin) return;
    delete assignments()[String(pin.number)];
    saveState();
    render();
  });
  elements.importBtn.addEventListener('click', () => elements.importFile.click());
  elements.importFile.addEventListener('change', () => { const file = elements.importFile.files?.[0]; if (file) importJson(file); });
  elements.exportJsonBtn.addEventListener('click', exportJson);
  elements.exportCsvBtn.addEventListener('click', exportCsv);
  elements.resetBtn.addEventListener('click', () => {
    const pkg = currentPackage();
    if (!window.confirm(`确定清空 ${state.activeDevice} ${pkg.label} 的全部引脚安排吗？其他芯片和封装不会受影响。`)) return;
    currentDeviceState().packages[currentDeviceState().activePackage].assignments = {};
    selectedPinNumber = null;
    selectedSignal = '';
    saveState();
    render();
  });
  new ResizeObserver(() => { if (!currentView().initialized) fitView(false); }).observe(elements.canvasScroller);

  render();
  saveState();
})();
