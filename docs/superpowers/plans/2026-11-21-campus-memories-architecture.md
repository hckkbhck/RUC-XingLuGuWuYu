# 校园拾光｜阶段 C 共享后端与接口设计

2026-11-21 · 「校园相册」视觉方案已确认。本稿用于阶段 D 开发评审。交互基准见[六项独立预览](../../../previews/campus-memories/index.html)。

## 1. 身份核查与接入决策

| 已核查的路径 | 当前行为 | 对拾光的影响 |
|---|---|---|
| `src/profile.js` 的 `newId / makeProfileStore` | 浏览器使用 Web Crypto 生成 UUID v4，按 `ruc.campus.player.v1` 保存版本、ID、昵称、签名、角色和头像。读取时校验格式与展示字段。重复登记复用已有本地资料 | UUID 可以随本机数据一起被替换。它只标识这份存档，相同昵称或 UUID 均不能证明内容所有权 |
| `src/profile-ui.js` 的 `setupIdentity` | 首次登记在本地校验并保存，重访恢复角色和名片。读取失败或注册面板打开时锁住游戏操作 | 保留原登记流程。共享账号独立登录，登录取消后可继续漫游 |
| `game/records.js` 的 `createRecords` | 手册以 `ruc.zhongguancun.fieldnotes.v1` 本地存储，同地点、同事件再次保存会替换旧记录 | 共享拾光使用独立数据表。一处能保留多篇故事；旧手册照片仅在玩家主动选择发布时进入共享流程 |
| `index.html → game/app.js → game/world.js`、`game/campus-scene.js` | 当前入口在同一张地图上呈现中关村和通州。Phaser 驱动帧循环，位置、镜头换算、人物输入和绘制都归 `createWorld` 管理 | 从实际帧和输入分发接入；原迎新链接会转向此入口 |
| `package.json`、`tools/serve.mjs`、`tools/build.mjs` | 开发服务器提供静态文件，构建输出网页版和两个离线 HTML。游戏入口及其依赖中未发现账号服务器、服务端会话校验、共享内容数据库或云存储接入 | 新增共享后端。浏览器可缓存会话，权限判定始终在服务端 |

本次运行 `node --test tests/phaser-registration.test.mjs tests/records.test.mjs`，6 项通过，覆盖本地身份复用、损坏存档、存储失败、地图出生点和手册保存。它们验证的是已有行为。多人访问和数据库权限列在阶段 E。

**建议选用托管 Supabase。** 保留静态 Phaser 客户端，用 Supabase Auth 验证邮箱，PostgreSQL 保存故事、坐标及审核状态，私有 Storage 存图，Edge Functions 提供游戏专用 API。地图在进入区域时加载，展板每次打开重新查询。现阶段无需长连接。若部署须进入学校现有基础设施，可沿用相同的 API 契约，以学校身份服务、PostgreSQL 和私有对象存储替换托管层；目前项目中未发现可直接接入的校园 SSO。 [Supabase Auth](https://supabase.com/docs/guides/auth/auth-email-passwordless) · [私有存储桶](https://supabase.com/docs/guides/storage/buckets/fundamentals)

**从本地玩家到共享作者**

1. 游客可以浏览公开且审核通过的拾光。首次发布、举报或管理自己的内容时，在游戏内输入邮箱并验证一次性验证码。建议采用邮箱验证码，便于手机玩家留在当前游戏页面。它验证邮箱控制权；若产品将来限定师生身份，需另外接入学校认可的认证方式。
2. 共享账号主键取自 Supabase Auth 的 `auth.users.id`。服务端验证 access token 的签名、签发方、受众和有效期，从已验证的 `sub` 得到作者。任何写请求中的 `authorId`、角色或审核状态均拒收。浏览器只持项目 URL、可发布密钥和自己的会话。 [Edge Functions 鉴权](https://supabase.com/docs/guides/functions/auth) · [密钥权限](https://supabase.com/docs/guides/getting-started/api-keys)
3. 首次登陆共享账号时，可确认使用本机昵称与头像创建云端名片。已有云端名片先从服务端读取。只预填展示字段，历史本地 ID、手册、邮箱和个性签名均不进入公开内容。两台设备验证同一账号后共用作者权；同机切换账号时清除旧账号的草稿、待审气泡、签名图链和私有缓存。
4. 所属校区由作者自选，默认不公开；发布地点的校区由地图决定。两者独立。登出或会话过期后保留本地漫游；过期写请求先刷新一次会话，失败则提示重新验证，并保留此次未提交的编辑内容供同一账号继续。

共享功能的生产入口为配置好的 HTTPS 游戏站点，开发时可使用 localhost。离线单文件在打开拾光时提示前往在线版，断网时允许取消编辑、继续漫游，恢复网络后由玩家重试。云端用户资料及作者身份均以重新验证取得的会话为准。

## 2. 发布、审核与读取

**文字发布**在打开编辑器时冻结游戏坐标及地图版本，提交时由服务端验证位置并写入一条 `pending` 记录，返回服务端 ID 和时间。作者马上能在该点看见「我的拾光 · 待审核」。审核通过后，其他玩家能在同一坐标读到它。

**照片发布**先领取一次上传名额，再用当前用户会话把文件传到私有暂存区。服务端验证实际字节数、文件头和解码结果，限制解码像素数，处理方向，去除 EXIF 等元数据并生成展示图和缩略图。建议最多 2400 万像素，发布前用实机样片验证处理资源上限。仅服务端验证通过的图片能够绑定故事；审核看的是将要展示的图片、正文及署名。如环境无法在内存和 CPU 预算内可靠处理上限图片，将同一验证步骤移至受控图片处理进程。客户端压缩仅用于改善体验。

**发布契约**沿用预览限制，每则最多一张 JPEG、PNG 或 WebP，最大 8 MiB（8,388,608 字节），文字去首尾空白后最多 500 个 Unicode 码点，与预览的 `Array.from` 计数一致。纯文字、纯照片和图文都有效。昵称继续沿用现有 2～16 个可见字符的规则。上传中断可以重试，跨过标准上传建议大小的图片可走断点续传。 [Storage 断点续传](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)

**审核与删除规则**

| 场景 | 作者 | 其他玩家及游客 | 审核员 |
|---|---|---|---|
| 待审、驳回、下架或仅自己可见 | 查看自己的记录及处理结果，可删除 | 地图、聚合数量、详情、图库和图片授权均不可见 | 可按职责审核，查看受理的举报 |
| 公开且通过，未删除 | 浏览、删除 | 浏览；已登录玩家可举报 | 可下架并记录原因 |
| 作者删除 | 从个人列表和地图移除，重复删除返回成功 | 新查询及新图片授权立即停止 | 留必要的处理记录，后台清理图片 |

首版用人工审核。新记录只能进入 `pending`；审核员可批准或驳回，已批准内容可因举报下架。举报本身不自动下架。作者端首版提供删除，修改正文或换图通过重新投稿走审核。审核和删除都带版本检查；删除先完成时，审核操作不能把旧记录恢复。展板只收录「公开 + 已通过 + 有验证完成的图片 + 未删除」的记录；纯文字仍可进入地图。

## 3. 数据库结构

业务表放在未向浏览器 Data API 开放的 `memory` schema。主键 UUID 和业务时间戳由服务端生成，时间统一使用 `timestamptz`。下列 `?` 表示可空。

| 表 | 主要字段与关系 | 约束及用途 |
|---|---|---|
| `memory.profiles` | `user_id uuid PK → auth.users.id`，`nickname text`，`avatar_id text`，`home_campus_id text?`，`show_home_campus bool default false`，`updated_at` | 昵称可重名。头像键限制为项目已支持的头像；自选校区仅允许中关村、通州。公开响应按当下隐私开关裁剪字段 |
| `memory.media` | `id PK`，`owner_id → auth.users`，`upload_key uuid`，`source_key text UNIQUE`，`display_key? / thumb_key?`，`mime?`，`byte_size? / width? / height?`，`state`，`expires_at / created_at` | `UNIQUE(owner_id,upload_key)`、`UNIQUE(id,owner_id)`。状态为 `reserved / validating / ready / attached / failed / purged`。库中存对象键；取图时再签发短期地址 |
| `memory.entries` | `id PK`，`author_id → profiles.user_id`，`request_key uuid`，`payload_hash`，`map_version`，`campus_id`，`world_x / world_y double precision`，`place_id?`，`place_name`，`body text`，`media_id uuid? UNIQUE`，`author_name / author_avatar`，`visibility`，`review_status`，`created_at / published_at? / deleted_at?`，`revision int` | `UNIQUE(author_id,request_key)`。复合外键 `(media_id,author_id) → media(id,owner_id)`。正文和图至少一项；正文上限由数据库再次校验。署名快照随稿审核；作者所属校区按当前授权读取 |
| `memory.reports` | `id PK`，`entry_id → entries`，`reporter_id → auth.users`，`reason_code`，`note?`，`status`，`created_at / resolved_at?`，`resolved_by?` | `UNIQUE(entry_id,reporter_id)`，同一人重复举报返回原受理结果。原因、举报人和处理备注仅对受理人员开放 |
| `memory.moderators`、`memory.review_events` | 前者以 `user_id` 为主键，由运维授予。后者保存 `id,entry_id,reviewer_id,from_status,to_status,reason,created_at,entry_revision` | 审核记录追加写入；审核员无法审核自己的投稿。角色授权来自服务端名册 |

`visibility` 取 `public / private`，`review_status` 取 `pending / approved / rejected / hidden`。首版「留下拾光」默认提交公开申请，审核状态单独控制曝光。服务器在单个事务内锁定图片、确认 `ready` 及所有者、插入记录并将图片标为 `attached`。同账号同请求键同载荷返回同一条记录，异载荷返回 409。照片另行上传成功而数据库事务失败时，可用原键重试。清理任务通过条件更新领取超时验证、未绑定、已删除的图片，按对象键幂等清理；只有对象删除成功或已不存在才标为 `purged`。记录删除后保留必要的幂等凭据。

**索引与地图契约。** 地图以 `(map_version,campus_id,cell_x,cell_y)` 的已公开记录部分索引按格读取，`cell_x/y` 是世界坐标按 32 像素向下取整的生成列。展板建立仅针对公开已通过、有图、未删除行的 `(published_at DESC,id DESC)` 索引，以及以 `campus_id` 开头的同序索引。作者区使用 `(author_id,created_at DESC,id DESC)`；审核队列使用 `(review_status,created_at,id)`。数据库约束保证缺图时正文非空、已批准时有发布时间。

当前地图尺寸实测为 **3236 × 824**，取 `world.getState()` 的世界像素。横坐标小于 1908 是中关村，1908 至不足 2004 为校际连接区，2004 起是通州。区域键分别为 `zhongguancun / intercampus / tongzhou`，其中 `intercampus` 显示为「两校区之间」。连接区的可行走点同样能发布，全校展板也收录其中的合规照片。服务端复用同版本 `game/layout.js` 的 `canWalk` 和地点几何，对有限数值、边界、喷泉和障碍进行验证，由坐标推导区域和地点名；未命名点使用「校园步道」等可读名称。版本不匹配返回 `MAP_VERSION_MISMATCH`；坐标验证证明点位有效，无法证明玩家亲自走过该点。地图拓扑变更须选择迁移旧坐标或保留旧版记录的详情和位置标签。

## 4. API 契约

下表为拟建接口。游戏 API 基址为 `/functions/v1/campus-memories`，专用审核接口同前缀。所有响应以服务端 UTC 时间表示，客户端本地化显示。分页响应统一为 `{items,nextCursor}`，游标绑定筛选条件与排序元组。请求正文只接受列出的字段。

客户端已预留 [publishMemory](../../../game/memories/api.js)。接入发布按钮时调用 `publishMemory({mapVersion, x, y, body, mediaId}, {endpoint, accessToken, requestKey})`。其中 `endpoint` 为包含 `/entries` 的完整发布地址，`accessToken` 来自共享账号会话，`requestKey` 在同一草稿的重试中复用。当前游戏与独立预览均未调用此函数。

| 方法与路径 | 谁可调用、主要输入 | 结果 |
|---|---|---|
| Supabase Auth `signInWithOtp / verifyOtp / refreshSession / signOut` | 玩家输入邮箱和验证码，客户端通过 SDK 管理会话 | 经验证的账号会话；生产邮件配置 OTP 模板及可投递的 SMTP。 [邮箱验证码](https://supabase.com/docs/guides/auth/auth-email-passwordless) · [SMTP 配置](https://supabase.com/docs/guides/auth/auth-smtp) |
| `GET /me/profile`、`PUT /me/profile` | 已登录。写入昵称、头像键、自选校区及公开开关 | 本人云端名片。首登创建与后续修改明确区分，避免自动预填覆盖已有资料 |
| `POST /uploads` | 已登录。上传请求键、声明类型与大小 | `{mediaId,bucket,objectKey,expiresAt}`；仅允许该用户、该路径、有效期限内首次上传 |
| Storage 上传，随后 `POST /uploads/{id}/complete` | 上传者。将文件传到对象键，再请求校验；后端从已锁定的对象取实际文件 | 返回 `ready`，或 `202 validating`。客户端以 `GET /uploads/{id}` 读取状态；重复完成请求复用结果。失败可重新选图 |
| `POST /entries` | 已登录并已建云端名片。请求头 `Idempotency-Key`；正文 `{mapVersion,x,y,body?,mediaId?}` | 首次 201，重试 200。返回 `{id,createdAt,reviewStatus,location,revision}`，作者气泡以此 ID 去重 |
| `GET /markers`、`GET /markers/{clusterKey}/entries` | 公开读，可附会话。输入 `mapVersion,campusId,bbox`；展开时传游标 | 固定世界网格聚合，单点给真实坐标及 ID，多点给代表点、数量和稳定格键。网格按对齐后的视口取完整格，跨边缘取相邻区域。最多返回 256 个标记，超出时按 2 倍格长聚合。展开按创建时间及 ID 分页，每页 20 条，最多 50 条 |
| `GET /entries/{id}`、`GET /me/entries` | 单条按可见性鉴权；个人列表仅本人，支持区域／视口和游标 | 详情含昵称、头像、可选作者校区、时间、发布地点、正文及可用的短期图链。个人结果另含审核状态或驳回原因。公共响应不含邮箱、本地 ID、Auth UUID 和对象键 |
| `GET /gallery` | 公开读，可传 `campusId,placeId,from,to,cursor,limit` | 每页默认 12 张、最多 30 张。返回拾光 ID、缩略图及失效时间、署名、发布地点与发布时间。详情按 ID 打开。首次查询以本次打开时间为上界，按 `(published_at,id)` 续页 |
| `DELETE /me/entries/{id}` | 已登录。数据库以账号和条目双条件更新 | 本人删除返回 204；他人条目返回 404。软删除生效后不再签发图片地址 |
| `POST /entries/{id}/reports` | 已登录，目标须对该玩家可见。提交 `reasonCode,note?` | 受理编号，重复提交复用编号；登录写入与匿名读分别限流，超过配额返回 429 和可重试时间 |
| `GET /moderation/queue`、`POST /moderation/entries/{id}/decision` | 审核员。队列支持游标及待审／已发布筛选；提交 `decision,reason,expectedRevision` | 带待审正文与短期审阅图链；批准、驳回或下架在同一事务更新状态、版本和审核日志 |
| `GET /moderation/reports`、`POST /moderation/reports/{id}/resolve` | 审核员受理，输入处理结论 | 举报关闭及操作人留痕；需要下架时将决定与举报结案放在同一事务 |

例如纯文字发布只需 `{"mapVersion":"campus-v1","x":1509,"y":361,"body":"报到那天，我们在喷泉旁第一次见面。"}`。接口从账号和地图取得署名与「中关村校区 · 求是广场」。统一错误体为 `{code,message,retryable}`。未验证为 401，角色不足为 403，不可见的条目或图片为 404，版本或幂等冲突为 409，过大为 413，格式／内容／坐标无效为 422。网络故障保留草稿；业务校验失败显示可修正的原因。

### 权限如何落到数据库和图片

- 业务入口使用只在服务端持有的受限数据库连接角色。每个事务从已验证的用户令牌设置事务级身份上下文，游客为空；连接池复用后身份不能串用。业务角色无表所有权及 `BYPASSRLS`。行级安全策略约束读范围和本人操作，列授权及受限事务函数控制状态、作者和审核字段，给建表角色、业务角色、后台清理分别授权。审核事务额外查服务端审核员名册。业务表与内部函数对浏览器角色撤销直接访问权限。 [RLS 与绕过权限](https://supabase.com/docs/guides/database/postgres/row-level-security)
- 设两个私有桶 `memory-inbox` 和 `memory-images`。Storage 的上传策略只接受通过账号、随机对象键和有效预留记录的新增对象，禁用覆盖、列目录和客户端自行删除。受限策略辅助函数只返回布尔值。处理完成后删除暂存原图；图链由服务端核验条目可见性后签发，图链有效期建议 60 秒。下架／删除立即阻止后续签发，已发链接可能在剩余有效期内继续使用，已下载副本无法收回。服务端签名凭据只用于已授权的对象。 [Storage 访问模型](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- 地图、聚合数量、展开列表、详情与展板共用同一个公开条件。作者待审记录从本人接口单独取回并在客户端合并。切换账号、地图版本或区域即清除相应缓存、中止过期请求；媒体过期后重新请求授权。审核员与作者专属响应使用 `Cache-Control: private, no-store`。公开内容的成功响应仅承诺下一次有效查询反映变化，应在重新打开、窗口重新聚焦及跨区时刷新。

## 5. 拟新增和修改的文件

以下路径均相对于项目根目录，只列阶段 D/E 拟落地的文件。

| 操作 | 文件 | 职责 |
|---|---|---|
| 新增／扩展 | 新增 `game/memories/config.js`、`game/memories/auth.js`；扩展已预留的 `game/memories/api.js` | 公开运行配置、邮箱会话与账号切换、游戏 API／上传／幂等重试。配置缺失或离线时照常启动漫游 |
| 新增 | `game/memories/ui.js`、`game/memories/gallery.js`、`game/memories/ui.css` | 接入现有弹窗与焦点恢复，呈现编辑、详情、个人记录、举报、照片墙、筛选和分页。业务账号验证复用同一弹窗栈 |
| 新增 | `game/memories/markers.js`、`game/memories/board.js`、`game/memories/location.js` | 管理可视格、聚合、命中框与 E 候选；展板位置和交互半径；从游戏几何解析 mapVersion、区域和地点 |
| 新增 | `assets/memories/camera.png`、`assets/memories/bubble.png`、`assets/memories/exhibit-board.png` | 沿用已确认的三个像素素材。预览中的样片和虚构作者继续留在预览目录 |
| 修改 | `index.html`、`game/app.js` | 底部工具栏增加 P／触屏入口；接入名片、账号、面板和刷新；复用原有暂停、恢复、Esc 及返回焦点机制 |
| 修改 | `game/world.js` | 从现有绘制帧暴露可视世界边界和坐标换算，按深度绘制展板与气泡，键盘、点击及触屏复用一个交互分发器。既有地点与气泡同时可交互时列出对象供选择。提交面板冻结开窗位置，乘车等非自由行走状态沿用原有输入限制 |
| 修改 | `src/profile-ui.js` | 对接云端名片入口和当前本地展示资料。继续使用 `src/profile.js` 的本地登记及 `src/characters.js` 的头像目录 |
| 新增 | `vendor/memory-client.js`、`vendor/memory-client.LICENSE` | 随包提供固定版本的浏览器 Auth／上传 SDK 及相应许可，供在线版按需加载 |
| 修改 | `tools/build.mjs`、`README.md` | 发布新增 JS、CSS、素材与公开配置。现有单文件构建只递归收集 game/src 相对 JS 模块，须显式处理 vendor 资源；离线模式无需联网加载 SDK。文档补充在线部署、邮件和审核方式 |
| 新增 | `supabase/config.toml`、`supabase/migrations/202611210001_memories.sql`、`supabase/migrations/202611210002_memories_access.sql` | 本地服务配置、表、约束、索引、私有桶、角色、RLS、Storage 策略和事务函数 |
| 新增 | `supabase/functions/campus-memories/index.ts`、同目录 `auth.ts`、`entries.ts`、`media.ts`、`moderation.ts` | API 路由与身份、资料及读写、上传验证与短期授权、人工审核与举报 |
| 新增 | `supabase/functions/_shared/db.ts`、`supabase/functions/_shared/map-contract.js`、`tools/sync-memory-map.mjs` | 事务级用户上下文；将客户端纯地图逻辑和地点解析打包给服务端。地图契约由脚本生成，CI 比对版本和结果，避免两端手写两份几何 |
| 新增 | `supabase/functions/memory-maintenance/index.ts`、`tools/memory-moderate.mjs` | 定时回收孤立原图、失败任务和删除后的图片；审核人员用自己的会话领取待处理列表、看图、决定、处理举报。调度身份只存在服务端 |
| 新增 | `tests/memories.test.mjs`、`supabase/tests/memories_access.sql`、`tests/integration/memories-flow.mjs` | 分别覆盖地图、聚合、重试；数据库和文件权限；两名玩家及审核员的完整在线流程 |

正式展板采用已确认预览的脚点 **(1519, 303)**，位于喷泉中心 **(1457, 328)** 东北侧。用当前地图函数复核，脚点可行走，处于喷泉水池和东南主步道范围之外；出生点为 **(1509, 361)**。集成时验证整个底座、交互半径、南侧迎新公告栏和出生点净空。气泡随世界坐标绘制，屏幕命中框采用同一相机变换，并考虑设备像素比。分页与图片加载都在绘制循环外执行。

## 6. 实施顺序与验收

1. **共享身份、发布与保存。** 完成登录、首次名片、纯文字、单图、图文、待审、审核与作者删除。用账号 A 在两种浏览器登录核对归属，账号 B 读取待审条目返回 404。中途断网、重复提交、图片替换与审核／删除并发均应得到一致结果。
2. **地图气泡与阅读。** 按当前可视区域加载、按 ID 去重、切区取消旧请求；验证聚合、点击及 E 键。在中关村、通州和连接区各发一条；审核通过后，B 在相同位置读到 A 的署名、故事和照片。刷新后坐标复现，隐藏的作者校区从接口响应中省略。
3. **展板与回归。** 重新打开显示所有区域合规照片；纯文字、待审、驳回、下架和删除记录不进入展板。验证筛选、游标翻页、图链到期、返回详情、恢复移动，以及原注册、任务、碰撞、乘车、手册、单文件离线启动。

阶段 D 的部署输入为 Supabase 项目及区域、网页发布域名、能收验证码的邮件服务、审核员账号。建议先在测试项目中从中关村和通州实际网络验证登录邮件、8 MiB 上传与图片加载，再选定生产配置。邮箱身份、公开浏览、人工审核及 60 秒签名有效期均为本阶段建议值。本次交付为架构设计，云资源开通、迁移执行和两名真实玩家的联测属于后续阶段。
