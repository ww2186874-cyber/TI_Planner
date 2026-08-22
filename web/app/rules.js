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
  if (availableDebug.size && assignedDebug.size < Math.min(2, availableDebug.size)) {
    issues.push({ severity: 'info', title: '调试接口尚未完整标记', detail: '当前封装存在 SWDIO/SWCLK 候选功能。若板上需要下载和调试，请确认对应连接。' });
  }

  const resetPin = pkg.pins.find(pin => pin.functions.some(fn => fn.signal === 'NRST'));
  if (resetPin && assignmentFor(resetPin.number).function !== 'NRST') {
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

function applyBoardResourceToggle(resource, enabled) {
  if (enabled) {
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
    return;
  }
  state.enabledBoardResources = (state.enabledBoardResources || []).filter(id => id !== resource.id);
  Object.entries(resource.assignments || {}).forEach(([number, signal]) => {
    if (anotherEnabledResourceNeeds(number, signal, resource.id)) return;
    if (assignmentFor(Number(number)).function === signal) delete assignments()[number];
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
  }
  commitMutation(`${enabled ? '启用' : '关闭'}板载资源 ${resource.name}`, () => {
    applyBoardResourceToggle(resource, enabled);
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
  const defaultResources = (board.resources || []).filter(resource => resource.defaultEnabled === true);
  if (!window.confirm(`恢复“${board.name}”的初始配置吗？将恢复 5 项固定时钟，并启用 ${defaultResources.map(resource => resource.shortName || resource.name).join('、')}；其他板载资源关闭。`)) return;
  commitMutation('恢复天猛星板卡初始配置', () => {
    state.enabledBoardResources = [];
    (board.resources || []).forEach(resource => Object.entries(resource.assignments || {}).forEach(([number, signal]) => {
      if (assignmentFor(Number(number)).function === signal) delete assignments()[number];
    }));
    Object.entries(board.fixedDefaults || {}).forEach(([number, signal]) => {
      assignments()[number] = emptyAssignment(signal);
    });
    state.enabledBoardResources = defaultResources.map(resource => resource.id);
    defaultResources.forEach(resource => Object.entries(resource.assignments || {}).forEach(([number, signal]) => {
      assignments()[number] = emptyAssignment(signal);
    }));
  });
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
