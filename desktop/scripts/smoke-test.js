'use strict';

const inspectorUrl = process.argv[2] || 'http://127.0.0.1:9223';
const mode = process.argv[3] || 'inspect';

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

const expressions = {
  inspect: `(() => ({
    title: document.title,
    url: location.href,
    devices: [...document.querySelectorAll('#deviceSelect option')].map(option => option.value),
    packages: [...document.querySelectorAll('#packageSelect option')].map(option => option.value),
    bridge: typeof window.mspm0Desktop?.saveFile === 'function',
    focusBridge: typeof window.mspm0Desktop?.focusWindow === 'function',
    projectActions: document.querySelectorAll('[data-project-action]').length,
    exportActions: document.querySelectorAll('[data-export]').length,
    hasAbout: Boolean(document.querySelector('#aboutBtn')),
    hasCheck: Boolean(document.querySelector('#checkBtn')),
    hasThemeToggle: Boolean(document.querySelector('#themeToggleBtn')),
    colorScheme: getComputedStyle(document.documentElement).colorScheme
  }))()`,
  write: `(() => {
    const device = document.querySelector('#deviceSelect');
    device.value = 'MSPM0G3507';
    device.dispatchEvent(new Event('change', { bubbles: true }));
    const pkg = document.querySelector('#packageSelect');
    const packages = [...pkg.options].map(option => option.value);
    pkg.value = 'RHB';
    pkg.dispatchEvent(new Event('change', { bubbles: true }));
    const stored = JSON.parse(localStorage.getItem('mspm0g-pin-planner-v6') || '{}');
    const project = stored.projects?.find(item => item.id === stored.activeProjectId);
    return { activeDevice: document.querySelector('#deviceSelect').value, activePackage: document.querySelector('#packageSelect').value, packages, saved: stored.version === 6, storedDevice: project?.data?.activeDevice, storedPackage: project?.data?.devices?.MSPM0G3507?.activePackage };
  })()`,
  restore: `(() => ({
    activeDevice: document.querySelector('#deviceSelect').value,
    activePackage: document.querySelector('#packageSelect').value,
    saved: JSON.parse(localStorage.getItem('mspm0g-pin-planner-v6') || '{}').version === 6,
    storedDevice: (() => { const stored = JSON.parse(localStorage.getItem('mspm0g-pin-planner-v6') || '{}'); return stored.projects?.find(item => item.id === stored.activeProjectId)?.data?.activeDevice; })(),
    storedPackage: (() => { const stored = JSON.parse(localStorage.getItem('mspm0g-pin-planner-v6') || '{}'); return stored.projects?.find(item => item.id === stored.activeProjectId)?.data?.devices?.MSPM0G3507?.activePackage; })()
  }))()`,
  defaults: `(() => {
    const change = element => element.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('[data-project-action="new"]').click();
    document.querySelector('#projectNameInput').value = '官方默认接口测试';
    document.querySelector('#projectForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const device = document.querySelector('#deviceSelect');
    const pkg = document.querySelector('#packageSelect');
    const packageCodes = {
      MSPM0G3519: ['RHB', 'RGZ', 'PT', 'PM', 'PN', 'PZ'],
      MSPM0G3507: ['RHB', 'RGZ', 'PT', 'PM']
    };
    const captures = [];
    const buttonForFunction = signal => [...document.querySelectorAll('#packageStage .pin-button')]
      .find(button => button.querySelector('.pin-function-label')?.textContent === signal);

    Object.entries(packageCodes).forEach(([deviceCode, codes]) => {
      device.value = deviceCode;
      change(device);
      codes.forEach(packageCode => {
        pkg.value = packageCode;
        change(pkg);
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

    device.value = 'MSPM0G3507';
    change(device);
    pkg.value = 'PM';
    change(pkg);
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

    device.value = 'MSPM0G3519';
    change(device);
    pkg.value = 'PM';
    change(pkg);
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
    const change = element => element.dispatchEvent(new Event('change', { bubbles: true }));
    const device = document.querySelector('#deviceSelect');
    const pkg = document.querySelector('#packageSelect');
    device.value = 'MSPM0G3507';
    change(device);
    pkg.value = 'PM';
    change(pkg);
    const g3507 = {
      assigned: Number(document.querySelector('#assignedCount').textContent),
      swdio: document.querySelector('[data-pin="12"]').getAttribute('aria-label'),
      swdioColor: document.querySelector('[data-pin="12"]').style.getPropertyValue('--pin-color'),
      nrst: document.querySelector('[data-pin="38"]').getAttribute('aria-label'),
      nrstColor: document.querySelector('[data-pin="38"]').style.getPropertyValue('--pin-color')
    };
    device.value = 'MSPM0G3519';
    change(device);
    pkg.value = 'PM';
    change(pkg);
    const g3519 = {
      assigned: Number(document.querySelector('#assignedCount').textContent),
      nrst: document.querySelector('[data-pin="38"]').getAttribute('aria-label'),
      nrstColor: document.querySelector('[data-pin="38"]').style.getPropertyValue('--pin-color')
    };
    return { g3507, g3519 };
  })()`,
  vqfn: `(() => {
    const device = document.querySelector('#deviceSelect');
    const pkg = document.querySelector('#packageSelect');
    const capture = (deviceCode, packageCode) => {
      device.value = deviceCode;
      device.dispatchEvent(new Event('change', { bubbles: true }));
      pkg.value = packageCode;
      pkg.dispatchEvent(new Event('change', { bubbles: true }));
      const pins = [...document.querySelectorAll('#packageStage button[aria-label^="Pin "]')];
      return {
        device: device.value,
        package: pkg.value,
        options: [...pkg.options].map(option => option.value),
        title: document.querySelector('#canvasTitle')?.textContent,
        chipPackage: document.querySelector('#chipPackage')?.textContent,
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
    const device = document.querySelector('#deviceSelect');
    device.value = 'MSPM0G3519';
    device.dispatchEvent(new Event('change', { bubbles: true }));
    const pkg = document.querySelector('#packageSelect');
    pkg.value = 'PZ';
    pkg.dispatchEvent(new Event('change', { bubbles: true }));
    const input = document.querySelector('#searchInput');
    input.value = 'PB1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const matches = [...document.querySelectorAll('#packageStage .pin-button:not(.dimmed)')]
      .map(pin => pin.querySelector('.pin-name')?.textContent);
    return { query: input.value, matches };
  })()`,
  'board-preset': `(() => {
    const change = element => element.dispatchEvent(new Event('change', { bubbles: true }));
    const input = element => element.dispatchEvent(new Event('input', { bubbles: true }));
    const createPreset = (name, presetId) => {
      document.querySelector('[data-project-action="new"]').click();
      document.querySelector('#projectNameInput').value = name;
      document.querySelector('#projectPresetSelect').value = presetId;
      document.querySelector('#projectForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    };
    const capture = () => ({
      device: document.querySelector('#deviceSelect').value,
      package: document.querySelector('#packageSelect').value,
      assigned: Number(document.querySelector('#assignedCount').textContent),
      boardMarkers: document.querySelectorAll('#packageStage .board-pin-marker').length,
      headerMarkers: document.querySelectorAll('#packageStage .board-header').length,
      occupiedMarkers: document.querySelectorAll('#packageStage .board-occupied').length,
      specialMarkers: document.querySelectorAll('#packageStage .board-special').length,
      unexposedMarkers: document.querySelectorAll('#packageStage .board-unexposed').length,
      fixedMarkers: document.querySelectorAll('#packageStage .board-fixed').length,
      subtitle: document.querySelector('#canvasSubtitle').textContent,
      storedPreset: (() => {
        const stored = JSON.parse(localStorage.getItem('mspm0g-pin-planner-v6') || '{}');
        const data = stored.projects?.find(item => item.id === stored.activeProjectId)?.data;
        return { id: data?.boardPresetId, enabled: data?.enabledBoardResources || [] };
      })(),
      hardwareSummary: document.querySelector('#boardHardwareSummary')?.textContent
    });

    createPreset('天猛星3507测试', 'tianmengxing-g3507-pm64');
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
    document.querySelector('[data-pin="60"]').click();
    sharedBoardInfo = document.querySelector('#boardInfoBox').textContent;
    sharedRouteLabels = [...document.querySelectorAll('#boardRouteList .board-route')].map(item => item.textContent);
    const sharedPinLabels = [...document.querySelectorAll('[data-pin="60"] .pin-board-label')].map(item => item.textContent);
    const boardHardwareText = boardHardwarePanel.textContent;
    toggleResource('spi-flash', false);
    const lcdOnlyAssigned = Number(document.querySelector('#assignedCount').textContent);
    const lcdToggle = document.querySelector('#boardResourceControls [data-resource="h8-lcd"] input');
    lcdToggle.checked = false;
    change(lcdToggle);

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

    const rectsOverlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const markerCheck = number => {
      const pin = document.querySelector('[data-pin="' + number + '"]');
      const markerElement = pin.querySelector('.board-pin-marker');
      const marker = markerElement.getBoundingClientRect();
      const pad = pin.querySelector('.pin-pad').getBoundingClientRect();
      const numberLabel = pin.querySelector('.pin-number').getBoundingClientRect();
      const nameLabel = pin.querySelector('.pin-name').getBoundingClientRect();
      const style = getComputedStyle(markerElement);
      return {
        text: markerElement.textContent,
        fontSize: parseFloat(style.fontSize),
        color: style.color,
        width: style.width,
        height: style.height,
        contained: marker.left >= pad.left && marker.right <= pad.right && marker.top >= pad.top && marker.bottom <= pad.bottom,
        overlapsText: rectsOverlap(marker, numberLabel) || rectsOverlap(marker, nameLabel)
      };
    };
    const markerChecks = {
      top: markerCheck(61),
      right: markerCheck(33),
      bottom: markerCheck(17),
      left: markerCheck(1)
    };

    const device = document.querySelector('#deviceSelect');
    device.value = 'MSPM0G3519';
    change(device);
    const mismatchSubtitle = document.querySelector('#canvasSubtitle').textContent;

    createPreset('天猛星3519测试', 'tianmengxing-g3519-pm64');
    const g3519 = capture();
    return {
      g3507, g3519, defaultSignals, ledMatches, lcdMatches, unexposedMatches, connectorMatches, changedCheck,
      restoredSignal, assignedAfterClear, markersAfterClear, assignedAfterRestore, boardInfo, openDrainCheck,
      printCalls, boardReport, markerChecks, mismatchSubtitle, sharedBoardInfo, sharedRouteLabels, sharedPinLabel, sharedPinLabels, boardHardwareText, lcdOnlyAssigned, fixedPinLabel, fixedBoardInfo
    };
  })()`,
  'seed-v4-workspace': `(() => {
    const project = {
      id: 'legacy-v4-project',
      name: 'v4 本地迁移',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      data: {
        version: 3,
        activeDevice: 'MSPM0G3507',
        theme: 'dark',
        layout: { leftWidth: 275, rightWidth: 355 },
        devices: {
          MSPM0G3507: {
            activePackage: 'PT',
            packages: { PT: { assignments: { '1': { function: 'UART0_TX', alias: 'v4本地数据', connector: 'J4-1', note: 'storage migration' } } } },
            views: {}
          }
        }
      }
    };
    localStorage.removeItem('mspm0g-pin-planner-v6');
    localStorage.setItem('mspm0g-pin-planner-v4', JSON.stringify({ version: 4, activeProjectId: project.id, projects: [project] }));
    setTimeout(() => location.reload(), 50);
    return true;
  })()`,
  'migration-v4': `(() => {
    const stored = JSON.parse(localStorage.getItem('mspm0g-pin-planner-v6') || '{}');
    const project = stored.projects?.find(item => item.id === stored.activeProjectId);
    return {
      workspaceVersion: stored.version,
      projectVersion: project?.data?.version,
      boardPresetId: project?.data?.boardPresetId,
      projectName: document.querySelector('#projectSelect option:checked')?.textContent,
      device: document.querySelector('#deviceSelect').value,
      package: document.querySelector('#packageSelect').value,
      pin: document.querySelector('[data-pin="1"]')?.getAttribute('aria-label')
    };
  })()`,
  layout: `(() => {
    const device = document.querySelector('#deviceSelect');
    device.value = 'MSPM0G3507';
    device.dispatchEvent(new Event('change', { bubbles: true }));
    const pkg = document.querySelector('#packageSelect');
    pkg.value = 'PM';
    pkg.dispatchEvent(new Event('change', { bubbles: true }));
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
    return {
      pin: button.getAttribute('aria-label'),
      gap: labelRect.top - padRect.bottom,
      contained: labelRect.bottom <= buttonRect.bottom + 0.5,
      buttonHeight: buttonRect.height,
      labelHeight: labelRect.height,
      trackHeight: button.offsetHeight,
      labelTrackLength: label.offsetWidth,
      transform: getComputedStyle(label).transform,
      turnDirection: Math.sign(new DOMMatrix(getComputedStyle(label).transform).b)
    };
  })()`,
  release: `(() => {
    const change = element => element.dispatchEvent(new Event('change', { bubbles: true }));
    const input = element => element.dispatchEvent(new Event('input', { bubbles: true }));
    const projectAction = action => document.querySelector('[data-project-action="' + action + '"]').click();
    const submitProjectName = name => {
      const field = document.querySelector('#projectNameInput');
      field.value = name;
      document.querySelector('#projectForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    };

    const projectSelect = document.querySelector('#projectSelect');
    const originalProjectId = projectSelect.value;
    projectAction('new');
    submitProjectName('发布验收');
    const testProjectId = projectSelect.value;

    const device = document.querySelector('#deviceSelect');
    device.value = 'MSPM0G3507';
    change(device);
    const pkg = document.querySelector('#packageSelect');
    pkg.value = 'RHB';
    change(pkg);

    projectAction('rename');
    submitProjectName('发布验收重命名');
    projectAction('duplicate');
    const duplicatedProject = projectSelect.options[projectSelect.selectedIndex].textContent;
    const projectCountAfterDuplicate = projectSelect.options.length;
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    projectAction('delete');
    window.confirm = originalConfirm;

    projectSelect.value = originalProjectId;
    change(projectSelect);
    const originalState = { device: device.value, package: pkg.value };
    projectSelect.value = testProjectId;
    change(projectSelect);

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
      projectCountAfterDuplicate,
      projectCountAfterDelete: projectSelect.options.length,
      duplicatedProject,
      selectedProject: projectSelect.options[projectSelect.selectedIndex].textContent,
      originalState,
      testState: { device: device.value, package: pkg.value },
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
    const alerts = [];
    const originalAlert = window.alert;
    window.alert = message => alerts.push(String(message));
    const payload = {
      schemaVersion: 4,
      kind: 'mspm0-pin-project',
      project: {
        id: 'fixture-v4-project',
        name: '新版导入测试',
        data: {
          version: 3,
          activeDevice: 'MSPM0G3507',
          theme: 'dark',
          layout: { leftWidth: 280, rightWidth: 360 },
          devices: {
            MSPM0G3507: {
              activePackage: 'PT',
              packages: { PT: { assignments: { '1': { function: 'UART0_TX', alias: '新版导入', connector: 'J2-1', note: 'v4 compatibility test' } } } },
              views: {}
            }
          }
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
      activeDevice: document.querySelector('#deviceSelect').value,
      activePackage: document.querySelector('#packageSelect').value,
      packages: [...document.querySelectorAll('#packageSelect option')].map(option => option.value),
      pin: document.querySelector('[aria-label^="Pin 1 PA0"]')?.getAttribute('aria-label'),
      alert: alerts[0],
      focusAfterImport,
      searchMatches,
      assigned: Number(document.querySelector('#assignedCount').textContent),
      editedPin: document.querySelector('[data-pin="1"]')?.getAttribute('aria-label')
    };
  })()`,
  'import-v3': `(async () => {
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
    return {
      activeProject: document.querySelector('#projectSelect option:checked')?.textContent,
      activeDevice: document.querySelector('#deviceSelect').value,
      activePackage: document.querySelector('#packageSelect').value,
      packages: [...document.querySelectorAll('#packageSelect option')].map(option => option.value),
      pin: document.querySelector('[aria-label^="Pin 1 PA0"]')?.getAttribute('aria-label'),
      assigned: Number(document.querySelector('#assignedCount').textContent),
      alert: alerts[0]
    };
  })()`,
  print: `(() => {
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
    if (!result.packages.includes('RHB') || !result.packages.includes('RGZ')) throw new Error('MSPM0G3519 VQFN package list is incomplete');
    if (result.hasThemeToggle || result.colorScheme !== 'dark') throw new Error('Night-only interface is not active');
    if (result.projectActions !== 5 || result.exportActions !== 7 || !result.hasAbout || !result.hasCheck) throw new Error('Candidate feature controls are incomplete');
  }
  if (mode === 'write' && (result.activeDevice !== 'MSPM0G3507' || result.activePackage !== 'RHB' || !result.packages.includes('RGZ') || !result.saved)) {
    throw new Error('MSPM0G3507 VQFN state was not saved');
  }
  if (mode === 'restore' && (result.activeDevice !== 'MSPM0G3507' || result.activePackage !== 'RHB' || !result.saved)) {
    throw new Error('Desktop state was not restored');
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
      if (item?.device !== device || item?.package !== packageCode || item?.pinCount !== pinCount || !item?.options.includes('RHB') || !item?.options.includes('RGZ') || !item?.title?.includes(`${packageCode}-${pinCount} VQFN`) || item?.chipPackage !== `${packageCode}-${pinCount} VQFN` || !item?.firstPin?.includes(firstPin) || !item?.lastPin?.includes(lastPin)) {
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
        && marker.width === '13px'
        && marker.height === '13px'
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
      || !result.sharedBoardInfo.includes('H8 LCD/OLED 接口')
      || !result.sharedBoardInfo.includes('这不是引脚冲突')
      || JSON.stringify(result.sharedPinLabels) !== JSON.stringify(['FLASH · MOSI', 'LCD · SDA'])
      || !result.boardHardwareText.includes('SPI1 共享总线')
      || !result.boardHardwareText.includes('PB6 / Pin 58 / W_CS')
      || !result.boardHardwareText.includes('PB14 / Pin 2 / LCD_CS')
      || result.lcdOnlyAssigned !== 14
      || !result.openDrainCheck.includes('仅支持开漏输出')
      || result.printCalls !== 1
      || !result.boardReport.includes('立创·天猛星 PM-64 最小系统板')
      || !result.boardReport.includes('U21-3')
      || !result.boardReport.includes('特殊电气条件')
      || !result.boardReport.includes('板载 SPI Flash[未启用]=MOSI')
      || !result.boardReport.includes('H8 LCD/OLED 接口[未启用]=SDA')
      || !markersReadable
      || !result.mismatchSubtitle.includes('模板对应 MSPM0G3507 PM-64')
    ) throw new Error(`Tianmengxing workflow failed: ${JSON.stringify(result)}`);
  }
  if (mode === 'migration-v4' && (
    result.workspaceVersion !== 6
    || result.projectVersion !== 5
    || result.boardPresetId !== ''
    || result.projectName !== 'v4 本地迁移'
    || result.device !== 'MSPM0G3507'
    || result.package !== 'PT'
    || !result.pin?.includes('UART0_TX')
    || !result.pin?.includes('v4本地数据')
  )) throw new Error(`Version 4 workspace migration failed: ${JSON.stringify(result)}`);
  if (mode === 'layout' && (!result.pin.includes('TIMG6_C0') || !result.pin.includes('TMC2209_1_STEP') || result.gap < 3 || !result.contained || result.trackHeight !== 210 || result.labelTrackLength !== 132 || result.turnDirection !== -1 || result.buttonHeight / result.labelHeight < 1.5)) {
    throw new Error(`Bottom pin label layout failed: ${JSON.stringify(result)}`);
  }
  if (mode === 'release' && (
    result.projectCountAfterDuplicate !== 3
    || result.projectCountAfterDelete !== 2
    || !result.duplicatedProject.includes('副本')
    || result.selectedProject !== '发布验收重命名'
    || result.originalState.device !== 'MSPM0G3519'
    || result.originalState.package !== 'PZ'
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
  if (mode === 'import-v4' && (result.activeProject !== '新版导入测试' || result.activeDevice !== 'MSPM0G3507' || result.activePackage !== 'PT' || !result.packages.includes('RHB') || !result.packages.includes('RGZ') || !result.pin?.includes('UART0_TX') || result.assigned !== 1 || result.focusAfterImport !== 'searchInput' || result.searchMatches.length !== 1 || result.searchMatches[0] !== 'PA0' || !result.editedPin?.includes('导入后输入'))) {
    throw new Error('Version 4 project import failed');
  }
  if (mode === 'import-v3' && (result.activeProject !== 'import-v3' || result.activeDevice !== 'MSPM0G3507' || result.activePackage !== 'PT' || !result.packages.includes('RHB') || !result.packages.includes('RGZ') || !result.pin?.includes('UART0_TX') || result.assigned !== 1 || !result.pin?.includes('旧版导入'))) {
    throw new Error('Version 3 project import failed');
  }
  if (mode === 'print' && (result.printCalls !== 1 || !result.report.includes('MSPM0 引脚规划报告') || !result.report.includes('非 TI 官方工具'))) {
    throw new Error('Print report generation failed');
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
