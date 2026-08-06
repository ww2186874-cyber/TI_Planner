# 当前项目状态

更新日期：2026-08-06

## 版本与门禁

- 当前正式版本与最新正式标签：`1.2.2` / `v1.2.2`。
- 正式归档：`releases/v1.0.0` 至 `releases/v1.2.2`，历史版本完整保留。
- 当前候选版本：`1.3.0-beta.5`。
- 当前门禁：默认仅生成离线 HTML，等待用户目视确认；除非用户明确说“发布”，不生成候选文件夹版、便携 EXE 或正式 `v1.3.0`。
- 当前候选 HTML：`outputs/mspm0g3519-pin-planner.html`。

## 支持范围

- 芯片：`MSPM0G3519`、`MSPM0G3507`。
- MSPM0G3519：RHB-32、RGZ-48 VQFN；PT-48、PM-64、PN-80、PZ-100 LQFP。
- MSPM0G3507：RHB-32、RGZ-48 VQFN；PT-48、PM-64 LQFP。
- 候选功能：两颗芯片各自的天猛星 PM-64 模板，含 5 项固定时钟默认功能、8 项可切换板载资源（新模板默认启用 SWD、BSL 与 NRST）、56 个 GPIO 排针映射、固定电源脚板载说明、板载电气限制和 SPI Flash/H8 LCD-OLED 共享 SPI1 展示。
- 界面：Windows x64 桌面优先，固定夜间主题；打印报告白底。

## 兼容基线

- Electron 内部地址：`app://mspm0/index.html`。
- 本地存储：workspace v6、project v5，工程可选保存 `boardPresetId` 和 `enabledBoardResources`；v4/v5 工作区及旧 JSON 可读取。
- 用户数据保存在当前电脑的 Electron 用户数据目录，不随程序移动。
- 依赖版本：Electron `31.7.7`、electron-builder `24.13.3`。

## 最近验证

- `1.3.0-beta.5` 数据校验、烟雾脚本语法检查、底边方向回归断言、离线 HTML 构建和工作区检查通过；等待用户目视确认。
- `workspace-check.cmd` 通过；预发布版本不再产生“缺少正式归档”的无效警告。
- 未运行本轮 Electron 全量烟雾测试；当前视觉结果由用户在离线 HTML 中确认。

## 工作区

- 正式工作区：`<USER_HOME>\Desktop\MSPM0`。
- 候选功能检查点：`1.3.0-beta.5` 源码检查点，不创建正式标签。
- Git 远程 `origin` 已配置为 `https://github.com/ww2186874-cyber/TI_Planner.git`，`main` 和全部正式标签已推送并与远程一致。
- `outputs/` 只保留当前 `1.3.0-beta.5` HTML 和 `.gitkeep`；旧候选及已有正式版本副本已清理，正式版本仍完整保存在 `releases/`。
- `.tmp/` 已移除隔离测试用户目录和可重建产物，保留目前仅存的芯片数据手册、原理图/EDA 参考资料及引脚规划转换文件。
- `.pnpm-store/`、`.cache/`、`desktop/node_modules/` 和全部 `releases/` 必须长期保留。
