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
