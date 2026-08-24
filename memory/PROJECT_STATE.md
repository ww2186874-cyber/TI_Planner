# 当前项目状态

更新日期：2026-08-24

## 版本与门禁

- 当前正式版本与最新正式标签：`1.2.2` / `v1.2.2`。
- 正式归档：`releases/v1.0.0` 至 `releases/v1.2.2`，历史版本完整保留。
- 当前候选版本：`1.3.0-beta.13`。
- 当前门禁：默认仅生成离线 HTML，等待用户目视确认；除非用户明确说“发布”，不生成候选文件夹版、便携 EXE 或正式 `v1.3.0`。
- 当前候选 HTML：`outputs/mspm0g3519-pin-planner.html`。

## 支持范围

- 芯片：`MSPM0G3519`、`MSPM0G3507`。
- MSPM0G3519：RHB-32、RGZ-48 VQFN；PT-48、PM-64、PN-80、PZ-100 LQFP。
- MSPM0G3507：RHB-32、RGZ-48 VQFN；PT-48、PM-64 LQFP。
- 候选功能：两颗芯片各自的天猛星 PM-64 模板，含 5 项固定时钟默认功能、8 项可切换板卡资源（新模板默认启用 SWD、BSL 与 NRST）、56 个 GPIO 排针映射、固定电源脚板载说明、板载电气限制和 SPI Flash/外接 H8 LCD-OLED 共享 SPI1 展示。
- 界面：Windows x64 桌面优先，固定夜间主题；打印报告白底。

## DeepSeek Harness 插件

- `harness-plugin/` 是独立可插拔源码包，不替换原生 JavaScript 网页规划器，也不属于 Electron 发布物；当前固定支持 MSPM0G3519 / PM-64 / `tianmengxing-g3519-pm64`。
- Web Profile Host Bundle 提供 Settings 持久化与 `mspm0Planner`；Client Package 在 `conversation.view` 增加 additive “引脚规划”标签；用户 preset `mspm0-planner` 贡献 7 个会话规划/检查/代码预览工具。
- 浏览器到 Host 使用严格 context-scoped Typert Remote，普通请求体不接受 `sessionId`；AI 风险安排由 `userQuestions` 直接询问人类，模型不能自行授权。
- 自动规划保守避开所有板载/可选外接资源和电气风险。SPI 只表示 SCK/PICO/POCI 三线基线；代码预览不写固件，并列出全部 `nonIomux` 排除项。
- TI SDK 来源锁固定 `mspm0g351x.h` Git blob `120ac6652d6364b8e6d33b3f55e27d4eed8dc2e7`、99,434 bytes 和 SHA-256 `d99d1fd2fa42382e8be1826b7daa5b50de421c513df51382dff69ca3260dbdc3`，独立保留/解析 812 行 IOMUX 宏，覆盖插件 PM-64 目录全部 591 个 IOMUX 功能。
- 插件精确兼容门禁为 DSH `0.1.1-rc.2`；源码与用户 preset 不在 DSH 安装目录内，升级不会覆盖，但未来 DSH 版本仍须重新 Inspect 和验证。
- 插件已经以本地 link 写入 Web Profile，用户 preset 已通过真实 `agentPresets.standingKeyFor('mspm0-planner')` mount-validation；当前进程尚未重启加载正式 Bundle/Client，必须由用户本人手动重启后再做 GUI/七工具验收。

## 兼容基线

- Electron 内部地址：`app://mspm0/index.html`。
- 本地存储：workspace v7、project data v6；每个工程固定保存一个 `device/package`，并可保存 `boardPresetId` 和 `enabledBoardResources`。软件尚未投入使用，本候选不读取旧预发布工作区或 JSON。
- 用户数据保存在当前电脑的 Electron 用户数据目录，不随程序移动。
- 依赖版本：Electron `31.7.7`、electron-builder `24.13.3`。

## 最近验证

- Harness 插件 `pnpm run build` 已通过 41/41 测试，覆盖 TI SDK 来源锁/812 项映射、模板来源防伪、风险人类确认与取消不落盘、特殊 Session key、revision/Settings、context-only Remote、Client 生命周期、SPI 三线基线和 `nonIomux` 代码预览披露。
- `check-installed.ps1` 已确认 Web Profile 为本地源码 link、Bundle/Client 元数据完整，当前 launcher 与包 engine 均为 DSH `0.1.1-rc.2`；用户 preset 已通过 live mount-validation。尚未替用户重启 DSH 或进行重启后的浏览器目视验收。
- `1.3.0-beta.13` 将顶部工程选择组在宽屏上适度向页面中部右移；窗口变窄时偏移会自动收回，避免挤压右侧操作按钮。
- `1.3.0-beta.12` 将所选外设实例的官方信号移到外设列表右侧的独立详情栏；详情栏参与正常布局，打开时压缩并临时适配芯片画布，关闭后恢复原视图，不覆盖画布。
- 顶部工程与操作按钮仍保持单排紧凑布局，标题下方不再显示说明小字；免责声明和数据来源仍保留在页面底部与关于窗口中。
- 每个工程固定一个芯片型号和一个封装；目标只在新建工程时选择，开发板模板会自动锁定对应目标。首次启动没有 v7 工程时必须先完成新建工程。
- 工程数据为单目标 workspace v7/project data v6，旧预发布存储键保留但不读取。
- `build-web.cmd` 会自动运行芯片清单、板卡校验、固定目标创建/加载/导入导出、外设详情分栏、搜索、板卡资源/共享总线、规划报告、撤销历史、四种 CSV 和内联构建保护。
- 未运行本轮 Electron 全量烟雾测试；当前候选等待用户目视检查顶部工程选择位置，以及外设详情栏与画布压缩效果。

## 工作区

- 正式工作区：`<WORKSPACE>`。
- 当前工作包含 `1.3.0-beta.13` 网页候选和独立 Harness 插件 `0.1.0`；本轮以无标签源码检查点保存，不创建正式版本或发布标签。
- Git 远程 `origin` 已配置为 `https://github.com/ww2186874-cyber/TI_Planner.git`；全部正式标签已推送，当前 `1.3.0-beta.13` 候选提交保留在本地 `main`，尚未推送至 `origin/main`。
- `outputs/` 只保留当前 `1.3.0-beta.13` HTML 和 `.gitkeep`；旧候选及已有正式版本副本已清理，正式版本仍完整保存在 `releases/`。
- `.tmp/` 已移除隔离测试用户目录和可重建产物，保留目前仅存的芯片数据手册、原理图/EDA 参考资料及引脚规划转换文件。
- `.pnpm-store/`、`.cache/`、`desktop/node_modules/` 和全部 `releases/` 必须长期保留。
