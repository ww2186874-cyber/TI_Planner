# 当前项目状态

更新日期：2026-07-19

- 当前正式版本：`1.2.2`
- 当前候选版本：无
- 最新 Git 标签：`v1.2.2`
- 正式版本归档：`releases/v1.0.0`、`releases/v1.0.1`、`releases/v1.1.0`、`releases/v1.2.0`、`releases/v1.2.1`、`releases/v1.2.2`
- 当前图标：无文字芯片图形，保留引脚和 1 号脚定位圆点
- 当前作者署名：`天津职业技术师范大学 电子创新协会`
- 支持芯片：`MSPM0G3519`、`MSPM0G3507`
- 支持封装：3519 的 RHB-32/RGZ-48 VQFN 和 PT-48/PM-64/PN-80/PZ-100 LQFP；3507 的 RHB-32/RGZ-48 VQFN 和 PT-48/PM-64 LQFP
- 桌面目标：Windows x64 Electron 单文件便携版
- 用户数据：当前电脑的 Electron 用户数据目录，不跟随 EXE或U盘移动
- 内部页面地址：`app://mspm0/index.html`
- 本地存储版本：v4 多工程结构；每个工程内部继续使用 v3 多芯片数据
- 当前正式工作区：`<USER_HOME>\Desktop\MSPM0`
- 依赖和缓存应长期保留：`.pnpm-store/`、`.cache/`、`desktop/node_modules/`
- 正式功能：多工程、撤销/重做、外设完整性、规划检查、连接器字段、扩展导出、关于与许可证、数据自动校验、快速启动文件夹版
- 最近完整验证：`1.2.2` 文件夹版和便携 EXE 均真实启动通过；全部 10 个芯片/封装组合默认安排 SWDIO/SWCLK/NRST，默认项修改和配色通过；v3/v4及“天猛星”旧工程保持原 assignments；VQFN、精确搜索、导入焦点、长标签、打印和完整发布工作流均通过
- 当前候选产物：无；`outputs/` 保留正式构建和既有候选产物
- 当前正式产物：`releases/v1.2.2/MSPM0-Pin-Planner-1.2.2-Portable.exe`、`releases/v1.2.2/MSPM0-Pin-Planner-1.2.2-Folder/`、`releases/v1.2.2/mspm0g3519-pin-planner.html`
- 项目长期记忆：已启用 `memory/`，由 `AGENTS.md` 强制新 Codex 任务读取和维护
- 工作区体检：`workspace-check.cmd` 只读检查版本、Git、目录、缓存和发布归档

工作区预期状态：Git干净；正式版本不可覆盖；`releases/v1.2.2/` 和 `v1.2.2` 标签存在，全部旧版归档和标签继续保留；`outputs/` 保存 `1.2.2` 正式构建及既有候选产物。
