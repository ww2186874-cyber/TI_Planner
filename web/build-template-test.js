'use strict';

const assert = require('node:assert/strict');
const vm = require('node:vm');
const {
  APP_BUNDLE_MARKER,
  DATA_PLACEHOLDERS,
  buildHtml,
  loadBuildInputs,
  safeInlineJson
} = require('./build');

function run(name, action) {
  action();
  console.log(`OK | ${name}`);
}

function extractOnlyScript(html) {
  const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(matches.length, 1, 'offline HTML must contain exactly one application script');
  return matches[0][1];
}

run('real template builds one parseable offline application script', () => {
  const inputs = loadBuildInputs();
  const html = buildHtml(inputs);
  assert.equal(html.includes(APP_BUNDLE_MARKER), false);
  DATA_PLACEHOLDERS.forEach(placeholder => assert.equal(html.includes(placeholder), false, `${placeholder} must be replaced`));
  assert.ok(html.includes(inputs.appMeta.version));
  assert.ok(html.includes('MSPM0G3519'));
  assert.ok(html.includes('MSPM0G3507'));
  const source = extractOnlyScript(html);
  new vm.Script(source, { filename: 'offline-app.js' });
});

run('project target controls exist only inside the creation dialog', () => {
  const { template } = loadBuildInputs();
  assert.equal(template.includes('id="deviceSelect"'), false);
  assert.equal(template.includes('id="packageSelect"'), false);
  assert.ok(template.includes('id="projectTemplateSelect"'));
  assert.ok(template.includes('id="projectDeviceSelect"'));
  assert.ok(template.includes('id="projectPackageSelect"'));
  assert.ok(template.includes('id="projectCreationFields"'));
  assert.equal(template.includes('基础模板'), false);
  assert.ok(template.includes('>模板</label>'));
  assert.ok(template.includes('清空引脚安排'));
  assert.ok(template.includes('>引脚 CSV</button>'));
});

run('inline JSON escapes script-closing and special line characters', () => {
  const serialized = safeInlineJson({ text: '</script><script>alert(1)</script>&\u2028\u2029' });
  assert.equal(serialized.includes('</script>'), false);
  assert.ok(serialized.includes('\\u003c/script\\u003e'));
  assert.ok(serialized.includes('\\u0026'));
  assert.ok(serialized.includes('\\u2028'));
  assert.ok(serialized.includes('\\u2029'));
  assert.deepEqual(JSON.parse(serialized), { text: '</script><script>alert(1)</script>&\u2028\u2029' });
});

run('application source cannot terminate its own script element', () => {
  const appSource = [
    'const DEVICE_DATA = __DEVICE_DATA__;',
    'const DEVICE_CONFIG = __DEVICE_CONFIG__;',
    'const BOARD_PRESETS = __BOARD_PRESETS__;',
    'const APP_META = __APP_META__;',
    'const sample = "</script><script>bad()</script>";'
  ].join('\n');
  const html = buildHtml({
    template: `<main>test</main>${APP_BUNDLE_MARKER}`,
    appSource,
    devices: { text: '</script>' },
    deviceConfig: {},
    boardPresets: {},
    appMeta: { version: 'test' }
  });
  assert.equal((html.match(/<\/script>/g) || []).length, 1);
  const source = extractOnlyScript(html);
  new vm.Script(source, { filename: 'hostile-inline-app.js' });
});

run('data may contain placeholder-like text without confusing the builder', () => {
  const values = Object.fromEntries(DATA_PLACEHOLDERS.map(placeholder => [placeholder, `kept ${placeholder}`]));
  const appSource = [
    'const DEVICE_DATA = __DEVICE_DATA__;',
    'const DEVICE_CONFIG = __DEVICE_CONFIG__;',
    'const BOARD_PRESETS = __BOARD_PRESETS__;',
    'const APP_META = __APP_META__;'
  ].join('\n');
  const html = buildHtml({
    template: APP_BUNDLE_MARKER,
    appSource,
    devices: values,
    deviceConfig: values,
    boardPresets: values,
    appMeta: values
  });
  DATA_PLACEHOLDERS.forEach(placeholder => assert.ok(html.includes(`kept ${placeholder}`)));
  new vm.Script(extractOnlyScript(html), { filename: 'placeholder-data-app.js' });
});

run('template marker must be unique', () => {
  const base = {
    appSource: 'const A=__DEVICE_DATA__;const B=__DEVICE_CONFIG__;const C=__BOARD_PRESETS__;const D=__APP_META__;',
    devices: {},
    deviceConfig: {},
    boardPresets: {},
    appMeta: {}
  };
  assert.throws(() => buildHtml({ ...base, template: '<main></main>' }), /exactly one app bundle marker/);
  assert.throws(() => buildHtml({ ...base, template: APP_BUNDLE_MARKER + APP_BUNDLE_MARKER }), /exactly one app bundle marker/);
});

run('every data placeholder must be unique', () => {
  assert.throws(() => buildHtml({
    template: APP_BUNDLE_MARKER,
    appSource: 'const A=__DEVICE_DATA__;const B=__DEVICE_CONFIG__;const C=__BOARD_PRESETS__;',
    devices: {},
    deviceConfig: {},
    boardPresets: {},
    appMeta: {}
  }), /exactly one __APP_META__ placeholder/);
});
