# PR #6「Rino UI」代码评审（develop-aecw → develop）

> 这是一次大规模 UI 改版：本地手牌改为 DOM 渲染、麻将牌改用卡通（toon）着色 + 描边、
> 行动 HUD 改为图片化两步选择、新增鸣牌高亮、重做 TableCenter / ResultPanel /
> WinnerDetailCard / ConnectScreen / SettingsModal、新增途中流局横幅、牌河抖动、
> 自定义字体、图片化计时数字、胶囊按钮等。
>
> 说明：本评审只列**本 PR 引入/改动**带来的问题；PR 之前就存在的问题不在此列。

---

## 进度总览（截至最新一次同步）

上游在评审后推了 2 个 commit（均名为 `fix`，`6e1fa4e` / `96ffd52`），修掉了不少问题；
我在本地又补了一批。当前状态：

**✅ 上游已修**：presubmit 五项全绿 · 加杠横幅（§3b）· 复用共享 helper（§5a）·
行动 HUD 死分支（§3c）· 拔北图片接线（§1c）· 番/符/点改用既有 key（§1a）· 字体不再预缓存（§0）

**✅ 我已修**（四个 commit，已提交到 `develop-aecw`）：

- `7f68efc` 功能与 i18n 回归：恢复托管开关到「游戏」设置页（§3a）· 补齐
  `settings.gameTab/animationSpeed/autoPlay` 三语 key（§1a）· 动画速度上限恢复到 8x（§2c）·
  `fuUnit` 脆弱正则改用 `yaku.fu`（§1a）· 恢复和牌按钮脉冲并删除失效 keyframe（§2a/2b）·
  触屏点击死区（§6d）· 清理死注释与无用参数（§5e）
- `8c48aa3` 结构性重构：拆分 `HandDisplay`（§5b/§6c）· 共享描边材质并修掉材质泄漏（§6e）·
  `CallPrompt` 分支收敛到已测 helper（§4b）· 途中流局“双横幅”收敛为一个居中横幅（§3e）·
  HUD 改用响应式尺寸 token（§6b）
- `82b8b5b` 收尾：描边改用 **InstancedMesh 批处理**，130+ draw call → **1**（§6e）·
  DOM 手牌用 CSS 复刻宝牌扫光（§3d）· 结算卡恢复玩家名与荣/摸/流局徽标（§3f）·
  字体按语言选择、英文不再套书法体（§1d）· 横幅与计时器 alt 文本本地化（§1d）·
  删除站不住脚的 eslint-disable 并真正修掉判空（§5d）· TableCenter 颜色抽成具名色板（§6f）
- `7ba14dc` 尺寸与回放：**结算界面会直接溢出屏幕**，牌/番符点/役种全部改为按视口缩放（§6g）·
  DOM 手牌补上高度预算并整体调小（§6g）· 修复**回放模式完全看不到手牌**的回归（§3g）
- `82806b8` 浏览器实测后的修正：手牌尺寸不再随剩余张数变化（§6h）·
  **回滚失败的 InstancedMesh 描边**，恢复逐牌描边壳（§6e）

测试从 477 → **541**：新增 `handLayout` / `discardGesture` / `ryuukyokuArtwork` /
`animationSpeedSlider` / `gameFont` / `resultBadge` 六组纯逻辑单测，
并补齐 `callPromptEvents` 的多面子场景。lint 现在是 **0 error / 0 warning**。

> 后半程的改动是**在浏览器里跑离线回放（`?replay=1`，无需服务端）逐条验证**的，
> 而不是只靠读代码——§6e/§6h/§6i 的结论都来自实测截图。

**⬜ 仍待处理**：字体授权 + 子集化（§6a，唯一可能阻断合并的问题）·
`ActionHUD` 两步鸣牌的交互层测试（§4a）· 计时器读秒紧迫感提示重新设计（§2a，属设计决策）

> 合并冲突已解决：上游 2 个 commit 与我的本地修复大面积重叠，冲突处基本采纳上游实现
> （`CallPrompt`/`WinnerDetailCard`/`vite.config.ts` 与上游完全一致），仅在明显更优处保留我的版本
> （`Tile3D` 删除无用参数而非改名 `_isDora`；`ActionHUD` 用渲染期重置状态而非 effect 内 `setState`）。

---

## 0. 🔴（阻断性）PR 未通过任何 presubmit 关卡 —— ✅ 现已修复

这是本次评审最优先的问题：**PR 最初提交时，AGENTS.md §1.4 / §8「Definition of
done」要求的 5 个关卡全部失败**，说明提交前没有本地跑过 `typecheck / lint /
format:check / build / test` 中的任何一个。逐项如下（上游 2 个 `fix` commit 已全部修掉）：

| 关卡           | 失败情况                                                                                                                        | 根因 / 建议                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build`        | **直接失败**——PWA/workbox 预缓存中止：`AaShenYeShiTang-2.ttf`（13.3MB）与 `Modified-DFPKanteiryu-XB.ttf`（6.77MB）超过 5MB 上限 | 排除大字体不预缓存（`globIgnores`）；根本上应给字体子集化（见 §6a）                                                                                         |
| `typecheck`    | ~20 处报错                                                                                                                      | 大量改版后遗留的无用变量（删掉的托管开关/计时器标签等），外加 `CallPrompt` 一处真实类型错误（`FlashEntry.imgSrc` 在 `exactOptionalPropertyTypes` 下不合法） |
| `lint`         | 20 errors                                                                                                                       | 无用变量、`ActionHUD` 里 effect 内同步 `setState`、多余的类型断言等                                                                                         |
| `format:check` | 14 个文件不合规                                                                                                                 | 未跑 `prettier`；很多改动文件带格式漂移                                                                                                                     |
| `test`         | `store.test.ts` 默认状态用例失败                                                                                                | 新增 `callHighlightTileIds` 到 store 却没更新测试（见 §4c）                                                                                                 |

> **关于我的本地修复（重要）**：为了能把分支跑起来评审/联调，我在**本地**把上述 5 项都修绿了，
> 但这些改动**未提交、也不会推到 `develop-aecw`**。请把它们当作评审证据，而不是替作者交付的成果——
> **presubmit 的修复应由作者在本 PR 内完成**。
> 我本地修改涉及文件里大量行变化其实是 Prettier 对本 PR 自身格式漂移的规范化，并非逻辑改动。

---

## 1. 国际化（i18n）

### 🔴 1a. 5 个新 key 在三种语言里全部缺失 —— ✅ 已修复

原问题：以下 key 在 `en/ja/zhs.json` 中**都没有**，代码里只靠 `defaultValue` 兜底，
英文用户会看到 `番/符/点`（明显错误），中/日用户看到英文 `Game` / `Animation Speed`：

| key                             | 使用位置                     | 处理方式                              |
| ------------------------------- | ---------------------------- | ------------------------------------- |
| `result.hanUnit` (默认 `番`)    | `WinnerDetailCard`           | ✅ 上游改为复用既有 `hud.han`         |
| `result.pointsUnit` (默认 `点`) | `WinnerDetailCard`           | ✅ 上游改为复用既有 `hud.points`      |
| `result.fuUnit` (默认 `符`)     | `WinnerDetailCard`           | ✅ 我改为复用既有 `yaku.fu`（见下）   |
| `settings.gameTab`              | `SettingsModal` 新“游戏”标签 | ✅ 我补齐三语 key（游戏/ゲーム/Game） |
| `settings.animationSpeed`       | `GameModalTab`               | ✅ 我补齐三语 key                     |

补充说明：上游取 `fuUnit` 时用了
`t('result.fu', { count: 0 }).replace(/^0/, '').trim()`——靠“格式化成 0 再把数字抠掉”来拿单位，
脆弱且难懂（依赖 `{{count}}` 恰好在开头、且语言里没有别的前导字符）。仓库本来就有纯单位 key
`yaku.fu`（`Fu`/`符`/`符`），已改为直接用它，与相邻的 `hud.han`/`hud.points` 保持一致。

### 🟠 1b. TableCenter 3D 文本硬编码 CJK，无法本地化

本 PR 把 `TableCenter` 原来的风牌贴图（feng_E/S/W/N）换成 DreiText 文本，直接写死
`東/南/西/北`、`余${remainingTiles}`、`局`。这些字符：

- 绑死在 CJK-only 的 `Modified-DFPKanteiryu-XB` 字体上，改成 `East 1` 之类也渲染不出来；
- `余`（剩余）、`局`（局数）对英文用户不友好。
  麻将牌面本身是汉字尚可接受，但 `余/局` 属于说明性文字，建议至少注释说明这是有意的语言中立设计。

### 🟠 1c. 鸣牌图片化后，`nukidora` 却没有图片（回退成文字）—— ✅ 上游已修复

原问题：`拔北.png` 资源已加入仓库，但 `ACTION_IMAGES`（`ActionHUD.tsx:17`）**没有映射 `nukidora`**，
导致拔北按钮渲染成文字，而吃/碰/杠/立直/自摸/跳过都是图片——视觉不一致。
上游已补上 `nukidora: '/assets/ui/拔北.png'`。

### 🟡 1d. 字体分流与 alt 文本 —— ✅ 已修复

**字体**：原来 `i18n.language === 'zhs' ? 'GameFontZH' : 'GameFont'`，日文/英文都落到
`GameFont`。查了一下这两个字体的实际身份：`GameFont` 是 DFP**勘亭流**（日本歌舞伎/相扑用字体），
`GameFontZH` 是 Aa沈夜食堂（中文）——所以中/日各自其实是对的，**问题只出在英文**：
它被套上了一个没有正经拉丁字形设计的 CJK 书法体。

处理：抽出 `gameFont.ts`，按语言给完整 font stack，英文直接走系统字体栈；
每条 stack 都以通用字族收尾，这样在那几 MB 字体加载完之前文字也能正常显示
（顺带缓解 §6a 的体积问题）。支持 `ja-JP` 这类带地区的 tag。6 个单测。

**alt 文本**：

- `CallPrompt` 原来 `alt={f.type}`（直接暴露 `'ryuukyoku'` 这种内部枚举），
  改为按类型映射到既有 key（`hud.action.*`；途中流局用 `result.ryuukyoku.${reason}`）后本地化。
- 计时器原来每个数字一个 `alt={d}`——读屏会把 "12 秒" 念成两个孤立数字。
  改为数字图片 `alt="" aria-hidden`，容器加 `role="timer"` + 一条完整的
  `aria-label`（新增三语 key `hud.secondsRemaining`）。

---

## 2. 动画

### 🔴 2a. 计时器脉冲动画被删除，keyframe 变成死 CSS —— ✅ 部分修复（死 CSS 已删）

原问题：旧 `HUDTimer` 有 `animate-[timer-pulse_1s_infinite_alternate]` + 红光文字，新版改为静态
数字图片，不再有任何动画，`@keyframes timer-pulse` 变成无人引用的死代码，倒计时“紧迫感”提示丢失。

处理：已删除该 keyframe——它动画的是 `border-color`/`box-shadow`，而新的计时器是**裸数字图片**，
没有边框可动，原样恢复没有意义。**仍待设计**：读秒紧迫感提示建议改为对数字图片做缩放/变色
（例如剩余 ≤5 秒时脉冲），这属于设计决策，未擅自实现。

### 🟠 2b. 荣和/自摸按钮的脉冲动画被删除 —— ✅ 已修复

原问题：旧 `ActionHUD` 里 agari 按钮带 `animate-[hud-agari-pulse_1.5s_infinite]`（吸引注意），
新版 agari 变成静态图片 `和.png` 后不再脉冲，keyframe 也成了死代码。

处理：把 `hud-agari-pulse` 重新挂到 `和.png` 上（该 keyframe 是 `transform: scale` + text-shadow，
对图片同样适用），既恢复了 UX 又消掉了死 CSS。

### 🟠 2c. 动画速度上限由 x8 降到 x2（功能回退）—— ✅ 已修复

原问题：旧 HUD 下拉是 x0.25/0.5/1/2/4/8；新 `GameModalTab` 滑杆写成 `min 0.25 max 2 step 0.25`，

> 2x 的快进（尤其看回放）没了。`animationSpeed` 本身在 `Tile3D`、粒子、回放（`client.ts:783`）
> 中一直正常生效，所以是**能力被砍**而非坏掉。

处理：滑杆改为**按档位索引**（`ANIMATION_SPEEDS = [0.25, 0.5, 1, 2, 4, 8]`），恢复到原有 6 档。
纯映射逻辑抽到 `src/ui/animationSpeedSlider.ts`（`speedToSliderIndex` / `sliderIndexToSpeed`），
并补了 `animationSpeedSlider.test.ts`（5 个用例：档位齐全、往返一致、就近取档、平手取慢档、越界钳制）。

### 🟡 2d. 本地手牌动画不再受 `animationSpeed` 影响

本地手牌改 DOM 后，动画走 CSS transition（`hover:-translate-y-5` 等），与 `animationSpeed`
无关。这是 DOM 方案的固有取舍，非 bug，但意味着“加速”对自己的手牌不再起作用。

### ✅ 2e. 正常运作/新增得不错的动画

- `CallPrompt` 的 `animate-call-prompt-entrance/exit` 保留，途中流局横幅复用同一套入场/退场动画。
- `TableCenter` 新增 `BlinkIndicator`（正弦呼吸）表示当前行动者，替代了旧的“分数变粉”。
- `River3D` 按 `traceId` 做确定性 ±2° 抖动，观感更自然（静态旋转，非逐帧动画）。

---

## 3. 功能对齐（feature parity）

### 🔴 3a. 网页端删除了托管开关（自动和/不鸣牌/自动切/自动拔北）

原问题：`HUDLeftPanel` 里的 4 个托管按钮被删且未迁移。`rabiriichi.toggleAutoAgari/NoCalls/
AutoDiscard/AutoNuki()` 仍然存在（CLI 还在用），但**网页端已无入口**——功能回退。

处理：已把 4 个开关迁到设置弹窗的「游戏」标签（`GameModalTab`），保持原有交互：
复用既有三语 key（`hud.autoAgari/noCalls/autoDiscard/autoNuki` + `*Desc` 提示气泡，均已存在）、
沿用原来的高亮样式，并保留「拔北仅在 `config.doraOption & 128`（三麻规则）时显示」的条件。
新增 key 仅 `settings.autoPlay`（已补三语）。

### 🔴 3b. 加杠（kakan / 加槓）鸣牌横幅不再触发 —— ✅ 上游已修复

原问题：`CallPrompt` 用 `called.length > prevCount` 判定“有没有新副露”，
而这里的 `called.length` 是**副露（面子）的个数**。加杠确实会多出第 4 张牌叠在碰面子上——
但在 `reducer.ts:587-599` 里，加杠是用 `called.map(... return updatedKan ...)` **原地替换**那组碰
（碰面子从 3 张变 4 张、第 4 张标 `KAKAN`），所以**面子个数 `called.length` 不变**；相比之下
碰/吃/大明杠/暗杠走的是 `called = [...called, group]`（`reducer.ts:519/610`，个数 +1）。
于是检测条件对加杠永远为 false → 加杠横幅丢失。

上游修法与建议一致：`prevCalledCounts` 改为存**上一帧的面子数组**而非个数，个数不变时再调用
`findNewMeldCallType(prevCalled, called)` 检测“某面子升级成杠”，个数变化时只处理新追加的面子。
⚠️ 仍建议补一条针对该路径的回归测试（现有加杠用例测的是 helper，不是 `CallPrompt` 的触发条件，见 §4b）。

### 🟠 3c. 行动 HUD 的“分组内牌预览”成了死分支 —— ✅ 上游已修复（按“删死代码”方案）

原问题：新流程把多分组的吃/碰/杠折叠成一个图标按钮，点开进第二步再选具体分组；但所有 option
都不再设置 `.tiles`，`opt.tiles ? (...)` 渲染分支**永远走不到**（死代码）。

上游已删除该死分支。注意这等于确认了取舍：**单一分组**鸣牌时只显示图标、不再预览牌面
（旧版每个吃/碰组合都会直接显示牌），需要靠 hover 高亮手牌来确认吃哪几张——
若觉得可用性有损，可考虑单分组时也显示牌面。

### 🟠 3d. 本地手牌的宝牌高光（dora sheen）丢失 —— ✅ 已用 CSS 复刻

原问题：宝牌闪光在 toon 材质里**保留了**（`createToonMaterial` 内含 DORA_SHEEN，由帧循环的
`uIsDora` 驱动），3D 牌河/副露上的宝牌仍会扫光；但本地手牌改 DOM 后
（`HandDisplay`/`UiTile` 无任何宝牌概念），**玩家看不到自己手里宝牌的扫光**。

处理：用 CSS 复刻同一视觉，参数对齐着色器而不是随手调——

| 着色器                                       | CSS 对应                                                |
| -------------------------------------------- | ------------------------------------------------------- |
| `mod(uTime * 2.0, 2.5)` → 周期 1.25s         | `animation: dora-sheen 1.25s linear infinite`           |
| 对角扫光 `uv.x + uv.y - progress`            | `linear-gradient(135deg, …)` + background-position 动画 |
| 加性叠加 `gl_FragColor.rgb += sheen`（0.75） | `mix-blend-mode: plus-lighter`，白色 0.75               |

是否为宝牌复用既有纯逻辑 `checkIsDora(tile, doraIndicators)`（与 3D 完全同源，
自动覆盖赤宝牌），并加了 `prefers-reduced-motion` 关闭动画。

### 🟠 3e. 途中流局 flash —— 新增部分实现正确，但要分清两套“流局展示”系统

先厘清事实（重要）：流局本来就有**两套**展示，本 PR 只新增了其中一小块：

1. **既有系统（本 PR 未改动）**：任何 `ryuukyokuEvent`（含途中流局 **和** 荒牌流局）都会
   `startResultAnimation('ryuukyoku')`（`client.ts:756-758`）→ `ResultAnimation3D` 在桌面中央播放
   动画版“流局/具体番种名”大字（`result.ryuukyoku.${reason}`），**并配有流局语音**
   （`gameVoice.ts:292-308`：`kyuushu_kyuuhai` 专属语音、荒牌流局按听/不听放语音），
   同时 `getEventDelay` 对流局返回 **3000ms**（且结果事件强制 `speed=1`，`client.ts:783/839`），
   这个延时是**必要的**，用来给动画+语音留出播放时间，之后才进结算面板。
2. **本 PR 新增**：`CallPrompt` 针对 5 种途中流局在**庄家座位旁**额外弹一张图片横幅
   （`四风连打/九种九牌/四家立直/三家和了/四杠散了`，reason key 与服务端
   `RyuukyokuEvent.cs` **完全一致** ✅）。

**由此带出一个真正的问题——途中流局会“双横幅”**：对 5 种途中流局，`resultAnimation` 同样被置为
`'ryuukyoku'`，所以 `ResultAnimation3D` 会在中央显示文字（如“四风连打”），而 `CallPrompt` 又在庄家旁显示图片（四风连打.png）——**同一信息同时出现两处**（时间上也重叠：flash 约 1.5s，中央动画 3s）。
另外 `CallPrompt` 把 flash 定位到 `seat = room.info.dealer`（庄家座位），注释却写“table center”，名实不符。

**✅ 处理**：把两点一起收敛掉——

1. 途中流局横幅改为**居中**渲染（它是全桌事件、不属于某个座位；这也正是原注释想表达的），
   并放大尺寸（`w-40 sm:w-56 lg:w-80`）以匹配“全桌公告”的分量；
2. 图片与文字**二选一**：把图片映射抽到 `src/ui/ryuukyokuArtwork.ts`，
   `ResultAnimation3D` 通过 `hasRyuukyokuArtwork(reason)` 判断——有图片就不再渲染文字。
   荒牌流局（`end_game_ryuukyoku`）没有图片，**照旧**走中央文字 + 语音 + 3s 延时，行为不变。

已补 `ryuukyokuArtwork.test.ts`（覆盖 5 种途中流局有图、荒牌流局无图、空/未知 reason）。

### 🟡 3f. 每局结算卡去掉了赢家名字与荣/摸/流局徽标 —— ✅ 已恢复（初版方案）

原问题：`WinnerDetailCard` 不再渲染 `getPlayerDisplayName` 与徽标。名字在 `FinalResultPanel` /
`ScoreTransferPanel` 仍有，但 3~4 人局的**单局**结算辨识度明显下降——一张只有分数的卡片，
看不出是荣和、自摸，还是听牌罚符。

处理：把两者放回卡片**顶部那一行**——那行原本就只挂着靠 `ml-auto` 右推的听牌待牌，
左侧是空的，正是它们原来的位置。左起：玩家名（过长截断，最多占 40%）+ 结果徽标。

徽标逻辑抽成纯函数 `resultBadge.ts`（7 个单测）：

| 情况     | 文案                 | 颜色 |
| -------- | -------------------- | ---- |
| 自摸     | `hud.action.tsumo`   | 粉   |
| 荣和     | `hud.action.ron`     | 粉   |
| 流局满贯 | `yaku.NagashiMangan` | 青   |
| 听牌     | `result.tenpai`      | 灰   |

荣/摸的判定沿用 reducer 的权威写法 `agari.isTsumo ?? isTsumoTile(agari.incoming)`，
不自己另发明一套；四种文案全部复用已存在的三语 key，未新增。

> 这是**初版方案**：位置与配色我按“信息最缺的地方”选的，若你更想放在别处（比如卡片左侧竖排、
> 或与分数同行）可以直接调，逻辑已经隔离在 `resultBadge.ts` 里。

### 🔴 3g. 回放模式下**完全看不到手牌** —— ✅ 已修复

改版把本地玩家的 3D 手牌整个隐藏了，改由 DOM 的 `HandDisplay` 承担：

```tsx
// PlayerArea3D.tsx
{
  !isLocal && <Hand3D … />;
}
```

但 `HandDisplay` **只挂在 `GamePlayHUD` 里**，而 `App.tsx:233` 对回放走的是另一条分支：

```tsx
if (isReplay)
  return (
    <>
      <ReplayHUD />
      <ResultPanel />
    </>
  ); // 没有 HandDisplay
```

`ReplayHUD` 只从 `GamePlayHUD` 引了 `GameInfoPanel` / `TenpaiWaitPanel`。
于是回放里：3D 手牌被隐藏、DOM 手牌没挂载 → **当前视角的手牌凭空消失**。
这是典型的「A 处删掉、假设 B 处会补上，但 B 只覆盖了一部分入口」。

处理：在 `ReplayHUD` 里也挂 `<HandDisplay />`。安全性已确认——回放不产生 inquiry
（`replayDriver` 完全不碰 `currentInquiry`），因此 `playableIds` 为空，手牌在回放中是
**惰性的**（不可点、不可拖）；视角切换（`setReplayPerspective`）与 `PlayerArea3D` 的
`isLocal` 用的是同一个 `currentUser.id`，两者始终一致。

---

## 4. 测试覆盖

### 🔴 4a. 新增逻辑几乎零测试 —— ✅ 大部分已补

原问题：`HandDisplay`（拖拽状态机、布局计算）、`ActionHUD` 两步鸣牌、途中流局检测、加杠触发条件
全都没有测试。AGENTS.md §4：“领域/视图模型逻辑的改动若无对应测试即视为未完成”。

已按“先抽纯函数、再测”的方式补上（共 +44 个用例，477 → 521）：

| 模块                           | 覆盖内容                                                             |
| ------------------------------ | -------------------------------------------------------------------- |
| `handLayout.test.ts`           | 8 例：缩放、横屏手机不溢出、居中、待切牌槽位、阈值随牌高缩放、空手牌 |
| `discardGesture.test.ts`       | 7 例：死区容忍抖动、达阈值切牌、中途放弃、向下拖、阈值随尺寸变化     |
| `ryuukyokuArtwork.test.ts`     | 3 例：5 种途中流局有图 / 荒牌流局无图 / 空 reason                    |
| `animationSpeedSlider.test.ts` | 5 例：档位齐全、往返一致、就近取档、平手取慢档、越界钳制             |
| `callPromptEvents.test.ts`     | +4 例：多面子下的加杠、无变化、追加面子、清空面子                    |

⬜ 仍未覆盖：`ActionHUD` 两步鸣牌的选择流程与 hover 高亮（依赖组件渲染，按 AGENTS.md §4
“不写 GUI 测试”的约束，建议后续把 option 扁平化逻辑也抽成纯函数再测）。

### 🔴 4b. 现有测试在测“死代码”，制造虚假绿灯 —— ✅ 已随 §5a 一并解决

原问题：`CallPrompt.tsx` 曾不再 import `callPromptPosition.ts` / `callPromptEvents.ts`，
两个文件及其测试却仍在且通过——套件是绿的、却在测**孤儿代码**；尤其那条加杠用例是对死 helper 通过，
而线上路径其实是坏的。

上游改回复用这两个 helper（见 §5a），孤儿状态自然消失，加杠用例重新覆盖到真实调用链。

**✅ 进一步处理**：上游修复后 `CallPrompt` 里仍留着一段 `if (面子数变了) {...} else {...}` 分支，
而这两种情况 `findNewMeldCallType` **内部本来就都处理了**（`current.length > previous.length`
走追加分支，否则走原地升级分支），属于把已测逻辑又抄了一遍。已收敛成单次调用：

```ts
const meldType = findNewMeldCallType(prevCalled, called);
if (meldType) trigger(pid, p.seat, meldCallToCallType(meldType));
```

这样“何时触发”与“触发什么”都由那个被测 helper 决定，测试真正守住了线上路径；
顺带把名不副实的 ref `prevCalledCounts`（其实存的是面子数组）改名为 `prevCalledMelds`。

### 🟠 4c. 改 store 未同步改测试 —— ✅ 上游已修复

新增 `callHighlightTileIds` 到 state 时没更新 `store.test.ts`——说明该改动当时没跑过测试套件。上游已补。

---

## 5. 代码质量

### 🔴 5a. 重复/反抽象：内联函数重造了已抽好的模块 —— ✅ 上游已修复

原问题：`CallPrompt` 内联重写了两处早就抽好且有测试的逻辑
（`getSeatClass` 重复 `getCallPromptSeatClass`、`detectCallType` 重复 `getMeldCallType`），
与 AGENTS.md §3 的 DRY/模块化要求相反，内联版还丢了加杠处理。

上游已改回复用 `getCallPromptSeatClass` 与 `findNewMeldCallType`，并加了一个很薄的
`meldCallToCallType` 适配器把 `MeldCallType` 映射到 `CallType`。

### 🟠 5b. `HandDisplay`（近 400 行）职责过多 —— ✅ 已重构

原问题：拖拽状态机（~90 行）、响应式几何计算（`tileGeo`）、音效、渲染全塞在一个组件里；
自由牌与摸到的牌各写了一份几乎相同的 `<button>` 标记；待切牌的 `left` 在两处手工重算。

已拆成 4 个文件，每个职责单一、都在规范的行数内：

| 文件                  | 行数 | 职责                                                        |
| --------------------- | ---- | ----------------------------------------------------------- |
| `handLayout.ts`       | ~79  | 纯几何：牌宽/牌高/行高/拖拽阈值/居中偏移/待切牌槽位（已测） |
| `discardGesture.ts`   | ~50  | 纯判定：点击 vs 拖拽、是否切牌、是否吞掉 click（已测）      |
| `useDragToDiscard.ts` | ~126 | React 手势 hook，组合上面两者                               |
| `HandDisplay.tsx`     | ~268 | 组件本体：`HandTile` 子组件统一渲染，自由牌与摸牌共用       |

顺带修掉：待切牌 `left` 现在只由 `layout.pendingLeft` 计算一次（原先两处手抄同一个表达式）。

### 🟠 5c. `ActionHUD` 两步渲染有重复 —— ✅ 上游已消除

上游删掉死分支（§3c）后，第二步的分组牌面渲染只剩一处，重复自然消失；
`<CallTileGroup>` 抽取已无必要。

### 🟡 5d. 防御性判空 warning 与一条站不住脚的 eslint-disable —— ✅ 已修复

查证结论：那条
`// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- proto fields may be null at runtime`
**理由是错的**。`agari.gainPoints` / `losePoints` 并不是 proto 字段，而是**领域模型**字段
（`model.ts:38` 声明为 `gainPoints: number`，reducer 已经归一化过），而且此处 `agari`
上方就有 `if (!agari) return null` 收窄。也就是说判空本来就是死代码，disable 只是把
lint 的正确提示压掉了——很像调试时随手加上忘了删。

处理：删掉 disable，同时删掉 `?? 0`，直接写 `agari.gainPoints - agari.losePoints`。

`CallPrompt` 那两条同理：`riichiTileId` 在模型里是 `number`（reducer 用 `?? 0` 归一化过），
所以 `gs.riichiTileId ?? 0` 是多余的，已去掉。**保留**的一处是
`prevRiichiIds.current.get(pid) ?? 0`——`Map.get` 对首次见到的玩家确实返回 `undefined`，
这是真实的可空，已加注释说明。

结果：lint 从 3 warning → **0 error / 0 warning**，且没有新增任何抑制。

### 🟡 5e. 残留注释式死代码 / 拼写 —— ✅ 已修复

- `GameTable.tsx` 的 `{/* Grid helper disabled */}` 已删除（AGENTS.md §3 要求删除死/注释代码）。
- `TableCenter` 注释错字 `佘XX` 上游已改为 `余XX`。
- `Tile3D.createMappedMaterial` 的无用参数：上游改名为 `_isDora` 保留，我直接删除了该参数
  与两处实参（AGENTS.md §3「不留死代码」）。

---

## 6. 响应式 / 硬编码常量 / 移动端（横屏）

### 🔴 6a. 约 25MB 商用字体（授权 + 体积）

新增 `AaShenYeShiTang-2.ttf`(13.3MB)、`Modified-DFPKanteiryu-XB.ttf`(6.77MB)、
`DFPKanTeiRyu-XB.ttf`(4.8MB)。

- **授权**：DynaFont（DFPKanteiryu 楷書体）与「Aa沈夜食堂」都是商用字体，放进公开开源仓库有
  授权风险（AGENTS.md §1「external-clean」、§7「尊重上游许可」）。请确认可再分发或换成 OFL/开源字体。
- **体积/移动端**：即便排除两个大字体后 SW 仍预缓存约 18MB，且字体运行时仍需下载。强烈建议
  **子集化（subset）**：3D 桌面只用到 `東南西北余局`+数字，结算页也就有限字符——可从 MB 级降到 KB 级。

### 🟠 6b. 改版后 HUD 大量固定尺寸、无断点 —— ✅ 已修复（HUD 部分）

原问题：`ActionHUD` 动作图片 `h-20`、按钮间距 `gap-20`(80px)，`HUDTimer` 数字图片 `h-20`，
全是固定值、无断点。**横屏手机高度只有约 390px**，80px 的图片会吃掉五分之一屏。

处理：在 `styles.ts` 新增 `HUD` token，按**视口高度**缩放（横屏下高度才是稀缺轴）：

```ts
actionImage: 'h-[clamp(2.5rem,9vh,5rem)] w-auto object-contain',
timerDigit:  'h-[clamp(2.5rem,9vh,5rem)] w-auto',
actionRowGap:'gap-[clamp(0.75rem,4vw,5rem)]',
```

桌面端维持原来的 80px 观感，横屏手机自动降到 40px 左右。

⬜ 仍待处理：`WinnerDetailCard` 役种列表 `text-2xl`、番/点 `text-6xl`，`ResultPanel` 标题
`text-7xl`、确认按钮 `text-3xl px-8 py-4` —— 结算面板同样是固定字号，建议一并 `clamp()` 化。

### 🟠 6c. `HandDisplay` 里的魔法数字 —— ✅ 已修复

原问题：`84`(牌宽)、`109`(牌高)、`21`(斜面)、`164`(拖拽阈值)、`1100`(最大宽)、`0.75`(vw 比例)、
`12`/`2`(间距) 散落在组件里，待切牌 `left` 还手工重算了两遍。

处理：全部收进 `handLayout.ts` 的具名常量（`BASE_TILE_WIDTH` / `MAX_HAND_WIDTH` /
`TILE_GAP` / `PENDING_TILE_GAP` / `DRAG_THRESHOLD_RATIO` …），并由 `computeHandLayout()`
单点计算出 `pendingLeft`；死区常量 `TAP_DEAD_ZONE_PX` 收进 `discardGesture.ts`。

### 🟠 6d. 点击切牌在触屏上可能失效 —— ✅ 已修复

原问题：`HandDisplay` 中只要 down/up 间有任何 `pointermove` 就置 `didMoveRef`，若 up 时未达拖拽阈值便
抑制 click（不切牌）。触屏点击经常有 1~2px 抖动，导致**点牌切牌在手机上静默失败**。

处理：加入 `TAP_DEAD_ZONE_PX = 10` 移动死区——只有累计位移超过该阈值才算作拖拽
（`Math.hypot(dx, dy) > TAP_DEAD_ZONE_PX`），轻微抖动的点击不再被吞掉。

### 🟠 6e. Toon 描边使每张牌的绘制翻倍 —— ✅ 部分修复（材质已共享，并修掉一个泄漏）

原问题：`Tile3D.OutlineClone` 把整张牌 clone 出来、按 1.05 放大再渲染一遍，且**每张牌、每个 mesh
都 `new THREE.MeshBasicMaterial`**。全桌 130+ 张牌 → 上百个内容完全相同的材质对象。

排查中还发现一个**更严重的问题**：`Tile3D` 里**没有任何 `dispose()`**，所以这些描边材质
在牌卸载（每局重开、牌被打出）时**不会释放**——是持续泄漏，不只是启动开销。

处理：改为**模块级单例** `OUTLINE_MATERIAL` 全场共享。既消掉了上百个材质分配与泄漏，
也减少了 GPU 状态切换；对 material 数组的 mesh 赋单一材质，还顺带把描边的分组 draw call 合并成一次。
（几何本来就是 `Object3D.clone()` 按引用共享的，不额外占顶点内存。）

**❌ 尝试改用 InstancedMesh 批处理——失败，已回滚**

先回答“为什么不能自动批处理”：**three.js 不会自动合批**。渲染器按场景图逐个 `Mesh` 提交，
每个 `Mesh` 有自己的 model matrix，就必然是一次独立 draw call。想合批只有两条路：

- `InstancedMesh`——**同一 geometry + 同一 material**，每个实例只差一个变换矩阵；
- `BatchedMesh`（three r160+）——多 geometry、单 material，靠 multi-draw 合并。

理论上描边正是 InstancedMesh 的教科书场景。我实现了一版（registry + 单个 InstancedMesh），
但**在浏览器里实测：牌上完全没有描边**。原因是这个牌模型的结构比想象中麻烦
（直接解 `tile.glb` 的 JSON chunk 看到的）：

```jsonc
nodes: [
  { name: "RootNode", children: [1] },
  { name: "Cube.002", scale: [100, 100, 100], mesh: 0 }  // ← 100 倍缩放
]
meshes: [ { name: "Cube.002", primitives: 3 } ]          // ← 3 个图元
```

1. **mesh 节点带 100× 缩放**：几何体本身只有最终尺寸的 1/100。只用「牌的世界矩阵」驱动实例，
   就把这 100 倍丢了，描边壳被画成百分之一大小 → 肉眼不可见。
2. **3 个 primitive**：GLTFLoader 会拆成 3 个兄弟 Mesh，`getObjectByProperty('type','Mesh')`
   只拿到其中一个（侧面），并不是整张牌。

我又试了把每个 primitive 的模型空间矩阵烘进实例矩阵（`worldMatrix × scale × localMatrix`，
每个 primitive 一个 InstancedMesh），**实测仍然不出描边**，没能在合理时间内定位剩余偏差。

**结论：已回滚**，恢复每张牌一个描边壳，但**保留共享材质**（那部分是实打实的改进：
消掉上百个材质分配 + 泄漏）。若之后要再做批处理，上面两点是必须先处理的坑。

**关于「描边看起来没生效」**：描边壳只放大 **1.05**，正常视距下几乎贴着牌边，所以很不显眼。
我在浏览器里临时调到 1.35 验证过——描边**确实在工作**，只是 1.05 下非常细。
按你的判断**维持 1.05**（放大后偏粗，原样更好看）。该系数已抽成常量 `OUTLINE_SCALE`，随时好调。

### ℹ️ 6i. 牌桌上那个大黑色四边形 —— 排查结论：**不是本 PR 的问题**

你截图里横跨牌桌的黑色四边形轮廓，我在浏览器里逐项排除过：

| 假设                  | 验证方式                                 | 结果                                    |
| --------------------- | ---------------------------------------- | --------------------------------------- |
| 是 toon 描边坏了      | 完全关掉描边再看                         | ❌ 黑框仍在                             |
| 是我的 InstancedMesh  | 回滚成逐牌描边再看                       | ❌ 黑框仍在                             |
| 是阴影 frustum 边缘   | 关掉 `castShadow`、收紧正交阴影相机+bias | ❌ 黑框仍在                             |
| 是某个巨大的黑色 mesh | 遍历场景，按世界包围盒找大物体           | ❌ 只有牌桌本身，黑色 mesh 全是小描边壳 |
| 是 DOM 边框           | 扫描所有大尺寸元素的 border/outline      | ❌ 无                                   |
| **是牌桌贴图**        | **把牌桌 mesh 隐藏**                     | **✅ 黑框随之消失**                     |

所以它是 **`table_diffuse.webp` 这张贴图里画着的东西**（房间场景里那张玻璃桌的边缘）。
`git log` 显示该贴图最后一次改动是 `1d4805e Theme revamp`，**本 PR 从未碰过**它。

如果观感上不想要这几条线，那是**美术资源问题**，需要改贴图，与本次改版无关。

### 🟡 6f. TableCenter 硬编码颜色 —— ✅ 已修复

原问题：`#02B6BF`(青，出现 4 次)、`#FF5454`(庄家红)、`#BFBFBF`(灰)、以及分数差的
`#00ff66`/`#ff3366`/`#ffffff` 都直接散在 JSX 里。

处理：收进文件顶部的具名色板 `TABLE_CENTER_COLORS`，每项带注释说明用途
（`label` / `score` / `scoreAhead` / `scoreBehind` / `dealerWind` / `seatWind`）。
现在文件里除色板定义外不再出现任何色值字面量。

### 🔴 6g. 结算界面与手牌尺寸过大，结算界面会**直接溢出屏幕** —— ✅ 已修复

这是实际截图暴露出来的问题，比预想严重：结算界面的牌溢出右边缘、番/点数字换行被切掉、
役满标签被按钮压住。查了一下改版把这些尺寸**成倍放大**了：

| 元素            | 改版前          | 改版后（本 PR）      | 现在（按视口缩放）         |
| --------------- | --------------- | -------------------- | -------------------------- |
| 结算牌 `UiTile` | `w-8`(32px)     | `w-16`(**64px**)     | `clamp(22px, 3.6vh, 36px)` |
| 番/点数字       | `text-lg`(18px) | `text-6xl`(**60px**) | `clamp(20px, 4.2vh, 40px)` |
| 役种列表        | `text-sm`(14px) | `text-2xl`(24px)     | `clamp(11px, 1.9vh, 16px)` |
| 役满/满贯标签   | —               | `text-6xl ml-10`     | `clamp(16px, 3.4vh, 32px)` |
| 结算标题        | —               | `lg:text-7xl`(72px)  | `clamp(20px, 5vh, 48px)`   |
| 确认按钮        | —               | `text-3xl px-8 py-4` | 同样 `clamp()` 化          |

一副和了手牌是 14 张 + 副露排一行，64px 的牌宽在**笔记本上就已经放不下**，更别说手机。
现在统一收进 `styles.ts` 的 `RESULT` token（与 §6b 的 `HUD` 同一套思路：按**视口高度**缩放，
因为横屏下高度才是稀缺轴），并给数字加 `whitespace-nowrap` 防止换行被裁。
顺带删掉了 `UiTile` 里没人用过的 `hand: 'w-32'`（128px）变体。

**DOM 手牌**也有同类问题，但方向相反：`computeHandLayout` 原本**只按宽度**限制，
所以「宽而矮」的窗口（笔记本、横屏手机）里手牌照样很高，把牌桌挤没。
已补上**高度预算**（不超过视口高度的 14%）并下调宽度上限：

| 视口             | 改版后（本 PR） | 现在      | 占屏高 |
| ---------------- | --------------- | --------- | ------ |
| 桌面 1920×1080   | 84×109          | **63×82** | 9.1%   |
| 笔记本 1512×672  | 84×109          | **60×78** | 13.8%  |
| 横屏手机 844×390 | 48×62           | **35×45** | 13.8%  |

`handLayout.test.ts` 相应加了「任何视口下行高 ≤15% 视口高」「整副手牌不超出视口宽度」
「小视口不塌成 0 宽」等断言。

### 🔴 6h. 手牌尺寸会随剩余张数变化 —— ✅ 已修复

本 PR 的原始写法（我在重构时照搬了，没质疑，是我的疏忽）：

```ts
const tw = Math.min(84, Math.floor(maxW / Math.max(freeTiles.length, 1)));
```

牌宽是拿「**当前**手牌张数」去除总宽度算出来的，于是**每次吃碰杠、每次打牌，整副手牌都会
肉眼可见地跟着变大变小**——这不该发生：牌的尺寸应当固定，只有整排的长度随张数变化。

处理：分母改为常量 `MAX_FREE_TILES = 13`（满手的自由牌数）。现在无论手里有 13/10/7/4 张，
牌宽牌高完全一致，只是那一排变短、并保持居中。已加回归测试
（13→0 张牌尺寸/行高/拖拽阈值全等；张数减少时 `leftOffset` 右移、`pendingLeft` 左移）。

---

## 7. 合并前剩余事项（按优先级）

阻断性问题、功能回退、结构性重构与性能问题都已修完（见开头「进度总览」）。剩下的是：

1. 🔴 **字体授权 + 子集化**（§6a）——公开开源仓库里放商用 CJK 字体是**授权风险**，
   且 SW 仍预缓存约 13MB。**这是唯一一条建议在合并前必须解决的问题**，需要人来决策
   （确认可再分发 / 换 OFL 字体 / 子集化），我不便代劳。
   （英文已不再依赖这两个字体，见 §1d，算是缓解了一点。）
2. 🟠 **真机验证一次**——本轮改动里有两处需要眼睛确认，自动化测试覆盖不到：
   - **描边批处理**（§6e，风险最高）：牌移动时描边是否跟手、隐藏的牌有无残留描边；
   - **横屏排版与帧率**（§6b）：HUD 已按视口高度 `clamp()` 缩放。
3. 🟡 **确认新的尺寸手感**（§6g）——牌与数字现在按视口高度缩放，桌面端手牌约 63px/张、
   结算牌约 36px。数值都集中在 `styles.ts` 的 `RESULT` 与 `handLayout.ts` 的常量里，
   觉得还要再大/再小可以直接调一个数。
4. 🟡 **产品取舍确认**：§3c 单分组鸣牌不再预览牌面、§2a 计时器读秒没有紧迫感提示
   （原动画已失效并删除，重做属设计决策）、§3f 徽标的位置与配色是我选的初版。
5. 🟡 **收尾**：`ActionHUD` 两步鸣牌流程的纯逻辑抽取 + 测试（§4a）——目前唯一还没有
   测试覆盖的新增交互。
