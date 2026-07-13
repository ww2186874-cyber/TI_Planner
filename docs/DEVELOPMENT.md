# 开发说明

## 工作流程

1. 修改 `web/` 中的源码或芯片数据。
2. 运行 `build-web.cmd`，先检查离线 HTML 的界面和逻辑。
3. 涉及桌面保存、内部地址、图标或窗口行为时运行 `run-dev.cmd`。
4. 对存储结构有改动时，为旧版 `localStorage` 增加迁移逻辑并更新烟雾测试。
5. 运行 `build-folder.cmd` 生成启动更快的候选软件供确认。
6. 用户确认后把候选版本改为正式版本，再运行 `create-release.cmd`。
7. 按 `RELEASE_CHECKLIST.md` 检查，并由 Codex提交 Git 记录和正式版本标签。

## 构建链路

`web/build.js` 会把模板、交互脚本和两颗芯片的数据合并成单文件 HTML：

`web/* -> outputs/mspm0g3519-pin-planner.html -> desktop/app/index.html -> folder build / portable EXE`

`desktop/app/index.html` 是自动生成文件。Electron 使用固定的 `app://mspm0/index.html` 地址加载它，从而让应用升级或移动位置后仍能读取当前电脑上的已有进度。

## 数据兼容

- 不要随意修改 Electron 的 `appId`、应用名称或内部 `app://mspm0/` 地址。
- 增加芯片、封装和普通功能通常不需要清空用户数据。
- 修改保存对象的字段或含义时，应先提升存储版本，再迁移旧结构。
- 发布前至少用旧版创建一份方案，再用新版打开验证迁移。

## Git 和版本归档

- Git 只记录源码、脚本、文档、发布说明和哈希，不记录依赖缓存与大型 EXE。
- `outputs/` 是候选构建区；同一版本重复构建时可能覆盖其中的文件。
- `releases/vX.Y.Z/` 保存正式发布的 EXE、HTML、哈希和发布说明。
- `create-release.cmd` 检测到相同版本已经存在时会停止，防止覆盖旧版本。
- 预发布版本使用 `X.Y.Z-beta.N`，可以提交 Git，但不创建正式版本标签。
- 普通小修复提升补丁版本，例如 `1.0.0 -> 1.0.1`。
- 新功能提升次版本，例如 `1.0.1 -> 1.1.0`。
- 不兼容的大改动提升主版本，例如 `1.1.0 -> 2.0.0`。

## 增加芯片或封装

1. 以官方数据手册为准生成独立 JSON 数据。
2. 在 `web/build.js` 的 `dataPaths` 和 `requiredPackages` 中登记型号与脚数。
3. 在 `web/app.js` 中补充该芯片的外设实例和必要别名。
4. 抽查电源脚、GPIO、复用功能、QEI、ADC、封装脚号和资源数量。

## 依赖和缓存

- Electron：`31.7.7`
- electron-builder：`24.13.3`
- 锁定文件：`desktop/pnpm-lock.yaml`
- 依赖目录：`desktop/node_modules/`
- pnpm 缓存：`.pnpm-store/`
- Electron 缓存：`.cache/electron/`
- builder 缓存：`.cache/electron-builder/`

这些目录会占用较多空间，但能显著减少下一次安装和打包时间。除非依赖损坏，不要主动删除。

`build-portable.cmd` 会自动准备 `winCodeSign` 的 Windows 缓存，并跳过压缩包中 Windows 普通用户无法创建、同时也用不到的 macOS 符号链接。

## 常见问题

- 单文件便携版启动较慢：每次启动需要解压 Chromium，属于 portable 目标的正常代价。
- 文件夹版启动更快：直接运行文件夹中的 `MSPM0 引脚规划器.exe`，但传播时必须复制整个文件夹。
- 首次构建慢：需要下载 Electron 和打包工具，之后会使用工作区缓存。
- Windows 提示未知发布者：当前版本没有商业代码签名。
- 打包路径错误：保持工作区路径简短；当前 D 盘路径比原临时路径更适合 NSIS。
