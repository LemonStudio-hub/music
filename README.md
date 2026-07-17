# Music Blocks

浏览器端音乐节奏游戏。导入音频，跟着节拍点击下落的方块。

## 使用

直接打开 `index.html`，拖入或点击选择音频文件即可开始。

## 操作

| 平台 | 操作 |
|------|------|
| PC | `D` `F` `J` `K` 对应四条轨道，`Space` 全击，`Esc` 暂停 |
| 手机 | 点击底部四条触摸区域，右上角按钮暂停 |

## 评分

- PERFECT: 偏差 < 40ms (3分)
- GREAT: 偏差 < 80ms (2分)
- GOOD: 偏差 < 120ms (1分)

连续命中累计 COMBO，每 10 连击加分加成。

## 项目结构

```
index.html              Vite 入口
vite.config.ts          Vite 配置
tsconfig.json           TypeScript 配置 (strict mode)
docs/
  ALGORITHM.md          核心算法研究文档（数学推导 + 实现细节）
src/
  main.ts               Vue 应用入口
  App.vue               根组件
  style.css             全局样式
  audio.ts              音频分析引擎（FFT/起音检测/BPM/节拍追踪）
  renderer.ts           Canvas 绘制 + 类型定义
  game.ts               游戏引擎（状态、判定、计分）
  env.d.ts              Vue SFC 类型声明
  stores/
    game.ts             Pinia 状态管理
  components/
    StartScreen.vue     开始界面
    GameScreen.vue      游戏主界面
    HitEffect.vue       打击特效
    PauseOverlay.vue    暂停覆盖层
    EndOverlay.vue      结束覆盖层
```

## 开发

```bash
npm install
npm run dev         # 启动开发服务器
npm run typecheck   # 类型检查
npm run lint        # ESLint 检查并自动修复
npm run format      # Prettier 格式化
npm run check       # 全部检查（类型 + lint + 格式）
npm run test        # 运行测试
npm run test:watch  # 监听模式运行测试
npm run test:coverage # 生成覆盖率报告
npm run build       # 生产构建（含全部检查）
```

## 测试覆盖率

| 模块 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| src/ (核心) | 91.8% | 80.5% | 92.7% | 93.2% |
| audio.ts | 100% | 90% | 100% | 100% |
| game.ts | 86.1% | 76.9% | 89.5% | 87.6% |
| renderer.ts | 98.7% | 87.5% | 100% | 100% |
| stores/game.ts | 85.7% | 82.7% | 81.8% | 91.8% |

## 技术

Vue 3 + Pinia + Vite + TypeScript (strict mode) + ESLint + Prettier。

### 核心算法

详见 [docs/ALGORITHM.md](docs/ALGORITHM.md)，主要数学理论应用：

| 模块 | 算理 | 用途 |
|------|------|------|
| FFT | 预计算旋转因子 + Hann 窗查找表 | 频谱分析，消除帧内 trig 调用 |
| 起音检测 | 频谱通量 + 复数域相位偏差 + 波峰因子加权 | 多方法融合检测音符起始点 |
| BPM | 归一化自相关 + 八度增强 + 抛物线插值 | 精确节拍速度估计 |
| 节拍追踪 | Viterbi 动态规划 | 将拍点对齐到实际音乐节奏 |
| 量化 | 柔性网格吸附 | 对齐节拍网格同时保持原始律动 |
| 段落检测 | 自相似矩阵 + 棋盘格核新颖度函数 | 自动识别 intro/verse/chorus 等段落 |
| 感知加权 | IEC 61672 A 加权曲线 | 模拟人耳等响度响应 |
| 难度系统 | 多参数调控（密度/间隔/子拍/双押） | easy/normal/hard 三档谱面生成 |
