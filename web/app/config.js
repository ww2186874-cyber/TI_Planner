const DEVICE_DATA = __DEVICE_DATA__;
const BOARD_PRESETS = __BOARD_PRESETS__;
const APP_META = __APP_META__;
const STORAGE_KEY = 'mspm0g-pin-planner-v6';
const LEGACY_V5_STORAGE_KEY = 'mspm0g-pin-planner-v5';
const LEGACY_V4_STORAGE_KEY = 'mspm0g-pin-planner-v4';
const LEGACY_V3_STORAGE_KEY = 'mspm0g-pin-planner-v3';
const LEGACY_V2_STORAGE_KEY = 'mspm0g3519-pin-planner-v2';
const LEGACY_V1_STORAGE_KEY = 'mspm0g3519-pin-planner-v1';
const SCHEMA_VERSION = 6;
const PROJECT_DATA_VERSION = 5;
const DEVICE_CONFIG = __DEVICE_CONFIG__;
const DEVICE_ORDER = Object.keys(DEVICE_CONFIG);
const RESOURCE_CATALOGS = Object.fromEntries(Object.entries(DEVICE_CONFIG).map(([device, config]) => [device, config.resources]));
const OFFICIAL_DEFAULT_SIGNALS = ['SWDIO', 'SWCLK', 'NRST'];
const DEBUG_SIGNALS = new Set(['SWDIO', 'SWCLK']);
const CATEGORY_COLORS = {
  Unassigned: 'var(--pin-unassigned)', GPIO: 'var(--pin-gpio)', UART: 'var(--pin-uart)',
  I2C: 'var(--pin-i2c)', SPI: 'var(--pin-spi)', CAN: 'var(--pin-can)',
  'Timer / Clock': 'var(--pin-timer)', ADC: 'var(--pin-adc)', DAC: 'var(--pin-dac)',
  Comparator: 'var(--pin-comparator)', Clock: 'var(--pin-clock)', Debug: 'var(--pin-debug)', System: 'var(--pin-system)',
  Power: 'var(--pin-power)', Other: 'var(--pin-other)'
};
const CATEGORY_LABELS = { Debug: 'Debug / 调试', System: 'System / 系统' };
