'use strict';

const fs = require('node:fs');
const path = require('node:path');

const desktopRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(desktopRoot, '..');
const source = path.join(projectRoot, 'outputs', 'mspm0g3519-pin-planner.html');
const destination = path.join(desktopRoot, 'app', 'index.html');
const legalSource = path.join(projectRoot, 'legal');
const legalDestination = path.join(desktopRoot, 'app', 'legal');

if (!fs.existsSync(source)) throw new Error(`Missing web build: ${source}`);
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(source, destination);
fs.rmSync(legalDestination, { recursive: true, force: true });
if (fs.existsSync(legalSource)) fs.cpSync(legalSource, legalDestination, { recursive: true });
console.log(destination);
