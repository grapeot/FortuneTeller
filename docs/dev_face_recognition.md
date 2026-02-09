# 人脸识别技术文档

本文档说明项目中使用的面相学术语定义、MediaPipe FaceLandmarker 的 landmark 索引映射，以及实际计算逻辑。

## 一、技术栈

- **人脸检测与特征点提取**：MediaPipe FaceLandmarker
- **Landmark 总数**：478 个 3D 特征点
- **模型来源**：Google MediaPipe Tasks Vision
- **运行模式**：IMAGE（单帧检测）

## 二、面相学术语定义

### 2.1 三庭（面部三分区）

三庭是面相学的基础分区方法，将面部纵向分为三个区域：

| 分区 | 范围 | 年龄段 | 主管 | 计算方式 |
|------|------|--------|------|----------|
| **上庭** | 发际线 → 印堂（两眉之间） | 15-30岁 | 智慧、父母运、早年学业事业 | `browY - foreheadY` |
| **中庭** | 山根（鼻梁根部） → 准头（鼻头） | 31-50岁 | 事业、财富、中年运 | `noseBottomY - browY` |
| **下庭** | 人中 → 地阁（下巴） | 51岁以后 | 晚年福气、子女运、健康 | `chinY - noseBottomY` |

**判断标准**：
- 三庭均等（各占约 33%）→ 一生运势平稳，衣食无忧
- 上庭突出 → 早年运佳，智慧高
- 中停突出 → 中年事业有成
- 下停突出 → 晚年福气好

**注意**：传统面相学中，上庭是从发际线到印堂，但在实际计算中，我们使用**眉毛位置**作为上庭和中庭的分界线，因为发际线在 MediaPipe 中难以精确定位。

### 2.2 关键面部部位术语

#### 五官（面相学基础）

| 官名 | 部位 | 关键术语 | 定义 |
|------|------|----------|------|
| **采听官** | 耳 | 轮、廓、垂珠、风门 | 长寿、冒险精神、童年运 |
| **保寿官** | 眉 | 凌云、紫气、繁霞、眉棱骨 | 健康、地位、兄弟朋友运 |
| **监察官** | 眼 | 龙宫、凤池、鱼尾、奸门、卧蚕、泪堂 | 意志力、心性、智慧、领导力 |
| **审辨官** | 鼻 | 山根、年上、寿上、准头、兰台、廷尉 | 财富、健康、自我力量 |
| **出纳官** | 口 | 海角、人中、唇、承浆 | 幸福、食禄、贵人运、晚年 |

#### 关键部位详细定义

| 术语 | 定义 | 位置描述 | 面相意义 |
|------|------|----------|----------|
| **天庭** | 额头最高点 | 发际线下方，额头中央顶部 | 智慧、早年运势 |
| **印堂** | 命宫 | 两眉之间，眉心位置 | 基本运势、心胸开阔度 |
| **山根** | 鼻梁根部 | 两眼之间，鼻梁起始处 | 健康、意志力、自信度 |
| **准头** | 财帛宫 | 鼻头，鼻尖位置 | 正财运、财富积累能力 |
| **鼻翼** | 兰台、廷尉 | 鼻孔两侧的隆起部分 | 聚财能力 |
| **人中** | 水沟 | 上唇和鼻底之间的纵向凹陷 | 寿命、生育力 |
| **地阁** | 下巴 | 下颌最下方，下巴尖 | 晚年运势、福气 |
| **颧骨** | 权骨 | 面颊两侧最突出的骨骼 | 权力欲、管理能力 |
| **夫妻宫** | 鱼尾 | 眼尾外侧，眼角位置 | 婚姻感情 |
| **田宅宫** | 眉眼之间 | 眉毛和眼睛之间的区域 | 家运、不动产、心态 |
| **官禄宫** | 额头正中 | 额头中央区域 | 事业、学业 |

## 三、MediaPipe Landmark 索引映射

### 3.1 关键 Landmark 索引表

项目中使用的关键 landmarks 定义在 `src/lib/face-annotator.js` 的 `LM` 对象中：

| 面相学术语 | 代码变量名 | MediaPipe 索引 | 说明 |
|-----------|-----------|---------------|------|
| 天庭 | `foreheadTop` | **10** | 额头最高点 |
| 官禄宫 | `foreheadMid` | **151** | 额头中央 |
| 印堂 | `glabella` | **9** | 两眉之间 |
| **山根** | `noseBridgeTop` | **6** | 鼻梁根部（两眼之间） |
| 准头 | `noseTip` | **1** | 鼻头 |
| 鼻底 | `noseBottom` | **2** | 鼻孔下方 |
| 左鼻翼 | `leftNoseWing` | **48** | 左鼻孔外侧 |
| 右鼻翼 | `rightNoseWing` | **278** | 右鼻孔外侧 |
| 左夫妻宫 | `leftEyeOuter` | **33** | 左眼外眼角 |
| 左眼内角 | `leftEyeInner` | **133** | 左眼内眼角 |
| 右夫妻宫 | `rightEyeOuter` | **362** | 右眼外眼角 |
| 右眼内角 | `rightEyeInner` | **263** | 右眼内眼角 |
| 左眼上 | `leftEyeTop` | **159** | 左眼上边缘 |
| 左眼下 | `leftEyeBottom` | **145** | 左眼下边缘 |
| 右眼上 | `rightEyeTop` | **386** | 右眼上边缘 |
| 右眼下 | `rightEyeBottom` | **374** | 右眼下边缘 |
| 左眉头 | `leftBrowInner` | **70** | 左眉内侧起点 |
| 左眉尾 | `leftBrowOuter` | **107** | 左眉外侧终点 |
| 左眉峰 | `leftBrowPeak` | **105** | 左眉最高点 |
| 右眉头 | `rightBrowInner` | **300** | 右眉内侧起点 |
| 右眉尾 | `rightBrowOuter` | **336** | 右眉外侧终点 |
| 右眉峰 | `rightBrowPeak` | **334** | 右眉最高点 |
| 上唇 | `upperLip` | **13** | 上嘴唇 |
| 下唇 | `lowerLip` | **14** | 下嘴唇 |
| 人中底部 | `lipTop` | **0** | 上唇最高点（人中下端） |
| 唇底 | `lipBottom` | **17** | 下唇最低点 |
| **地阁** | `chin` | **152** | 下巴尖 |
| 左颧骨 | `leftCheekbone` | **234** | 左面颊最突出点 |
| 右颧骨 | `rightCheekbone` | **454** | 右面颊最突出点 |
| 左腮骨 | `leftJaw` | **172** | 左下颌角 |
| 右腮骨 | `rightJaw` | **397** | 右下颌角 |
| 左太阳穴 | `leftTemple` | **54** | 左额角 |
| 右太阳穴 | `rightTemple` | **284** | 右额角 |
| **人中** | `philtrum` | **164** | 人中中央 |

### 3.2 使用的 Landmark 总数

实际用于计算和标注的 landmarks 共 **33 个**（从 478 个中精选），这些点覆盖了：
- 三停分区的关键边界点
- 十二宫位的核心位置
- 五官的关键特征点
- 脸型判断所需的宽度测量点

## 四、计算逻辑详解

### 4.1 三停比例计算

**代码位置**：`src/lib/face-annotator.js` → `calculateMeasurements()`

```javascript
// 关键边界点
const foreheadY = px(LM.foreheadTop).y        // 上庭顶部：landmark 10
const browY = (px(LM.leftBrowPeak).y + px(LM.rightBrowPeak).y) / 2  // 上庭/中庭分界：landmark 105, 334 的平均值
const noseBottomY = px(LM.noseBottom).y       // 中庭/下庭分界：landmark 2
const chinY = px(LM.chin).y                   // 下庭底部：landmark 152

// 计算各庭高度
const upper = browY - foreheadY              // 上庭高度
const middle = noseBottomY - browY            // 中庭高度
const lower = chinY - noseBottomY             // 下庭高度
const total = upper + middle + lower          // 总高度

// 计算百分比
三停比例 = {
  上庭: Math.round((upper / total) * 100),
  中庭: Math.round((middle / total) * 100),
  下庭: 100 - 上庭 - 中庭
}
```

**注意**：
- 上庭和中庭的分界线使用**眉毛最高点**（眉峰），而非传统面相学中的"印堂"
- 这是因为 MediaPipe 的眉峰点（landmark 105, 334）比印堂点（landmark 9）更稳定可靠

### 4.2 脸型判断

**计算方式**：

```javascript
// 面部宽度测量（不同高度）
const templeWidth = dist(px(LM.leftTemple), px(LM.rightTemple))      // 太阳穴宽度：landmark 54, 284
const cheekWidth = dist(px(LM.leftCheekbone), px(LM.rightCheekbone)) // 颧骨宽度：landmark 234, 454
const jawWidth = dist(px(LM.leftJaw), px(LM.rightJaw))                // 下颌宽度：landmark 172, 397
const faceHeight = chinY - foreheadY                                 // 面部高度

// 宽高比
const widthRatio = cheekWidth / faceHeight

// 脸型分类逻辑
if (widthRatio > 0.85) faceShape = '方形'
else if (widthRatio > 0.75) faceShape = '圆形'
else if (widthRatio < 0.6) faceShape = '长形'
if (jawWidth > cheekWidth * 0.95 && widthRatio > 0.75) faceShape = '方形'
if (cheekWidth > templeWidth * 1.1 && cheekWidth > jawWidth * 1.1) faceShape = '菱形'
if (templeWidth > jawWidth * 1.15) faceShape = '心形'
else faceShape = '椭圆形'
```

### 4.3 其他关键测量

#### 印堂宽度（命宫）

```javascript
const yintangWidth = dist(px(LM.leftBrowInner), px(LM.rightBrowInner))  // landmark 70, 300
// 判断标准：与眼间距比较
印堂宽度 = yintangWidth > eyeSpacing * 0.7 ? '开阔' 
         : yintangWidth > eyeSpacing * 0.5 ? '适中' 
         : '较窄'
```

#### 田宅宫（眉眼间距）

```javascript
const leftTianZhai = px(LM.leftEyeTop).y - px(LM.leftBrowPeak).y      // landmark 159 - 105
const rightTianZhai = px(LM.rightEyeTop).y - px(LM.rightBrowPeak).y    // landmark 386 - 334
// 判断标准：与眼宽比较
田宅宫 = (leftTianZhai + rightTianZhai) / 2 > leftEyeWidth * 0.4 ? '宽广' : '较窄'
```

#### 颧骨突出度

```javascript
const cheekWidth = dist(px(LM.leftCheekbone), px(LM.rightCheekbone))  // landmark 234, 454
const jawWidth = dist(px(LM.leftJaw), px(LM.rightJaw))                // landmark 172, 397
// 判断标准
颧骨 = cheekWidth > jawWidth * 1.08 ? '突出' : '平和'
```

#### 鼻翼宽度

```javascript
const noseWidth = dist(px(LM.leftNoseWing), px(LM.rightNoseWing))    // landmark 48, 278
const eyeSpacing = dist(px(LM.leftEyeInner), px(LM.rightEyeInner))    // landmark 133, 263
// 判断标准
鼻翼宽度 = noseWidth > eyeSpacing * 0.85 ? '饱满' : '适中'
```

#### 下巴形状

```javascript
const jawWidth = dist(px(LM.leftJaw), px(LM.rightJaw))                  // landmark 172, 397
const cheekWidth = dist(px(LM.leftCheekbone), px(LM.rightCheekbone))  // landmark 234, 454
// 判断标准
下巴 = jawWidth > cheekWidth * 0.85 ? '方阔' 
     : jawWidth > cheekWidth * 0.7 ? '适中' 
     : '尖窄'
```

## 五、数据流转

### 5.1 处理流程

```
视频帧 (HTMLVideoElement)
  ↓
Canvas 捕获 (rawCanvas)
  ↓
MediaPipe FaceLandmarker.detect()
  ↓
478 个 landmarks (landmarks[0])
  ↓
提取关键 33 个 landmarks (LM 对象映射)
  ↓
计算测量值 (calculateMeasurements)
  ↓
生成标注图 (drawAnnotations)
  ↓
输出：{ originalDataUrl, annotatedDataUrl, measurements }
```

### 5.2 测量数据格式

```javascript
{
  三停比例: {
    上庭: 35,    // 百分比
    中庭: 33,    // 百分比
    下庭: 32     // 百分比
  },
  脸型: '椭圆形',
  面部宽高比: 0.72,
  印堂宽度: '开阔',
  田宅宫: '宽广',
  颧骨: '突出',
  鼻翼宽度: '饱满',
  下巴: '方阔'
}
```

### 5.3 数据传递到 AI

测量数据通过 `formatMeasurements()` 函数格式化为文本，与面部图像一起发送给 AI 模型：

```javascript
【面部测量数据】
三停比例：上庭35% / 中庭33% / 下庭32%
脸型：椭圆形
面部宽高比：0.72
印堂：开阔
田宅宫：宽广
颧骨：突出
鼻翼：饱满
下巴/腮骨：方阔
```

## 六、关键设计决策

### 6.1 为什么使用眉峰而非印堂作为上庭/中庭分界？

- **稳定性**：眉峰点（landmark 105, 334）在 MediaPipe 中检测更稳定
- **视觉一致性**：眉毛位置是面部最明显的横向分界线
- **计算简便**：眉峰点可直接获取，无需额外计算

### 6.2 为什么只使用 33 个 landmarks？

- **性能**：减少计算量，提高实时性
- **精度**：33 个关键点已足够覆盖面相学分析所需的所有特征
- **可维护性**：代码更简洁，易于理解和调试

### 6.3 为什么使用相对比例而非绝对尺寸？

- **尺度无关**：不同照片尺寸、拍摄距离下都能得到一致的结果
- **标准化**：百分比形式更符合面相学的判断标准
- **鲁棒性**：对图像缩放、裁剪不敏感

## 七、关键测量可视化

为了直观展示面部测量结果，我们设计了 5 个最重要的可视化项。每个可视化项都通过绘制关键点和连线，配合标注文字，清晰展示测量数据和判断结果。

### 7.1 可视化项列表

| 序号 | 可视化项 | 关键点 | 绘制内容 | 标注内容 |
|------|---------|--------|----------|----------|
| 1 | **三停比例** | 额头顶部(10)、眉峰(105,334)、鼻底(2)、下巴(152) | 两条水平分界线 + 三个区域标注 | 上庭X% / 中庭Y% / 下庭Z% |
| 2 | **印堂宽度** | 左眉头(70)、右眉头(300) | 两点连线 + 宽度标注 | 宽度值 + 判断（开阔/适中/较窄） |
| 3 | **田宅宫** | 左眉峰(105)、左眼上(159)、右眉峰(334)、右眼上(386) | 左右各一条垂直线 + 距离标注 | 平均距离 + 判断（宽广/较窄） |
| 4 | **颧骨突出度** | 左颧骨(234)、右颧骨(454)、左下颌(172)、右下颌(397) | 两条水平宽度线 + 比较标注 | 颧骨宽度 vs 下颌宽度 + 判断（突出/平和） |
| 5 | **鼻翼宽度** | 左鼻翼(48)、右鼻翼(278) | 两点连线 + 宽度标注 | 宽度值 + 判断（饱满/适中） |

### 7.2 可视化算法详解

#### 7.2.1 三停比例可视化

**算法步骤**：
1. 获取关键点 Y 坐标：
   - `foreheadY = landmarks[10].y * height` （额头顶部）
   - `browY = (landmarks[105].y + landmarks[334].y) / 2 * height` （眉峰平均）
   - `noseBottomY = landmarks[2].y * height` （鼻底）
   - `chinY = landmarks[152].y * height` （下巴）

2. 绘制两条水平分界线：
   - 上庭/中庭分界线：从 `(0.1*width, browY)` 到 `(0.9*width, browY)`，虚线样式
   - 中庭/下庭分界线：从 `(0.1*width, noseBottomY)` 到 `(0.9*width, noseBottomY)`，虚线样式

3. 计算各庭高度和百分比：
   ```javascript
   upper = browY - foreheadY
   middle = noseBottomY - browY
   lower = chinY - noseBottomY
   total = upper + middle + lower
   上庭% = Math.round((upper / total) * 100)
   中庭% = Math.round((middle / total) * 100)
   下庭% = 100 - 上庭% - 中庭%
   ```

4. 在右侧绘制标注：
   - 上庭标注：位置 `(width - 20, (foreheadY + browY) / 2)`，文本 `"上庭 X%"`
   - 中庭标注：位置 `(width - 20, (browY + noseBottomY) / 2)`，文本 `"中庭 Y%"`
   - 下庭标注：位置 `(width - 20, (noseBottomY + chinY) / 2)`，文本 `"下庭 Z%"`

**视觉样式**：
- 分界线：金色虚线，线宽 2px，透明度 0.6
- 标注：金色文字，黑色半透明背景，字体大小 14px

#### 7.2.2 印堂宽度可视化

**算法步骤**：
1. 获取关键点坐标：
   - `leftBrowInner = {x: landmarks[70].x * width, y: landmarks[70].y * height}`
   - `rightBrowInner = {x: landmarks[300].x * width, y: landmarks[300].y * height}`

2. 计算宽度：
   ```javascript
   yintangWidth = sqrt((rightBrowInner.x - leftBrowInner.x)² + (rightBrowInner.y - leftBrowInner.y)²)
   eyeSpacing = dist(landmarks[133], landmarks[263])  // 眼间距作为参考
   ```

3. 绘制连线：
   - 从 `leftBrowInner` 到 `rightBrowInner`，实线，金色，线宽 2px

4. 绘制标注：
   - 位置：连线中点上方 10px
   - 文本：`"印堂: ${yintangWidth.toFixed(1)}px (${判断})"`
   - 判断标准：
     - `yintangWidth > eyeSpacing * 0.7` → "开阔"
     - `yintangWidth > eyeSpacing * 0.5` → "适中"
     - 否则 → "较窄"

**视觉样式**：
- 连线：金色实线，线宽 2px
- 标注：金色文字，黑色半透明背景，字体大小 12px

#### 7.2.3 田宅宫（眉眼间距）可视化

**算法步骤**：
1. 获取关键点坐标：
   - `leftBrowPeak = {x: landmarks[105].x * width, y: landmarks[105].y * height}`
   - `leftEyeTop = {x: landmarks[159].x * width, y: landmarks[159].y * height}`
   - `rightBrowPeak = {x: landmarks[334].x * width, y: landmarks[334].y * height}`
   - `rightEyeTop = {x: landmarks[386].x * width, y: landmarks[386].y * height}`

2. 计算距离：
   ```javascript
   leftTianZhai = leftEyeTop.y - leftBrowPeak.y
   rightTianZhai = rightEyeTop.y - rightBrowPeak.y
   avgTianZhai = (leftTianZhai + rightTianZhai) / 2
   eyeWidth = dist(landmarks[33], landmarks[133])  // 左眼宽度作为参考
   ```

3. 绘制垂直线：
   - 左侧：从 `leftBrowPeak` 到 `leftEyeTop`，带箭头指向下方
   - 右侧：从 `rightBrowPeak` 到 `rightEyeTop`，带箭头指向下方

4. 绘制标注：
   - 位置：左侧垂直线中点左侧 10px
   - 文本：`"田宅宫: ${avgTianZhai.toFixed(1)}px (${判断})"`
   - 判断标准：
     - `avgTianZhai > eyeWidth * 0.4` → "宽广"
     - 否则 → "较窄"

**视觉样式**：
- 垂直线：金色实线，线宽 2px，带箭头
- 标注：金色文字，黑色半透明背景，字体大小 12px

#### 7.2.4 颧骨突出度可视化

**算法步骤**：
1. 获取关键点 Y 坐标（取平均值作为水平线位置）：
   - `cheekY = (landmarks[234].y + landmarks[454].y) / 2 * height`
   - `jawY = (landmarks[172].y + landmarks[397].y) / 2 * height`

2. 计算宽度：
   ```javascript
   cheekWidth = dist(landmarks[234], landmarks[454])
   jawWidth = dist(landmarks[172], landmarks[397])
   ```

3. 绘制两条水平宽度线：
   - 颧骨宽度线：从 `(landmarks[234].x * width, cheekY)` 到 `(landmarks[454].x * width, cheekY)`
   - 下颌宽度线：从 `(landmarks[172].x * width, jawY)` 到 `(landmarks[397].x * width, jawY)`

4. 绘制比较标注：
   - 位置：两条线之间，右侧
   - 文本：`"颧骨: ${cheekWidth.toFixed(1)}px vs 下颌: ${jawWidth.toFixed(1)}px"`
   - 判断：`cheekWidth > jawWidth * 1.08` → "突出"，否则 → "平和"

**视觉样式**：
- 宽度线：金色实线，线宽 2px，两端带端点标记
- 标注：金色文字，黑色半透明背景，字体大小 12px

#### 7.2.5 鼻翼宽度可视化

**算法步骤**：
1. 获取关键点坐标：
   - `leftNoseWing = {x: landmarks[48].x * width, y: landmarks[48].y * height}`
   - `rightNoseWing = {x: landmarks[278].x * width, y: landmarks[278].y * height}`

2. 计算宽度：
   ```javascript
   noseWidth = dist(leftNoseWing, rightNoseWing)
   eyeSpacing = dist(landmarks[133], landmarks[263])  // 眼间距作为参考
   ```

3. 绘制连线：
   - 从 `leftNoseWing` 到 `rightNoseWing`，实线，金色，线宽 2px

4. 绘制标注：
   - 位置：连线中点上方 10px
   - 文本：`"鼻翼: ${noseWidth.toFixed(1)}px (${判断})"`
   - 判断标准：
     - `noseWidth > eyeSpacing * 0.85` → "饱满"
     - 否则 → "适中"

**视觉样式**：
- 连线：金色实线，线宽 2px
- 标注：金色文字，黑色半透明背景，字体大小 12px

### 7.3 可视化布局原则

1. **避免重叠**：各可视化项的标注位置错开，避免文字重叠
2. **颜色统一**：所有标注使用金色（#ffd700）文字，黑色半透明背景（rgba(0,0,0,0.65)）
3. **层次清晰**：关键点用实心圆标记，连线用实线或虚线区分
4. **信息完整**：每个可视化项都包含数值和判断结果
5. **位置合理**：标注文字放在不遮挡面部关键特征的位置

### 7.4 实现工具

可视化工具位于 `tools/visualize_face.py`，使用方法：

```bash
python tools/visualize_face.py test-assets/test-face-1.jpg
```

工具会：
1. 使用 MediaPipe FaceLandmarker 检测人脸 landmarks
2. 计算所有测量值
3. 在图像上绘制 5 个关键可视化项
4. 保存结果到 `test-assets/test-face-1-visualized.jpg`

## 八、参考资料

- [MediaPipe Face Landmarker 官方文档](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker)
- [面相学知识库](./face_reading_knowledge.md)
- MediaPipe FaceLandmarker 模型：478 landmarks，基于 Attention Mesh 架构

---

*最后更新：2026-02-08*
