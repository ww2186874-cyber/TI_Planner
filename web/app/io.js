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
    projectDataVersion: PROJECT_DATA_VERSION,
    kind: 'mspm0-pin-project',
    exportedAt: new Date().toISOString(),
    project: { ...project, data: state }
  };
  downloadFile(`${safeFileName(project.name)}-mspm0-project.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
}

function exportWorkspaceJson() {
  const payload = { ...workspace, projectDataVersion: PROJECT_DATA_VERSION, exportedAt: new Date().toISOString(), kind: 'mspm0-pin-workspace' };
  downloadFile('mspm0-pin-planner-workspace.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
}

function csvEscape(value) {
  let text = String(value ?? '');
  const formulaLike = /^[\s\u0000-\u001f\u007f-\u009f]*[=+\-@]/u.test(text);
  if (formulaLike) text = `'${text}`;
  return formulaLike || /[",\r\n\t]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportCsv() {
  const pkg = currentPackage();
  const rows = [['Project', 'Device', 'Package', 'Board Preset', 'Physical Pin', 'Pin Name', 'Selected Function', 'Custom Label', 'User Connector', 'Note', 'Board Connector', 'Board Status', 'Board Detail', 'Category', 'Signal Type', 'IOMUX PF', 'IOMUX Register', 'Buffer Type']];
  pkg.pins.forEach(pin => {
    const value = assignmentFor(pin.number);
    const fn = selectedFunction(pin, value);
    const boardPin = boardPinFor(pin);
    rows.push([currentProjectRecord().name, state.device, pkg.code, isBoardApplicable() ? currentBoard().name : '', pin.number, pin.name, pin.fixed ? pin.name : value.function, value.alias, value.connector, value.note, boardPin?.header || '', boardStatusLabel(boardPin?.status), boardExportDetail(pin), pin.fixed ? 'Power' : functionCategory(fn), fn?.signalType || '', fn ? (fn.iomuxManaged ? fn.pf : fn.pfLabel) : '', pin.iomuxRegister, pin.bufferType]);
  });
  downloadFile(`${state.device.toLowerCase()}-${pkg.code.toLowerCase()}-pin-plan.csv`, '\ufeff' + rows.map(row => row.map(csvEscape).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
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
    <p>工程：${escapeHtml(project.name)} · 芯片：${escapeHtml(state.device)} · 封装：${escapeHtml(pkg.label)}${isBoardApplicable() ? ` · 板卡：${escapeHtml(currentBoard().name)}` : ''}</p>
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

function projectSourcesFromImportPayload(parsed) {
  if (parsed?.schemaVersion === SCHEMA_VERSION
    && parsed.projectDataVersion === PROJECT_DATA_VERSION
    && parsed.kind === 'mspm0-pin-project'
    && parsed.project) return [parsed.project];
  if (parsed?.version === SCHEMA_VERSION
    && parsed.projectDataVersion === PROJECT_DATA_VERSION
    && parsed.kind === 'mspm0-pin-workspace'
    && Array.isArray(parsed.projects)) return parsed.projects;
  throw new Error('当前预发布版本不支持此工程文件格式。');
}

async function importJson(file) {
  try {
    const parsed = JSON.parse(await file.text());
    const sourceProjects = projectSourcesFromImportPayload(parsed);
    if (!sourceProjects.length) throw new Error('文件中没有可导入的工程。');
    const reservedNames = new Set(workspace.projects.map(project => project.name.toLowerCase()));
    const reserveName = baseValue => {
      const base = String(baseValue || '导入工程').slice(0, 48);
      if (!reservedNames.has(base.toLowerCase())) {
        reservedNames.add(base.toLowerCase());
        return base;
      }
      let index = 2;
      let result = '';
      do {
        const suffix = ` ${index}`;
        result = `${base.slice(0, 48 - suffix.length)}${suffix}`;
        index += 1;
      } while (reservedNames.has(result.toLowerCase()));
      reservedNames.add(result.toLowerCase());
      return result;
    };
    const imported = sourceProjects.map((project, index) => normalizeProject({
      ...project,
      id: createId(),
      name: reserveName(project?.name || (index ? '导入工程' : file.name.replace(/\.json$/i, '')))
    }, index));
    try {
      ensureProjectCapacity(imported.length);
    } catch {
      throw new Error(`导入后最多只能保留 ${MAX_PROJECTS} 个工程，请先删除不需要的工程。`);
    }
    workspace.projects.push(...imported);
    workspace.activeProjectId = imported[0].id;
    state = imported[0].data;
    resetTransientSelection();
    saveState();
    render();
    window.alert(`${imported.length} 个工程已导入为新工程。`);
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
  layoutViewOverride = null;
  if (layoutReflowFrame !== null && globalThis.cancelAnimationFrame) cancelAnimationFrame(layoutReflowFrame);
  layoutReflowFrame = null;
  elements.resourceDetail?.classList?.add('hidden');
  elements.workspace?.classList?.remove('resource-detail-open');
  activeFilter = 'all';
  activeCategory = 'All';
  elements.searchInput.value = '';
}
