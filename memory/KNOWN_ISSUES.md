# 已知问题

更新日期：2026-08-24

这里只记录尚未解决、会影响用户或发布判断的问题。已接受的产品取舍放在 `DECISIONS.md`，已解决故障放在 `LESSONS.md`。

- 单文件 portable EXE 每次启动需要解压 Chromium，部分电脑首次打开可能需要十几秒；快速启动文件夹版是当前替代方案。
- 正式程序没有商业代码签名，Windows SmartScreen 可能显示“未知发布者”。
- Harness 插件当前只验证 DSH `0.1.1-rc.2`；升级后会保留源码和用户 preset，但必须重新核对契约，不能直接视为兼容。新增 Host/Client 元数据尚未由用户手动重启加载，重启后的现有 Web GUI/七工具目视验收仍待完成。
- DSH `0.1.1-rc.2` 是单用户 trusted-browser 模型：context-scoped Remote 阻止普通 UI 请求体自填会话 ID，但不提供抵御恶意同源插件或 XSS 的 per-plugin/per-session ACL。需要 DSH/BFF 不可伪造 capability 才能建立更强边界。
