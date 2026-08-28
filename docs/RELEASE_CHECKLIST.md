# 正式发布检查清单

本清单只用于用户明确说“发布”后创建正式版本。日常修改只生成网页版 HTML，不生成文件夹候选或便携 EXE；网页阶段见 `docs/DEVELOPMENT.md`。

## 发布前提

- [ ] 用户已确认当前 HTML。
- [ ] 用户明确要求创建正式版本。
- [ ] `git status` 中的改动来源明确，当前候选源码已有可追溯提交。
- [ ] `desktop/package.json` 使用不含 `beta` 的目标版本，且 `releases/vX.Y.Z/` 不存在，也没有同版本发布锁。
- [ ] 最新正式标签和历史 `releases/` 归档均已核对，不删除、不覆盖；同一版本不得并行运行发布脚本。

## 自动与功能验证

- [ ] 运行数据校验和 `build-web.cmd`。
- [ ] 验证两颗芯片及全部受影响封装；数据改动时抽查物理脚和官方复用功能。
- [ ] 验证受影响的搜索、安排、检查、撤销/重做、工程隔离、JSON/CSV、打印和板卡模板流程。
- [ ] 存储结构有变化时验证全部仍受支持的旧数据迁移。
- [ ] 运行适用的 Electron 烟雾测试，并确保测试用户目录位于 `.tmp/`；正式归档必须运行 `release` 模式，并将被测版本作为第 4 个参数显式传给 `smoke-test.js`。

## 构建与归档

- [ ] 运行一次 `create-release.cmd`。它负责取得版本发布锁、构建便携 EXE、文件夹版并通过同卷 staging 原子归档，不预先重复运行 `build-portable.cmd`。
- [ ] 从 `releases/vX.Y.Z/` 启动文件夹版，验证窗口、版本、输入和关闭。若标签前验收失败，保留目录并添加 `REJECTED.md` 和禁止分发说明，提升版本后重建；禁止删除、覆盖或为失败版本打标签。
- [ ] 从 `releases/vX.Y.Z/` 启动便携 EXE；不能使用远程调试时采用直接窗口检查。
- [ ] 核对 HTML、EXE、文件夹清单、release notes 和 SHA-256 文件齐全。
- [ ] 运行 `workspace-check.cmd`，确认历史归档仍在且无生成内容被 Git 跟踪。

## Git 收尾

- [ ] 更新 `CHANGELOG.md` 和必要的 memory 当前状态。
- [ ] 提交正式版本源码和归档元数据。
- [ ] 确认目标归档没有 `REJECTED.md`，再创建与 `desktop/package.json` 一致的本地 `vX.Y.Z` 标签。
- [ ] 最终 `git status` 干净，`workspace-check.cmd` 不再报告待打标签归档；保留上一个可用正式版本。
