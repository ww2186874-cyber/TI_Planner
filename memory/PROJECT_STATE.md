# 当前项目状态

更新日期：2026-08-23

## 版本与门禁

- 当前正式版本与最新正式标签：`1.2.2` / `v1.2.2`。
- 正式归档：`releases/v1.0.0` 至 `releases/v1.2.2`，历史版本完整保留。
- 当前候选版本：`1.3.0-beta.7`。
- 当前门禁：默认仅生成离线 HTML，等待用户目视确认；除非用户明确说“发布”，不生成候选文件夹版、便携 EXE 或正式 `v1.3.0`。
- 当前候选 HTML：`outputs/mspm0g3519-pin-planner.html`。

## 支持范围

- 芯片：`MSPM0G3519`、`MSPM0G3507`。
- MSPM0G3519：RHB-32、RGZ-48 VQFN；PT-48、PM-64、PN-80、PZ-100 LQFP。
- MSPM0G3507：RHB-32、RGZ-48 VQFN；PT-48、PM-64 LQFP。
- 候选功能：两颗芯片各自的天猛星 PM-64 模板，含 5 项固定时钟默认功能、8 项可切换板卡资源（新模板默认启用 SWD、BSL 与 NRST）、56 个 GPIO 排针映射、固定电源脚板载说明、板载电气限制和 SPI Flash/外接 H8 LCD-OLED 共享 SPI1 展示。
- 界面：Windows x64 桌面优先，固定夜间主题；打印报告白底。

## 兼容基线

- Electron 内部地址：`app://mspm0/index.html`。
- 本地存储：workspace v6、project v5，工程可选保存 `boardPresetId` 和 `enabledBoardResources`；v4/v5 工作区及旧 JSON 可读取。
- 用户数据保存在当前电脑的 Electron 用户数据目录，不随程序移动。
- 依赖版本：Electron `31.7.7`、electron-builder `24.13.3`。

## 最近验证

- `1.3.0-beta.7` 前端已按职责拆分为工程状态、规则、显示、导入导出和事件文件；继续使用原生 JavaScript，构建后仍是一个离线 HTML，存储和应用版本未改变。
- `build-web.cmd` 会自动运行芯片清单、可扩展板卡校验、v1-v6 迁移、新工程默认、搜索、板卡共享资源、规划报告、撤销历史、JSON/CSV 导出和内联构建保护；本轮全部通过。
- 所有整理后的 JavaScript 语法检查、离线 HTML 构建和 `workspace-check.cmd` 通过；独立只读审查未发现功能漏搬或事件遗漏。
- 未运行本轮 Electron 全量烟雾测试；当前候选等待用户在 `outputs/mspm0g3519-pin-planner.html` 目视确认界面和常用操作。

## 工作区

- 正式工作区：`<WORKSPACE>`。
- 候选功能检查点：`1.3.0-beta.7` 源码检查点，不创建正式标签。
- Git 远程 `origin` 已配置为 `https://github.com/ww2186874-cyber/TI_Planner.git`；全部正式标签已推送，当前 `1.3.0-beta.7` 候选提交保留在本地 `main`，尚未推送至 `origin/main`。
- `outputs/` 只保留当前 `1.3.0-beta.7` HTML 和 `.gitkeep`；旧候选及已有正式版本副本已清理，正式版本仍完整保存在 `releases/`。
- `.tmp/` 已移除隔离测试用户目录和可重建产物，保留目前仅存的芯片数据手册、原理图/EDA 参考资料及引脚规划转换文件。
- `.pnpm-store/`、`.cache/`、`desktop/node_modules/` 和全部 `releases/` 必须长期保留。
