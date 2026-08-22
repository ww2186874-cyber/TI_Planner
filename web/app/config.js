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
const DEVICE_ORDER = ['MSPM0G3519', 'MSPM0G3507'];
const OFFICIAL_DEFAULT_SIGNALS = ['SWDIO', 'SWCLK', 'NRST'];
const DEBUG_SIGNALS = new Set(['SWDIO', 'SWCLK']);
const DEVICE_CONFIG = {
  MSPM0G3519: { defaultPackage: 'PZ', packageOrder: ['RHB', 'RGZ', 'PT', 'PM', 'PN', 'PZ'], defaultZoom: { RHB: 100, RGZ: 100, PT: 100, PM: 90, PN: 80, PZ: 70 } },
  MSPM0G3507: { defaultPackage: 'PM', packageOrder: ['RHB', 'RGZ', 'PT', 'PM'], defaultZoom: { RHB: 100, RGZ: 100, PT: 100, PM: 90 } }
};
const CATEGORY_COLORS = {
  Unassigned: 'var(--pin-unassigned)', GPIO: 'var(--pin-gpio)', UART: 'var(--pin-uart)',
  I2C: 'var(--pin-i2c)', SPI: 'var(--pin-spi)', CAN: 'var(--pin-can)',
  'Timer / Clock': 'var(--pin-timer)', ADC: 'var(--pin-adc)', DAC: 'var(--pin-dac)',
  Comparator: 'var(--pin-comparator)', Clock: 'var(--pin-clock)', Debug: 'var(--pin-debug)', System: 'var(--pin-system)',
  Power: 'var(--pin-power)', Other: 'var(--pin-other)'
};
const CATEGORY_LABELS = { Debug: 'Debug / 调试', System: 'System / 系统' };

const timerAliases = ['timer', '定时器', 'pwm', 'capture', 'compare'];
const commonAnalogResources = [
  { key: 'ADC', label: 'ADC', instances: [0, 1].map(n => ({ id: `ADC${n}`, display: `ADC${n}`, prefix: `A${n}_`, aliases: ['analog', '模拟输入'] })) },
  { key: 'DAC', label: 'DAC', instances: [{ id: 'DAC0', display: 'DAC0', exact: ['DAC_OUT'], aliases: ['analog out', '模拟输出'] }] },
  { key: 'Comparator', label: '比较器', instances: [0, 1, 2].map(n => ({ id: `COMP${n}`, prefix: `COMP${n}_`, aliases: ['comparator', '比较器'] })) }
];
const RESOURCE_CATALOGS = {
  MSPM0G3519: [
    { key: 'UART', label: 'UART', instances: ['UART0', 'UART1', 'UART3', 'UART4', 'UART5', 'UART6', 'UART7'].map(id => ({ id, prefix: `${id}_`, aliases: ['serial', '串口'] })) },
    { key: 'I2C', label: 'I2C', instances: ['I2C0', 'I2C1', 'I2C2'].map(id => ({ id, prefix: `${id}_`, aliases: ['iic', 'two wire'] })) },
    { key: 'SPI', label: 'SPI', instances: ['SPI0', 'SPI1', 'SPI2'].map(id => ({ id, prefix: `${id}_`, aliases: ['synchronous serial'] })) },
    { key: 'CAN', label: 'CAN-FD', instances: [0, 1].map(n => ({ id: `CAN${n}`, display: `CAN-FD${n}`, prefix: `CAN${n}_`, aliases: ['canfd', 'can fd'] })) },
    { key: 'Timer', label: '定时器', instances: [
      { id: 'TIMA0', prefix: 'TIMA0_', feature: 'Advanced · 4CH', aliases: [...timerAliases, 'tim0'] },
      { id: 'TIMA1', prefix: 'TIMA1_', feature: 'Advanced · 2CH', aliases: [...timerAliases, 'tim1', 'timer1'] },
      { id: 'TIMG0', prefix: 'TIMG0_', feature: 'General · 2CH', aliases: [...timerAliases, 'tim0'] },
      { id: 'TIMG6', prefix: 'TIMG6_', feature: 'General · 2CH', aliases: timerAliases },
      { id: 'TIMG7', prefix: 'TIMG7_', feature: 'General · 2CH', aliases: timerAliases },
      { id: 'TIMG8', prefix: 'TIMG8_', feature: 'QEI / Hall · 2CH', aliases: [...timerAliases, 'qei', 'encoder', '编码器', 'hall', '霍尔'] },
      { id: 'TIMG9', prefix: 'TIMG9_', feature: 'QEI / Hall · 2CH', aliases: [...timerAliases, 'qei', 'encoder', '编码器', 'hall', '霍尔'] },
      { id: 'TIMG12', prefix: 'TIMG12_', feature: 'General · 32-bit · 2CH', aliases: timerAliases },
      { id: 'TIMG14', prefix: 'TIMG14_', feature: 'General · 4CH', aliases: timerAliases }
    ] },
    ...commonAnalogResources
  ],
  MSPM0G3507: [
    { key: 'UART', label: 'UART', instances: ['UART0', 'UART1', 'UART2', 'UART3'].map(id => ({ id, prefix: `${id}_`, aliases: ['serial', '串口'] })) },
    { key: 'I2C', label: 'I2C', instances: ['I2C0', 'I2C1'].map(id => ({ id, prefix: `${id}_`, aliases: ['iic', 'two wire'] })) },
    { key: 'SPI', label: 'SPI', instances: ['SPI0', 'SPI1'].map(id => ({ id, prefix: `${id}_`, aliases: ['synchronous serial'] })) },
    { key: 'CAN', label: 'CAN-FD', instances: [{ id: 'CAN0', display: 'CAN-FD', exact: ['CAN_TX', 'CAN_RX'], aliases: ['can', 'canfd', 'can fd'] }] },
    { key: 'Timer', label: '定时器', instances: [
      { id: 'TIMA0', prefix: 'TIMA0_', feature: 'Advanced · 4CH', aliases: [...timerAliases, 'tim0'] },
      { id: 'TIMA1', prefix: 'TIMA1_', feature: 'Advanced · 2CH', aliases: [...timerAliases, 'tim1', 'timer1'] },
      { id: 'TIMG0', prefix: 'TIMG0_', feature: 'General · 2CH', aliases: [...timerAliases, 'tim0'] },
      { id: 'TIMG6', prefix: 'TIMG6_', feature: 'General · 2CH', aliases: timerAliases },
      { id: 'TIMG7', prefix: 'TIMG7_', feature: 'General · 2CH', aliases: timerAliases },
      { id: 'TIMG8', prefix: 'TIMG8_', feature: 'QEI / Hall · 2CH', aliases: [...timerAliases, 'qei', 'encoder', '编码器', 'hall', '霍尔'] },
      { id: 'TIMG12', prefix: 'TIMG12_', feature: 'General · 32-bit · 2CH', aliases: timerAliases }
    ] },
    ...commonAnalogResources
  ]
};
