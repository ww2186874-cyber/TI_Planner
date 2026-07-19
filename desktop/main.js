'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, dialog, ipcMain, net, protocol } = require('electron');

const APP_ORIGIN = 'app://mspm0';
const INDEX_PATH = path.join(__dirname, 'app', 'index.html');
const MAX_EXPORT_SIZE = 20 * 1024 * 1024;
const TEST_HEADLESS = process.env.MSPM0_TEST_HEADLESS === '1';

app.setName('MSPM0 引脚规划器');
if (process.env.MSPM0_TEST_USER_DATA_DIR) {
  app.setPath('userData', path.resolve(process.env.MSPM0_TEST_USER_DATA_DIR));
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: false,
      stream: true
    }
  }
]);

function isTrustedSender(event) {
  return event.senderFrame?.url?.startsWith(`${APP_ORIGIN}/`) === true;
}

function filtersFor(name) {
  const extension = path.extname(name).slice(1).toLowerCase();
  if (extension === 'json') return [{ name: 'JSON 文件', extensions: ['json'] }];
  if (extension === 'csv') return [{ name: 'CSV 文件', extensions: ['csv'] }];
  return [{ name: '所有文件', extensions: ['*'] }];
}

async function saveExport(event, payload) {
  if (!isTrustedSender(event)) throw new Error('不允许来自外部页面的文件保存请求。');
  const name = path.basename(String(payload?.name || 'export.txt')).slice(0, 160);
  const content = String(payload?.content ?? '');
  if (!name || content.length > MAX_EXPORT_SIZE) throw new Error('导出内容无效或过大。');

  const owner = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(owner, {
    title: '保存文件',
    defaultPath: path.join(app.getPath('documents'), name),
    filters: filtersFor(name)
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.promises.writeFile(result.filePath, content, 'utf8');
  return { canceled: false };
}

function focusOwnerWindow(event) {
  if (!isTrustedSender(event)) throw new Error('不允许来自外部页面的窗口操作请求。');
  const owner = BrowserWindow.fromWebContents(event.sender);
  if (!owner || owner.isDestroyed()) return false;
  if (owner.isMinimized()) owner.restore();
  owner.show();
  owner.focus();
  owner.webContents.focus();
  return true;
}

function createWindow() {
  const window = new BrowserWindow({
    title: 'MSPM0 引脚规划器',
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#eef4f6',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (!targetUrl.startsWith(`${APP_ORIGIN}/`)) event.preventDefault();
  });
  window.webContents.on('did-fail-load', (_event, code, description) => {
    console.error(`Page load failed (${code}): ${description}`);
  });
  window.once('ready-to-show', () => {
    if (!TEST_HEADLESS) window.show();
  });
  window.loadURL(`${APP_ORIGIN}/index.html`);
}

app.setAppUserModelId('com.yingdian2514.mspm0pinplanner');

app.whenReady().then(async () => {
  protocol.handle('app', request => {
    const url = new URL(request.url);
    if (url.hostname !== 'mspm0' || !['/', '/index.html'].includes(url.pathname)) {
      return new Response('Not found', { status: 404 });
    }
    return net.fetch(pathToFileURL(INDEX_PATH).toString());
  });
  ipcMain.handle('mspm0:save-file', saveExport);
  ipcMain.handle('mspm0:focus-window', focusOwnerWindow);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', event => event.preventDefault());
});

app.on('window-all-closed', () => app.quit());
