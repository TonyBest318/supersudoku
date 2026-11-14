# 游戏架构

## 技术选择

React + strict TypeScript + Vite + CSS Grid。没有全局状态库、后端、在线题库或第三方运行时服务。Vitest 验证纯函数核心。

## 数据流

UI / 键盘 → GameAction → gameReducer → GameState → 棋盘和 localStorage。

新游戏 → Web Worker → 随机完整解 → 逐格随机挖空 + 唯一解检查 → 低阶停滞验证 → 完整逻辑解题与评级 → Puzzle → createGame。

## 模块

| 文件 | 职责 |
| --- | --- |
| `src/domain/types.ts` | 题目、单元格、操作、游戏状态 |
| `src/domain/board.ts` | 行、列、宫关系 |
| `src/domain/solver.ts` | 位掩码 + 最少候选优先回溯，最多寻找两个解 |
| `src/domain/generator.ts` | 随机终盘与挖空、唯一解约束、技巧筛选及时间/数量预算 |
| `src/domain/logicalSolver.ts` | 10 种人类技巧、候选持续消除、结构化推理记录 |
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

从空盘用随机候选顺序求出完整解；打乱 81 格顺序后尝试删除。每次删除调用确定性求解器，发现第二解便立即停止并恢复该格。`generateCandidate` 只保证唯一解，供内部与测试使用；游戏调用 `generatePuzzle` 做技巧筛选。

默认先运行 rank ≤ 3 的逻辑解题器；能解出的题立即拒绝。低阶停滞后运行完整技巧库，只有成功解完且答案与唯一解一致的题才发布。默认最多 400 个候选、20 秒预算，失败抛出错误，不降级。Worker 发送进度消息，主线程保留当前游戏直至新题成功；失败后可重试。

每题附带 `analysis`：版本、状态、最高技巧等级、各技巧次数和完整推理。旧存档没有该字段，保持未评级。已评级存档恢复时从已验证的 givens 重算报告，避免信任未经校验的存储内容。详细规则见 [逻辑评级](logical-rating.md)。

## 本地持久化

键 `super-sudoku.game.v1`，结构带 schemaVersion。恢复时检查题目唯一解、解的一致性、已知数不可修改、草稿合法、错误次数、终局一致性和历史上限。异常数据不恢复；写入失败提示用户，不中断内存中的游戏。

## 当前验证范围

自动测试覆盖核心数学约束与游戏状态转换；浏览器检查实际键盘、3×3 草稿、同数高亮、三错锁定、刷新恢复、新游戏和窄屏布局。构建同时生成静态主包和 Worker 包。不依赖外部字体、图片或 API；本地静态服务可离线运行，生产构建支持可安装 PWA。


## PWA

`public/manifest.webmanifest` 定义独立窗口安装、名称和图标。`scripts/build-sw.mjs` 在 Vite 构建后扫描完整 dist，以文件内容 hash 命名缓存；包括单独的出题 Worker。Service Worker 采用完整版本缓存，导航返回同版本 HTML，缓存成功后 skipWaiting 以恢复无法打开的旧客户端，不强制刷新窗口，仅清理本应用 scope 的旧缓存。

`src/pwa/InstallPanel.tsx` 仅在生产、安全上下文中注册 SW。浏览器支持 beforeinstallprompt 时显示安装按钮；其他环境提供系统安装说明。安装区域键盘事件不传播至游戏。页面使用 safe-area-inset 适配独立窗口安全区域。

缓存导航响应使用新 Response 去掉重定向记录（clone 会保留该记录），避免 Safari 报 “Response served by service worker has redirections”。缓存版本同时包含 SW 构建脚本 hash，确保仅 SW 变更也会建立新缓存。
