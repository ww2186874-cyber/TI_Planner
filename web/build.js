const fs = require('node:fs');
const path = require('node:path');
const { validateDevices } = require('./data-validation');

const root = path.resolve(__dirname, '..');
const templatePath = path.join(__dirname, 'template.html');
const dataPaths = {
  MSPM0G3519: path.join(__dirname, 'pin-data.json'),
  MSPM0G3507: path.join(__dirname, 'pin-data-3507.json')
};
const appPath = path.join(__dirname, 'app.js');
const outputPath = path.join(root, 'outputs', 'mspm0g3519-pin-planner.html');
const packageJsonPath = path.join(root, 'desktop', 'package.json');

const template = fs.readFileSync(templatePath, 'utf8');
const devices = Object.fromEntries(Object.entries(dataPaths).map(([device, dataPath]) => [device, JSON.parse(fs.readFileSync(dataPath, 'utf8'))]));
const app = fs.readFileSync(appPath, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const requiredPackages = {
  MSPM0G3519: { RHB: 32, RGZ: 48, PT: 48, PM: 64, PN: 80, PZ: 100 },
  MSPM0G3507: { RHB: 32, RGZ: 48, PT: 48, PM: 64 }
};

for (const [device, packages] of Object.entries(requiredPackages)) {
  if (devices[device]?.device !== device) throw new Error(`${device} data identity mismatch`);
  for (const [code, pinCount] of Object.entries(packages)) {
    if (devices[device].packages?.[code]?.pins?.length !== pinCount) {
      throw new Error(`${device} ${code} expected ${pinCount} pins`);
    }
  }
}
validateDevices(devices);

const scriptStart = template.lastIndexOf('<script>');
const scriptEnd = template.indexOf('</script>', scriptStart);
if (scriptStart < 0 || scriptEnd < 0) throw new Error('Inline script block was not found');
const shell = `${template.slice(0, scriptStart)}<script>\n${app}\n${template.slice(scriptEnd)}`;
const appMeta = { version: packageJson.version, author: packageJson.author, productName: packageJson.build.productName };
const html = shell
  .replace('__DEVICE_DATA__', JSON.stringify(devices))
  .replace('__APP_META__', JSON.stringify(appMeta));
if (html.includes('__DEVICE_DATA__') || html.includes('__APP_META__')) throw new Error('Build placeholder was not replaced');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, 'utf8');
console.log(outputPath);
