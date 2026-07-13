'use strict';

const fs = require('node:fs');
const path = require('node:path');

const desktopRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(desktopRoot, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8'));
const fileName = `MSPM0-Pin-Planner-${packageJson.version}-Portable.exe`;
const source = path.join(desktopRoot, 'dist', fileName);
const destination = path.join(projectRoot, 'outputs', fileName);

if (!fs.existsSync(source)) throw new Error(`Missing portable executable: ${source}`);
fs.copyFileSync(source, destination);
console.log(destination);
