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
- `memory/`：跨 Codex 任务保存的项目状态、决策、踩坑经验和交接信息。

## 当前支持

- `MSPM0G3519`：RHB-32 VQFN、RGZ-48 VQFN、PT-48 LQFP、PM-64 LQFP、PN-80 LQFP、PZ-100 LQFP。
- `MSPM0G3507`：RHB-32 VQFN、RGZ-48 VQFN、PT-48 LQFP、PM-64 LQFP。
- 内置板卡模板：天猛星 PM-64，可分别为 MSPM0G3507/MSPM0G3519 新建带板载功能、排针映射和电气限制提示的工程。
- 天猛星模板会同时显示共享总线上的多个板卡资源，例如 PB8/PB9 上并存的板载 SPI Flash 与 H8 LCD/OLED 接口。
- 应用界面固定使用针对桌面规划优化的夜间主题；打印报告仍使用白底版式。

## 常用操作

1. 双击 `run-dev.cmd`：构建最新网页并启动开发版软件。
2. 双击 `build-portable.cmd`：构建并把新版便携 EXE复制到 `outputs/`。
3. 双击 `build-folder.cmd`：生成启动更快的文件夹版候选软件。
4. 双击 `build-web.cmd`：只生成离线 HTML，不生成 EXE。
5. 双击 `install-dependencies.cmd`：重新安装或校验 Electron 开发依赖。
6. 双击 `create-release.cmd`：在效果确认后生成正式 EXE、文件夹版，并归档到 `releases/v版本号/`。
7. 双击 `workspace-check.cmd`：只读检查 Git、版本、目录结构、缓存和发布归档是否正常。

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

每个正式版本统一保存在一个目录中，例如：

```text
releases/v1.1.0/
  MSPM0-Pin-Planner-1.1.0-Portable.exe
  MSPM0-Pin-Planner-1.1.0-Folder/
  mspm0g3519-pin-planner.html
  SHA256.txt
  FOLDER-SHA256.txt
  RELEASE_NOTES.md
```

单文件 EXE、快速启动文件夹版和离线 HTML 属于同一个软件版本。传播文件夹版时必须复制整个 `*-Folder/` 目录。

日常功能修改优先检查离线 HTML；需要验证桌面保存窗口、内部地址或应用图标时再运行 Electron。候选阶段优先生成文件夹版，它启动更快；用户确认后再生成并归档正式单文件便携版。

项目根目录的 `AGENTS.md` 是给 Codex 的固定工作规则。以后创建新的 Codex 任务时，应把 `<USER_HOME>\Desktop\MSPM0` 选为工作区，这样新窗口会自动读取 `memory/` 并按照相同流程工作。

详细流程见 `docs/DEVELOPMENT.md`、`docs/WORKSPACE_HYGIENE.md` 和 `docs/RELEASE_CHECKLIST.md`。
