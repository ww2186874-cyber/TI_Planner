# 开发说明

本文是网页/Electron 主产品源码结构、验证范围和候选构建的权威说明。不可删除内容、正式发布授权和 memory 维护边界由根目录 `AGENTS.md` 规定。DeepSeek Harness 插件由同级独立 Git 仓库维护，不属于本构建链。

## 开发门禁

| 阶段 | 允许动作 | 完成条件 |
|---|---|---|
| 网页迭代（默认） | 修改源码、数据、测试和文档；运行自动校验；生成 HTML | `build-web.cmd` 通过，向用户提供 `outputs/mspm0g3519-pin-planner.html` |
| 正式发布 | 用户明确说“发布”后改为不含 `beta` 的版本，运行 `create-release.cmd`，验证归档并打标签 | 用户已确认当前 HTML，并明确要求发布 |

没有明确的“发布”指令时，不运行 `run-dev.cmd`、`build-folder.cmd`、`build-portable.cmd` 或 `create-release.cmd`。`create-release.cmd` 已依次构建便携 EXE、文件夹版并归档，正式发布时不需要提前单独构建。

## 源码入口

| 范围 | 入口 |
|---|---|
| 页面结构与样式 | `web/template.html` |
| 前端入口与源码合并顺序 | `web/app.js`、`web/app-bundle.js` |
| 工程状态、规则、显示、导入导出与事件 | `web/app/` |
| 芯片文件、封装、默认视图与外设清单 | `web/device-catalog.js` |
| MSPM0G3519 官方引脚数据 | `web/pin-data.json` |
| MSPM0G3507 官方引脚数据 | `web/pin-data-3507.json` |
| 板卡模板 | `web/board-presets.json` |
| 数据与板卡校验 | `web/data-validation.js`、`web/board-schema-validation.js`、`web/board-validation.js`、`web/validate-data.js` |
| 快速回归检查 | `web/run-tests.js` 及 `web/*-test.js` |
| 单文件网页构建 | `web/build.js` |
| Electron 窗口与受限桥接 | `desktop/main.js`、`desktop/preload.js` |
| 桌面烟雾测试 | `desktop/scripts/smoke-test.js` |
| 应用版本 | `desktop/package.json` |

不要直接编辑 `outputs/mspm0g3519-pin-planner.html`、`desktop/app/index.html` 或 `desktop/dist/`。

`web/app/` 中各文件按职责维护，`web/app-bundle.js` 在构建时把它们放入同一个原生 JavaScript 作用域，最终仍只交付一个离线 HTML。`web/app.js` 只负责启动，不再堆放业务代码。修改共享变量或调整文件顺序时，必须同步检查 `SOURCE_FILES`。

## 构建链路

```text
web 分层源码、芯片清单与 JSON
  -> build-web.cmd（快速回归检查、数据校验、源码合并）
  -> outputs/mspm0g3519-pin-planner.html
  -> desktop/app/index.html（仅在正式发布流程中继续打包）
  -> Electron 文件夹版 / 便携 EXE
```

Electron 固定从 `app://mspm0/index.html` 加载页面，使升级或移动程序后仍能读取同一用户数据目录中的工程。


## 验证范围

| 改动类型 | 最低验证 |
|---|---|
| 文案、流程文档、内部脚本整理 | `workspace-check.cmd` 和 `git diff --check` |
| 页面样式或普通交互 | `build-web.cmd`，再由用户检查离线 HTML |
| 芯片数据、封装、功能或板卡资源 | `build-web.cmd` 中的数据校验，并抽查受影响的芯片/封装 |
| 保存结构、工程模型、导入导出 | 提升存储版本并覆盖当前格式往返和重启恢复；投入使用后必须迁移旧数据，尚未投入使用的有意重做需明确记录不兼容决定 |
| Electron 窗口、文件对话框、桥接、图标 | 先说明网页版无法验证；仅在用户明确要求发布时运行 `run-dev.cmd` 和对应桌面烟雾测试 |
| 正式发布 | 完整执行 `docs/RELEASE_CHECKLIST.md` |

验证应与改动风险匹配，不为纯文档改动运行耗时的 Electron 全量测试。视觉验收优先使用用户在真实浏览器或桌面候选中的截图；自动浏览器不能打开 `file://` 时不重复等待。

## 工程目标与数据

- 保持 `appId`、应用名称和 `app://mspm0/` 不变。
- 一个工程只保存一个固定芯片型号和一个固定封装；目标只能在新建工程时选择，后续通过新建其他工程规划不同目标。
- 空白工程由用户选择型号和封装；开发板模板自动固定其声明的型号和封装。没有工程时必须先完成新建工程。
- 当前 workspace v7/project data v6 是尚未投入使用前的有意重做，不读取 v1-v6 旧预发布本地存储或旧 JSON；旧存储键保留但忽略。
- 新工程默认值与已保存工程规范化必须分开；加载、导入、复制和清空不得悄悄补回新默认值。
- 以后软件投入使用后，保存对象字段或含义变化必须提升版本并提供迁移，再用真实旧版数据验证。

## 增加芯片或封装

1. 以官方数据手册为准生成独立 JSON 数据。
2. 在 `web/device-catalog.js` 中登记数据文件、封装脚数、默认封装、缩放和外设实例。
3. 在 `web/data-validation.js` 的独立官方预期中登记封装、关键默认脚和外设范围；不能只依赖运行清单自证正确。
4. 运行 `build-web.cmd`，抽查电源脚、GPIO、复用功能、QEI、ADC、封装脚号和资源数量。
5. 只有官方表确认一致时才能复用同一芯片的封装数据；不得跨芯片复制完整 IOMUX。

## 增加板卡模板

1. 板级走线只写入 `web/board-presets.json`，不混入芯片官方引脚 JSON。
2. 共用 PCB 走线不等于共用功能表；每个目标芯片的默认功能都要独立校验。
3. 板卡约束与用户备注分开保存，只有用户明确从模板新建时才写入 `boardPresetId` 和默认安排；模板同时固定其声明的型号和封装。
4. 一个物理引脚连接多个板卡资源时使用 `resources`；总线共享关系使用 `sharedBuses`，不要让后录入的资源覆盖先前连接。
5. 已有工程、复制工程和导入文件不重新套用模板或默认值；板载冲突只提醒，不阻止用户修改。

## 依赖与缓存

- Electron：`31.7.7`
- electron-builder：`24.13.3`
- 桌面锁文件：`desktop/pnpm-lock.yaml`
- 依赖：`desktop/node_modules/`
- pnpm 缓存：`.pnpm-store/`
- Electron 缓存：`.cache/electron/`
- builder 缓存：`.cache/electron-builder/`

脚本从 `scripts/common.ps1` 统一定位 Codex 或系统 Node/pnpm、配置国内镜像并复用工作区缓存。除非确认依赖损坏，不重装或清空缓存。

## Git 与版本

- Git 记录源码、脚本、文档、release notes 和哈希清单，不记录大型 EXE、HTML、依赖或构建目录。
- `outputs/` 只保存当前可覆盖的网页版候选；`releases/vX.Y.Z/` 是不可覆盖正式归档。
- beta 候选可以提交，但不创建正式标签。正式归档验证通过后再创建对应 `vX.Y.Z` 标签。
- 补丁版本用于修复和小型样式调整；次版本用于新功能、新芯片或新封装；主版本用于不兼容变化。纯内部重构不单独提升应用版本。
