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
    projectActions: document.querySelectorAll('[data-project-action]').length,
    exportActions: document.querySelectorAll('[data-export]').length,
    hasAbout: Boolean(document.querySelector('#aboutBtn')),
    hasCheck: Boolean(document.querySelector('#checkBtn'))
  }))()`,
  write: `(() => {
    const device = document.querySelector('#deviceSelect');
    device.value = 'MSPM0G3507';
    device.dispatchEvent(new Event('change', { bubbles: true }));
    const pkg = document.querySelector('#packageSelect');
    const packages = [...pkg.options].map(option => option.value);
    pkg.value = 'RHB';
    pkg.dispatchEvent(new Event('change', { bubbles: true }));
    const stored = JSON.parse(localStorage.getItem('mspm0g-pin-planner-v4') || '{}');
    const project = stored.projects?.find(item => item.id === stored.activeProjectId);
    return { activeDevice: document.querySelector('#deviceSelect').value, activePackage: document.querySelector('#packageSelect').value, packages, saved: stored.version === 4, storedDevice: project?.data?.activeDevice, storedPackage: project?.data?.devices?.MSPM0G3507?.activePackage };
  })()`,
  restore: `(() => ({
    activeDevice: document.querySelector('#deviceSelect').value,
    activePackage: document.querySelector('#packageSelect').value,
    saved: JSON.parse(localStorage.getItem('mspm0g-pin-planner-v4') || '{}').version === 4,
    storedDevice: (() => { const stored = JSON.parse(localStorage.getItem('mspm0g-pin-planner-v4') || '{}'); return stored.projects?.find(item => item.id === stored.activeProjectId)?.data?.activeDevice; })(),
    storedPackage: (() => { const stored = JSON.parse(localStorage.getItem('mspm0g-pin-planner-v4') || '{}'); return stored.projects?.find(item => item.id === stored.activeProjectId)?.data?.devices?.MSPM0G3507?.activePackage; })()
  }))()`,
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
    return {
      activeProject: document.querySelector('#projectSelect option:checked')?.textContent,
      activeDevice: document.querySelector('#deviceSelect').value,
      activePackage: document.querySelector('#packageSelect').value,
      packages: [...document.querySelectorAll('#packageSelect option')].map(option => option.value),
      pin: document.querySelector('[aria-label^="Pin 1 PA0"]')?.getAttribute('aria-label'),
      alert: alerts[0]
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
    if (!result.bridge) throw new Error('Desktop save bridge is unavailable');
    if (!result.devices.includes('MSPM0G3507') || !result.devices.includes('MSPM0G3519')) throw new Error('Device list is incomplete');
    if (!result.packages.includes('RHB') || !result.packages.includes('RGZ')) throw new Error('MSPM0G3519 VQFN package list is incomplete');
    if (result.projectActions !== 4 || result.exportActions !== 7 || !result.hasAbout || !result.hasCheck) throw new Error('Candidate feature controls are incomplete');
  }
  if (mode === 'write' && (result.activeDevice !== 'MSPM0G3507' || result.activePackage !== 'RHB' || !result.packages.includes('RGZ') || !result.saved)) {
    throw new Error('MSPM0G3507 VQFN state was not saved');
  }
  if (mode === 'restore' && (result.activeDevice !== 'MSPM0G3507' || result.activePackage !== 'RHB' || !result.saved)) {
    throw new Error('Desktop state was not restored');
  }
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
  if (mode === 'import-v4' && (result.activeProject !== '新版导入测试' || result.activeDevice !== 'MSPM0G3507' || result.activePackage !== 'PT' || !result.packages.includes('RHB') || !result.packages.includes('RGZ') || !result.pin?.includes('UART0_TX') || !result.pin?.includes('新版导入'))) {
    throw new Error('Version 4 project import failed');
  }
  if (mode === 'import-v3' && (result.activeProject !== 'import-v3' || result.activeDevice !== 'MSPM0G3507' || result.activePackage !== 'PT' || !result.packages.includes('RHB') || !result.packages.includes('RGZ') || !result.pin?.includes('UART0_TX') || !result.pin?.includes('旧版导入'))) {
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
