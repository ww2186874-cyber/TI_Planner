# 当前项目状态

更新日期：2026-08-06

- 当前正式版本：`1.2.2`
- 当前候选版本：`1.3.0-beta.1`，已生成离线 HTML，等待用户确认夜间界面和天猛星共享 SPI 展示
- 最新 Git 标签：`v1.2.2`
- 正式版本归档：`releases/v1.0.0`、`releases/v1.0.1`、`releases/v1.1.0`、`releases/v1.2.0`、`releases/v1.2.1`、`releases/v1.2.2`
- 当前图标：无文字芯片图形，保留引脚和 1 号脚定位圆点
- 当前作者署名：`天津职业技术师范大学 电子创新协会`
- 支持芯片：`MSPM0G3519`、`MSPM0G3507`
- 支持封装：3519 的 RHB-32/RGZ-48 VQFN 和 PT-48/PM-64/PN-80/PZ-100 LQFP；3507 的 RHB-32/RGZ-48 VQFN 和 PT-48/PM-64 LQFP
- 桌面目标：Windows x64 Electron 单文件便携版
- 用户数据：当前电脑的 Electron 用户数据目录，不跟随 EXE或U盘移动
- 内部页面地址：`app://mspm0/index.html`
- 本地存储版本：v5 多工程结构；每个工程内部使用 v4 多芯片数据并保存可选的 `boardPresetId`
- 当前正式工作区：`<USER_HOME>\Desktop\MSPM0`
- 依赖和缓存应长期保留：`.pnpm-store/`、`.cache/`、`desktop/node_modules/`
- 正式功能：多工程、撤销/重做、外设完整性、规划检查、连接器字段、扩展导出、关于与许可证、数据自动校验、快速启动文件夹版
- 当前候选功能：天猛星 PM-64 基础模板，可为 MSPM0G3507/MSPM0G3519 明确从模板新建工程；预选 17 项板载功能，记录 56 个 GPIO 排针端子、NRST、未引出晶振脚、开漏/参考电压限制，并同时展示 SPI Flash 与 H8 LCD/OLED 的共享 SPI1 关系；应用界面固定为夜间主题
- 最近完整验证：`1.2.2` 文件夹版和便携 EXE 均真实启动通过；`1.3.0-beta.1` 当前源码的数据校验和离线 HTML 构建通过，夜间界面及共享总线布局等待用户目视确认
- 当前候选产物：`outputs/mspm0g3519-pin-planner.html`（`1.3.0-beta.1`）；尚未生成候选文件夹版或便携 EXE
- 当前正式产物：`releases/v1.2.2/MSPM0-Pin-Planner-1.2.2-Portable.exe`、`releases/v1.2.2/MSPM0-Pin-Planner-1.2.2-Folder/`、`releases/v1.2.2/mspm0g3519-pin-planner.html`
- 项目长期记忆：已启用 `memory/`，由 `AGENTS.md` 强制新 Codex 任务读取和维护
- 工作区体检：`workspace-check.cmd` 只读检查版本、Git、目录、缓存和发布归档

工作区预期状态：候选源码提交后 Git 干净；正式版本仍为 `v1.2.2`，全部旧版归档和标签继续保留；`outputs/` 保存 `1.3.0-beta.1` HTML 候选，等待确认后才生成文件夹版。
