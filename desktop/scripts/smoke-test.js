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
    bridge: typeof window.mspm0Desktop?.saveFile === 'function'
  }))()`,
  write: `(() => {
    const device = document.querySelector('#deviceSelect');
    device.value = 'MSPM0G3507';
    device.dispatchEvent(new Event('change', { bubbles: true }));
    const pkg = document.querySelector('#packageSelect');
    pkg.value = 'PM';
    pkg.dispatchEvent(new Event('change', { bubbles: true }));
    const stored = JSON.parse(localStorage.getItem('mspm0g-pin-planner-v3') || '{}');
    return { activeDevice: document.querySelector('#deviceSelect').value, activePackage: document.querySelector('#packageSelect').value, saved: Boolean(stored.version), storedDevice: stored.activeDevice, storedPackage: stored.devices?.MSPM0G3507?.activePackage };
  })()`,
  restore: `(() => ({
    activeDevice: document.querySelector('#deviceSelect').value,
    activePackage: document.querySelector('#packageSelect').value,
    saved: Boolean(localStorage.getItem('mspm0g-pin-planner-v3')),
    storedDevice: JSON.parse(localStorage.getItem('mspm0g-pin-planner-v3') || '{}').activeDevice,
    storedPackage: JSON.parse(localStorage.getItem('mspm0g-pin-planner-v3') || '{}').devices?.MSPM0G3507?.activePackage
  }))()`,
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
  }
  if (mode === 'restore' && (result.activeDevice !== 'MSPM0G3507' || result.activePackage !== 'PM' || !result.saved)) {
    throw new Error('Desktop state was not restored');
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
