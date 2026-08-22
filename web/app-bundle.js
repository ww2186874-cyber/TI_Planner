'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SOURCE_FILES = Object.freeze([
  'app/config.js',
  'app/state.js',
  'app/rules.js',
  'app/render.js',
  'app/io.js',
  'app/events.js',
  'app/test-api.js',
  'app.js'
]);

function indentSource(source) {
  return source
    .replace(/\r\n/g, '\n')
    .trimEnd()
    .split('\n')
    .map(line => line ? `  ${line}` : '')
    .join('\n');
}

function buildApplicationSource(root = __dirname) {
  const appDirectory = path.join(root, 'app');
  const listedFragments = SOURCE_FILES
    .filter(relativePath => relativePath.startsWith('app/'))
    .map(relativePath => path.basename(relativePath))
    .sort();
  const actualFragments = fs.readdirSync(appDirectory)
    .filter(name => name.endsWith('.js'))
    .sort();
  if (JSON.stringify(listedFragments) !== JSON.stringify(actualFragments)) {
    throw new Error(`Application source list mismatch: expected ${actualFragments.join(', ')}, found ${listedFragments.join(', ')}`);
  }
  const sources = SOURCE_FILES.map(relativePath => {
    const absolutePath = path.join(root, ...relativePath.split('/'));
    return indentSource(fs.readFileSync(absolutePath, 'utf8'));
  });
  return `(() => {\n  'use strict';\n\n${sources.join('\n\n')}\n})();\n`;
}

module.exports = { SOURCE_FILES, buildApplicationSource };
