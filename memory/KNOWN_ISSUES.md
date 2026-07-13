# 已知问题与产品取舍

## 尚未处理

- 单文件 portable EXE 每次启动需要解压 Chromium，部分电脑首次打开可能需要十几秒。
- 软件未进行商业代码签名，Windows SmartScreen 可能显示“未知发布者”。
- 公开大范围传播前，建议增加“非 TI 官方工具”声明、软件许可证和第三方许可证说明。

## 已接受的取舍

- Electron 成品较大，但目标电脑不需要安装 Node 或 WebView2。
- 配置保存在当前电脑，不随 U 盘移动。
- 当前只构建 Windows x64，不提供 macOS、Linux和32位Windows版本。
- 当前不把移动端体验作为验收目标。
