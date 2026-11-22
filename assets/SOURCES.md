# 游戏资源来源

新版地图采用项目提供的 RUC-Campus-Building-Locator.png 与 .ruc-image-reference/latest-campus-layout.png。游戏将参考图的道路与地标重绘为像素场景。

| 使用内容 | 来源 |
| --- | --- |
| 地点涂鸦墙的六张预设照片 | 喷泉、中区食堂和立德楼取景自本项目渲染的校园地图，肉桂卷取自现有的 `assets/canteen/dish.jpg`。成品位于 `assets/memories/wall/`。 |
| 金黄落叶树、松树、白玉兰（原版、高瘦、宽冠、斜干）、校园长椅 | 项目已有 assets/trees 与 assets/props 贴图 |
| 教二草坪纵向长椅、求是广场公告板、照片展板和留言板 | 项目提供的 assets/props/campus-bench-vertical.png 与同目录三款 campus-*-board.png |
| 主角四向立姿与行走 | 项目已有 assets/characters 下两张中文命名的学生图集 |
| 教二草坪长椅坐姿 | 项目已有 assets/characters/campus-student-seated.png，使用人物部分与地图长椅对齐 |
| Phaser 迎新角色与注册窗 | 红衫男生的站姿、侧向和纵向步行帧分别取自 `校园漫步像素学生四视图.png`、`学生四帧像素行走循环.png`、`campus-student-walk-vertical.png`，整理为 `jacket-student.png`。雏菊女生沿用 `daisy-student.png`。注册窗的校园木框、头像框取自提供的参考图 |
| 求是广场喷泉 | 用户提供的 assets/props/campus-fountain-sprites.png，六帧按原动图的 1.30 秒节奏循环 |
| 中关村校区东南草地的立德楼 | 项目提供的 assets/landmarks/立德楼贴图.png |
| 理工楼、中区食堂 | 项目提供的 assets/landmarks/理工楼贴图.png 和 assets/landmarks/中区食堂贴图.png |
| 中区食堂每日菜谱、菜品插画与评价头像 | 用户提供的菜谱和肉桂卷详情两张参考图，位于 assets/canteen/ |
| 求是楼 | 项目提供的 assets/landmarks/求是楼贴图.png |
| 一勺池 | 水面与岸线随地点轮廓绘制，池中题石截取自项目贴图 assets/game/pond-autumn.png |
| 东门公交站 | 项目已有 assets/landmarks/campus-transfer-station.png 候车亭贴图 |
| 教二草坪的花猫跳跳 | 用户提供的四向行走图集，整理为 assets/characters/tiaotiao-walk.png。四行从上到下依次为正面、背面、向左、向右，每个方向四帧 |
| 建筑、跑道、草地、路牌与界面图标 | 本版使用 Canvas 或内联矢量图形绘制 |
| 崇德花园的雏菊、郁金香、向日葵和风铃草 | 使用 OpenAI 图像生成制作透明像素图集，按花种切分为 `assets/flowers/` 下的四张 48 × 48 PNG |
| 脚步、风铃、背景音乐及校园环境音 | 本版通过 tools/make-audio.py 合成，无外部音频依赖 |

沿用的项目贴图未附独立授权声明。当前游戏加载清单见 tools/build.mjs。
