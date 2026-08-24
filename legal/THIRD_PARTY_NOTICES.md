# 第三方组件声明

MSPM0 引脚规划器桌面版使用 Electron 31.7.7、Chromium、Node.js 及其间接依赖。

- Electron：MIT License
- Chromium：BSD-style licenses 及各组件对应许可证
- Node.js：MIT License 及各组件对应许可证
- electron-builder：MIT License

Electron 发行目录中包含 `LICENSE` 和 `LICENSES.chromium.html`，文件夹版会原样保留这些文件；单文件便携版运行时也会释放对应的 Electron 运行文件。

项目内独立的 DeepSeek Harness 插件还使用：

- `@deepseek-ai/schemastery`、`zod`、`@deepseek-ai/dsh-typert-protocol`：运行时 MIT License 组件；
- `@deepseek-ai/dsh-typert-loader`、`esbuild`：开发/验证期 MIT License 组件；
- TI MSPM0 SDK `mspm0g351x.h` 中提取的 IOMUX 宏定义、标识符与 PF 映射：BSD-3-Clause，Copyright (C) 2023 Texas Instruments Incorporated。

插件保留了锁定源文件的路径、Git blob、完整头文件 SHA-256 和独立宏定义提取，并在 `harness-plugin/THIRD_PARTY_NOTICES.md` 中附带完整 BSD-3-Clause 和 MIT 文本。该插件不是正式 Electron 发布物的一部分，除非发布流程以后明确纳入它。

第三方项目名称和商标仅用于说明依赖关系，不表示其作者对本软件提供认可或担保。完整许可证文本以发行物内随附文件和各上游项目公布的许可证为准。
