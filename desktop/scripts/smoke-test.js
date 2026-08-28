'use strict';

const fs = require('node:fs');
const path = require('node:path');
const inspectorUrl = process.argv[2] || 'http://127.0.0.1:9223';
const mode = process.argv[3] || 'inspect';
const expectedVersion = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version;

async function target() {
  const targets = await fetch(`${inspectorUrl}/json`).then(response => response.json());
  const page = targets.find(item => item.type === 'page' && item.url.startsWith('app://mspm0/'));
  if (!page) throw new Error('MSPM0 application page was not found');
  return page;
}

async function evaluate(webSocketUrl, expression) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const id = 1;
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error('CDP evaluation timed out'));
    }, 10000);
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } }));
    });
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      clearTimeout(timeout);
      socket.close();
      if (message.error || message.result?.exceptionDetails) reject(new Error(JSON.stringify(message.error || message.result.exceptionDetails)));
      else resolve(message.result.result.value);
    });
    socket.addEventListener('error', () => reject(new Error('CDP WebSocket connection failed')));
  });
}

const fixedProjectHelpers = `
    const change = element => element.dispatchEvent(new Event('change', { bubbles: true }));
    const storedWorkspace = () => JSON.parse(localStorage.getItem('mspm0g-pin-planner-v7') || '{}');
    const activeProject = () => {
      const stored = storedWorkspace();
      return stored.projects?.find(item => item.id === stored.activeProjectId);
    };
    const activeTarget = () => {
      const data = activeProject()?.data;
      return {
        device: data?.device,
        package: data?.package,
        chipDevice: document.querySelector('#chipDevice')?.textContent,
        chipPackage: document.querySelector('#chipPackage')?.textContent
      };
    };
    const openNewProject = () => {
      const dialog = document.querySelector('#projectDialog');
      if (!dialog.open) document.querySelector('[data-project-action="new"]').click();
    };
    const createFixedProject = (name, device, packageCode, templateId = '') => {
      openNewProject();
      document.querySelector('#projectNameInput').value = name;
      const template = document.querySelector('#projectTemplateSelect');
      template.value = templateId;
      change(template);
      if (!templateId) {
        const deviceSelect = document.querySelector('#projectDeviceSelect');
        deviceSelect.value = device;
        change(deviceSelect);
        document.querySelector('#projectPackageSelect').value = packageCode;
      }
      document.querySelector('#projectForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      return document.querySelector('#projectSelect').value;
    };
    const selectProject = projectId => {
      const select = document.querySelector('#projectSelect');
      select.value = projectId;
      change(select);
    };
`;

const expressions = {
  inspect: `(() => {
    if (!document.querySelector('#projectDialog').open) document.querySelector('[data-project-action="new"]').click();
    const deviceSelect = document.querySelector('#projectDeviceSelect');
    const packageSelect = document.querySelector('#projectPackageSelect');
    const devices = [...deviceSelect.options].map(option => option.value);
    const packagesByDevice = {};
    devices.forEach(device => {
      deviceSelect.value = device;
      deviceSelect.dispatchEvent(new Event('change', { bubbles: true }));
      packagesByDevice[device] = [...packageSelect.options].map(option => option.value);
    });
    return {
      title: document.title,
      url: location.href,
      devices,
      packagesByDevice,
      fixedTargetSelectorsMissing: !document.querySelector('#deviceSelect') && !document.querySelector('#packageSelect'),
      chipTextPresent: Boolean(document.querySelector('#chipDevice')) && Boolean(document.querySelector('#chipPackage')),
      bridge: typeof window.mspm0Desktop?.saveFile === 'function',
      focusBridge: typeof window.mspm0Desktop?.focusWindow === 'function',
      projectActions: document.querySelectorAll('[data-project-action]').length,
      exportActions: document.querySelectorAll('[data-export]').length,
      hasAbout: Boolean(document.querySelector('#aboutBtn')),
      hasCheck: Boolean(document.querySelector('#checkBtn')),
      hasThemeToggle: Boolean(document.querySelector('#themeToggleBtn')),
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
      footer: document.querySelector('#sourceFooter')?.textContent || ''
    };
  })()`,
  write: `(() => {
    ${fixedProjectHelpers}
    createFixedProject('固定状态保存测试', 'MSPM0G3507', 'RHB');
    const stored = storedWorkspace();
    const project = activeProject();
    return { target: activeTarget(), saved: stored.version === 7, projectVersion: project?.data?.version, storedDevice: project?.data?.device, storedPackage: project?.data?.package };
  })()`,
  restore: `(() => {
    ${fixedProjectHelpers}
    const stored = storedWorkspace();
    const project = activeProject();
    return { target: activeTarget(), saved: stored.version === 7, projectVersion: project?.data?.version, storedDevice: project?.data?.device, storedPackage: project?.data?.package };
  })()`,
  defaults: `(() => {
    ${fixedProjectHelpers}
    const packageCodes = {
      MSPM0G3519: ['RHB', 'RGZ', 'PT', 'PM', 'PN', 'PZ'],
      MSPM0G3507: ['RHB', 'RGZ', 'PT', 'PM']
    };
    const captures = [];
    const buttonForFunction = signal => [...document.querySelectorAll('#packageStage .pin-button')]
      .find(button => button.querySelector('.pin-function-label')?.textContent === signal);

    const projectIds = {};
    Object.entries(packageCodes).forEach(([deviceCode, codes]) => {
      codes.forEach(packageCode => {
        projectIds[deviceCode + '-' + packageCode] = createFixedProject('官方默认-' + deviceCode + '-' + packageCode, deviceCode, packageCode);
        const swdio = buttonForFunction('SWDIO');
        const swclk = buttonForFunction('SWCLK');
        const nrst = buttonForFunction('NRST');
        const power = [...document.querySelectorAll('#packageStage .pin-button.fixed')][0];
        captures.push({
          device: deviceCode,
          package: packageCode,
          assigned: Number(document.querySelector('#assignedCount').textContent),
          systemCount: Number(document.querySelector('#systemCount').textContent),
          swdioPin: Number(swdio?.dataset.pin),
          swclkPin: Number(swclk?.dataset.pin),
          nrstPin: Number(nrst?.dataset.pin),
          swdioColor: swdio?.style.getPropertyValue('--pin-color'),
          swclkColor: swclk?.style.getPropertyValue('--pin-color'),
          nrstColor: nrst?.style.getPropertyValue('--pin-color'),
          powerColor: power?.style.getPropertyValue('--pin-color'),
          subtitle: document.querySelector('#canvasSubtitle').textContent
        });
      });
    });

    selectProject(projectIds['MSPM0G3507-PM']);
    const swdio = buttonForFunction('SWDIO');
    swdio.click();
    const swdioOptions = [...document.querySelector('#functionSelect').options].map(option => option.value);
    const swdioStatusBefore = document.querySelector('#pinStatus').textContent;
    document.querySelector('#functionSelect').value = 'PA19';
    change(document.querySelector('#functionSelect'));
    const swdioAfter = document.querySelector('[data-pin="12"]');
    const swdioEdit = {
      label: swdioAfter.getAttribute('aria-label'),
      color: swdioAfter.style.getPropertyValue('--pin-color'),
      status: document.querySelector('#pinStatus').textContent
    };

    const nrst = buttonForFunction('NRST');
    nrst.click();
    const nrstOptions = [...document.querySelector('#functionSelect').options].map(option => option.value);
    const nrstStatusBefore = document.querySelector('#pinStatus').textContent;
    document.querySelector('#functionSelect').value = '';
    change(document.querySelector('#functionSelect'));
    const nrstAfter = document.querySelector('[data-pin="38"]');
    const nrstEdit = {
      label: nrstAfter.getAttribute('aria-label'),
      color: nrstAfter.style.getPropertyValue('--pin-color'),
      status: document.querySelector('#pinStatus').textContent
    };

    selectProject(projectIds['MSPM0G3519-PM']);
    buttonForFunction('NRST').click();
    const nrstAlternativeOptions = [...document.querySelector('#functionSelect').options].map(option => option.value);
    document.querySelector('#functionSelect').value = 'WAKE';
    change(document.querySelector('#functionSelect'));
    const nrstAlternativePin = document.querySelector('[data-pin="38"]');
    const nrstAlternative = {
      label: nrstAlternativePin.getAttribute('aria-label'),
      color: nrstAlternativePin.style.getPropertyValue('--pin-color'),
      status: document.querySelector('#pinStatus').textContent
    };

    return {
      captures,
      swdioOptions,
      nrstOptions,
      nrstAlternativeOptions,
      swdioStatusBefore,
      nrstStatusBefore,
      swdioEdit,
      nrstEdit,
      nrstAlternative,
      categoryLabels: [...document.querySelectorAll('#categoryList .category-btn span:nth-child(2)')].map(item => item.textContent)
    };
  })()`,
  'default-restore': `(() => {
    ${fixedProjectHelpers}
    const projects = storedWorkspace().projects || [];
    const findProject = (device, packageCode) => projects.filter(project => project.name.startsWith('官方默认-' + device + '-' + packageCode) && project.data?.device === device && project.data?.package === packageCode).at(-1)?.id;
    selectProject(findProject('MSPM0G3507', 'PM'));
    const g3507 = {
      assigned: Number(document.querySelector('#assignedCount').textContent),
      swdio: document.querySelector('[data-pin="12"]').getAttribute('aria-label'),
      swdioColor: document.querySelector('[data-pin="12"]').style.getPropertyValue('--pin-color'),
      nrst: document.querySelector('[data-pin="38"]').getAttribute('aria-label'),
      nrstColor: document.querySelector('[data-pin="38"]').style.getPropertyValue('--pin-color')
    };
    selectProject(findProject('MSPM0G3519', 'PM'));
    const g3519 = {
      assigned: Number(document.querySelector('#assignedCount').textContent),
      nrst: document.querySelector('[data-pin="38"]').getAttribute('aria-label'),
      nrstColor: document.querySelector('[data-pin="38"]').style.getPropertyValue('--pin-color')
    };
    return { g3507, g3519 };
  })()`,
  vqfn: `(() => {
    ${fixedProjectHelpers}
    const capture = (deviceCode, packageCode) => {
      createFixedProject('VQFN-' + deviceCode + '-' + packageCode, deviceCode, packageCode);
      const pins = [...document.querySelectorAll('#packageStage button[aria-label^="Pin "]')];
      const target = activeTarget();
      return {
        device: target.device,
        package: target.package,
        chipDevice: target.chipDevice,
        title: document.querySelector('#canvasTitle')?.textContent,
        chipPackage: target.chipPackage,
        pinCount: pins.length,
        firstPin: pins.find(pin => pin.getAttribute('aria-label')?.startsWith('Pin 1 '))?.getAttribute('aria-label'),
        lastPin: pins.find(pin => pin.getAttribute('aria-label')?.startsWith('Pin ' + pins.length + ' '))?.getAttribute('aria-label')
      };
    };
    return [
      capture('MSPM0G3519', 'RHB'),
      capture('MSPM0G3519', 'RGZ'),
      capture('MSPM0G3507', 'RHB'),
      capture('MSPM0G3507', 'RGZ')
    ];
  })()`,
  search: `(() => {
    ${fixedProjectHelpers}
    createFixedProject('搜索测试', 'MSPM0G3519', 'PZ');
    const input = document.querySelector('#searchInput');
    input.value = 'PB1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const matches = [...document.querySelectorAll('#packageStage .pin-button:not(.dimmed)')]
      .map(pin => pin.querySelector('.pin-name')?.textContent);
    return { query: input.value, matches };
  })()`,
  'board-preset': `(() => {
    ${fixedProjectHelpers}
    const input = element => element.dispatchEvent(new Event('input', { bubbles: true }));
    let templateLock;
    const createPreset = (name, presetId, device) => {
      openNewProject();
      document.querySelector('#projectNameInput').value = name;
      const template = document.querySelector('#projectTemplateSelect');
      template.value = presetId;
      change(template);
      templateLock = {
        device: document.querySelector('#projectDeviceSelect').value,
        package: document.querySelector('#projectPackageSelect').value,
        deviceDisabled: document.querySelector('#projectDeviceSelect').disabled,
        packageDisabled: document.querySelector('#projectPackageSelect').disabled,
        hint: document.querySelector('#projectTargetHint').textContent
      };
      if (templateLock.device !== device) throw new Error('Template did not force the expected device');
      document.querySelector('#projectForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    };
    const capture = () => ({
      device: activeTarget().device,
      package: activeTarget().package,
      assigned: Number(document.querySelector('#assignedCount').textContent),
      boardMarkers: document.querySelectorAll('#packageStage .board-pin-marker').length,
      headerMarkers: document.querySelectorAll('#packageStage .board-header').length,
      occupiedMarkers: document.querySelectorAll('#packageStage .board-occupied').length,
      specialMarkers: document.querySelectorAll('#packageStage .board-special').length,
      unexposedMarkers: document.querySelectorAll('#packageStage .board-unexposed').length,
      fixedMarkers: document.querySelectorAll('#packageStage .board-fixed').length,
      subtitle: document.querySelector('#canvasSubtitle').textContent,
      storedPreset: (() => {
        const stored = storedWorkspace();
        const data = stored.projects?.find(item => item.id === stored.activeProjectId)?.data;
        return { id: data?.boardPresetId, enabled: data?.enabledBoardResources || [] };
      })(),
      hardwareSummary: document.querySelector('#boardHardwareSummary')?.textContent
    });

    createPreset('天猛星3507测试', 'tianmengxing-g3507-pm64', 'MSPM0G3507');
    const g3507 = capture();
    const defaultSignals = [42, 43, 44, 45, 46]
      .map(number => document.querySelector('[data-pin="' + number + '"] .pin-function-label')?.textContent);

    const search = document.querySelector('#searchInput');
    const findMatches = query => {
      search.value = query;
      input(search);
      return [...document.querySelectorAll('#packageStage .pin-button:not(.dimmed) .pin-name')].map(item => item.textContent);
    };
    const ledMatches = findMatches('LED');
    const lcdMatches = findMatches('LCD').sort();
    const unexposedMatches = findMatches('未引出').sort();
    const connectorMatches = findMatches('U21-3');
    search.value = '';
    input(search);

    document.querySelector('[data-pin="42"]').click();
    document.querySelector('#functionSelect').value = 'PA2';
    change(document.querySelector('#functionSelect'));
    document.querySelector('#checkBtn').click();
    const changedCheck = document.querySelector('#checkDialogBody').textContent;
    document.querySelector('#checkDialog').close();

    const originalConfirm = window.confirm;
    window.confirm = () => true;
    document.querySelector('[data-project-action="restore-preset"]').click();
    const restoredSignal = document.querySelector('[data-pin="42"] .pin-function-label').textContent;
    document.querySelector('#resetBtn').click();
    const assignedAfterClear = Number(document.querySelector('#assignedCount').textContent);
    const markersAfterClear = document.querySelectorAll('#packageStage .board-pin-marker').length;
    document.querySelector('[data-project-action="restore-preset"]').click();
    const assignedAfterRestore = Number(document.querySelector('#assignedCount').textContent);
    window.confirm = originalConfirm;

    document.querySelector('[data-pin="60"]').click();
    let sharedBoardInfo = document.querySelector('#boardInfoBox').textContent;
    let sharedRouteLabels = [...document.querySelectorAll('#boardRouteList .board-route')].map(item => item.textContent);
    const sharedPinLabel = document.querySelector('[data-pin="60"] .pin-board-label')?.textContent;
    const boardHardwarePanel = document.querySelector('#boardHardwarePanel');
    boardHardwarePanel.open = true;
    const toggleResource = (id, checked = true) => {
      const input = document.querySelector('#boardResourceControls [data-resource="' + id + '"] input');
      input.checked = checked;
      change(input);
    };
    toggleResource('spi-flash');
    toggleResource('h8-lcd');
    const flashActiveMarker = document.querySelector('[data-pin="58"] .board-pin-marker')?.textContent;
    const lcdActiveMarker = document.querySelector('[data-pin="2"] .board-pin-marker')?.textContent;
    document.querySelector('[data-pin="60"]').click();
    sharedBoardInfo = document.querySelector('#boardInfoBox').textContent;
    sharedRouteLabels = [...document.querySelectorAll('#boardRouteList .board-route')].map(item => item.textContent);
    const sharedPinLabels = [...document.querySelectorAll('[data-pin="60"] .pin-board-label')].map(item => item.textContent);
    const boardHardwareText = boardHardwarePanel.textContent;
    toggleResource('spi-flash', false);
    const flashInactiveMarker = document.querySelector('[data-pin="58"] .board-pin-marker')?.textContent;
    const lcdOnlyAssigned = Number(document.querySelector('#assignedCount').textContent);
    const lcdToggle = document.querySelector('#boardResourceControls [data-resource="h8-lcd"] input');
    lcdToggle.checked = false;
    change(lcdToggle);
    const lcdInactiveMarker = document.querySelector('[data-pin="2"] .board-pin-marker')?.textContent;

    document.querySelector('[data-pin="33"]').click();
    const boardInfo = document.querySelector('#boardInfoBox').textContent;
    document.querySelector('#functionSelect').value = 'UART0_TX';
    change(document.querySelector('#functionSelect'));
    document.querySelector('#checkBtn').click();
    const openDrainCheck = document.querySelector('#checkDialogBody').textContent;
    document.querySelector('#checkDialog').close();

    document.querySelector('[data-pin="40"]').click();
    const fixedPinLabel = document.querySelector('[data-pin="40"] .board-fixed-label')?.textContent;
    const fixedBoardInfo = document.querySelector('#boardInfoBox').textContent;

    let printCalls = 0;
    const originalPrint = window.print;
    window.print = () => { printCalls += 1; };
    document.querySelector('[data-export="print"]').click();
    const boardReport = document.querySelector('#printReport').textContent;
    window.print = originalPrint;

    const rectsOverlap = (a, b, tolerance = 0.5) => a.left < b.right - tolerance && a.right > b.left + tolerance && a.top < b.bottom - tolerance && a.bottom > b.top + tolerance;
    const textRects = element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return [...range.getClientRects()].map(rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }));
    };
    const markerCheck = number => {
      const pin = document.querySelector('[data-pin="' + number + '"]');
      const markerElement = pin.querySelector('.board-pin-marker');
      const marker = markerElement.getBoundingClientRect();
      const pad = pin.querySelector('.pin-pad').getBoundingClientRect();
      const labels = [...textRects(pin.querySelector('.pin-number')), ...textRects(pin.querySelector('.pin-name'))];
      const style = getComputedStyle(markerElement);
      return {
        text: markerElement.textContent,
        fontSize: parseFloat(style.fontSize),
        color: style.color,
        width: parseFloat(style.width),
        height: parseFloat(style.height),
        contained: marker.left >= pad.left - 0.5 && marker.right <= pad.right + 0.5 && marker.top >= pad.top - 0.5 && marker.bottom <= pad.bottom + 0.5,
        overlapsText: labels.some(label => rectsOverlap(marker, label)),
        marker: { left: marker.left, right: marker.right, top: marker.top, bottom: marker.bottom },
        labels,
        devicePixelRatio: window.devicePixelRatio,
        viewportScale: window.visualViewport?.scale || 1
      };
    };
    const markerChecks = {
      top: markerCheck(61),
      right: markerCheck(33),
      bottom: markerCheck(17),
      left: markerCheck(1)
    };

    const g3507TemplateLock = templateLock;
    createPreset('天猛星3519测试', 'tianmengxing-g3519-pm64', 'MSPM0G3519');
    const g3519TemplateLock = templateLock;
    const g3519 = capture();
    return {
      g3507, g3519, defaultSignals, ledMatches, lcdMatches, unexposedMatches, connectorMatches, changedCheck,
      restoredSignal, assignedAfterClear, markersAfterClear, assignedAfterRestore, boardInfo, openDrainCheck,
      printCalls, boardReport, markerChecks, g3507TemplateLock, g3519TemplateLock, sharedBoardInfo, sharedRouteLabels, sharedPinLabel, sharedPinLabels, boardHardwareText, lcdOnlyAssigned, fixedPinLabel, fixedBoardInfo,
      flashActiveMarker, flashInactiveMarker, lcdActiveMarker, lcdInactiveMarker
    };
  })()`,
  'seed-v4-workspace': `(() => {
    const project = {
      id: 'fixed-v7-project',
      name: 'v7 固定状态恢复',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      data: {
        version: 6,
        device: 'MSPM0G3507',
        package: 'PT',
        boardPresetId: '',
        enabledBoardResources: [],
        layout: { leftWidth: 275, rightWidth: 355 },
        view: { zoom: 80, x: 0, y: 0, rotation: 0, initialized: false },
        assignments: { '1': { function: 'UART0_TX', alias: 'v7本地数据', connector: 'J4-1', note: 'storage restore' } }
      }
    };
    localStorage.setItem('mspm0g-pin-planner-v7', JSON.stringify({ version: 7, activeProjectId: project.id, projects: [project] }));
    setTimeout(() => location.reload(), 50);
    return true;
  })()`,
  'migration-v4': `(() => {
    ${fixedProjectHelpers}
    const stored = storedWorkspace();
    const project = activeProject();
    const target = activeTarget();
    return {
      workspaceVersion: stored.version,
      projectVersion: project?.data?.version,
      boardPresetId: project?.data?.boardPresetId,
      projectName: document.querySelector('#projectSelect option:checked')?.textContent,
      device: project?.data?.device,
      package: project?.data?.package,
      chipDevice: target.chipDevice,
      chipPackage: target.chipPackage,
      pin: document.querySelector('[data-pin="1"]')?.getAttribute('aria-label')
    };
  })()`,
  layout: `(() => {
    ${fixedProjectHelpers}
    createFixedProject('布局测试', 'MSPM0G3507', 'PM');
    const pin = document.querySelector('[data-pin="17"]');
    pin.click();
    const functionSelect = document.querySelector('#functionSelect');
    functionSelect.value = 'TIMG6_C0';
    functionSelect.dispatchEvent(new Event('change', { bubbles: true }));
    const alias = document.querySelector('#aliasInput');
    alias.value = 'TMC2209_1_STEP';
    alias.dispatchEvent(new Event('input', { bubbles: true }));
    const button = document.querySelector('.side.bottom [data-pin="17"]');
    const pad = button.querySelector('.pin-pad');
    const label = button.querySelector('.pin-external-label');
    const buttonRect = button.getBoundingClientRect();
    const padRect = pad.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const textRange = document.createRange();
    textRange.selectNodeContents(label.querySelector('.pin-function-label'));
    const textRect = textRange.getBoundingClientRect();
    return {
      pin: button.getAttribute('aria-label'),
      gap: labelRect.top - padRect.bottom,
      visualGap: textRect.top - padRect.bottom,
      contained: labelRect.bottom <= buttonRect.bottom + 0.5,
      buttonHeight: buttonRect.height,
      labelHeight: labelRect.height,
      trackHeight: button.offsetHeight,
      labelTrackLength: label.offsetWidth,
      transform: getComputedStyle(label).transform,
      turnDirection: Math.sign(new DOMMatrix(getComputedStyle(label).transform).b)
    };
  })()`,
  'resource-detail-layout': `(async () => {
    ${fixedProjectHelpers}
    createFixedProject('外设详情分栏测试', 'MSPM0G3519', 'PM');
    const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const rect = element => {
      const value = element.getBoundingClientRect();
      return { left: value.left, right: value.right, width: value.width };
    };
    const sidebar = document.querySelector('.sidebar');
    const center = document.querySelector('.center');
    const canvas = document.querySelector('#canvasScroller');
    const detail = document.querySelector('#resourceDetail');
    const capture = () => ({
      sidebar: rect(sidebar),
      center: rect(center),
      canvas: rect(canvas),
      detail: detail.getClientRects().length ? rect(detail) : null,
      detailVisible: detail.getClientRects().length > 0,
      detailParent: detail.parentElement?.id || '',
      title: document.querySelector('#resourceDetailTitle')?.textContent || '',
      selected: document.querySelector('[data-resource="UART0"]')?.classList.contains('active') || false
    });
    document.querySelector('[data-view="resources"]').click();
    await settle();
    const closed = capture();
    const uart0 = document.querySelector('[data-resource="UART0"]');
    if (!uart0) throw new Error('UART0 resource instance was not rendered');
    uart0.click();
    await settle();
    const open = capture();
    document.querySelector('#resourceDetailClose').click();
    await settle();
    const reclosed = capture();
    return { closed, open, reclosed };
  })()`,
  release: `(() => {
    ${fixedProjectHelpers}
    const input = element => element.dispatchEvent(new Event('input', { bubbles: true }));
    const projectAction = action => document.querySelector('[data-project-action="' + action + '"]').click();
    const submitProjectName = name => {
      const field = document.querySelector('#projectNameInput');
      field.value = name;
      document.querySelector('#projectForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    };

    const projectSelect = document.querySelector('#projectSelect');
    const originalProjectId = createFixedProject('发布原始工程', 'MSPM0G3519', 'PZ');
    const originalState = activeTarget();
    const testProjectId = createFixedProject('发布验收', 'MSPM0G3507', 'RHB');

    projectAction('rename');
    submitProjectName('发布验收重命名');
    const projectCountBeforeDuplicate = projectSelect.options.length;
    projectAction('duplicate');
    const duplicatedProject = projectSelect.options[projectSelect.selectedIndex].textContent;
    const projectCountAfterDuplicate = projectSelect.options.length;
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    projectAction('delete');
    window.confirm = originalConfirm;

    selectProject(originalProjectId);
    const restoredOriginalState = activeTarget();
    selectProject(testProjectId);
    const testState = activeTarget();

    const pin = document.querySelector('[aria-label^="Pin 1 PA0"]');
    pin.click();
    const functionSelect = document.querySelector('#functionSelect');
    const selectedFunction = [...functionSelect.options].find(option => option.value)?.value;
    functionSelect.value = selectedFunction;
    change(functionSelect);
    const assignedAfterEdit = Number(document.querySelector('#assignedCount').textContent);
    document.querySelector('#undoBtn').click();
    const functionAfterUndo = document.querySelector('#functionSelect').value;
    document.querySelector('#redoBtn').click();
    const functionAfterRedo = document.querySelector('#functionSelect').value;

    const alias = document.querySelector('#aliasInput');
    alias.value = '发布测试';
    input(alias);
    const connector = document.querySelector('#connectorInput');
    connector.value = 'J99-1';
    input(connector);
    const note = document.querySelector('#noteInput');
    note.value = 'release smoke test';
    input(note);

    const themeToggleMissing = !document.querySelector('#themeToggleBtn');
    const colorScheme = getComputedStyle(document.documentElement).colorScheme;
    const rotationBefore = document.querySelector('#packageStage').dataset.rotation;
    document.querySelector('#rotateCwBtn').click();
    const rotationAfter = document.querySelector('#packageStage').dataset.rotation;
    const zoom = document.querySelector('#zoomSlider');
    zoom.value = '125';
    input(zoom);
    document.querySelector('#checkBtn').click();

    return {
      projectCountBeforeDuplicate,
      projectCountAfterDuplicate,
      projectCountAfterDelete: projectSelect.options.length,
      duplicatedProject,
      selectedProject: projectSelect.options[projectSelect.selectedIndex].textContent,
      originalState,
      restoredOriginalState,
      testState,
      selectedFunction,
      assignedAfterEdit,
      functionAfterUndo,
      functionAfterRedo,
      pinLabel: document.querySelector('[data-pin="1"]').getAttribute('aria-label'),
      themeToggleMissing,
      colorScheme,
      rotationBefore,
      rotationAfter,
      zoom: document.querySelector('#zoomValue').textContent,
      checkOpen: document.querySelector('#checkDialog').open,
      checkText: document.querySelector('#checkDialog').textContent
    };
  })()`,
  'import-v4': `(async () => {
    ${fixedProjectHelpers}
    if (!activeProject()) createFixedProject('导入前工程', 'MSPM0G3519', 'PM');
    const alerts = [];
    const originalAlert = window.alert;
    window.alert = message => alerts.push(String(message));
    const payload = {
      schemaVersion: 7,
      projectDataVersion: 6,
      kind: 'mspm0-pin-project',
      project: {
        id: 'fixture-v7-project',
        name: '新版导入测试',
        data: {
          version: 6,
          device: 'MSPM0G3507',
          package: 'PT',
          boardPresetId: '',
          enabledBoardResources: [],
          layout: { leftWidth: 280, rightWidth: 360 },
          view: { zoom: 80, x: 0, y: 0, rotation: 0, initialized: false },
          assignments: { '1': { function: 'UART0_TX', alias: '新版导入', connector: 'J2-1', note: 'v7 import test' } }
        }
      }
    };
    const transfer = new DataTransfer();
    transfer.items.add(new File([JSON.stringify(payload)], 'import-v4.json', { type: 'application/json' }));
    const input = document.querySelector('#importFile');
    Object.defineProperty(input, 'files', { configurable: true, value: transfer.files });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 150));
    window.alert = originalAlert;
    const focusAfterImport = document.activeElement?.id;
    const search = document.querySelector('#searchInput');
    search.value = 'PA0';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    const searchMatches = [...document.querySelectorAll('#packageStage .pin-button:not(.dimmed) .pin-name')].map(item => item.textContent);
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[aria-label^="Pin 1 PA0"]')?.click();
    const alias = document.querySelector('#aliasInput');
    alias.value = '导入后输入';
    alias.dispatchEvent(new Event('input', { bubbles: true }));
    return {
      activeProject: document.querySelector('#projectSelect option:checked')?.textContent,
      activeDevice: activeTarget().device,
      activePackage: activeTarget().package,
      chipDevice: activeTarget().chipDevice,
      chipPackage: activeTarget().chipPackage,
      projectVersion: activeProject()?.data?.version,
      pin: document.querySelector('[aria-label^="Pin 1 PA0"]')?.getAttribute('aria-label'),
      alert: alerts[0],
      focusAfterImport,
      searchMatches,
      assigned: Number(document.querySelector('#assignedCount').textContent),
      editedPin: document.querySelector('[data-pin="1"]')?.getAttribute('aria-label')
    };
  })()`,
  'import-v3': `(async () => {
    ${fixedProjectHelpers}
    if (!activeProject()) createFixedProject('旧格式拒绝基线', 'MSPM0G3519', 'PM');
    const before = storedWorkspace();
    const beforeCount = before.projects?.length || 0;
    const beforeActiveProjectId = before.activeProjectId;
    const alerts = [];
    const originalAlert = window.alert;
    window.alert = message => alerts.push(String(message));
    const payload = {
      schemaVersion: 3,
      device: 'MSPM0G3507',
      activePackage: 'PT',
      packages: { PT: { assignments: { '1': { function: 'UART0_TX', alias: '旧版导入', connector: 'J1-1', note: 'v3 compatibility test' } } } },
      views: {}
    };
    const transfer = new DataTransfer();
    transfer.items.add(new File([JSON.stringify(payload)], 'import-v3.json', { type: 'application/json' }));
    const input = document.querySelector('#importFile');
    Object.defineProperty(input, 'files', { configurable: true, value: transfer.files });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 150));
    window.alert = originalAlert;
    const after = storedWorkspace();
    return {
      beforeCount,
      afterCount: after.projects?.length || 0,
      beforeActiveProjectId,
      afterActiveProjectId: after.activeProjectId,
      activeTarget: activeTarget(),
      alert: alerts[0]
    };
  })()`,
  print: `(() => {
    ${fixedProjectHelpers}
    if (!activeProject()) createFixedProject('打印测试', 'MSPM0G3519', 'PM');
    let printCalls = 0;
    const originalPrint = window.print;
    window.print = () => { printCalls += 1; };
    document.querySelector('[data-export="print"]').click();
    const report = document.querySelector('#printReport').textContent;
    window.print = originalPrint;
    return { printCalls, report };
  })()`,
  close: `(() => { setTimeout(() => window.close(), 100); return true; })()`
};

async function main() {
  if (!expressions[mode]) throw new Error(`Unknown smoke-test mode: ${mode}`);
  const page = await target();
  const result = await evaluate(page.webSocketDebuggerUrl, expressions[mode]);
  console.log(JSON.stringify(result));

  if (mode === 'inspect') {
    if (result.title !== 'MSPM0G 引脚规划器') throw new Error('Unexpected page title');
    if (result.url !== 'app://mspm0/index.html') throw new Error('Unexpected application URL');
    if (!result.bridge || !result.focusBridge) throw new Error('Desktop bridge is incomplete');
    if (!result.devices.includes('MSPM0G3507') || !result.devices.includes('MSPM0G3519')) throw new Error('Device list is incomplete');
    if (!['RHB', 'RGZ', 'PT', 'PM', 'PN', 'PZ'].every(code => result.packagesByDevice.MSPM0G3519?.includes(code))) throw new Error('MSPM0G3519 package list is incomplete');
    if (!['RHB', 'RGZ', 'PT', 'PM'].every(code => result.packagesByDevice.MSPM0G3507?.includes(code))) throw new Error('MSPM0G3507 package list is incomplete');
    if (!result.fixedTargetSelectorsMissing || !result.chipTextPresent) throw new Error('Fixed project target interface is incomplete');
    if (result.hasThemeToggle || result.colorScheme !== 'dark') throw new Error('Night-only interface is not active');
    if (!result.footer.includes(`v${expectedVersion}`)) throw new Error(`Runtime version mismatch: ${result.footer}`);
    if (result.projectActions !== 5 || result.exportActions !== 7 || !result.hasAbout || !result.hasCheck) throw new Error('Candidate feature controls are incomplete');
  }
  if (mode === 'write' && (result.storedDevice !== 'MSPM0G3507' || result.storedPackage !== 'RHB' || result.target.device !== 'MSPM0G3507' || result.target.package !== 'RHB' || result.projectVersion !== 6 || !result.saved)) {
    throw new Error('MSPM0G3507 fixed VQFN state was not saved');
  }
  if (mode === 'restore' && (result.storedDevice !== 'MSPM0G3507' || result.storedPackage !== 'RHB' || result.target.device !== 'MSPM0G3507' || result.target.package !== 'RHB' || result.projectVersion !== 6 || !result.saved)) {
    throw new Error('Desktop fixed project state was not restored');
  }
  if (mode === 'defaults') {
    const expectedPins = {
      RHB: [23, 24, 3],
      RGZ: [34, 35, 4],
      PT: [34, 35, 4],
      PM: [12, 13, 38],
      PN: [56, 57, 6],
      PZ: [71, 72, 6]
    };
    if (result.captures.length !== 10) throw new Error('Official default coverage is incomplete');
    result.captures.forEach(item => {
      const expected = expectedPins[item.package];
      if (
        item.assigned !== 3
        || item.systemCount !== 1
        || item.swdioPin !== expected[0]
        || item.swclkPin !== expected[1]
        || item.nrstPin !== expected[2]
        || item.swdioColor !== 'var(--pin-debug)'
        || item.swclkColor !== 'var(--pin-debug)'
        || item.nrstColor !== 'var(--pin-system)'
        || item.powerColor !== 'var(--pin-power)'
        || new Set([item.swdioColor, item.nrstColor, item.powerColor]).size !== 3
        || !item.subtitle.includes('1 个系统引脚')
      ) throw new Error(`Official defaults failed for ${item.device} ${item.package}: ${JSON.stringify(item)}`);
    });
    if (
      !result.swdioOptions.includes('SWDIO')
      || !result.swdioOptions.includes('PA19')
      || !result.nrstOptions.includes('NRST')
      || result.nrstOptions.includes('WAKE')
      || !result.nrstAlternativeOptions.includes('WAKE')
      || result.swdioStatusBefore !== '官方默认 · 可修改'
      || result.nrstStatusBefore !== '官方默认 · 可修改'
      || !result.swdioEdit.label.includes('PA19 PA19')
      || result.swdioEdit.color !== 'var(--pin-gpio)'
      || result.swdioEdit.status !== '已安排'
      || result.nrstEdit.label !== 'Pin 38 NRST'
      || result.nrstEdit.color !== 'var(--pin-unassigned)'
      || result.nrstEdit.status !== '未安排'
      || !result.nrstAlternative.label.includes('NRST WAKE')
      || result.nrstAlternative.color !== 'var(--pin-system)'
      || result.nrstAlternative.status !== '已安排'
      || !result.categoryLabels.includes('Debug / 调试')
      || !result.categoryLabels.includes('System / 系统')
    ) throw new Error(`Official defaults are not editable or categorized correctly: ${JSON.stringify(result)}`);
  }
  if (mode === 'default-restore' && (
    result.g3507.assigned !== 2
    || !result.g3507.swdio.includes('PA19 PA19')
    || result.g3507.swdioColor !== 'var(--pin-gpio)'
    || result.g3507.nrst !== 'Pin 38 NRST'
    || result.g3507.nrstColor !== 'var(--pin-unassigned)'
    || result.g3519.assigned !== 3
    || !result.g3519.nrst.includes('NRST WAKE')
    || result.g3519.nrstColor !== 'var(--pin-system)'
  )) throw new Error(`Edited official defaults were not restored: ${JSON.stringify(result)}`);
  if (mode === 'vqfn') {
    const expected = [
      ['MSPM0G3519', 'RHB', 32, 'PA0', 'VCORE'],
      ['MSPM0G3519', 'RGZ', 48, 'PA0', 'VCORE'],
      ['MSPM0G3507', 'RHB', 32, 'PA0', 'VCORE'],
      ['MSPM0G3507', 'RGZ', 48, 'PA0', 'VCORE']
    ];
    expected.forEach(([device, packageCode, pinCount, firstPin, lastPin], index) => {
      const item = result[index];
      if (item?.device !== device || item?.package !== packageCode || item?.chipDevice !== device || item?.pinCount !== pinCount || !item?.title?.includes(`${packageCode}-${pinCount} VQFN`) || !item?.chipPackage?.includes(`${packageCode}-${pinCount} VQFN`) || !item?.firstPin?.includes(firstPin) || !item?.lastPin?.includes(lastPin)) {
        throw new Error(`${device} ${packageCode} VQFN package smoke test failed`);
      }
    });
  }
  if (mode === 'search' && (result.query !== 'PB1' || result.matches.length !== 1 || result.matches[0] !== 'PB1')) {
    throw new Error(`GPIO search returned unexpected pins: ${JSON.stringify(result.matches)}`);
  }
  if (mode === 'board-preset') {
    const expectedSignals = ['ROSC', 'LFXIN', 'LFXOUT', 'HFXIN', 'HFXOUT'];
    const expectedMarkers = { top: 'B', right: '!', bottom: '!', left: 'H' };
    for (const [device, capture] of [['MSPM0G3507', result.g3507], ['MSPM0G3519', result.g3519]]) {
      if (capture.device !== device || capture.package !== 'PM' || capture.assigned !== 9 || capture.boardMarkers !== 64 || capture.headerMarkers !== 40 || capture.occupiedMarkers !== 12 || capture.specialMarkers !== 5 || capture.unexposedMarkers !== 4 || capture.fixedMarkers !== 3 || !capture.subtitle.includes('天猛星') || capture.storedPreset.id !== (device === 'MSPM0G3507' ? 'tianmengxing-g3507-pm64' : 'tianmengxing-g3519-pm64') || JSON.stringify(capture.storedPreset.enabled) !== JSON.stringify(['swd-debug', 'bsl-button', 'nrst-reset']) || !capture.hardwareSummary.includes('3/8')) {
        throw new Error(`${device} Tianmengxing preset failed: ${JSON.stringify(capture)}`);
      }
    }
    const markersReadable = Object.entries(expectedMarkers).every(([side, text]) => {
      const marker = result.markerChecks[side];
      return marker.text === text
        && marker.fontSize > 0
        && marker.color !== 'rgba(0, 0, 0, 0)'
        && Math.abs(marker.width - 13) <= 0.75
        && Math.abs(marker.height - 13) <= 0.75
        && marker.contained
        && !marker.overlapsText;
    });
    if (
      JSON.stringify(result.defaultSignals) !== JSON.stringify(expectedSignals)
      || JSON.stringify(result.ledMatches) !== JSON.stringify(['PB22'])
      || JSON.stringify(result.lcdMatches) !== JSON.stringify(['PB10', 'PB11', 'PB14', 'PB26', 'PB8', 'PB9'])
      || JSON.stringify(result.unexposedMatches) !== JSON.stringify(['PA3', 'PA4', 'PA5', 'PA6'])
      || JSON.stringify(result.connectorMatches) !== JSON.stringify(['PA0'])
      || !result.changedCheck.includes('固定时钟网络')
      || result.restoredSignal !== 'ROSC'
      || result.assignedAfterClear !== 0
      || result.markersAfterClear !== 64
      || result.assignedAfterRestore !== 9
      || !result.boardInfo.includes('U21-3')
      || !result.boardInfo.includes('开漏')
      || result.fixedPinLabel !== '3.3 V 主电源'
      || !result.fixedBoardInfo.includes('3.3 V 主电源')
      || !result.fixedBoardInfo.includes('固定板载连接')
      || result.sharedRouteLabels.length !== 2
      || !result.sharedBoardInfo.includes('板载 SPI Flash')
      || !result.sharedBoardInfo.includes('外接 H8 LCD/OLED 接口')
      || !result.sharedBoardInfo.includes('这不是引脚冲突')
      || JSON.stringify(result.sharedPinLabels) !== JSON.stringify(['FLASH · MOSI', 'LCD · SDA'])
      || !result.boardHardwareText.includes('SPI1 共享总线')
      || !result.boardHardwareText.includes('PB6 / Pin 58 / W_CS')
      || !result.boardHardwareText.includes('PB14 / Pin 2 / LCD_CS')
      || result.lcdOnlyAssigned !== 15
      || result.flashActiveMarker !== '✓'
      || result.flashInactiveMarker !== 'B'
      || result.lcdActiveMarker !== '✓'
      || result.lcdInactiveMarker !== 'H'
      || !result.openDrainCheck.includes('仅支持开漏输出')
      || result.printCalls !== 1
      || !result.boardReport.includes('立创·天猛星 PM-64 最小系统板')
      || !result.boardReport.includes('U21-3')
      || !result.boardReport.includes('特殊电气条件')
      || !result.boardReport.includes('板载 SPI Flash[未启用]=MOSI')
      || !result.boardReport.includes('外接 H8 LCD/OLED 接口[未启用]=SDA')
      || !markersReadable
      || result.g3507TemplateLock.device !== 'MSPM0G3507'
      || result.g3507TemplateLock.package !== 'PM'
      || !result.g3507TemplateLock.deviceDisabled
      || !result.g3507TemplateLock.packageDisabled
      || !result.g3507TemplateLock.hint.includes('不能修改')
      || result.g3519TemplateLock.device !== 'MSPM0G3519'
      || result.g3519TemplateLock.package !== 'PM'
      || !result.g3519TemplateLock.deviceDisabled
      || !result.g3519TemplateLock.packageDisabled
    ) throw new Error(`Tianmengxing workflow failed: ${JSON.stringify(result)}`);
  }
  if (mode === 'migration-v4' && (
    result.workspaceVersion !== 7
    || result.projectVersion !== 6
    || result.boardPresetId !== ''
    || result.projectName !== 'v7 固定状态恢复'
    || result.device !== 'MSPM0G3507'
    || result.package !== 'PT'
    || result.chipDevice !== 'MSPM0G3507'
    || !result.chipPackage?.includes('PT')
    || !result.pin?.includes('UART0_TX')
    || !result.pin?.includes('v7本地数据')
  )) throw new Error(`Version 7 fixed workspace restore failed: ${JSON.stringify(result)}`);
  if (mode === 'layout' && (!result.pin.includes('TIMG6_C0') || !result.pin.includes('TMC2209_1_STEP') || result.gap < 3 || result.visualGap < 3 || result.visualGap > 24 || !result.contained || result.trackHeight !== 210 || result.labelTrackLength !== 132 || result.turnDirection !== -1 || result.buttonHeight / result.labelHeight < 1.5)) {
    throw new Error(`Bottom pin label layout failed: ${JSON.stringify(result)}`);
  }
  if (mode === 'resource-detail-layout') {
    const near = (a, b, tolerance = 1.5) => Math.abs(a - b) <= tolerance;
    const { closed, open, reclosed } = result;
    if (
      closed.detailVisible
      || !open.detailVisible
      || !open.title.includes('UART0')
      || !open.selected
      || open.detailParent !== 'leftRegion'
      || open.detail.left < open.sidebar.right - 1.5
      || open.detail.right > open.center.left + 1.5
      || open.center.width >= closed.center.width
      || open.canvas.width >= closed.canvas.width
      || !near(open.sidebar.left, closed.sidebar.left)
      || !near(open.sidebar.width, closed.sidebar.width)
      || !near(open.center.right, closed.center.right)
      || !near(closed.center.width - open.center.width, open.detail.width, 9)
      || reclosed.detailVisible
      || !near(reclosed.center.left, closed.center.left)
      || !near(reclosed.center.width, closed.center.width)
      || !near(reclosed.canvas.left, closed.canvas.left)
      || !near(reclosed.canvas.width, closed.canvas.width)
    ) throw new Error(`Peripheral detail column layout failed: ${JSON.stringify(result)}`);
  }
  if (mode === 'release' && (
    result.projectCountAfterDuplicate !== result.projectCountBeforeDuplicate + 1
    || result.projectCountAfterDelete !== result.projectCountBeforeDuplicate
    || !result.duplicatedProject.includes('副本')
    || result.selectedProject !== '发布验收重命名'
    || result.originalState.device !== 'MSPM0G3519'
    || result.originalState.package !== 'PZ'
    || result.restoredOriginalState.device !== result.originalState.device
    || result.restoredOriginalState.package !== result.originalState.package
    || result.testState.device !== 'MSPM0G3507'
    || result.testState.package !== 'RHB'
    || !result.selectedFunction
    || result.assignedAfterEdit !== 4
    || result.functionAfterUndo !== ''
    || result.functionAfterRedo !== result.selectedFunction
    || !result.pinLabel.includes('发布测试')
    || !result.pinLabel.includes('J99-1')
    || !result.themeToggleMissing
    || result.colorScheme !== 'dark'
    || result.rotationBefore === result.rotationAfter
    || result.zoom !== '125%'
    || !result.checkOpen
    || !result.checkText.includes('规划检查')
  )) {
    throw new Error(`Release workflow smoke test failed: ${JSON.stringify(result)}`);
  }
  if (mode === 'import-v4' && (result.activeProject !== '新版导入测试' || result.activeDevice !== 'MSPM0G3507' || result.activePackage !== 'PT' || result.chipDevice !== 'MSPM0G3507' || !result.chipPackage?.includes('PT') || result.projectVersion !== 6 || !result.pin?.includes('UART0_TX') || result.assigned !== 1 || result.focusAfterImport !== 'searchInput' || result.searchMatches.length !== 1 || result.searchMatches[0] !== 'PA0' || !result.editedPin?.includes('导入后输入') || !result.alert?.includes('已导入'))) {
    throw new Error('Version 7/project data 6 import failed');
  }
  if (mode === 'import-v3' && (result.afterCount !== result.beforeCount || result.afterActiveProjectId !== result.beforeActiveProjectId || !result.alert?.includes('不支持'))) {
    throw new Error('Legacy version 3 project was not rejected cleanly');
  }
  if (mode === 'print' && (result.printCalls !== 1 || !result.report.includes('MSPM0 引脚规划报告') || !result.report.includes('非 TI 官方工具'))) {
    throw new Error('Print report generation failed');
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
