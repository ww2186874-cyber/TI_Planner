function renderHistoryControls() {
  const history = projectHistory();
  elements.undoBtn.disabled = history.undo.length === 0;
  elements.redoBtn.disabled = history.redo.length === 0;
  elements.undoBtn.title = history.undo.length ? `撤销：${history.undo.at(-1).label} · Ctrl+Z` : '没有可撤销的操作';
  elements.redoBtn.title = history.redo.length ? `重做：${history.redo.at(-1).label} · Ctrl+Y` : '没有可重做的操作';
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
    ['芯片', state.device],
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

function makePinButton(pin, conflicts) {
  const value = assignmentFor(pin.number);
  const fn = selectedFunction(pin, value);
  const category = pin.fixed ? 'Power' : functionCategory(fn) || (isMeaningfulAssignment(value) ? 'GPIO' : 'Unassigned');
  const candidate = Boolean(selectedSignal && pin.functions.some(item => item.signal === selectedSignal));
  const boardPin = boardPinFor(pin);
  const activeBoardResources = activeBoardResourcesForPin(pin);
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
  if (activeBoardResources.length) button.classList.add('board-resource-active');

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
    marker.textContent = activeBoardResources.length ? '✓' : { header: 'H', occupied: 'B', special: '!', unexposed: '×', fixed: 'P' }[boardPin.status];
    marker.title = activeBoardResources.length
      ? `已启用：${activeBoardResources.map(resource => resource.shortName || resource.name).join('、')}；物理状态：${boardStatusLabel(boardPin.status)}`
      : boardStatusLabel(boardPin.status);
    pad.appendChild(marker);
  }

  const external = document.createElement('span');
  external.className = 'pin-external-label';
  const functionLabel = document.createElement('span');
  functionLabel.className = 'pin-function-label';
  functionLabel.textContent = pin.fixed ? pin.name : value.function || '—';
  external.appendChild(functionLabel);
  if (boardPin) {
    activeBoardResources.forEach(resource => {
      const boardLabel = document.createElement('span');
      boardLabel.className = 'pin-board-label';
      boardLabel.dataset.resource = resource.id;
      boardLabel.textContent = `${resource.shortName || resource.name} · ${resource.signal}`;
      boardLabel.title = `${resource.name}：${resource.signal}`;
      external.appendChild(boardLabel);
    });
    if (pin.fixed && boardPin.label) {
      const fixedLabel = document.createElement('span');
      fixedLabel.className = 'pin-board-label board-fixed-label';
      fixedLabel.textContent = boardPin.label;
      fixedLabel.title = boardPin.detail || boardPin.label;
      external.appendChild(fixedLabel);
    }
  }
  if (!pin.fixed && value.alias) {
    const custom = document.createElement('span');
    custom.className = 'pin-custom-label';
    custom.textContent = value.alias;
    external.appendChild(custom);
  }
  button.append(pad, external);
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
  elements.canvasTitle.textContent = `${state.device} · ${pkg.label}`;
  elements.canvasSubtitle.textContent = selectedSignal
    ? `正在安排 ${selectedSignal}：点击绿色候选引脚，橙色表示将替换已有安排`
    : isBoardApplicable()
      ? `${currentBoard().name} · H 排针 · B 板载占用 · P 固定电源 · ! 特殊限制 · × 未引出`
      : `${pkg.pinCount} 个物理引脚 · ${portPins.length} 个 GPIO/复用引脚 · ${systemPins.length} 个系统引脚 · ${fixedPins.length} 个电源/地`;
  elements.chipDevice.textContent = state.device;
  elements.chipPackage.textContent = pkg.label;
  elements.chipSummary.textContent = `${assigned} pins assigned · ${view.rotation}°${conflicts.size ? ` · ${conflicts.size} conflicts` : ''}`;
}

function renderBoardHardwarePanel() {
  const preset = currentBoardPreset();
  const board = currentBoard();
  elements.boardHardwarePanel.classList.toggle('hidden', !preset || !board);
  if (!preset || !board) return;
  const enabled = new Set(state.enabledBoardResources || []);
  const resourceMismatchCount = resource => Object.entries(resource.assignments || {})
    .filter(([number, signal]) => assignmentFor(Number(number)).function !== signal).length;
  const conflicts = (board.resources || []).filter(resource => enabled.has(resource.id))
    .reduce((sum, resource) => sum + resourceMismatchCount(resource), 0);
  elements.boardHardwareSummary.textContent = `${enabled.size}/${(board.resources || []).length} 启用${conflicts ? ` · ${conflicts} 项需处理` : ''}`;
  elements.boardHardwareNote.textContent = '开关只控制当前规划，不会断开真实器件与走线。模板默认启用 SWD、BSL 和 NRST；其中 SWD 与 NRST 建议保留。';

  const pinByNumber = new Map(Object.entries(board.pins || {}));
  const resourceRows = (board.resources || []).map(resource => {
    const row = document.createElement('label');
    row.className = `board-resource-row${enabled.has(resource.id) ? ' enabled' : ''}`;
    row.dataset.resource = resource.id;
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'board-resource-toggle';
    toggle.checked = enabled.has(resource.id);
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
    const mismatchCount = enabled.has(resource.id) ? resourceMismatchCount(resource) : 0;
    status.textContent = enabled.has(resource.id)
      ? mismatchCount ? `需处理 ${mismatchCount}` : '已启用'
      : resource.recommended ? '建议启用' : resource.kind === 'optional' ? '未启用' : '未纳入规划';
    if (mismatchCount) row.classList.add('warning');
    row.append(toggle, copy, status);
    return row;
  });
  elements.boardResourceControls.replaceChildren(...resourceRows);

  const activeSharedBuses = (board.sharedBuses || []).filter(bus => bus.resources.every(id => enabled.has(id)));
  elements.boardSharedNote.classList.toggle('hidden', activeSharedBuses.length === 0);
  elements.boardSharedNote.textContent = activeSharedBuses.map(bus => `${bus.name}：${bus.summary}；${Object.values(bus.chipSelectPins || {}).join(' · ')}`).join(' ');

  const fixedConnections = Object.entries(board.pins || {})
    .filter(([, item]) => item.status === 'fixed')
    .map(([number, item]) => ({ name: `${item.name} · ${item.label}`, detail: `Pin ${number}：${item.detail}` }));
  const fixedRows = [...(board.fixedHardware || []), ...fixedConnections].map(item => {
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
    button.dataset.category = category;
    button.style.setProperty('--category-color', category === 'All' ? '#9aa7af' : CATEGORY_COLORS[category]);
    button.innerHTML = `<span class="category-dot"></span><span>${category === 'All' ? '全部类别' : categoryLabel(category)}</span><span class="category-count">${category === 'All' ? currentPackage().pins.length : counts.get(category)}</span>`;
    return button;
  }));
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
    title.dataset.resourceGroup = group.key;
    title.innerHTML = `<span>${group.label}</span><span>${group.instances.length} 个</span>`;
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
        button.setAttribute('aria-controls', 'resourceDetail');
        button.setAttribute('aria-expanded', String(instance.id === selectedResourceId));
        const name = document.createElement('span');
        const healthText = health.required.length && health.active
          ? `<span class="resource-health${health.complete ? '' : ' incomplete'}">${health.complete ? '完整' : `缺 ${health.missing.length}`}</span>`
          : '';
        name.innerHTML = `${instance.display || instance.id}${instance.feature ? ` <span class="resource-instance-feature">${instance.feature}</span>` : ''}${healthText}`;
        const meta = document.createElement('span');
        meta.className = 'resource-instance-meta';
        meta.textContent = `${health.assignedCount}/${signals.length}`;
        button.append(name, meta);
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
  const wasOpen = !elements.resourceDetail.classList.contains('hidden');
  const selected = resourceDetailIsOpen() ? resourceInstance(selectedResourceId) : null;
  const isOpen = Boolean(selected);
  elements.resourceDetail.classList.toggle('hidden', !isOpen);
  elements.resourceDetail.setAttribute('aria-hidden', String(!isOpen));
  elements.workspace.classList.toggle('resource-detail-open', isOpen);
  if (!selected) {
    elements.resourceDetailTitle.textContent = '';
    elements.resourceDetailNote.textContent = '';
    elements.resourceSignals.replaceChildren();
    applyLayout();
    if (wasOpen) scheduleCanvasLayoutReflow();
    return;
  }
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
    button.setAttribute('aria-pressed', String(selectedSignal === fn.signal));
    const label = document.createElement('span');
    label.innerHTML = `<span class="resource-signal-role">${signalRole(fn.signal)}</span><span class="resource-signal-name">${fn.signal}</span>`;
    const meta = document.createElement('span');
    meta.className = 'resource-signal-meta';
    meta.textContent = assignedPins.length ? `Pin ${assignedPins.join('、')}` : `${pins.length} 可选`;
    button.append(label, meta);
    return button;
  });
  elements.resourceSignals.replaceChildren(...nodes);
  applyLayout();
  if (!wasOpen) scheduleCanvasLayoutReflow();
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
  elements.pinSubtitle.textContent = `${state.device} · ${currentPackage().label}`;
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
    elements.fixedBox.textContent = boardPin?.detail
      ? `${pin.name} 是固定电源相关引脚，不参与复用规划。${boardPin.detail}`
      : `${pin.name} 是该封装的固定电源相关引脚，不参与复用规划。`;
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

function effectiveView() {
  return layoutViewOverride || currentView();
}

function applyView() {
  const view = effectiveView();
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

function calculateLayoutMetrics(viewportWidth, baseLeftWidth, baseRightWidth, detailOpen) {
  const viewport = Math.max(320, Number(viewportWidth) || 320);
  let leftWidth = Math.min(460, Math.max(190, Number(baseLeftWidth) || 250));
  let rightWidth = Math.min(540, Math.max(260, Number(baseRightWidth) || 330));
  const allStacked = viewport <= 800;
  const inspectorStacked = viewport <= 1064;
  const preferredDetailWidth = detailOpen ? Math.min(270, Math.max(220, viewport * 0.18)) : 0;

  if (allStacked) {
    return {
      viewportWidth: viewport,
      leftWidth,
      detailWidth: detailOpen ? leftWidth : 0,
      leftRegionWidth: viewport,
      rightWidth,
      centerWidth: viewport,
      inspectorStacked: true,
      allStacked: true
    };
  }

  const minimumCenterWidth = inspectorStacked ? 360 : 420;
  const dividerWidth = inspectorStacked ? 7 : 14;
  if (inspectorStacked) rightWidth = 0;
  let detailWidth = preferredDetailWidth;
  const panelBudget = Math.max(0, viewport - minimumCenterWidth - dividerWidth);
  let excess = leftWidth + detailWidth + rightWidth - panelBudget;
  if (excess > 0 && rightWidth) {
    const reduction = Math.min(excess, rightWidth - 260);
    rightWidth -= reduction;
    excess -= reduction;
  }
  if (excess > 0 && detailWidth) {
    const reduction = Math.min(excess, detailWidth - 180);
    detailWidth -= reduction;
    excess -= reduction;
  }
  if (excess > 0) {
    const reduction = Math.min(excess, leftWidth - 190);
    leftWidth -= reduction;
    excess -= reduction;
  }
  if (excess > 0 && detailWidth) detailWidth = Math.max(0, detailWidth - excess);

  const leftRegionWidth = leftWidth + detailWidth;
  const centerWidth = Math.max(0, viewport - leftRegionWidth - rightWidth - dividerWidth);
  return {
    viewportWidth: viewport,
    leftWidth,
    detailWidth,
    leftRegionWidth,
    rightWidth,
    centerWidth,
    inspectorStacked,
    allStacked: false
  };
}

function applyLayout() {
  state.layout.leftWidth = Math.min(460, Math.max(190, state.layout.leftWidth));
  state.layout.rightWidth = Math.min(540, Math.max(260, state.layout.rightWidth));
  const metrics = calculateLayoutMetrics(window.innerWidth, state.layout.leftWidth, state.layout.rightWidth, resourceDetailIsOpen());
  document.documentElement.style.setProperty('--left-panel-width', `${metrics.leftWidth}px`);
  document.documentElement.style.setProperty('--resource-detail-width', `${metrics.detailWidth}px`);
  document.documentElement.style.setProperty('--left-region-width', `${metrics.leftRegionWidth}px`);
  document.documentElement.style.setProperty('--right-panel-width', `${metrics.rightWidth}px`);
  elements.workspace.dataset.resourceDetailOpen = String(resourceDetailIsOpen());
  elements.workspace.dataset.inspectorStacked = String(metrics.inspectorStacked);
  return metrics;
}

function scheduleCanvasLayoutReflow() {
  if (layoutReflowFrame !== null) cancelAnimationFrame(layoutReflowFrame);
  const opening = resourceDetailIsOpen();
  layoutReflowFrame = requestAnimationFrame(() => {
    layoutReflowFrame = requestAnimationFrame(() => {
      layoutReflowFrame = null;
      if (!state) return;
      if (!opening) {
        layoutViewOverride = null;
        applyView();
        return;
      }
      const base = currentView();
      const stageWidth = elements.packageStage.offsetWidth;
      const stageHeight = elements.packageStage.offsetHeight;
      const availableWidth = Math.max(100, elements.canvasScroller.clientWidth - 48);
      const availableHeight = Math.max(100, elements.canvasScroller.clientHeight - 48);
      const fittedZoom = Math.min(180, Math.max(35, Math.min(availableWidth / stageWidth, availableHeight / stageHeight) * 100));
      const zoom = Math.min(base.zoom, fittedZoom);
      const scale = zoom / 100;
      layoutViewOverride = {
        ...base,
        zoom,
        x: (elements.canvasScroller.clientWidth - stageWidth * scale) / 2,
        y: (elements.canvasScroller.clientHeight - stageHeight * scale) / 2,
        initialized: true
      };
      applyView();
    });
  });
}

function markCanvasViewInteraction() {
  if (layoutReflowFrame !== null) cancelAnimationFrame(layoutReflowFrame);
  layoutReflowFrame = null;
  if (layoutViewOverride) Object.assign(currentView(), layoutViewOverride);
  layoutViewOverride = null;
}

function centerView(save = true) {
  if (save) markCanvasViewInteraction();
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
  if (save) markCanvasViewInteraction();
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
  markCanvasViewInteraction();
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
