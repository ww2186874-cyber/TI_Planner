# 当前项目状态

更新日期：2026-07-19

- 当前正式版本：`1.2.1`
- 当前候选版本：`1.2.2-beta.1`，已生成新工程默认调试/复位功能和独立配色的离线 HTML，等待用户确认
- 最新 Git 标签：`v1.2.1`
- 正式版本归档：`releases/v1.0.0`、`releases/v1.0.1`、`releases/v1.1.0`、`releases/v1.2.0`、`releases/v1.2.1`
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
- 最近完整验证：`1.2.2-beta.1` Electron 开发版覆盖全部 10 个芯片/封装组合，均默认安排 SWDIO/SWCLK/NRST；默认项修改、清除和重启恢复通过，v3/v4及“天猛星”旧工程导入保持原 assignments；VQFN、精确搜索、长标签、打印和完整发布工作流回归通过
- 当前候选产物：`outputs/mspm0g3519-pin-planner.html` 为 `1.2.2-beta.1` 候选，大小 719,580 字节，SHA-256 为 `DBD5B85D44BB95AFFA2C59471C6F2AB5DD58EECD6D3DDBDD2A652941368D54C3`
- 当前正式产物：`releases/v1.2.1/MSPM0-Pin-Planner-1.2.1-Portable.exe`、`releases/v1.2.1/MSPM0-Pin-Planner-1.2.1-Folder/`、`releases/v1.2.1/mspm0g3519-pin-planner.html`
- 项目长期记忆：已启用 `memory/`，由 `AGENTS.md` 强制新 Codex 任务读取和维护
- 工作区体检：`workspace-check.cmd` 只读检查版本、Git、目录、缓存和发布归档

工作区预期状态：Git干净；正式版本不可覆盖；`releases/v1.2.1/` 和 `v1.2.1` 标签存在，全部旧版归档和标签继续保留；`outputs/` 保存 `1.2.2-beta.1` HTML及既有产物，尚未生成本候选文件夹版、便携 EXE或正式归档。
