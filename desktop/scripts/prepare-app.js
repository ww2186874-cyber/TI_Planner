'use strict';

const fs = require('node:fs');
const path = require('node:path');

const desktopRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(desktopRoot, '..');
const source = path.join(projectRoot, 'outputs', 'mspm0g3519-pin-planner.html');
const destination = path.join(desktopRoot, 'app', 'index.html');

if (!fs.existsSync(source)) throw new Error(`Missing web build: ${source}`);
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(source, destination);
console.log(destination);
