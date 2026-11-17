# 游戏架构

## 技术选择

React + strict TypeScript + Vite + CSS Grid。使用固定版本 sudoku-core 4.1.1，本地生成并评定 easy=L8 / medium=L9。没有全局状态库、后端、在线题库或第三方运行时服务。Vitest 验证纯函数核心。

## 数据流

UI / 键盘 → GameAction → gameReducer → GameState → 棋盘和 localStorage。

新游戏 → Web Worker → sudoku-core 按 easy/medium 生成 → 重新评级、校验所选档位技巧上限 → 独立唯一解及逐步答案校验 → Puzzle → createGame。

## 模块

| 文件 | 职责 |
| --- | --- |
| `src/domain/types.ts` | 题目、单元格、操作、游戏状态 |
| `src/domain/board.ts` | 行、列、宫关系 |
| `src/domain/solver.ts` | 位掩码 + 最少候选优先回溯，最多寻找两个解 |
| `src/domain/generator.ts` | 随机终盘与挖空、唯一解约束、技巧筛选及时间/数量预算 |
| `src/domain/logicalSolver.ts` | 旧版 10 种技巧解题器，保留原存档评级兼容 |
| `src/domain/coreRating.ts` | sudoku-core 正式评级、步骤适配与所选档位上限校验 |
| `src/domain/difficulty.ts` | easy/L8、medium/L9 映射与存档难度识别 |
| `src/components/DifficultyReport.tsx` | 技巧统计，终局后查看逐步推理 |
| `src/game/generator.worker.ts` | 后台生成，避免阻塞输入与绘制 |
| `src/game/reducer.ts` | 输入、草稿、擦除、撤销、错误计数和完成判断 |
| `src/game/useGame.ts` | Worker 生命周期、状态持有、存档恢复及持久化 |
| `src/game/shortcuts.ts` | 工具栏快捷键约定 |
| `src/storage/localStorage.ts` | 存档结构、唯一解、状态一致性验证 |
| `src/components/Board.tsx` | 81 格、固定九个草稿槽、同数高亮、已知/用户/错误数字样式 |
| `src/App.tsx` | 工具栏、数字面板、快捷键、开局确认、终局反馈 |

## 规则

不计时，无暂停需求。正式填入与解不同的数字计错，第三错立即进入 lost。错误值留在棋盘以便识别，重复同值不二次计错。草稿不计错。撤销只恢复棋盘，不撤销错误记录，终局不可撤销。全部 81 个值与解一致时进入 completed。

正确填数清除本格草稿和同组同数草稿；一个历史快照覆盖全部连带变更。错误填数不清除其他格的草稿。历史限制为 200 步。

键盘事件限制在游戏区域，忽略组合输入、文本输入框和不相关修饰键；单次动作忽略按住键重复，方向键允许连续移动。新游戏完成后焦点回到游戏区域。进行中的游戏区域内 Tab 切换草稿并阻止默认焦点移动，Shift+Tab 保留默认导航，终局后 Tab 不再拦截。棋盘使用方向键导航，错误同时用标红、感叹号及可访问文本表示。

## 随机生成和验证

`generatePuzzle` 调用固定版本 sudoku-core 的 `generate('L8')` / `generate('L9')`，每次一个随机终盘，最多 500 次 / 20 秒，发送实际终盘尝试进度。库在挖空时检查唯一解、逻辑可解与等级。随后重新用 `solve` 获取正式评级与步骤，拒绝等级不符、未知技巧或超过所选档位的步骤，并用独立回溯引擎验证唯一解、最终答案和每步填入/消除。

Worker 失败时不替换旧局。主线程另设 25 秒终止保护，完成、失败、新游戏或卸载时清理计时器。`generateCandidate` 仍保留为旧解题器的测试工具，不参与新游戏生成。

报告 version=2 表示 sudoku-core，并记录精确引擎版本、L 等级、技巧计数和步骤。version=1 是旧版本地评级。恢复存档时根据版本，从已验证 givens 重新计算报告；未评级旧存档不强加新等级。详细规则见 [逻辑评级](logical-rating.md)。

## 本地持久化

键 `super-sudoku.game.v1`，结构带 schemaVersion。恢复时检查题目唯一解、解的一致性、已知数不可修改、草稿合法、错误次数、终局一致性和历史上限。异常数据不恢复；写入失败提示用户，不中断内存中的游戏。

## 当前验证范围

自动测试覆盖核心数学约束与游戏状态转换；浏览器检查实际键盘、3×3 草稿、同数高亮、三错锁定、刷新恢复、新游戏和窄屏布局。构建同时生成静态主包和 Worker 包。不依赖外部字体、图片或 API；本地静态服务可离线运行，生产构建支持可安装 PWA。


## PWA

`public/manifest.webmanifest` 定义独立窗口安装、名称和图标。`scripts/build-sw.mjs` 在 Vite 构建后扫描完整 dist，以文件内容 hash 命名缓存；包括单独的出题 Worker。Service Worker 采用完整版本缓存，导航返回同版本 HTML，缓存成功后 skipWaiting 以恢复无法打开的旧客户端，不强制刷新窗口，仅清理本应用 scope 的旧缓存。

`src/pwa/InstallPanel.tsx` 仅在生产、安全上下文中注册 SW。浏览器支持 beforeinstallprompt 时显示安装按钮；其他环境提供系统安装说明。安装区域键盘事件不传播至游戏。页面使用 safe-area-inset 适配独立窗口安全区域。

缓存导航响应使用新 Response 去掉重定向记录（clone 会保留该记录），避免 Safari 报 “Response served by service worker has redirections”。缓存版本同时包含 SW 构建脚本 hash，确保仅 SW 变更也会建立新缓存。
