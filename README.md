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

编辑 [`src/domain/generator.ts`](src/domain/generator.ts) 中的 `GENERATION_CONFIG`：

```ts
{ targetClues: 25, attempts: 400, minRank: 4, maxMilliseconds: 20000 }
```

- `targetClues`：挖空的目标已知数（17–80），仍然每步检查唯一解。
- `attempts`：最多筛选候选题数量（1–5000），不再是挑最少已知数的次数。
- `minRank`：最低技巧等级（2–4）；默认 4，要求用区块排除、显隐数对/三数组仍无法解完，而加入鱼形/翼形技巧后可以完整解出。
- `maxMilliseconds`：筛选时间预算，默认 20 秒，在每次开始新候选前检查；失败明确提示重试，不返回简单题或需猜测的题。

逻辑解题器独立维护候选数，只做可解释的消除，不读取答案、不回溯。依次支持显性单数、隐性单数、区块排除（指向/认领）、显性/隐性数对、显性/隐性三数组、X-Wing、Swordfish、XY-Wing；每步后重新从最简单技巧开始。每道新题都必须唯一解、低阶解题器停滞、完整逻辑解题器成功，并与独立唯一解一致。

页面底部显示本题实际使用的技巧与次数；本局结束后可以展开完整推理（原因、填入、消除）。不提供游戏中的提示按钮。旧存档保留并标为未评级，开始新游戏才应用新的筛选。

**Extreme 是本应用单一模式名称，不等同于 sudoku.com 或 Sudoku Explainer 的评级。** 这里保证的是相对于已实现技巧库的难度下限和无猜测解法；技巧次数属于一条确定性解题路径，不表示每个技巧在所有可能解法中都不可替代。未支持链、ALS 等技巧，逻辑解不出的题会被拒绝，而不是标为更难。

设计参考与验证说明见 [逻辑评级](docs/logical-rating.md)。

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

This project is licensed under the [MIT License](LICENSE).

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
