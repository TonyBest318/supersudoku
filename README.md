# Super Sudoku

React + TypeScript 单机数独。随机生成、唯一解验证、三错结束、不计时；界面只提供一个模式，没有提示按钮或难度选择。

## 启动

```sh
npm install
npm run dev
```

打开终端显示的本地地址。生产构建：`npm run build`；预览：`npm run preview`；测试：`npm test`。

游戏无需账号、后端或互联网 API。依赖安装需要网络；安装后本地服务器可在断网时运行。生产构建包含 Service Worker 离线缓存与 PWA 安装支持；不支持直接双击 `dist/index.html`。

## 配色

页面底部可切换晴空蓝、森林绿、暖纸棕、暮色紫、午夜深色五种配色。主题会自动保存在本地，切换不影响当前游戏进度；配色区域保留正常 Tab 与方向键操作，不触发游戏快捷键。

## 操作

| 操作 | 快捷键 |
| --- | --- |
| 填数字 / 切换单个草稿 | 1–9（含小键盘） |
| 草稿模式 | Tab |
| 擦除当前格 | Backspace / Delete |
| 撤销 | Ctrl+Z / Cmd+Z |
| 选择相邻格 | 方向键 |

- 游戏区域内按 Tab 切换草稿并保持焦点；Shift+Tab 保留向前移动焦点，终局后 Tab 恢复默认导航。
- 草稿固定为 `1 2 3 / 4 5 6 / 7 8 9`，缺少数字不改变其他数字的位置。
- 点击已有数字，或输入数字时，全盘同数及草稿高亮。
- 某数字的 9 个位置全部正确填好且没有该数字的错误填入时，数字面板对应按钮显示灰色勾并禁用；擦除或撤销后自动恢复。
- 正式输入与唯一解不符即计一次错误并标红；草稿不计错。连续重复同一个错误值不重复扣次；擦除或撤销后重新填错会计次。
- 擦除和撤销不返还错误次数；第三错结束后不能再编辑，仍可查看棋盘或开始新游戏。
- 正确填数自动移除同行、列、宫的同数草稿；撤销同时恢复这些草稿。
- 自动保存当前题目、草稿、错误次数、选择和最近 200 步历史。刷新继续，损坏的存档会被忽略；存储不可用时显示提示。
- 进行中的游戏点击 New Game 会先确认；胜利或失败后可以直接开局。

## 调整生成参数

新游戏使用固定版本 **sudoku-core 4.1.1**，提供两个独立难度配置：

| 页面名称 | 正式评级 | 技巧上限 |
| --- | --- | --- |
| easy | L8 | 拒绝 L9、L10 技巧（rank < 5） |
| medium | L9 | 拒绝 L10 技巧（rank < 7） |

首次打开默认 easy；已有 L9 存档恢复为 medium。页面顶部切换难度会开始新局，进行中的游戏先确认；取消或生成失败保留当前进度和原难度。New Game 沿用当前难度，刷新恢复存档对应难度。目前仍只保存当前一局，不是两套独立存档。

生成器按选择调用 `generate('L8')` 或 `generate('L9')`，然后重新求解评级；只接受等级与所选档位完全一致、步骤不超过对应技巧上限的题目。继续使用本仓库独立求解器确认唯一解、核对最终答案，以及每次填入/候选消除的正确性。不能把库内的数值 rank 直接当作 L 等级；正式评级也考虑累计解题工作量。

编辑 [`src/domain/generator.ts`](src/domain/generator.ts) 中的 `GENERATION_CONFIG`：

```ts
{ attempts: 500, maxMilliseconds: 20000 }
// generatePuzzle({ ...GENERATION_CONFIG, difficulty: 'easy' })
```

这是候选终盘数量与时间预算。每次挖空时都由库检查唯一解和等级，已知数数量不作为难度判定。主线程另外在 25 秒后终止过慢的出题 Worker。预算用尽提示重试，保留原进度，不返回不符合当前档位的题。

页面显示当前档位、对应 L8/L9 与 `sudoku-core`、技巧次数；本局结束后可展开技巧、模式位置、填入与消除记录。链的强弱边未由上游步骤 API 完整暴露，当前展示模式格及结果，不声称提供逐条链边证明。游戏中不提供提示按钮。

旧题保持原进度与原评级；开始新游戏才按所选档位生成。sudoku-core 的等级 不等同于 sudoku.com 的 Extreme。设计和版本说明见 [逻辑评级](docs/logical-rating.md)。

## 验证

`npm test` 覆盖十个固定随机种子的唯一解与行/列/宫合法性，以及三错结束、草稿、撤销、已知数保护、胜利和存档校验。`npm run build` 包含 strict TypeScript 检查。

浏览器已实际检查：键盘草稿输入、方向移动、同数草稿高亮、擦除撤销、刷新恢复、第三错锁定、新游戏和桌面/窄屏布局。

模块说明见 [架构](docs/architecture.md)。

## 安装到手机 / 平板（PWA）

1. 运行 `npm run build`，将整个 `dist/` 部署到 HTTPS 静态站点根路径。服务器为 `sw.js` 和 `index.html` 设置 `Cache-Control: no-cache`，带 hash 的 assets 可长期缓存。
2. 首次联网打开网页，等页面底部显示“离线资源已就绪”。此后断网可恢复进度，也可随机生成新题。
3. Android Chrome：点击页面提供的“安装应用”（浏览器允许时显示），或浏览器菜单 → 安装应用 / 添加到主屏幕。
4. iPhone / iPad：用 Safari 打开 → 分享 → 添加到主屏幕。系统如显示“作为 Web App 打开”，保持开启。

本机验证：`npm run preview` 后访问 localhost。手机访问电脑的普通 HTTP 局域网 IP 不满足 PWA 安全上下文要求；需要可信 HTTPS，不要绕过证书警告。

`npm run dev` 不注册 Service Worker，防止开发时缓存旧代码。生产构建会预缓存 HTML、JS、CSS、图标、manifest 和出题 Worker。新版缓存准备好后会主动激活，但不会强制刷新正在玩的页面；重新打开即使用新版，本地存档和主题不受缓存更新影响。页面响应会移除缓存中的重定向记录，避免 Safari 拒绝打开。浏览器清除站点数据或系统回收站点存储仍可能删除缓存和存档。

安装不提供跨设备同步；各设备各自保存。iOS 的主屏幕应用可能使用独立存储，不保证继承 Safari 中现有进度。

验证命令：`npm run test:pwa` 检查构建图标尺寸、manifest、离线页面和出题 Worker 缓存，以及旧缓存清理边界。手机系统安装弹窗与真机离线体验仍需在 HTTPS 部署后验证。

## License

This project is licensed under the [MIT License](LICENSE). Bundled sudoku-core attribution is included in [third-party licenses](public/third-party-licenses.txt).

## GitHub Pages

在本机测试、构建并推送静态产物：

```sh
npm ci
npm run deploy:pages
```

发布前先提交源码。脚本要求工作区干净，运行游戏测试、TypeScript/Vite 构建与 PWA 校验，然后在临时目录中将 `dist/` 和 `.nojekyll` 提交到 `origin` 的 `gh-pages` 分支。已有发布历史会保留，不强推，也不切换当前工作分支。没有产物变化时跳过提交。

首次设置：仓库 **Settings → Pages → Source: Deploy from a branch → gh-pages → / (root) → Save**。

站点地址：https://TonyBest318.github.io/supersudoku/

已移除自定义 Actions workflow；推送 `main` 仅更新源码，发布新版需在本地运行上述命令。GitHub 自身仍会运行 Pages 内部发布任务，`.nojekyll` 跳过 Jekyll 构建。

构建设置 `VITE_BASE_PATH=/supersudoku/`，覆盖主包、图标、manifest 与 Service Worker 路径；普通本地/Sites 构建默认仍用 `/`。

仅验证、不发布：`VITE_BASE_PATH=/supersudoku/ npm run test:pwa`。两个域名的进度和安装实例各自保存，不互相同步。
