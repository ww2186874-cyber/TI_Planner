# 当前项目状态

更新日期：2026-07-19

- 当前正式版本：`1.1.0`
- 当前候选版本：`1.2.0-beta.1`，已生成离线 HTML 和快速启动文件夹版，等待用户确认是否进入便携版阶段
- 最新 Git 标签：`v1.1.0`
- 正式版本归档：`releases/v1.0.0`、`releases/v1.0.1`、`releases/v1.1.0`
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
- 最近完整验证：`1.2.0-beta.1` 文件夹版正常启动；两颗芯片的 RHB/RGZ 封装列表、首尾脚、32/48 引脚数、真实标签输入、正常关闭恢复、v3/v4 导入、打印报告和保存桥接通过；全部 LQFP/VQFN 数据校验、旧封装无回归比对及提取结果可复现
- 当前候选产物：`outputs/mspm0g3519-pin-planner.html`、`outputs/MSPM0-Pin-Planner-1.2.0-beta.1-Folder/`
- 当前正式产物：`releases/v1.1.0/MSPM0-Pin-Planner-1.1.0-Portable.exe`、`releases/v1.1.0/MSPM0-Pin-Planner-1.1.0-Folder/`、`releases/v1.1.0/mspm0g3519-pin-planner.html`
- 项目长期记忆：已启用 `memory/`，由 `AGENTS.md` 强制新 Codex 任务读取和维护
- 工作区体检：`workspace-check.cmd` 只读检查版本、Git、目录、缓存和发布归档

工作区预期状态：Git干净；正式版本不可覆盖；`outputs/` 保存 `1.2.0-beta.1` 候选 HTML、文件夹版和既有候选产物；未生成本候选的便携 EXE或正式发布归档。
