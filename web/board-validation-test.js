'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateBoardPresets } = require('./board-validation');

const devices = {
  MSPM0G3519: JSON.parse(fs.readFileSync(path.join(__dirname, 'pin-data.json'), 'utf8')),
  MSPM0G3507: JSON.parse(fs.readFileSync(path.join(__dirname, 'pin-data-3507.json'), 'utf8'))
};
const realBoardData = JSON.parse(fs.readFileSync(path.join(__dirname, 'board-presets.json'), 'utf8'));

function cloneRealBoardData() {
  return JSON.parse(JSON.stringify(realBoardData));
}

function addSecondBoard(data) {
  const board = JSON.parse(JSON.stringify(data.boards['tianmengxing-pm64']));
  board.id = 'validation-second-pm64';
  board.name = '校验用第二块 PM-64 板卡';
  board.compatibleDevices = ['MSPM0G3507'];
  data.boards[board.id] = board;
  data.presets['validation-second-g3507-pm64'] = {
    id: 'validation-second-g3507-pm64',
    name: '校验用第二板卡 · MSPM0G3507 · PM-64',
    boardId: board.id,
    device: 'MSPM0G3507',
    package: 'PM'
  };
  return data;
}

function expectValidationError(data, expectedMessage) {
  assert.throws(
    () => validateBoardPresets(data, devices),
    error => {
      assert.ok(Array.isArray(error.validationErrors), 'validation error must expose validationErrors');
      assert.ok(
        error.validationErrors.some(message => message.includes(expectedMessage)),
        `expected validation error containing ${JSON.stringify(expectedMessage)}, found:\n${error.validationErrors.join('\n')}`
      );
      return true;
    }
  );
}

function run(name, action) {
  action();
  console.log(`OK | ${name}`);
}

run('current board data passes', () => {
  const summary = validateBoardPresets(cloneRealBoardData(), devices);
  assert.equal(summary.boards, 1);
  assert.equal(summary.presets, 2);
  assert.equal(summary.headerGpios, 56);
});

run('a valid second board and preset pass', () => {
  const summary = validateBoardPresets(addSecondBoard(cloneRealBoardData()), devices);
  assert.equal(summary.boards, 2);
  assert.equal(summary.presets, 3);
  assert.equal(summary.headerGpios, 56);
});

run('an invalid resource pin reference fails', () => {
  const data = cloneRealBoardData();
  const resource = data.boards['tianmengxing-pm64'].resources.find(item => item.id === 'spi-flash');
  resource.pins['999'] = 'INVALID';
  resource.assignments['999'] = 'SPI1_SCK';
  expectValidationError(data, 'resource spi-flash Pin 999 does not reference a board pin');
});

run('an invalid shared bus resource reference fails', () => {
  const data = cloneRealBoardData();
  data.boards['tianmengxing-pm64'].sharedBuses[0].resources[1] = 'missing-resource';
  expectValidationError(data, 'resource missing-resource does not exist');
});

run('an incompatible preset fails', () => {
  const data = addSecondBoard(cloneRealBoardData());
  data.presets['validation-second-g3507-pm64'].device = 'MSPM0G3519';
  expectValidationError(data, 'device MSPM0G3519 is not compatible with board validation-second-pm64');
});
