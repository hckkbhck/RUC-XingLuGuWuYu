# RUC物语 · 中关村教学区

使用 Cocos Creator 3.8.8 打开此文件夹，在资源管理器中双击 `assets/scenes/Campus-ZGC.scene`，点击顶部的预览按钮即可游玩。首次打开可在 Dashboard 的「项目」页选择「导入项目」，选中本目录。

用 **WASD 或方向键** 行走。靠近楼前入口时，按 **E** 或点击楼名提示查看建筑介绍，按 **Esc** 或点击「关闭」返回。出生点在红楼群中栋前。

## 编辑教学片区

- 在场景层级 `Canvas → World → Buildings` 下拖动北栋、中栋或南栋。各自的 `Footprint` 决定阻挡范围，`Entrance` 决定互动位置。双击 `assets/prefabs` 里的楼体可编辑预制体。
- 用 Tiled 打开 `assets/maps/campus.tmx` 编辑道路、铺装或绿化。瓦片为 32 × 32 像素。草地分南北两层，以便 Creator 场景视图一次显示整张地图。
- 四方向行走帧位于 `assets/resources/characters`。红楼贴图取自网页原型的建筑绘制结果。地面、路面、人物与树木沿用原工程美术，来源见上级目录的 `assets/SOURCES.md`。

## 浏览器构建

在 Creator 的构建发布面板选择 Web Desktop，将 `Campus-ZGC` 设为首场景。仓库内的 `build-web.json` 提供相同的命令行构建配置。构建产物位于 `build/web-desktop`。

从上一级项目目录运行 `node tools/serve.mjs game-client/build/web-desktop 4188` 后，打开 [本机试玩](http://127.0.0.1:4188/)。

本工程附带 Funplay MCP 0.7.6。此电脑上的 Codex 已登记连接 `ruc_campus_creator`，它指向这个工程的本机地址。编辑器运行时可在 Funplay 面板查看连接地址。移动工程目录后，需按该面板显示的新地址更新 Codex 连接。
