# 发布检查清单

- [ ] 更新 `desktop/package.json` 中的版本号。
- [ ] 运行 `run-dev.cmd`，确认开发版正常启动。
- [ ] 验证 MSPM0G3507/3519 和全部 LQFP 封装。
- [ ] 验证搜索、QEI、引脚安排、标签、冲突提示、旋转、缩放、平移和主题。
- [ ] 验证 JSON/CSV 导入导出。
- [ ] 验证旧版保存的数据能够恢复。
- [ ] 运行 `build-portable.cmd`。
- [ ] 从 `outputs/` 启动新版 EXE并再次检查。
- [ ] 运行 `create-release.cmd`，确认历史版本未被覆盖。
- [ ] 记录 EXE 大小和 SHA-256。
- [ ] Codex提交 Git 记录并创建 `vX.Y.Z` 标签。
- [ ] 保留上一个可用版本，确认新版稳定后再对外发布。
