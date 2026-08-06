# MSPM0 引脚规划器开发工作区

这是 MSPM0 引脚规划器的唯一长期维护目录。源码、依赖缓存和全部正式版本应与发布用 EXE 一起保留。

## 当前产品

- `MSPM0G3519`：RHB-32、RGZ-48 VQFN；PT-48、PM-64、PN-80、PZ-100 LQFP。
- `MSPM0G3507`：RHB-32、RGZ-48 VQFN；PT-48、PM-64 LQFP。
- 天猛星 PM-64 板卡模板：分别使用两颗芯片的官方功能数据，并提供板载连接、排针、电气限制和共享 SPI1 资源提示。
- Windows x64 Electron 桌面应用，固定夜间界面；打印报告保持白底。

准确的正式版、候选版和当前验收门禁见 `memory/PROJECT_STATE.md`。

## 工作区地图

| 路径 | 职责 |
|---|---|
| `web/` | 网页界面、交互、芯片数据、板卡数据和单文件 HTML 构建 |
| `desktop/` | Electron 外壳、权限、图标、桌面测试和打包配置 |
| `scripts/` | 构建、缓存准备、归档和工作区检查脚本 |
| `outputs/` | 可覆盖的候选产物 |
| `releases/vX.Y.Z/` | 不可覆盖的正式历史归档 |
| `legal/` | 许可证、第三方声明和数据来源 |
| `docs/` | 开发、发布和文件管理的权威流程 |
| `memory/` | 跨任务仍有用的当前状态、决策、经验和交接 |
| `.pnpm-store/`、`.cache/`、`desktop/node_modules/` | 应长期保留的本机依赖与构建缓存 |

## 常用入口

| 命令 | 用途 |
|---|---|
| `build-web.cmd` | 校验数据并生成离线 HTML 候选 |
| `run-dev.cmd` | 构建并启动 Electron 开发版 |
| `build-folder.cmd` | 生成快速启动文件夹版候选 |
| `build-portable.cmd` | 仅在明确需要单独便携候选时构建 EXE |
| `create-release.cmd` | 构建并归档已确认的正式版本 |
| `workspace-check.cmd` | 只读检查版本、Git、目录、缓存和归档 |
| `install-dependencies.cmd` | 依赖缺失或损坏时安装/校验依赖 |

脚本优先使用 Codex 自带的 Node.js 和 pnpm，也支持系统安装；下载镜像和缓存路径由 `scripts/common.ps1` 统一管理。

普通改动遵循“HTML 候选 -> 文件夹候选 -> 正式发布”三道门禁。不要直接修改 `outputs/mspm0g3519-pin-planner.html` 或 `desktop/app/index.html`。

开发细节见 `docs/DEVELOPMENT.md`，正式发布见 `docs/RELEASE_CHECKLIST.md`，工作区整理见 `docs/WORKSPACE_HYGIENE.md`。Codex 固定边界见 `AGENTS.md`。
