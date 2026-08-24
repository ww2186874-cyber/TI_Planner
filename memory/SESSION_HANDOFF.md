# 任务交接

更新日期：2026-08-24

## 当前门禁

- 网页/Electron 主产品仍为 `1.3.0-beta.13`；默认只等待离线 HTML 目视确认。没有用户明确“发布”前，不构建文件夹版、portable EXE、正式归档或标签。
- 独立 `harness-plugin/` 版本为 `0.1.1`，固定目标 MSPM0G3519 / PM-64 / `tianmengxing-g3519-pm64`，固定兼容 DSH `0.1.1-rc.2`。
- 插件已以本地 link 安装进 Web Profile；用户 preset `mspm0-planner` 已再次通过真实 mount-validation。当前进程仍运行修改前加载的 Host/Client 模块，`0.1.1` 的 Remote revision 契约和重做界面必须由用户手动重启现有 DSH 后加载。
- 规划标签已重做为接近原版的桌面 EDA 工作台：外设/信号分栏、方形 PM-64 封装、64 个焊盘/外部功能双层标签、候选与板卡状态色、聚焦检查器、检查/代码覆盖层和容器响应式布局；Harness 原生导航与 Composer 保持不变。
- 插件全套 `pnpm run build` 已通过 44/44 测试；TI SDK 来源锁、812 项独立映射、风险人类确认/取消、Session Settings/revision、context-scoped Remote、代码 revision 门禁、普通引脚点击、四边封装 DOM、scoped 容器布局、弹窗键盘路径、SPI 三线基线和代码预览排除项均有回归覆盖。
- 已用 Chromium 隔离 fixture 验收 1800×1050 默认工作台/引脚详情/代码覆盖层和 1200×900 信号分栏；它不代替重启后的真实 Harness GUI 验收。
- 安装/卸载/检查脚本不会停止或重启 DSH；所有重启必须由用户本人执行。

## Harness 插件下一步

1. 用户本人手动重启当前 DSH Web Profile；不要启动另一个服务器替代现有 GUI。
2. 刷新 `http://127.0.0.1:3080`，新建会话时选择“MSPM0 引脚规划” preset。
3. 打开 additive “引脚规划”标签，确认出现方形四边封装、外设/信号相邻分栏和右侧聚焦检查器；目标为 MSPM0G3519 / PM-64 / 天猛星模板，默认 9 项保护存在，Composer 不遮挡画布或弹窗。
4. 在宽屏和缩窄 Harness 侧栏后的内容区分别确认封装自动适配、信号栏切换和检查器覆盖行为，不要求复制 Harness 自身导航外壳。
5. 确认 7 个工具可见：`mspm0_plan_read`、`mspm0_signal_candidates`、`mspm0_assign_signal`、`mspm0_auto_plan`、`mspm0_release_pin`、`mspm0_check_plan`、`mspm0_generate_init_code`。
6. 验收普通 UART0 安排；对 PA0/PA1 或板载/可选资源候选选择一次取消并确认规划未变；自动安排 SPI0 并确认只显示三线基线/topology warning；生成代码并确认 `nonIomux` 排除清单可见。
7. 可在代码弹窗打开期间让 AI 修改规划，确认旧 revision 预览被拒绝或关闭，而不会冒充当前代码。
8. 若 DSH 升级，不直接绕过 engine 门禁；先重新 Inspect Service/Slot/Remote/Client Module 与 preset 契约，再构建和 mount-validate。

## 网页候选下一步

1. 打开当前离线 HTML，确认宽屏下工程选择组比原来更靠近页面中部，同时仍与右侧操作保持同一排。
2. 在 1100、1300 px 左右窗口确认工程选择偏移自动收回，选择框和右侧按钮没有被推出视口。
3. 进入“外设资源”并选择 UART0、I2C0、SPI0 等实例，确认详情栏不覆盖芯片、画布压缩与关闭恢复正常，首次滚轮缩放和右键拖动不跳动。
4. 用户确认 HTML 后继续网页版流程；只有用户明确说“发布”后，才改为正式 `1.3.0` 并运行 `create-release.cmd`。

## 未完成事项

- 未替用户重启 DSH；因此插件 `0.1.1` 重做界面和新 Remote revision 契约的当前 GUI 运行时验收仍待用户完成。
- 未启动 Electron，未构建文件夹版或便携 EXE，未创建 `1.3.0` 正式版本、release archive 或标签。
