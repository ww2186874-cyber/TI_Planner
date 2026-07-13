'use strict';

const fs = require('node:fs');
const path = require('node:path');

const desktopRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(desktopRoot, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8'));
const folderName = `MSPM0-Pin-Planner-${packageJson.version}-Folder`;
const source = path.join(desktopRoot, 'dist', 'win-unpacked');
const destination = path.join(projectRoot, 'outputs', folderName);

if (!fs.existsSync(source)) throw new Error(`Missing unpacked application: ${source}`);
fs.rmSync(destination, { recursive: true, force: true });
fs.cpSync(source, destination, { recursive: true });
console.log(destination);
