# MSPM0 项目协作规则

`<USER_HOME>\Desktop\MSPM0` 是 MSPM0 引脚规划器的唯一正式开发工作区。用户最新明确要求优先于本文；实际行为以源码和测试为准，正式版本以 Git 标签和 `releases/` 归档为准，memory 只作辅助上下文。

## 开始任务

1. 检查 `git status --short --branch`、`desktop/package.json` 版本和最新 Git 标签，先识别已有未提交修改。
2. 必读 `memory/PROJECT_STATE.md` 和 `memory/SESSION_HANDOFF.md`；按 `memory/README.md` 的路由检索相关决策、经验和已知问题，不要求每个任务重复通读全部历史。
3. 修改产品源码、数据或构建链时读 `docs/DEVELOPMENT.md`；发布时读 `docs/RELEASE_CHECKLIST.md`；整理文件时读 `docs/WORKSPACE_HYGIENE.md`。
4. 不覆盖来源不明或用户已有的修改。无法区分时先保留并说明。

## 不可违反的边界

- 只修改源码和配置。`outputs/mspm0g3519-pin-planner.html`、`desktop/app/index.html`、`desktop/dist/` 均由脚本生成，不直接编辑。
- 不删除或覆盖 Git 历史、`releases/vX.Y.Z/` 历史版本、`.pnpm-store/`、`.cache/`、`desktop/node_modules/`。未知文件不自动删除。
- 临时截图、日志、测试 JSON 和一次性脚本只放 `.tmp/` 或既有测试目录。
- 保持 Electron `appId`、应用名称和 `app://mspm0/` 地址稳定。保存结构变更必须提升存储版本并提供旧数据迁移。
- 芯片和封装数据以官方资料为准；不得因脚位相似而跨芯片复用完整 IOMUX。板卡走线与芯片官方数据分层保存。
- 发布物必须保留 `legal/` 中的许可证、第三方声明、数据来源和非官方声明。
- 产品以 Windows x64 桌面端为主，不把手机布局作为当前验收目标。

## 阶段门禁

1. **默认网页版迭代**：完成源码与相应自动校验后，只运行 `build-web.cmd` 生成离线 HTML，交给用户确认。没有用户明确的“发布”指令，不运行 `run-dev.cmd`、`build-folder.cmd`、`build-portable.cmd` 或 `create-release.cmd`。
2. **正式发布**：只有用户明确说“发布”后，才把版本改为不含 `beta` 的正式版本并运行一次 `create-release.cmd`。该脚本负责构建便携 EXE、文件夹版和正式归档，不提前单独构建任何桌面产物。
3. `outputs/` 只保存当前网页版候选，可由同一候选反复生成；`releases/` 不可覆盖。beta 可以提交 Git，但不创建正式标签；正式归档验证通过后才创建对应 `vX.Y.Z` 标签。

桌面专属源码如果确实属于用户需求，先说明网页版无法验证该部分；仍保持网页版优先，直到用户明确要求“发布”。

版本规则：修复和小型样式调整提升补丁版本；新功能、新芯片或新封装提升次版本；不兼容的数据或产品变化提升主版本。纯文档、测试或内部重构在不改变交付行为时不单独提升应用版本。

## 验证与收尾

- 验证范围随风险调整。芯片数据、板卡资源或功能映射变更必须运行 `web/validate-data.js` 或包含它的构建；存储变更必须覆盖旧数据迁移。桌面专属验证只在用户明确要求发布时执行，不因普通网页版迭代自动启动 Electron。
- 结束前运行 `workspace-check.cmd` 或等价检查并查看最终 Git 状态。
- memory 按事实变化更新，不要求每次机械修改全部文件：状态变化写 `PROJECT_STATE.md`，新长期取舍写 `DECISIONS.md`，已确认且可复用的故障规律写 `LESSONS.md`，未解决问题写 `KNOWN_ISSUES.md`，未完成动作和下一门禁写 `SESSION_HANDOFF.md`。
- 不在 memory 复制聊天过程、一次性命令输出、发布哈希全文、猜测、密钥或个人数据。已有 release notes、源码或其他文档能准确承载的内容只链接，不重复抄写。
- 源码和文档完成相应验证后由 Codex提交 Git。等待用户目视确认的 beta 可以保存为无标签检查点，后续反馈使用新提交修正。
