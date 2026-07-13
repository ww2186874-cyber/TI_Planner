# MSPM0 项目协作规则

本目录是 MSPM0 引脚规划器的唯一正式开发工作区。所有 Codex 任务在修改项目前必须先阅读 `README.md`、`docs/DEVELOPMENT.md`、`memory/README.md` 和本文件。

## 项目记忆

开始任务时必须阅读：

- `memory/PROJECT_STATE.md`
- `memory/DECISIONS.md`
- `memory/LESSONS.md`
- `memory/KNOWN_ISSUES.md`
- `memory/SESSION_HANDOFF.md`

结束任务前必须：

1. 运行 `workspace-check.cmd` 或等价检查。
2. 把新的长期决策写入 `DECISIONS.md`。
3. 把可复用的故障原因和预防方法写入 `LESSONS.md`。
4. 更新版本、发布和工作区状态到 `PROJECT_STATE.md`。
5. 未完成事项写入 `SESSION_HANDOFF.md`；没有未完成事项时明确写“无”。
6. 只记录以后有用的事实，不复制聊天过程，不写猜测，不记录密钥、令牌或隐私数据。

记忆文件是辅助上下文，不得覆盖用户最新明确要求。内容与代码冲突时，以代码、Git 历史和实际测试结果为准，并修正记忆。

## 固定流程

1. 开始前检查 Git 状态，理解现有未提交修改，不覆盖用户工作。
2. 只修改源码：主要入口是 `web/`，桌面功能入口是 `desktop/main.js` 和 `desktop/preload.js`。
3. 不直接编辑 `outputs/mspm0g3519-pin-planner.html` 或 `desktop/app/index.html`，它们是自动生成文件。
4. 普通界面和逻辑修改先运行 `build-web.cmd`，向用户提供 HTML 预览。
5. 桌面窗口、文件对话框、应用图标等 Electron 专属修改使用 `run-dev.cmd` 预览。
6. 候选确认优先运行 `build-folder.cmd` 生成快速启动文件夹版，不为每次迭代反复压缩单文件 EXE。
7. 用户确认后再运行 `build-portable.cmd`；正式发布必须使用不带 `beta` 的版本号并运行 `create-release.cmd`。
8. 正式版本保存在 `releases/vX.Y.Z/`。不得删除或覆盖旧版本，除非用户明确要求。
9. 完成并验证后，由 Codex提交 Git 记录；预发布候选不创建正式标签，正式发布再创建对应的 `vX.Y.Z` 标签。
10. 修改芯片数据或资源逻辑后必须运行 `web/validate-data.js` 或等价数据校验。
11. 临时文件只放入 `.tmp/` 或既有测试目录，不在项目根目录散落截图、日志和临时脚本。

## 兼容和安全

- 保持 `appId`、应用名称和 `app://mspm0/` 地址稳定，确保升级后仍能读取原配置。
- 改变本地存储结构时必须提升存储版本并提供旧数据迁移。
- 不清理 `.pnpm-store/`、`.cache/` 或 `desktop/node_modules/`，除非依赖确实损坏或用户明确要求。
- 不把不同芯片或封装的数据互相套用；引脚数据必须以官方资料为准并进行抽查。
- 不因节省磁盘而删除正式版本、依赖缓存或可复现构建所需文件。
- 发布物必须保留 `legal/` 中的许可证、第三方声明、数据来源和非官方声明。
- 不自动清理用户文件。保持工作区清爽以归类、忽略和报告为主，删除前必须确认文件确实是本任务生成且不再需要。

## 版本规则

- 补丁版本 `X.Y.Z+1`：图标、样式、文案和错误修复。
- 次版本 `X.Y+1.0`：新功能、新芯片或新封装。
- 主版本 `X+1.0.0`：不兼容的数据结构或产品方向变更。

用户的最新明确要求始终优先于本文件。如果某项修改无法仅通过 HTML 预览，应直接说明原因并使用 Electron 开发模式验证。
