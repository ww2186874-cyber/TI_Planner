# MSPM0 项目协作规则

本目录是 MSPM0 引脚规划器的唯一正式开发工作区。所有 Codex 任务在修改项目前必须先阅读 `README.md`、`docs/DEVELOPMENT.md` 和本文件。

## 固定流程

1. 开始前检查 Git 状态，理解现有未提交修改，不覆盖用户工作。
2. 只修改源码：主要入口是 `web/`，桌面功能入口是 `desktop/main.js` 和 `desktop/preload.js`。
3. 不直接编辑 `outputs/mspm0g3519-pin-planner.html` 或 `desktop/app/index.html`，它们是自动生成文件。
4. 普通界面和逻辑修改先运行 `build-web.cmd`，向用户提供 HTML 预览。
5. 桌面窗口、文件对话框、应用图标等 Electron 专属修改使用 `run-dev.cmd` 预览。
6. 用户确认效果前，不为每次迭代反复生成正式便携 EXE；确认后再运行 `build-portable.cmd`。
7. 正式发布必须提升 `desktop/package.json` 的版本号，再运行 `create-release.cmd`。
8. 正式版本保存在 `releases/vX.Y.Z/`。不得删除或覆盖旧版本，除非用户明确要求。
9. 完成并验证后，由 Codex提交 Git 记录；正式发布再创建对应的 `vX.Y.Z` 标签。

## 兼容和安全

- 保持 `appId`、应用名称和 `app://mspm0/` 地址稳定，确保升级后仍能读取原配置。
- 改变本地存储结构时必须提升存储版本并提供旧数据迁移。
- 不清理 `.pnpm-store/`、`.cache/` 或 `desktop/node_modules/`，除非依赖确实损坏或用户明确要求。
- 不把不同芯片或封装的数据互相套用；引脚数据必须以官方资料为准并进行抽查。
- 不因节省磁盘而删除正式版本、依赖缓存或可复现构建所需文件。

## 版本规则

- 补丁版本 `X.Y.Z+1`：图标、样式、文案和错误修复。
- 次版本 `X.Y+1.0`：新功能、新芯片或新封装。
- 主版本 `X+1.0.0`：不兼容的数据结构或产品方向变更。

用户的最新明确要求始终优先于本文件。如果某项修改无法仅通过 HTML 预览，应直接说明原因并使用 Electron 开发模式验证。
