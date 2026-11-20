# easy / medium 逻辑评级

## 引擎与等级

使用 MIT 授权的 [sudoku-core](https://github.com/komeilmehranfar/sudoku-core)，固定版本 4.1.1；npm lockfile 锁定包，构建包含许可证。所有代码运行于本地，离线也能生成 L8/L9。

easy 目标为正式 L8，medium 目标为正式 L9，由 `src/domain/difficulty.ts` 集中定义等级与技巧上限。该库按最高技巧的 rank 与累计技巧分数评定 L1–L10，工作量较大时可能上调一级，因此不能断言每道 L9 都必须使用某一种 L9 技巧。其 rank 5–6.8 对应 L9 技巧段；rank ≥7 进入 L10 技巧段。这是固定版本的规则，不是 sudoku.com 或 Sudoku Explainer 的分数。

| L9 技巧 | 作用 |
| --- | --- |
| Jellyfish | 四阶鱼形消除 |
| Finned Swordfish | 带鳍三阶鱼形消除 |
| Finned Jellyfish | 带鳍四阶鱼形消除 |
| BUG+1 | 在唯一解前提与特定候选结构下确定额外候选 |
| X-Chain | 同一数字的强弱链 |
| XY-Chain | 双值格链 |

L1–L8 技巧仍会优先应用。3D Medusa、AIC、Nishio 等 L10 技巧不允许出现在接受的新题解法里。

## 生成与验收

1. 生成随机种子，根据所选档位调用 `generate('L8' | 'L9', { seed, maxAttempts: 1, timeoutMs })`。库每次挖空均校验唯一解与人类逻辑评级。
2. 使用库的 `solve` 重新求解，要求成功、唯一、正式等级与档位一致，所有步骤为已知且低于对应上限的技巧（easy: rank <5；medium: rank <7）。
3. 用本仓库独立回溯引擎确认唯一解，与逻辑结果比较；每个填入必须等于答案，每个消除不能删除答案。
4. 不合格继续生成。默认最多 500 个终盘、20 秒总预算；主线程 25 秒终止出题 Worker。失败提示重试并保留原局，不降级。

测试覆盖每档五个固定随机种子，独立唯一解校验、正式 L8/L9 评级、每步候选重放、L10/未知技巧拒绝、预算耗尽和新旧存档恢复。旧版解题器仍有全部十种技巧覆盖测试。

## 显示与存档

报告 version=2、engine=`sudoku-core@4.1.1`，显示真实等级、技巧次数，终局后开放步骤中的模式格、填入与消除。L9 技巧附简短中文原理；上游步骤未完整暴露链的每条强弱边，当前不展示完整边证明。不存在游戏内提示按钮。

旧存档 version=1 使用原来的本地十技巧评级器恢复，显示旧题标记，不伪称 L9；无评级存档继续标为未评级。新游戏才按所选档位生成。恢复时重算报告，不信任本地存储中的技巧计数或等级。

## 先前实现

旧版独立逻辑解题器参考了 [KyleGough/sudoku](https://github.com/KyleGough/sudoku) 的逐步解释思路。它提供单数、区块、数对/三数组、X-Wing、Swordfish、XY-Wing；旧版内部 rank 1–4 不等于 sudoku-core 的 L1–L4。新游戏不再使用该近似评级筛选。

## 难度选择与进度

UI 默认 easy，加载已有 core 报告时根据 L8/L9 恢复 easy/medium；旧本地评级题保持旧题标记，下一局默认 medium。切换难度与 New Game 共用确认流程。只有生成成功才替换当前棋盘和难度；失败或取消不覆盖进度。使用单一当前局存档，不为两档分别保存一局。

## 禁用技巧

两档新题都显式禁用 **WXYZ-Wing 和 W-Wing**：若 sudoku-core 的完整解法使用其中任一技巧，整题被拒绝并继续生成；不隐藏步骤、不降低 L8/L9 标准。过滤表位于 `src/domain/coreRating.ts` 的 `BANNED_TECHNIQUES`。因此接受的新题都有一条不使用 WXYZ-Wing、W-Wing 的完整解法，但不表示棋盘上完全不存在该图形。已有存档保持原题和原推理记录，从下一局应用禁用规则。
