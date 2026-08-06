# 正式发布检查清单

本清单只用于从已确认的文件夹候选创建正式版本。HTML 和文件夹候选阶段见 `docs/DEVELOPMENT.md`。

## 发布前提

- [ ] 用户已确认当前 HTML。
- [ ] 用户已确认当前快速启动文件夹版。
- [ ] 用户再次明确要求创建正式版本。
- [ ] `git status` 中的改动来源明确，当前候选源码已有可追溯提交。
- [ ] `desktop/package.json` 使用不含 `beta` 的目标版本，且 `releases/vX.Y.Z/` 不存在。
- [ ] 最新正式标签和历史 `releases/` 归档均已核对，不删除、不覆盖。

## 自动与功能验证

- [ ] 运行数据校验和 `build-web.cmd`。
- [ ] 验证两颗芯片及全部受影响封装；数据改动时抽查物理脚和官方复用功能。
- [ ] 验证受影响的搜索、安排、检查、撤销/重做、工程隔离、JSON/CSV、打印和板卡模板流程。
- [ ] 存储结构有变化时验证全部仍受支持的旧数据迁移。
- [ ] 运行适用的 Electron 烟雾测试，并确保测试用户目录位于 `.tmp/`。

## 构建与归档

- [ ] 运行一次 `create-release.cmd`。它负责构建便携 EXE、文件夹版和正式归档，不预先重复运行 `build-portable.cmd`。
- [ ] 从 `releases/vX.Y.Z/` 启动文件夹版，验证窗口、版本、输入和关闭。
- [ ] 从 `releases/vX.Y.Z/` 启动便携 EXE；不能使用远程调试时采用直接窗口检查。
- [ ] 核对 HTML、EXE、文件夹清单、release notes 和 SHA-256 文件齐全。
- [ ] 运行 `workspace-check.cmd`，确认历史归档仍在且无生成内容被 Git 跟踪。

## Git 收尾

- [ ] 更新 `CHANGELOG.md` 和必要的 memory 当前状态。
- [ ] 提交正式版本源码和归档元数据。
- [ ] 创建与 `desktop/package.json` 一致的 `vX.Y.Z` 标签。
- [ ] 最终 `git status` 干净；保留上一个可用正式版本。
