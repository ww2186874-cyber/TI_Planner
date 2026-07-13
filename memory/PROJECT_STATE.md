# 当前项目状态

更新日期：2026-07-14

- 当前正式版本：`1.0.1`
- 最新 Git 标签：`v1.0.1`
- 正式版本归档：`releases/v1.0.0`、`releases/v1.0.1`
- 当前图标：无文字芯片图形，保留引脚和 1 号脚定位圆点
- 支持芯片：`MSPM0G3519`、`MSPM0G3507`
- 支持封装：3519 的 PT-48/PM-64/PN-80/PZ-100；3507 的 PT-48/PM-64
- 桌面目标：Windows x64 Electron 单文件便携版
- 用户数据：当前电脑的 Electron 用户数据目录，不跟随 EXE或U盘移动
- 内部页面地址：`app://mspm0/index.html`
- 本地存储版本：v3 多芯片结构
- 当前正式工作区：`<USER_HOME>\Desktop\MSPM0`
- 依赖和缓存应长期保留：`.pnpm-store/`、`.cache/`、`desktop/node_modules/`
- 最近完整验证：v1.0.1 启动、芯片列表、封装列表、桌面保存桥接、版本、图标和归档哈希通过
- 项目长期记忆：已启用 `memory/`，由 `AGENTS.md` 强制新 Codex 任务读取和维护
- 工作区体检：`workspace-check.cmd` 只读检查版本、Git、目录、缓存和发布归档

工作区预期状态：Git干净；正式版本不可覆盖；`outputs/` 仅作为候选构建区。
