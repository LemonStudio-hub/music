# Music Blocks 核心算法研究文档

## 1. 快速傅里叶变换（FFT）优化

### 1.1 数学基础

离散傅里叶变换（DFT）定义：

$$X[k] = \sum_{n=0}^{N-1} x[n] \cdot e^{-j2\pi kn/N}, \quad k = 0, 1, \ldots, N-1$$

直接计算 DFT 复杂度为 O(N^2)。Cooley-Tukey 基2 FFT 算法通过分治策略将复杂度降至 O(N log N)。

### 1.2 旋转因子预计算

FFT 蝶形运算中的旋转因子（twiddle factor）：

$$W_N^k = e^{-j2\pi k/N} = \cos\left(\frac{2\pi k}{N}\right) - j\sin\left(\frac{2\pi k}{N}\right)$$

**优化策略**：预计算所有旋转因子存入查找表，跨帧复用。

- 原始方法：每帧每蝶形运算调用 2 次三角函数
- 优化后：全局初始化一次，后续仅查表

**复杂度分析**：
- 初始化：O(N) 一次性开销
- 每帧节省：O(N log N) 次三角函数调用
- 对 2048 点 FFT，每帧节省约 22528 次 trig 调用

### 1.3 窗函数预计算

Hann 窗：

$$w[n] = 0.5 \left(1 - \cos\left(\frac{2\pi n}{N-1}\right)\right)$$

同样预计算为 `WindowTable`，避免每帧重复计算。

### 1.4 参数选择

| 参数 | 值 | 理由 |
|------|-----|------|
| FFT 大小 | 2048 | 频率分辨率 ≈ 21.5Hz（@44.1kHz），足以分辨音乐音符 |
| 重叠率 | 75%（hop = 512） | 时间分辨率 ≈ 11.6ms，适合起音检测 |
| 窗函数 | Hann | 旁瓣衰减 -31dB，频谱泄漏可控 |

---

## 2. 起音检测（Onset Detection）

### 2.1 频谱通量（Spectral Flux）

$$SF[n] = \sum_{k=0}^{N/2-1} H\left(|X_n[k]| - |X_{n-1}[k]|\right)$$

其中 H(x) = max(x, 0) 为半波整流函数，仅保留正向变化。

**物理含义**：频谱能量的突然增加对应音乐起音事件。

### 2.2 复数域起音检测（Complex Domain Onset）

基于相位偏差理论，检测频谱相位的不连续性：

$$\Delta\phi_k[n] = \phi_k[n] - \phi_k[n-1] - \frac{2\pi k \cdot H}{N}$$

其中 H 为 hop size，最后一项为期望相位推进。

总相位偏差：

$$CD[n] = \sum_{k=0}^{N/2-1} |\Delta\phi_k[n]| \cdot \min(|X_n[k]|, |X_{n-1}[k]|)$$

**优势**：对相位突变敏感，即使幅度变化不大也能检测到起音（如钢琴延音踏板后的重新击键）。

### 2.3 频谱波峰因子（Spectral Crest Factor）

$$C[n] = \frac{\max_k |X_n[k]|}{\frac{1}{N/2}\sum_k |X_n[k]|}$$

**物理含义**：打击乐信号的频谱波峰因子高于持续音，用于加权起音函数。

### 2.4 复合起音函数

$$O[n] = 0.5 \cdot \hat{SF}[n] + 0.3 \cdot \hat{CD}[n] + 0.2 \cdot \hat{C}[n]$$

其中 $\hat{\cdot}$ 表示归一化到 [0, 1]。

### 2.5 自适应阈值

使用指数移动平均（EMA）跟踪起音函数的统计特性：

$$\mu[n] = \mu[n-1] + \alpha \cdot (O[n] - \mu[n-1])$$
$$\sigma^2[n] = \sigma^2[n-1] + \alpha \cdot ((O[n] - \mu[n])^2 - \sigma^2[n-1])$$

阈值：$T[n] = \max(T_{min}, \mu[n] + \lambda \cdot \sigma[n])$

其中 α = 0.1（平滑因子），λ = 1.4（灵敏度系数）。

---

## 3. BPM 检测

### 3.1 归一化自相关

对起音函数进行零均值化：

$$\hat{O}[n] = O[n] - \bar{O}$$

自相关函数：

$$R[\tau] = \frac{1}{N-\tau} \sum_{n=0}^{N-\tau-1} \hat{O}[n] \cdot \hat{O}[n+\tau]$$

**关键改进**：除以 $(N-\tau)$ 进行滞后归一化，消除长滞后偏差（原始方法中长滞后自然累积更大值）。

### 3.2 BPM 搜索范围

对应滞后范围：

$$\tau_{min} = \left\lfloor \frac{60 \cdot f_s}{BPM_{max} \cdot H} \right\rfloor, \quad \tau_{max} = \left\lfloor \frac{60 \cdot f_s}{BPM_{min} \cdot H} \right\rfloor$$

其中 $f_s$ 为采样率，$H$ 为 hop size。

### 3.3 八度关系增强

音乐中 tempo 常有 2 倍/半倍关系。对每个候选滞后 τ，计算增强得分：

$$S[\tau] = R[\tau] + 0.3 \cdot R[\tau/2] + 0.2 \cdot R[2\tau]$$

### 3.4 抛物线插值

在峰值附近用二次函数拟合，实现亚样本精度：

$$\hat{\tau} = \tau^* + \frac{R[\tau^*-1] - R[\tau^*+1]}{2(2R[\tau^*] - R[\tau^*-1] - R[\tau^*+1])}$$

---

## 4. 动态规划节拍追踪

### 4.1 问题建模

状态空间：帧索引 i ∈ [0, N)
转移：从帧 i 到帧 i+p，p 为拍间周期（帧数）
目标：找到最大化起音对齐的拍点序列

### 4.2 代价函数

$$C[i] = \min_{p \in [p_{min}, p_{max}]} \left\{ C[i-p] + \lambda_{trans} \cdot \left(\frac{p - p_{exp}}{p_{exp}}\right)^2 - 2 \cdot O[i] \right\}$$

- 第一项：前一拍的累积代价
- 第二项：转移代价（二次惩罚，偏离期望周期越大代价越高）
- 第三项：观测奖励（起音越强代价越低）

### 4.3 反向回溯

从最小代价帧开始，沿 backpointer 链回溯，提取最优拍点序列。

---

## 5. 感知加权

### 5.1 A 加权曲线

IEC 61672:2003 标准 A 加权：

$$R_A(f) = \frac{12194^2 \cdot f^4}{(f^2 + 20.6^2)\sqrt{(f^2 + 107.7^2)(f^2 + 737.9^2)}(f^2 + 12194^2)}$$

归一化到 1kHz（$R_A(1000) = 1$）。

**作用**：模拟人耳等响度曲线，抑制非感知频率的能量贡献。

---

## 6. 段落检测

### 6.1 特征提取

每段（约 1.5 秒）提取 5 维特征向量：

$$\mathbf{v}_s = [\bar{E}_{bass}, \bar{E}_{mid}, \bar{E}_{high}, \bar{SF}, \bar{C}]_s$$

### 6.2 自相似矩阵

$$S[i,j] = \cos(\mathbf{v}_i, \mathbf{v}_j) = \frac{\mathbf{v}_i \cdot \mathbf{v}_j}{|\mathbf{v}_i| \cdot |\mathbf{v}_j|}$$

### 6.3 新颖度函数

使用棋盘格核（checkerboard kernel）卷积自相似矩阵：

$$\text{Nov}[i] = \sum_{d_i, d_j} K(d_i, d_j) \cdot S[i+d_i, i+d_j]$$

其中核函数在对角线两侧取相反符号，检测相似性突变。

---

## 7. 频率感知音符分配

### 7.1 对数能量压缩

原始频带能量跨度极大（低频通常高数十倍），使用对数压缩：

$$\hat{E}_b = \log_{10}(1 + 1000 \cdot E_b)$$

### 7.2 加权分配

基于压缩后的频带能量比分配轨道权重，同时维护滑动窗口历史记录，对过度使用的轨道施加惩罚（权重 ×0.3）。

---

## 8. 性能优化总结

| 优化项 | 技术 | 收益 |
|--------|------|------|
| FFT 旋转因子 | 预计算查找表 | 消除 O(N log N) trig 调用/帧 |
| 窗函数 | 预计算查找表 | 消除 O(N) trig 调用/帧 |
| A 加权 | 预计算系数表 | 消除 O(N) 浮点除法/帧 |
| 复合起音函数 | 向量化计算 | 单次遍历生成多维特征 |
| 自相关 | 滞后归一化 | 消除长滞后偏差，提高 BPM 精度 |
| 节拍量化 | 柔性吸附 | 保持原始节奏感的同时对齐网格 |
