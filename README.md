# MSPM0 引脚规划器开发工作区

这是 MSPM0 引脚规划器的长期维护目录。请同时保存本目录和发布用 EXE，不要只保留 EXE。

## 目录说明

- `web/`：网页源码和芯片数据，是主要修改位置。
- `desktop/`：Electron 桌面外壳、安全配置、图标和打包配置。
- `outputs/`：生成的离线 HTML 和便携 EXE。
- `releases/`：已正式发布的历史版本；正式版本不得自动删除或覆盖。
- `scripts/`：依赖安装、开发运行和打包脚本。
- `.pnpm-store/`、`.cache/`、`desktop/node_modules/`：本机开发依赖与缓存。保留它们可以减少以后下载和打包时间。
- `docs/`：开发、发布和数据兼容说明。

## 常用操作

1. 双击 `run-dev.cmd`：构建最新网页并启动开发版软件。
2. 双击 `build-portable.cmd`：构建并把新版便携 EXE复制到 `outputs/`。
3. 双击 `build-web.cmd`：只生成离线 HTML，不生成 EXE。
4. 双击 `install-dependencies.cmd`：重新安装或校验 Electron 开发依赖。
5. 双击 `create-release.cmd`：在效果确认后生成正式 EXE，并归档到 `releases/v版本号/`。

脚本会优先使用 Codex 自带的 Node.js 和 pnpm，也支持系统中已经安装的 Node.js/pnpm。Electron 下载使用国内镜像，缓存固定保存在本工作区。

## 修改入口

- 界面结构和样式：`web/template.html`
- 交互、搜索、状态和导入导出逻辑：`web/app.js`
- MSPM0G3519 数据：`web/pin-data.json`
- MSPM0G3507 数据：`web/pin-data-3507.json`
- 网页生成逻辑：`web/build.js`
- 桌面窗口和权限：`desktop/main.js`、`desktop/preload.js`
- 软件版本：`desktop/package.json` 中的 `version`

不要直接修改 `desktop/app/index.html` 或 `outputs/mspm0g3519-pin-planner.html`，它们会在构建时由源码自动覆盖。

`outputs/` 是临时构建区，可以被同版本的下一次构建覆盖；`releases/` 是正式版本库，不允许覆盖已有版本。正式发布前必须先修改 `desktop/package.json` 中的版本号。

项目根目录的 `AGENTS.md` 是给 Codex 的固定工作规则。以后创建新的 Codex 任务时，应把 `<USER_HOME>\Desktop\MSPM0` 选为工作区，这样新窗口会自动按照相同流程工作。

详细流程见 `docs/DEVELOPMENT.md` 和 `docs/RELEASE_CHECKLIST.md`。
