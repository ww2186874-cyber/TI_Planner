'use strict';

const BOARD_SCHEMA_VERSION = 2;
const PIN_STATUSES = new Set(['header', 'occupied', 'special', 'unexposed', 'fixed']);
const RESOURCE_KINDS = new Set(['onboard', 'optional']);
const REQUIRED_SOURCE_FIELDS = ['document', 'revision', 'pages', 'retrieved'];

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function validateBoardSchema(data, devices) {
  const errors = [];
  const assert = (condition, message) => { if (!condition) errors.push(message); };
  const boards = isRecord(data?.boards) ? data.boards : {};
  const presets = isRecord(data?.presets) ? data.presets : {};
  const deviceCatalog = isRecord(devices) ? devices : {};
  const targets = new Map();
  const summary = {
    boards: Object.keys(boards).length,
    presets: Object.keys(presets).length,
    pins: 0,
    resources: 0,
    sharedBuses: 0
  };

  assert(isRecord(data), 'board presets: root must be an object');
  assert(data?.version === BOARD_SCHEMA_VERSION, `board presets: version must be ${BOARD_SCHEMA_VERSION}`);
  assert(isRecord(data?.boards), 'board presets: boards must be an object');
  assert(isRecord(data?.presets), 'board presets: presets must be an object');
  assert(isRecord(devices), 'board presets: devices must be an object');

  const addTarget = (boardId, board, deviceName, packageCode) => {
    if (!isNonEmptyString(deviceName) || !isNonEmptyString(packageCode)) return;
    const device = deviceCatalog[deviceName];
    assert(Boolean(device), `${boardId}: compatible device ${deviceName} is missing`);
    if (!device) return;
    const pkg = device.packages?.[packageCode];
    assert(Boolean(pkg) && Array.isArray(pkg?.pins), `${boardId}: package ${deviceName} ${packageCode} is missing`);
    if (!pkg || !Array.isArray(pkg.pins)) return;
    targets.set(`${boardId}\u0000${deviceName}\u0000${packageCode}`, { boardId, board, deviceName, packageCode, pkg });
  };

  for (const [boardId, board] of Object.entries(boards)) {
    assert(isRecord(board), `${boardId}: board must be an object`);
    if (!isRecord(board)) continue;

    assert(board.id === boardId, `${boardId}: board identity mismatch`);
    assert(isNonEmptyString(board.name), `${boardId}: name is required`);
    assert(isNonEmptyString(board.package), `${boardId}: package is required`);
    assert(Array.isArray(board.compatibleDevices) && board.compatibleDevices.length > 0, `${boardId}: compatibleDevices must contain at least one device`);
    const compatibleDevices = Array.isArray(board.compatibleDevices) ? board.compatibleDevices : [];
    const validCompatibleDevices = compatibleDevices.filter(isNonEmptyString);
    compatibleDevices.forEach((deviceName, index) => {
      assert(isNonEmptyString(deviceName), `${boardId}: compatibleDevices[${index}] must be a non-empty string`);
    });
    assert(new Set(validCompatibleDevices).size === validCompatibleDevices.length, `${boardId}: compatibleDevices contains duplicates`);

    assert(isRecord(board.source), `${boardId}: source must be an object`);
    REQUIRED_SOURCE_FIELDS.forEach(field => {
      assert(isNonEmptyString(board.source?.[field]), `${boardId}: source.${field} is required`);
    });

    const pins = isRecord(board.pins) ? board.pins : {};
    assert(isRecord(board.pins), `${boardId}: pins must be an object`);
    assert(Object.keys(pins).length > 0, `${boardId}: pins must contain at least one pin`);
    summary.pins += Object.keys(pins).length;
    for (const [number, pin] of Object.entries(pins)) {
      assert(/^[1-9]\d*$/.test(number), `${boardId} Pin ${number}: physical pin number is invalid`);
      assert(isRecord(pin), `${boardId} Pin ${number}: record must be an object`);
      if (!isRecord(pin)) continue;
      assert(isNonEmptyString(pin.name), `${boardId} Pin ${number}: name is required`);
      assert(PIN_STATUSES.has(pin.status), `${boardId} Pin ${number}: invalid board status`);
      if (pin.status === 'header') assert(isNonEmptyString(pin.header), `${boardId} Pin ${number}: header status requires a header terminal`);
      if (pin.status === 'unexposed') assert(!isNonEmptyString(pin.header), `${boardId} Pin ${number}: unexposed pin cannot have a header terminal`);
      for (const field of ['header', 'label', 'detail']) {
        if (pin[field] !== undefined) assert(typeof pin[field] === 'string', `${boardId} Pin ${number}: ${field} must be a string`);
      }
      if (pin.aliases !== undefined) {
        assert(Array.isArray(pin.aliases), `${boardId} Pin ${number}: aliases must be an array`);
        if (Array.isArray(pin.aliases)) {
          pin.aliases.forEach((alias, index) => assert(isNonEmptyString(alias), `${boardId} Pin ${number}: aliases[${index}] must be a non-empty string`));
          assert(new Set(pin.aliases).size === pin.aliases.length, `${boardId} Pin ${number}: aliases contains duplicates`);
        }
      }
    }

    const fixedDefaults = board.fixedDefaults === undefined ? {} : board.fixedDefaults;
    assert(isRecord(fixedDefaults), `${boardId}: fixedDefaults must be an object`);
    if (isRecord(fixedDefaults)) {
      for (const [number, signal] of Object.entries(fixedDefaults)) {
        assert(hasOwn(pins, number), `${boardId}: fixed default Pin ${number} does not reference a board pin`);
        assert(isNonEmptyString(signal), `${boardId}: fixed default Pin ${number} signal is required`);
      }
    }

    const fixedHardware = board.fixedHardware === undefined ? [] : board.fixedHardware;
    assert(Array.isArray(fixedHardware), `${boardId}: fixedHardware must be an array`);
    const fixedHardwareIds = new Set();
    if (Array.isArray(fixedHardware)) {
      fixedHardware.forEach((item, index) => {
        const label = `${boardId}: fixedHardware[${index}]`;
        assert(isRecord(item), `${label} must be an object`);
        if (!isRecord(item)) return;
        assert(isNonEmptyString(item.id), `${label}.id is required`);
        if (isNonEmptyString(item.id)) {
          assert(!fixedHardwareIds.has(item.id), `${boardId}: duplicate fixed hardware id ${item.id}`);
          fixedHardwareIds.add(item.id);
        }
        assert(isNonEmptyString(item.name), `${label}.name is required`);
        assert(Array.isArray(item.pins) && item.pins.length > 0, `${label}.pins must contain at least one pin`);
        if (item.detail !== undefined) assert(typeof item.detail === 'string', `${label}.detail must be a string`);
        if (Array.isArray(item.pins)) {
          item.pins.forEach(number => {
            assert(isNonEmptyString(number), `${label}: pin reference must be a non-empty string`);
            assert(hasOwn(pins, number), `${label}: Pin ${number} does not reference a board pin`);
          });
          assert(new Set(item.pins).size === item.pins.length, `${label}.pins contains duplicates`);
        }
      });
    }

    const resources = board.resources === undefined ? [] : board.resources;
    assert(Array.isArray(resources), `${boardId}: resources must be an array`);
    const resourceIds = new Set();
    const resourceById = new Map();
    if (Array.isArray(resources)) {
      summary.resources += resources.length;
      resources.forEach((resource, index) => {
        const label = `${boardId}: resource[${index}]`;
        assert(isRecord(resource), `${label} must be an object`);
        if (!isRecord(resource)) return;
        assert(isNonEmptyString(resource.id), `${label}.id is required`);
        if (isNonEmptyString(resource.id)) {
          assert(!resourceIds.has(resource.id), `${boardId}: duplicate resource id ${resource.id}`);
          resourceIds.add(resource.id);
          if (!resourceById.has(resource.id)) resourceById.set(resource.id, resource);
        }
        assert(isNonEmptyString(resource.name), `${label}.name is required`);
        assert(RESOURCE_KINDS.has(resource.kind), `${label}.kind must be onboard or optional`);
        assert(typeof resource.defaultEnabled === 'boolean', `${label}.defaultEnabled must be a boolean`);
        if (resource.recommended !== undefined) assert(typeof resource.recommended === 'boolean', `${label}.recommended must be a boolean`);
        for (const field of ['shortName', 'detail', 'bus']) {
          if (resource[field] !== undefined) assert(typeof resource[field] === 'string', `${label}.${field} must be a string`);
        }

        const resourcePins = isRecord(resource.pins) ? resource.pins : {};
        const assignments = isRecord(resource.assignments) ? resource.assignments : {};
        assert(isRecord(resource.pins) && Object.keys(resourcePins).length > 0, `${label}.pins must contain at least one pin`);
        assert(isRecord(resource.assignments) && Object.keys(assignments).length > 0, `${label}.assignments must contain at least one assignment`);
        for (const [number, role] of Object.entries(resourcePins)) {
          assert(hasOwn(pins, number), `${boardId}: resource ${resource.id || index} Pin ${number} does not reference a board pin`);
          assert(isNonEmptyString(role), `${boardId}: resource ${resource.id || index} Pin ${number} role is required`);
        }
        for (const [number, signal] of Object.entries(assignments)) {
          assert(hasOwn(pins, number), `${boardId}: resource ${resource.id || index} assignment Pin ${number} does not reference a board pin`);
          assert(hasOwn(resourcePins, number), `${boardId}: resource ${resource.id || index} assignment Pin ${number} is missing from resource pins`);
          assert(isNonEmptyString(signal), `${boardId}: resource ${resource.id || index} assignment Pin ${number} signal is required`);
        }
      });
    }

    const sharedBuses = board.sharedBuses === undefined ? [] : board.sharedBuses;
    assert(Array.isArray(sharedBuses), `${boardId}: sharedBuses must be an array`);
    const sharedBusIds = new Set();
    if (Array.isArray(sharedBuses)) {
      summary.sharedBuses += sharedBuses.length;
      sharedBuses.forEach((bus, index) => {
        const label = `${boardId}: sharedBuses[${index}]`;
        assert(isRecord(bus), `${label} must be an object`);
        if (!isRecord(bus)) return;
        assert(isNonEmptyString(bus.id), `${label}.id is required`);
        if (isNonEmptyString(bus.id)) {
          assert(!sharedBusIds.has(bus.id), `${boardId}: duplicate shared bus id ${bus.id}`);
          sharedBusIds.add(bus.id);
        }
        assert(isNonEmptyString(bus.name), `${label}.name is required`);
        const busResources = Array.isArray(bus.resources) ? bus.resources : [];
        const busPins = Array.isArray(bus.pins) ? bus.pins : [];
        assert(Array.isArray(bus.resources) && busResources.length >= 2, `${label}.resources must contain at least two resources`);
        assert(Array.isArray(bus.pins) && busPins.length > 0, `${label}.pins must contain at least one pin`);
        assert(new Set(busResources).size === busResources.length, `${label}.resources contains duplicates`);
        assert(new Set(busPins).size === busPins.length, `${label}.pins contains duplicates`);
        busResources.forEach(resourceId => {
          assert(isNonEmptyString(resourceId), `${label}: resource reference must be a non-empty string`);
          assert(resourceById.has(resourceId), `${label}: resource ${resourceId} does not exist`);
        });
        busPins.forEach(number => {
          assert(isNonEmptyString(number), `${label}: pin reference must be a non-empty string`);
          assert(hasOwn(pins, number), `${label}: Pin ${number} does not reference a board pin`);
          busResources.forEach(resourceId => {
            const resource = resourceById.get(resourceId);
            if (resource) assert(hasOwn(isRecord(resource.pins) ? resource.pins : {}, number), `${label}: Pin ${number} is not used by resource ${resourceId}`);
          });
        });
        for (const field of ['summary', 'detail']) {
          if (bus[field] !== undefined) assert(typeof bus[field] === 'string', `${label}.${field} must be a string`);
        }
        if (bus.chipSelectPins !== undefined) {
          assert(isRecord(bus.chipSelectPins), `${label}.chipSelectPins must be an object`);
          if (isRecord(bus.chipSelectPins)) {
            for (const [resourceId, description] of Object.entries(bus.chipSelectPins)) {
              assert(busResources.includes(resourceId), `${label}: chipSelectPins resource ${resourceId} is not part of the shared bus`);
              assert(resourceById.has(resourceId), `${label}: chipSelectPins resource ${resourceId} does not exist`);
              assert(isNonEmptyString(description), `${label}: chipSelectPins.${resourceId} description is required`);
            }
          }
        }
      });
    }

    validCompatibleDevices.forEach(deviceName => addTarget(boardId, board, deviceName, board.package));
  }

  for (const [presetId, preset] of Object.entries(presets)) {
    assert(isRecord(preset), `${presetId}: preset must be an object`);
    if (!isRecord(preset)) continue;
    assert(preset.id === presetId, `${presetId}: preset identity mismatch`);
    assert(isNonEmptyString(preset.name), `${presetId}: name is required`);
    assert(isNonEmptyString(preset.boardId), `${presetId}: boardId is required`);
    assert(isNonEmptyString(preset.device), `${presetId}: device is required`);
    assert(isNonEmptyString(preset.package), `${presetId}: package is required`);
    const board = boards[preset.boardId];
    assert(isRecord(board), `${presetId}: board ${preset.boardId || '(missing)'} does not exist`);
    if (!isRecord(board)) continue;
    assert(Array.isArray(board.compatibleDevices) && board.compatibleDevices.includes(preset.device), `${presetId}: device ${preset.device} is not compatible with board ${preset.boardId}`);
    assert(preset.package === board.package, `${presetId}: package ${preset.package} does not match board package ${board.package}`);
    const device = deviceCatalog[preset.device];
    assert(Boolean(device), `${presetId}: device ${preset.device} does not exist`);
    const pkg = device?.packages?.[preset.package];
    assert(Boolean(pkg) && Array.isArray(pkg?.pins), `${presetId}: package ${preset.device} ${preset.package} does not exist`);
    if (device && pkg && Array.isArray(pkg.pins)) {
      targets.set(`${preset.boardId}\u0000${preset.device}\u0000${preset.package}`, {
        boardId: preset.boardId,
        board,
        deviceName: preset.device,
        packageCode: preset.package,
        pkg
      });
    }
  }

  for (const { boardId, board, deviceName, packageCode, pkg } of targets.values()) {
    const pins = isRecord(board.pins) ? board.pins : {};
    const byNumber = new Map(pkg.pins.map(pin => [String(pin.number), pin]));
    for (const [number, boardPin] of Object.entries(pins)) {
      const devicePin = byNumber.get(number);
      assert(Boolean(devicePin), `${boardId} (${deviceName} ${packageCode}): Pin ${number} does not exist`);
      if (devicePin && isRecord(boardPin)) {
        assert(devicePin.name === boardPin.name, `${boardId} (${deviceName} ${packageCode}): Pin ${number} expected ${boardPin.name}, found ${devicePin.name}`);
      }
    }

    const validateAssignment = (context, number, signal) => {
      const devicePin = byNumber.get(number);
      if (!devicePin || !isNonEmptyString(signal)) return;
      assert(Array.isArray(devicePin.functions) && devicePin.functions.some(fn => fn.signal === signal), `${boardId} (${deviceName} ${packageCode}): ${context} ${signal} is unavailable on Pin ${number}`);
    };
    if (isRecord(board.fixedDefaults)) {
      Object.entries(board.fixedDefaults).forEach(([number, signal]) => validateAssignment('fixed default', number, signal));
    }
    if (Array.isArray(board.resources)) {
      board.resources.forEach((resource, index) => {
        if (!isRecord(resource) || !isRecord(resource.assignments)) return;
        Object.entries(resource.assignments).forEach(([number, signal]) => validateAssignment(`resource ${resource.id || index}`, number, signal));
      });
    }
  }

  if (errors.length) {
    const error = new Error(`MSPM0 board schema validation failed:\n- ${errors.join('\n- ')}`);
    error.validationErrors = errors;
    throw error;
  }
  return summary;
}

module.exports = { BOARD_SCHEMA_VERSION, PIN_STATUSES, validateBoardSchema };
