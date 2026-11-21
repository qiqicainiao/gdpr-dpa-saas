# GDPR DPA generator for SaaS — 前端架构设计与开发规范 v0.1

- 文档日期：2026-11-13
- 文档状态：已定版；第 1–4 周开发完成，契约自检、落盘核验、离线回放与静态自检通过；仅剩上线前域名与邮箱占位替换
- 站点标识：`SITE_ID=gdpr-dpa-saas`，`SLUG=gdpr-dpa-saas`
- 站点语言：英文，`<html lang="en">`
- 目标用户：需要为 3–20 个 EU B2B 客户分别准备 DPA 草案的独立 SaaS 创始人
- 产品定位：以 SaaS 提供方为 processor、其客户为 controller 的轻量客户 DPA 工作台
- 技术边界：纯前端静态站；核心条款选择、条件判断、覆盖计算和文本组装全部由服务端完成
- 本期商业模式：全部功能免费，无登录、无支付、无可见订阅入口

> **契约现状**：后端已生成 `contracts/gdpr-dpa-saas/contract.md` 与 `public/manifests/gdpr-dpa-saas.json`（19 个事件、84 个语义字段），前端事件与字段均逐字抄自 manifest，check/track 已联调通过。manifest 仍是唯一权威源：任何事件或字段变更必须先改后端并重新生成 manifest，再同步前端常量并重跑 §18.3 清单，不得反向自拟。

**MVP 一句话与范围护栏**

用户填写双方主体、处理活动、子处理者、国际传输和安全措施，服务端生成一份带 Article 28 条款及附件的客户专属 DPA 草案；用户可逐条确认、进行结构化修正、报告漏项、复制或通过浏览器打印，并在当前浏览器保存不含双方名称和文书原文的最近工作记录。

“门户”在本期仅指**单浏览器内的客户草稿工作台**，不指可供客户登录的在线门户。浏览器复制和打印是真实本地能力，不调用 501 的 `export`；本地历史不调用 501 的 `memory/sync`。不得展示“在线签署”“客户已接受”“云端同步”“多人协作”“自动法律更新”等未上线表述。

---

## 0. 竞品分析简报

以下仅依据 2026-11-13 可访问的公开页面，不据此断言竞品没有其他功能。

| 竞品 | 公开定位与已核对能力（每家不超过 5 行） | 本项目可验证的定位破绽 |
|---|---|---|
| ConsentPixel | 公开页强调 Article 28 八类处理者义务、SCCs，并明确生成文书仍需审阅和签署；DPA 包含在五文书套件中。 | 公开叙事偏“生成单份文书并进入套件”。本站聚焦 SaaS 方为多个客户重复出稿、逐条确认和修正的短路径，不做大而全合规套件。来源：[ConsentPixel DPA Generator](https://consentpixel.com/dpa-generator/) |
| FreeTOS | 公开页提供 controller/processor 场景、SCCs 与即时下载，并强调 EU 客户采购前的 DPA 需求。 | 公开叙事偏单次生成与下载。本站以 3–20 个客户的本地工作队列、可回放修正和漏项捕获为差异化，不把下载量当唯一价值。来源：[FreeTOS DPA Generator](https://freetos.org/data-processing-agreement-generator) |
| ToolsDock | 公开表单覆盖双方信息、处理目的、数据类别、子处理者、传输地点和安全措施，并附通用 FAQ 与法律审阅提示。 | 公开页面是通用法律生成器集合。本站可围绕 SaaS processor 的固定角色、客户附件复用和结构化条款反馈减少重复输入，而非增加文书种类。来源：[ToolsDock DPA Generator](https://toolsdock.com/policies/legal/dpa-generator/) |

结论：MVP 不以“模板更多”竞争，而以**固定 SaaS 角色、少字段、逐客户复用、结果可纠正、数据可回放**验证工作流价值。法律内容准确性不能由前端或竞品文案证明，上线前仍需合格法律审阅。

---

## 1. SEO 目标词与功能映射表

| 目标词 | 页面与真实实现 | 缩水判定与处理 |
|---|---|---|
| GDPR DPA generator for SaaS | 首页。服务端依据结构化事实选择 Article 28 条款、条件段落和附件，返回完整客户专属草案；不是拼接固定表单文本。 | **不缩水**。无真实服务端生成响应时不得上线该词对应页面。 |
| data processing agreement generator | 首页。生成双方信息、处理说明、八类处理者义务、子处理者、传输、安全、删除/返还、审计等内容。 | **不缩水**。空结果、仅展示模板或仅下载静态文件均不算完成。 |
| SaaS DPA template | 首页结果区与方法区。固定 SaaS 为 processor、客户为 controller，按客户处理事实形成可复用模板与附件。 | **不缩水**。不得将“template”包装成法律合规保证。 |
| DPA requirements for SaaS | 首页厚文本、Article 28 覆盖清单、FAQ、HowTo。要求与生成项一一对应，并显示适用边界。 | **不缩水**，作为教育型长尾词。 |
| international transfer clause for SaaS DPA | 首页传输段。仅处理“仅 EEA”与“第三国传输并使用 SCC”两个结构化分支及冲突校验。 | 降级词。仅生成本站模板中的衔接条款，**不宣称生成完整 SCC 模块或 TIA**。 |
| DPA compliance checker | 本期没有既有 DPA 上传、解析、逐条审计能力。 | <span style="color:red">放弃该词；不设置 checker 页面，不用手动勾选冒充检测。</span> |
| SCC generator / TIA generator | 本期不覆盖完整 SCC 模块选择、签署方填表、传输影响评估。 | <span style="color:red">放弃该组词；延后，不在正文、FAQ、llms.txt 留否定式功能残留。</span> |
| DPA e-signature / DPA tracking software | 本期无签署、签署状态验证、客户在线接受或云端跟踪。 | <span style="color:red">放弃该组词；不得以本地“已确认条款”冒充“合同已签署”。</span> |

首页 SEO Title 建议：`GDPR DPA Generator for SaaS | Customer-Specific Article 28 Drafts`。Description 只承诺生成可审阅草案、复制、打印和本地记录，不使用“guaranteed compliant”“legally binding by generation”等措辞。

---

## 2. 前端职责边界

### 2.1 只做五件事

1. **输入采集与本地预处理**：必填、长度、数量、条件冲突校验；枚举归一；当前标签页草稿暂存；不做条款法律判断。
2. **统一调用 BFF**：所有 fetch/XHR/sendBeacon 均经 `assets/js/api.js`；10 秒超时、AbortController 竞态防护、统一错误映射，禁止裸请求。
3. **结果渲染与修正交互**：渲染服务端草案、覆盖计数和警示；提供逐条确认、结构化替代项、独立漏项入口；动态字符串只用 `textContent`。
4. **上下文动作捕获与真实上报**：捕获输入特征、生成、查看、停留、展开、复制、打印、确认、修正和漏项；通过真实 `/bff/gdpr-dpa-saas/track` 请求发送。
5. **订阅引导与合规同意**：本期付费组件休眠且静态 `hidden`；ConsentManager 管理 granted/denied，拒绝后核心生成仍可用。

前端不得实现 Article 28 规则库、覆盖分母计算、SCC 选择算法、风险评分、条款文本拼装或“合规分数”。UI 只显示服务端结果。

### 2.2 页面与路由白名单

内页物理平铺，站内跳转使用相对路径；无 SPA、无客户端路由、无跨语言互链。

| 物理资源 | 对外路径 | 类型 | 用途与链接约束 |
|---|---|---|---|
| `index.html` | `/`、`/index.html` | 页面 | 生成器、结果、历史、方法、FAQ；canonical 归一到生产域名根路径。 |
| `gdpr-dpa-saas-privacy.html` | `/gdpr-dpa-saas-privacy.html` | 页面 | 采集、用途、保留、撤回、联系方式、本地数据说明。 |
| `gdpr-dpa-saas-terms.html` | `/gdpr-dpa-saas-terms.html` | 页面 | 服务边界、草案性质、禁止上传真实个人数据、责任与免责声明。 |
| `robots.txt` | `/robots.txt` | 抓取配置 | 五类 AI/搜索爬虫规则，统一 Disallow `/bff/`。 |
| `sitemap.xml` | `/sitemap.xml` | 抓取配置 | 仅三张已上线页面，使用正式绝对 URL。 |
| `llms.txt` | `/llms.txt` | 信源文件 | 仅描述已上线功能、方法、边界和三张页面。 |
| `style.css` | `/style.css?v=0.1.0` | 静态资源 | 全站样式与打印样式。 |
| `_site_config.js` | `/_site_config.js?v=0.1.0` | 静态资源 | 最先同步加载；环境、站点、版本、路径唯一来源。 |
| `app.js` | `/app.js?v=0.1.0` | 静态资源 | 入口编排，无核心算法。 |
| 后端官方 `telemetry-sdk.js` | `/js/telemetry-sdk.js` | 共享 SDK | 只使用后端的当前权威版本，负责 auto page_view、信封规范化和 event_id 去重；不得复制旧 SDK 到本站。 |
| `gdpr-dpa-saas-telemetry.js` | `/gdpr-dpa-saas-telemetry.js?v=0.1.0` | 静态资源 | 站群隔离埋点适配器；只做站点事件白名单与 SDK 编排，真实请求统一委托 api 网络单点。 |
| `assets/js/api.js`、`state.js`、`ui.js`、`generator.js`、`history.js`、`consent.js` | `/assets/js/{上述文件名}?v=0.1.0` | 静态资源 | 六个具名模块；新增模块必须先登记白名单，不暴露其他源码路径。 |
| `assets/js/mock/check.request.json`、`check.success.json`、`check.empty.json` | 仅 dev 运行时引用 | Mock | 三个具名请求/响应样例；生产不请求、不自动降级，新增样例先登记。 |

未列资源不得出现在 Header、Footer、正文、JSON-LD、FAQ、sitemap 或 llms.txt。`/bff/gdpr-dpa-saas/health` 和 `/manifests/gdpr-dpa-saas.json` 是校验/构建资源，不是用户页面，不做导航入口。未知路径不得被当成新路由；死链零容忍。

### 2.3 文件职责与渲染策略

- `_site_config.js`：唯一环境判断与配置源，业务代码不得写死域名、协议、端口或站点 ID。
- `assets/js/api.js`：业务 check 的唯一网络单点，封装 check、超时、取消、响应信封和限流头。埋点由站点级 `gdpr-dpa-saas-telemetry.js` 独立发送（fetch → keepalive → sendBeacon 降级链），业务代码不得裸 fetch，也不得形成第二套业务网络入口。
- `assets/js/state.js`：全局状态、十态状态机、最新请求标识、结果原对象与逐条款 `activeItem` 引用保存。
- `assets/js/generator.js`：表单读取、条件校验、结果编排；不做服务端规则。
- `assets/js/ui.js`：自定义下拉、Toast、对话框、ClauseCard 等 DOM 组件，业务模块只实例化调用。
- `assets/js/history.js`：本地存储与迁移适配器；MyHistoryPanel 是唯一可视化出口。
- `assets/js/consent.js`：同意状态与门控；非必要功能不依赖同意。
- `assets/js/mock/`：唯一 Mock 目录；禁止放根目录 `js/`、`assets/mock/` 或任何其他位置。

HTML 直出导航、表单骨架、方法、FAQ、JSON-LD 和免责声明，保证无 JS 时可阅读和抓取；生成结果仅在有效服务端响应后挂载 DOM。结果、历史和付费区块按需渲染，首屏不调用 check。历史面板展开时再读取并渲染，最多 20 条，避免首屏工作风暴。打印使用独立 `@media print`，不经过导出接口。

---

## 3. 订阅引导路径与付费墙位置

本期产品决策为完全免费，后端契约必须返回 `quota_info:{limit:null,unlimited:true}`。前端以后端 `free_quota_used`、`plan`、`quota_info` 为权威，配置中的 `FREE_QUOTA` 只用于界面预说明，禁止本地计数充当额度权威。

- `SubscriptionCTA`、`PaywallOverlay` 在组件代码中保留，但 HTML 初始即静态 `hidden`；免费模式下无可见订阅文案、付费按钮、模糊锁区或付费事件调用点。
- `paywall_exposed`、`paywall_clicked`、`plan_activated` 仅请求后端保留 Schema；本期均为 0 量，严禁用 no-op、console.log 或假事件占位。
- 首屏、输入区、结果摘要、全部条款和附件永不遮挡；不存在“出结果前付费”“登录后查看”。首页与 FAQ 固定声明 `All generator features are free in this MVP.`。
- 全局状态仍保留 `plan`、`freeQuotaUsed`、`quotaInfo`、`paywallTriggeredBy`，首次有效 check 响应前分别为 `free`、`null`、`null`、`null`。前端不得把 `null` 显示成“已用 0 次”或推算剩余额度；仅在响应后写入服务端权威值。
- 403 `QUOTA_BLOCKED` 映射必须存在。若后端意外返回该错误，显示真实额度不可用态和重试入口，不出现虚假升级按钮。
- 未来订阅仅允许在额度用尽后再次生成、点击深度区块、频次软提示三类场景出现，且必须先让用户获得价值；属于 Post-MVP，不在本期预埋调用。

---

## 4. 合规与匿名化规范

### 4.1 Consent 前置与撤回

1. 首访先完成页面主内容渲染；横幅延迟到首次有效交互后出现，面积不超过当前视口 40%，不遮挡提交按钮。
2. “Accept analytics”和“Reject analytics”均清晰可见，拒绝不比接受多一步；关闭等同拒绝。拒绝后生成、复制、打印、本地历史全部可用。
3. 必要本地偏好可保存同意选择；granted 前不生成带持久关联的行为序列。每次 track 必带布尔 `consent`。
4. `consent=false` 仅发送最小匿名聚合体：顶层 `site_id`、`consent:false`、`events[]`；每行只有 `{event,total}`。不得包含 `sess_ref`、`event_id`、时间戳、页面序列、L2/L3、六归属字段或业务事实。
5. 同意变化立即生效；历史 denied 队列不回填业务字段，granted 后也不补发同意前的敏感上下文。已同意数据仍按分级表白名单裁剪，后端二次裁剪不是前端放松脱敏的理由。
6. 隐私页提供撤回路径；撤回后清空 granted 队列并停止关联上报，核心功能保持可用。
7. Consent 横幅是非模态 `role="region"`，不设置 `aria-modal`、不 trap focus、不让主内容 inert；出现后保留当前焦点，Tab 可自然到达 Accept/Reject。`unset` 与 denied 一样只聚合匿名计数，不得先保存 granted 全字段事件再等待同意回放。
8. denied 只聚合 manifest 明确允许匿名计数的事件；不在匿名白名单内的事件直接本地丢弃并计数，不得因 204 就假定后端已接收。官方 SDK 的 unset 全字段缓冲必须关闭：适配器把 unset 初始化为 denied 门控，明确 Accept 后才切 granted，禁止回放未决策期间的明细事件。

### 4.2 输入最小化与法律边界

- 只收集生成文书必需的主体与处理事实；明确禁止输入客户真实终端用户记录、特殊类别明细、证件号、密码、API 密钥或真实个人数据样本。
- 联系邮箱为可选业务输入，仅用于 check 文书生成，不进入埋点和 localStorage；当前标签页草稿关闭即清除。
- 公司名、地址、服务描述、子处理者名称和生成文书原文只进入必要 check 与内存结果，不进入 track 或持久本地历史。
- 特殊类别数据仅询问布尔“是否涉及”；选择“是”时显示加强法律审阅提示，不要求上传或描述具体个人记录。
- 结果页和提交区固定显示：`This tool generates a starting draft for review. It does not provide legal advice or guarantee GDPR compliance. Have qualified counsel review the agreement before signature.`
- 隐私页已写入事件保留期（服务端按天 jsonl，395 天/约 13 个月滚动删除）、撤回方式与联系邮箱；联系邮箱的正式值属上线前替换项（见 §19）。

### 4.3 匿名化执行位置

- L1/L2 的省略、哈希或分桶在客户端完成，原值禁止进入事件队列；本站不需要邮箱哈希，直接省略。
- L3 仅做枚举归一化，不上传自由文本；准标识符累计门槛由服务端判断。
- 所有事件值仅为 string/number/boolean/enum；多值 enum 用英文逗号。对象、数组、原始文书、用户修正自由文本均禁止进入 track。

---

## 5. 数据分级表

下表覆盖业务输入、结果归属和拟上报字段。事件字段名已按 manifest（19 事件、84 语义字段）逐字登记，实现时仍须以 manifest 为唯一权威；未标注或未完成分级的字段不得进入 Event Schema。跨站语义 ID 只在后端 `config/semantic_map/gdpr-dpa-saas.json` 登记，前端不映射、不展示、不写入代码。

| 字段或数据组 | 层级 | 客户端处理规则 | check / track / 本地上报形态 | 跨站语义 ID 与冲突裁决 |
|---|---|---|---|---|
| `controller.legal_name`、`processor.legal_name` | L2 | 长度限制、去控制字符；不脱敏用于必要生成，禁止进入事件 | check 原值；track 禁止；localStorage 禁止 | 后端登记；安全优先，宁可无公司维度 |
| 双方地址 | L2 | 长度与字符校验 | 同上 | 后端登记；不生成地址片段埋点 |
| `controller.country`、`processor.country` | L2 | 仅国家/地区代码枚举，不据此生成画像 | check 枚举；track/localStorage 禁止 | 后端登记；仅作必要主体事实 |
| `contact_email` | L1 | 可选、格式校验；不哈希、不上报 | check 原值；track/localStorage 禁止；sessionStorage 仅当前标签页 | 后端登记；安全 > 数据密度 |
| `service_summary` | L2 | 仅生成所需短描述，禁自由文本进入事件 | check 原值；track/localStorage 禁止 | 后端登记；宁可少收语料 |
| `subprocessors.items[].legal_name` | L2 | 最多 10 项，名称原值仅用于生成 | check 原值；track/localStorage 禁止 | 后端登记；公司名单不入事件 |
| `subprocessors.items[].country`、`subprocessors.items[].service_category` | L3 | 仅国家/地区与固定服务类别枚举；本期仍按最小化原则不上报 | check 枚举；track/localStorage 禁止 | 后端登记；track 只使用派生数量桶 |
| `customer_ref` | L4 | 只能自动为 `C01`–`C20`，禁止自由输入姓名或邮箱 | 仅本地队列；track 禁止 | 后端登记为本地工作流元数据；不得与身份映射 |
| `purposes`、`data_categories`、`data_subject_categories`；反馈别名 `processing_purposes`、`processing_data_categories`、`processing_data_subject_categories` | L3 | 固定枚举归一化，数组只用于 check；track 多值仅英文逗号 | check 枚举数组；check_started 只报计数；修正/确认/漏报可带归一化枚举上下文；历史可存枚举 | 后端登记；服务端控制累计门槛 |
| `special_category_data` | L2 | 布尔，不采集具体记录；不作为持久客户画像 | 仅 check 布尔；track/localStorage 禁止；sessionStorage 仅当前标签页 | 后端登记；安全优先，历史恢复后需重新选择 |
| `duration`（反馈别名 `processing_duration`）、`breach_notice_hours` | L3 | 限定枚举或数值范围 | check 标量；历史可存；track 仅在对应反馈规则上下文中携带 | 后端登记；不作为用户画像 |
| `termination.data_disposition`、`termination.completion_days`（历史扁平键 `termination_data_disposition`、`termination_completion_days`） | L3 | `data_disposition` 仅固定枚举；天数限定范围 | check 标量；历史可存；track 仅在对应修正事实对中携带 | 后端登记；表达删除/返还/controller choice，不作合法性判断 |
| `subprocessor_authorization`、`notice_days`（反馈别名 `subprocessor_notice_days`） | L3 | 固定枚举/范围，条件冲突校验 | check 标量；历史可存；check_started 只报数量桶；反馈事件按规则上下文携带类别/数值 | 后端登记 |
| `dimensions`、`detail_level`、`max_items` | L4 | 仅 API 控制参数；生产 UI 不开放截断文书 | check 可选标量/枚举数组；track/localStorage 禁止 | 后端登记；非法值进入 param_error |
| `subprocessor_count_bucket` | L2 派生 | 客户端按 `0/1-3/4-10` 分桶 | 仅 track 枚举 | 后端登记；禁止原名单 |
| `transfer_region`、`transfer_mechanism` | L3 | 固定配对枚举，禁止非法组合 | check/历史可存；track 只报 `transfer_region` 及修正上下文 | 后端登记；服务端判定累计 |
| `security.measures`（反馈别名 `security_measures`） | L3 | 固定枚举归一；track 多值仅英文逗号 | check 数组；check_started 只报 `security_measure_count`；修正/确认/漏报可带归一化枚举上下文 | 后端登记 |
| `purpose_count`、`data_category_count`、`security_measure_count`、`item_count`、`warning_count` | L4 | 只计数，不带原值 | track number；历史可存 | 后端登记 |
| `clause_key`、`clause_variant`、`system_variant`、`corrected_variant`、`expected_variant`、`missing_category` | L3 | 除第 8 节明示 nullable 外，只能来自服务端或固定常量表，禁拼接用户输入 | check 响应/track 枚举；历史仅可存服务端 variant | 后端登记；支撑可回放 |
| `title`、`body`、完整 DPA 文本 | L2 | `textContent` 渲染，内存保存 | check 响应原值；track/localStorage 禁止 | 后端登记；复制由用户显式触发 |
| `rule_id`、`rule_version`、`template_version` | L3 | 原对象保留，不改名、不格式化 | check 响应与指定反馈事件；本地仅存 template_version | 后端登记；修正/确认缺失时 degraded；漏报按专用 nullable 契约置空，不伪造 |
| `replay_context_fields`、`replayable` | L4 | 服务端给出反馈上下文清单及可回放性；前端不得按 rule_id/clause_key 推断规则维度，也不得为回放补传 L1/L2 | check 响应数组/布尔，只作序列化与 degraded 判定；不作为事件数组上报；localStorage 禁止 | 后端登记；与 manifest/L3 白名单交叉校验 |
| `confidence` | L4 | 0–1、两位小数；不得展示为法律确定性 | check 响应与指定事件 number | 后端登记；仅规则匹配置信度 |
| `matched_terms` | L3 | 只接受服务端脱敏归一化词项；track 类型逐字按 manifest | check 响应与指定事件；不得转为原始输入 | 后端登记；多值只能英文逗号 |
| `diff_detail` | L3 | 保留响应原对象；事件只取 manifest 允许的标量表达 | correction_submitted 必带，confirmation 省略 | 后端登记；禁嵌套进入 track |
| `sample_source` | L4 | 枚举以 manifest 为准；真实响应缺省 `user`，dev Mock 为 `mock` | check 响应与相关事件 enum | 后端登记；降级不污染真实样本 |
| `reason_tag` | L3 | 固定枚举，未选 `unspecified`，无自由文本 | 修正/漏报事件 enum | 后端登记；语义层唯一标签源 |
| `degraded`、`input_source` | L4 | 布尔/固定枚举 | track；`input_source=new,history,retry` | 后端登记 |
| `attempt_count`、`run_sequence` | L4 | 同条款首次修正为 1；同会话生成序号从 1 递增 | track number | 后端登记；口径固定 |
| `check_duration_ms`、`render_ms`、`dwell_seconds`、`time_on_result_s`、`expanded_clause_count` | L4 | 只计时/计数；结果切换重置；无结果可见性能力时 `time_on_result_s=null` | track number；仅 `time_on_result_s` 按契约 nullable | 后端登记；高频项采样优先于完整性 |
| `copy_scope`、`print_scope`、`error_code`、`trigger_source`、`plan` | L4 | 固定枚举，不读取剪贴板内容或打印内容 | track enum；付费字段本期无调用 | 后端登记 |
| `site_id`、`consent`、`page_path`、`device_type`、`referrer_host`、`dropped_count`、`event_id` | L4 | 常量、布尔或结构化元数据；page_path 仅白名单 pathname，去除 query/hash；referrer 仅 hostname/`direct` | 顶层信封或事件行；denied 仅保留 site_id/consent/event/total | 后端登记；安全裁剪优先 |
| `sess_ref` | L1 假名标识 | 按第 6 节派生为 `{SITE_ID}:{32hex}`；不可反推身份，仅当前标签页会话 | 仅 granted 顶层；denied 禁止；sessionStorage | 后端登记；不得持久跨会话追踪，不与 X-Session-Id 复用 |
| `free_quota_used`、`quota_info`、`paywallTriggeredBy` | L4 | 只作界面状态，额度权威在服务端 | check 响应；默认不进 track | 后端登记；不得本地自增当权威 |

空值口径：第 7/8 节明确允许 nullable 的归属字段、empty summary、false_negative.system_variant 与无可见性能力时的 time_on_result_s，可以按 manifest 送 null；null 不等于 0、空串或空数组，也不改变字段层级。未明确 nullable 的字段不得自行置空。

---

## 6. 站群隔离配置项

`_site_config.js` 随源码交付、非构建产物、最先同步加载，是唯一环境和配置来源。组件禁止硬编码以下值。

| 配置 | 本站值或规则 |
|---|---|
| `SITE_ID` / `SLUG` | 均为 `gdpr-dpa-saas`，满足 `[a-z0-9-]`、不超过 20 字符；路径、文件名、存储命名空间共用。 |
| `KEYWORD` | `GDPR DPA generator for SaaS`，只用于用户可读文案和 SEO 元数据。 |
| `ENV` | 仅由 hostname 判断：localhost、127.0.0.1、::1、`.local` 为 dev，其余为 prod；其他模块不得再次实现 isDev。 |
| `API_BASE` | `/bff/gdpr-dpa-saas`，同源相对路径；check/track 由 api 封装拼接，禁止独立 API 子域。 |
| `TRACK_PATH` | `/bff/gdpr-dpa-saas/track`，不得省略站点段。 |
| `HEALTH_PATH` | `/bff/gdpr-dpa-saas/health`，只供部署校验。 |
| `MANIFEST_URL` | `/manifests/gdpr-dpa-saas.json`，只供开发前/构建校验，不在页面运行时轮询。 |
| `VERSION` | `0.1.0`；所有自定义 CSS/JS 查询参数 `v` 必须同值，发版同步递增。 |
| `TELEMETRY_FILE` | `gdpr-dpa-saas-telemetry.js`，禁止通用 `tracker.js`。 |
| `SESSION_NAMESPACE` | `gdpr-dpa-saas`；sessionStorage 键为 `gdpr-dpa-saas:session`。 |
| `SALT_SECRET` | 独立随机、不派生、只作为部署配置键名；部署时注入，实际值不写入文档、源码仓库、日志或 payload，不承担加密职责。禁止提交真实长期密钥。 |
| `FREE_QUOTA` | 只作预说明；实际免费模式必须由 `quota_info.unlimited=true` 确认。 |
| `QUEUE_LIMIT` | 300；单条 2KB、单批 32KB、单批 50 条。 |

事件字段名和 enum 只能从 manifest 注入或由开发时生成的常量表逐字复制；严禁前端自行增加或删除 `f_` 等前缀。语义 ID 映射完全在后端，前端配置不得出现映射表。本期明确**不做构建变异、类名混淆、文件名变异或预埋变异空位**。

`sess_ref` 的可验收派生格式固定为 `gdpr-dpa-saas:{32 位小写 hex}`：先用 `crypto.getRandomValues` 生成 16 字节随机数并编码为 `random32`，再计算 `SHA-256(SALT_SECRET + ":" + SITE_ID + ":" + random32)`，取摘要前 32 位小写 hex 拼在站点前缀后；唯一性由随机数保证，盐只提供站点级派生差异。示例为 `gdpr-dpa-saas:0123456789abcdef0123456789abcdef`。仅在首次进入 granted 时创建并在该标签页会话复用，denied/unset 不创建；撤回同意或关闭标签页时删除，之后再次同意生成新值。storage 不可用时仅保留内存值。`crypto.subtle` 不可用则该会话只做 denied 匿名聚合，不降级为可预测标识。

下发到浏览器的站点盐必须按公开值处理：配置键虽名为 `SALT_SECRET`，但不得复用任何服务端私密密钥，也不得把它用于访问控制、签名验证或保密；部署注入不等于对浏览器用户保密。

本期 check **不发送** `X-Session-Id`。未来若服务端额度契约要求启用，必须另取独立随机会话值，只放 check 请求头；不得复用 `sess_ref`、写入 track 信封或用于跨站关联。

---

## 7. BFF 接口契约

### 7.1 契约分层

- **基座事实**：只走 `/bff/gdpr-dpa-saas/check` 与 `/track`；`export`、`memory/sync` 为 501；统一信封、限流、health 和 track 线格式按基座执行。
- **本站契约已落地**：`contracts/gdpr-dpa-saas/contract.md`、`public/manifests/gdpr-dpa-saas.json` 与 `GdprDpaSaasCheckController` 为权威来源；本节请求/响应示例与实测响应一致，字段名不得在实现中改写。
- 请求 `site_id` 必须与路径一致；所有响应解析 HTTP 与业务 code。成功 code 以正式契约为准，本文不自造成功码。

### 7.2 `POST /bff/gdpr-dpa-saas/check`（已对接）

用途：生成一份 processor-side SaaS DPA。请求示例中的公司信息均为虚构，不得用于埋点。

```json
{
  "site_id": "gdpr-dpa-saas",
  "controller": {
    "legal_name": "Example Customer GmbH",
    "address": "Example address",
    "country": "DE",
    "contact_email": "privacy@example-customer.invalid"
  },
  "processor": {
    "legal_name": "Example SaaS Ltd",
    "address": "Example address",
    "country": "IE",
    "contact_email": "privacy@example-saas.invalid"
  },
  "processing": {
    "service_summary": "Hosted customer support workspace",
    "purposes": ["hosted_application", "customer_support"],
    "data_categories": ["account_identifiers", "usage_metadata"],
    "data_subject_categories": ["customer_personnel", "end_users"],
    "special_category_data": false,
    "duration": "service_term"
  },
  "subprocessors": {
    "authorization": "general",
    "notice_days": 30,
    "items": [
      {"legal_name": "Example Cloud", "country": "US", "service_category": "cloud_hosting"}
    ]
  },
  "transfers": {
    "region": "third_country",
    "mechanism": "scc"
  },
  "termination": {
    "data_disposition": "controller_choice",
    "completion_days": 30
  },
  "security": {
    "measures": ["encryption_in_transit", "access_control", "audit_logs", "backups"],
    "breach_notice_hours": 24
  },
  "dimensions": ["article_28", "annexes"],
  "detail_level": "full"
}
```

约束与 UI 映射：

- controller 固定为客户、processor 固定为当前 SaaS；本期不提供角色互换，避免误用。
- “EEA only”映射 `region=eea_only + mechanism=not_applicable`；仅在用户明确表示“我们已决定采用 SCCs”时，“Outside the EEA with SCCs”才映射 `region=third_country + mechanism=scc`。使用单一分段控件产生配对值，非法组合应由服务端 400，前端不得静默改写。该分支只生成 DPA 中对既定 SCC 路径的衔接条款，不判断 SCC 是否适用、不选择 SCC 模块，也不生成完整 SCC 或 TIA；其他传输情形应提示用户寻求法律审阅，而不是由前端猜测机制。
- `termination.data_disposition` 枚举为 `controller_choice/delete/return`，`completion_days` 为终止后完成删除或返还的天数。默认 `controller_choice` 要求服务端文书保留 controller 在服务终止后的删除或返还选择权及适用法律的存储例外；固定 delete/return 只表达用户选定事实，前端不得自行拼写该法律条款。
- `authorization=none` 时 `items=[]`；general/specific 可允许空名单但必须生成相应授权条款。子处理者最多 10 项。
- `dimensions`、`detail_level`、`max_items` 为契约要求支持的可选参数；生产生成默认全量，UI 不提供截断文书选项。非法值 400 必须进入 `param_error`，不得忽略。
- 输入长度建议：公司名 160、地址 300、服务描述 500 字符；数值范围和后端保持一致。前端校验不能替代服务端校验。

成功时解析统一信封 `{code,msg,trace_id,data}`，`data` 结构如下（字段名以实测响应为准）：

```json
{
  "items": [
    {
      "clause_key": "processing_instructions",
      "position": 10,
      "title": "Processing on documented instructions",
      "body": "Server-generated clause text",
      "clause_variant": "standard_processor",
      "required": true,
      "status": "generated",
      "rule_id": "server_registered_rule",
      "rule_version": "server_registered_version",
      "confidence": 0.98,
      "matched_terms": ["normalized", "server_terms"],
      "diff_detail": {"server_defined": "structured_detail"},
      "sample_source": "user",
      "replay_context_fields": ["processing_purposes", "processing_data_categories", "processing_duration"],
      "replayable": true,
      "alternatives": [
        {
          "clause_key": "processing_instructions",
          "position": 10,
          "title": "Processing on documented instructions",
          "body": "Server-generated alternative clause text",
          "clause_variant": "narrow_instructions",
          "required": true,
          "status": "generated",
          "rule_id": "server_registered_alternative_rule",
          "rule_version": "server_registered_version",
          "confidence": 0.96,
          "matched_terms": ["normalized", "alternative_terms"],
          "diff_detail": {"server_defined": "alternative_detail"},
          "sample_source": "user",
          "replay_context_fields": ["processing_purposes", "processing_data_categories", "processing_duration"],
          "replayable": true
        }
      ]
    }
  ],
  "summary": {
    "document_title": "Data Processing Agreement",
    "template_version": "server_registered_template_version",
    "applicable_required_total": 12,
    "generated_applicable_count": 12,
    "warning_count": 0,
    "coverage_ratio": 1,
    "rule_id": "server_registered_assembly_rule",
    "rule_version": "server_registered_version",
    "confidence": 0.98,
    "matched_terms": ["normalized", "server_terms"],
    "diff_detail": {"server_defined": "assembly_detail"},
    "sample_source": "user",
    "replay_context_fields": ["processing_purposes", "processing_data_categories", "subprocessor_authorization", "security_measures", "termination_data_disposition"],
    "replayable": true
  },
  "free_quota_used": 0,
  "plan": "free",
  "quota_info": {"limit": null, "unlimited": true}
}
```

每条 `items[]` 及其 `alternatives[]` 必须含六归属键、`replay_context_fields` 与布尔 `replayable`；summary 也携带这两个回放字段，其六归属字段用于整次生成链路事件，不能使用首条条款冒充。六键存在不等于归属有效：修正/确认只有非空 `rule_id/rule_version` 且 `replayable=true` 才能进入有效对齐样本；漏报则要求这两个键按契约显式为 null 且 `summary.replayable=true`。

覆盖率分母为本次事实下适用的必需项数，只统计服务端判定已生成的适用项；**它是模板覆盖指标，不是 GDPR 合规率或法律评分**。前端不得自行计算或改变分母。`applicable_required_total=0` 时 `coverage_ratio=null`，UI 显示 `No applicable required clauses`，不得显示 100%。

empty 与 degraded 的响应边界固定如下：`items=[]` 仍须返回结构合法的 summary、`replay_context_fields` 和 `replayable`，其中适用/生成计数为 0、`coverage_ratio=null`，summary 的 `rule_id/rule_version/confidence/matched_terms/diff_detail` 可为 null、`sample_source="user"`。非 empty 响应中，若仅某个 item/alternative 的 `rule_id/rule_version` 为 null 或 `replayable=false`，其余结构合法，可以展示该条款，但涉及该对象的修正/确认必须 `degraded=true`，只进入降级计数；独立漏报依据 summary.replayable 作同样判定。规则若消费 special_category_data 等禁止上报的 L1/L2 事实，服务端必须返回 `replayable=false`，前端不得为追求可回放而补传这些事实。六键、replay 清单或 replayable 缺失、replay 清单含未知/L1/L2 字段、summary 归属无效、计数越界、重复 clause_key/position 或其他结构缺字段，均按无效成功响应进入 server_error，不上报 check_completed。

响应文本与顺序契约：

- `body` 为 UTF-8 **plain text**，不是 HTML/Markdown；段落间固定 `\n\n`，段内换行为 `\n`。渲染可把它拆成 `<p>`/换行节点，但每段只用 `textContent`，原 `body` 字符串不变。
- `items[]` 数组顺序是完整 DPA 的唯一权威顺序，`position` 单调递增且 clause_key 唯一；附件也在同一数组中。前端不得按 required、标题或字母重新排序，不得过滤 warning 项。
- `alternatives[]` 是服务端针对当前事实预生成的完整可选条款对象，不再嵌套 alternatives；每个选项也必须有独立六归属字段。MVP 至少要求 processing scope、subprocessor、transfer、security、termination 五类可审阅条款有可选 variant，否则“改结果”功能未完成。前端只选择对象，不生成或拼接替代法律文本。
- 原始响应保留在 `state.result`；`state.review[clause_key].activeItem` 初始指向原 item，修正后指向所选 alternative。复制和打印按 items 权威位置读取 activeItem 的 `title/body`，顺序不变、计数不变，不包含按钮、覆盖仪表盘或交互说明。
- 复制文本固定为 `document_title`、空行、各 activeItem 的 `title + "\n\n" + body`，末尾附模板版本与固定草案免责声明；段落间一个空行，不添加 Markdown 标记。打印使用同一 activeItem 序列和纯文本段落，保证修正后的内容就是用户复制/看到的内容。

### 7.3 `POST /bff/gdpr-dpa-saas/track`

granted 线格式示例（业务字段以 manifest 为准）：

```json
{
  "site_id": "gdpr-dpa-saas",
  "consent": true,
  "sess_ref": "gdpr-dpa-saas:0123456789abcdef0123456789abcdef",
  "page_path": "/",
  "device_type": "desktop",
  "referrer_host": "direct",
  "dropped_count": 0,
  "events": [
    {
      "event": "check_completed",
      "event_id": "0123456789abcdef",
      "check_duration_ms": 840,
      "render_ms": 42,
      "item_count": 12,
      "warning_count": 0,
      "rule_id": "server_registered_assembly_rule",
      "rule_version": "server_registered_version",
      "confidence": 0.98,
      "matched_terms": "normalized,server_terms",
      "diff_detail": "server_defined_scalar",
      "sample_source": "user"
    }
  ]
}
```

- 顶层信封不得写成 `session_id` 或 `envelope:{}`；事件字段平铺，不使用 `event_name`、`fields:{}` 或 `{type,ts,global,data}`。
- `event_id` 为 16 位 hex，客户端生成并在重试间保持不变；`ts` 由服务端注入。不得上送 `anon_id`、`account_id`、`envelope_v`。
- denied 只发 `{"site_id":"gdpr-dpa-saas","consent":false,"events":[{"event":"page_view","total":1}]}`。
- 成功恒 204 无 body，前端不得读取响应体。400/413 是终态格式错误，直接丢弃并计 `dropped_count`；429 静默丢弃，不反向限制用户。仅网络失败与 5xx 可按第 10 节退避重试，其他 HTTP/业务错误不重试。
- track 请求统一发送 **raw JSON string**，Content-Type 为 `text/plain;charset=UTF-8`，不使用 FormData 或 URL 编码。pagehide 时 sendBeacon 使用同类型 Blob；返回 `true` 只代表浏览器接管，不代表服务端落盘，最终以 events JSONL 和 health 核验。
- 单条 ≤2KB、单批 ≤32KB、≤50 条，按 UTF-8 字节数计算。单条超限时先删除 manifest 标记为 optional 的 L4 细节；六归属字段、event/event_id 和高价值事实对不得为压缩而删，仍超限则丢该条。批量超限依次丢弃 `clause_expanded` 末次采样、最旧重复 `result_viewed`、最旧 `result_dwell`，再按“低价值最旧优先”丢弃，修正/确认/漏报最后；超限部分不得拆成多个规避批次，全部计入下一批 `dropped_count`。

### 7.4 manifest、health、占位与 Mock

- `GET /manifests/gdpr-dpa-saas.json`：开发前拉取并校验事件名、auto_event、字段类型、enum、nullable；生成物不得手改。
- `GET /bff/gdpr-dpa-saas/health`：部署后解析统一信封中的 `data.configured_status/effective_status/trial_days_elapsed/manifest_ok/last_event_ts/unknown_fields_24h/unregistered_dropped_24h/bot_dropped_24h`，并核对 `events_registered` 与 manifest。硬性要求状态符合已审批配置、`manifest_ok=true`、`unknown_fields_24h=0`、`unregistered_dropped_24h=0`；`last_event_ts` 在真实上报后应非空。`l12_blocked/consent_strip` 从后端审计/日聚合观察，不臆造为 health 返回字段。
- `/bff/gdpr-dpa-saas/export`、`/bff/gdpr-dpa-saas/memory/sync`：只允许部署探针验证 501；前端无调用点、无空函数、无 UI 入口。
- Mock 仅在 `ENV=dev` 且网络不可达时由 api 封装启用；超时和业务错误码不降级，prod 永不降级。
- 降级结果固定显示 `Demo data — live generation is unavailable.`，`sample_source=mock`，不上报真实 `check_completed`，禁用确认、修正、漏项入口，禁止将 Mock 计入真实样本。

### 7.5 限流与错误码

check 默认 10 次/分/IP，track 60 次/分/IP，独立配额，站点覆盖值以响应头为准。后端 `RateLimiter` 的 `X-RateLimit-Reset` 已确认是 **Unix epoch 秒**，不是毫秒或相对秒；`Retry-After` 是纯数字相对秒。

429 倒计时算法固定为：优先取合法 `X-RateLimit-Reset`，在收到响应时计算 `seconds=max(0,ceil(reset-Date.now()/1000))`；Reset 缺失、非有限整数或结果不为正数时，回退到合法 `Retry-After`（向上取整且最小 1 秒）；两者都不可用时保守使用 60 秒。随后以 `performance.now()+seconds*1000` 建立单调时钟 deadline，每次渲染和 `visibilitychange` 时显示 `ceil((deadline-performance.now())/1000)`，归零只恢复 idle，不自动重发。不得混用 Reset 与 Retry-After、叠加两个值或持久化倒计时。`X-RateLimit-Limit/Remaining` 仅用于诊断，不参与额度权威判断。

| HTTP + code | 前端语义 |
|---|---|
| 2xx + 正式成功 code | 先校验 data 与对应 Schema；`items=[]` 进入 empty，否则 success。 |
| 2xx + 正式成功 code，但 data 结构、summary 归属、replay 清单或顺序 Schema 无效 | server_error；不挂载结果，发带 nullable 六键的 check_failed，不伪造 check_completed。单条 item 仅 rule_id/rule_version=null 或 replayable=false 按 degraded 规则处理，不混入本行。 |
| 400 + `INVALID_PARAM` | param_error；显示字段/参数提示，不自动重试。 |
| 403 + `QUOTA_BLOCKED` | quota_blocked；读取 quota_info，不展示付费承诺。 |
| 413 + `PAYLOAD_TOO_LARGE` | check 按参数过大处理；track 终态丢弃。 |
| 429 + `RATE_LIMITED` | check 进入 rate_limited 并倒计时；track 静默丢弃。 |
| 5xx + `INTERNAL` | server_error；允许用户主动重试，Toast 可附 trace_id 后 6 位。 |
| 网络不可达 | prod 进入 network_timeout；仅 dev 可受控 Mock。 |
| 10 秒超时 | network_timeout；取消在途请求，允许重试。 |
| AbortError | 不进入错误态、不上报 check_failed；旧响应不得覆盖新结果。 |

---

## 8. 上下文动作事件字典

以下事件与字段已与 manifest 逐字对齐（19 个事件），不是待登记草案；任何实现变更仍须先从 manifest 复制，未注册事件或字段一律不得发送。所有 granted 行另含 `event` 与 `event_id`，所有事件遵守第 7.3 节重试和体积规则。

| 事件名 | 唯一触发时机 | 业务字段（平铺） | 匿名化、频率与重试 |
|---|---|---|---|
| `page_view` | 埋点适配器在页面加载后自动上报 | 无 | 不含输入；SDK/auto_event 唯一来源，页面脚本不得重复手报。 |
| `check_started` | 本地校验通过、即将发起真实 check | `input_source,run_sequence,purpose_count,data_category_count,subprocessor_count_bucket,transfer_region,security_measure_count` | 只含枚举/计数，每次真实提交一次；Mock 不触发。 |
| `check_completed` | 非 Mock 的有效 2xx 响应（success 或 empty）且对应 DOM 渲染完成 | `check_duration_ms,render_ms,item_count,warning_count` + summary 六归属字段 | 双计时必带；每次有效响应一次；empty 的 item_count=0，summary 六键按 empty nullable 契约上报；归属取 summary 原对象。 |
| `check_failed` | 真实请求返回业务失败、无效成功响应、超时或网络失败；本地校验失败、Abort、Mock 除外 | `error_code,check_duration_ms,degraded` + **完整六归属字段** | 六键始终存在；无可用 summary 时按下方 nullable 规则，不含输入原文，不编造归属。 |
| `result_viewed` | 紧凑 ResultSummary 观察锚点首次连续 500ms 保持自身面积 ≥50% 可见 | `render_ms,item_count,warning_count,sample_source` | 每次新结果渲染最多一次；低于阈值或页面隐藏即取消计时，重新生成重置；不得观察整份可能高于视口的长文书。 |
| `result_dwell` | 结果隐藏、pagehide 或新结果替换时结算 | `dwell_seconds,expanded_clause_count,item_count,sample_source` | 每段可见结果结束时一次，pagehide 兜底；不按秒高频发送；无 IntersectionObserver 时不累计、不发送。 |
| `clause_expanded` | 用户展开条款细节 | `clause_key` | 低价值高频：同 requestId 同条款首次展开即入队，之后只更新一个待结算末次样本，在结果替换/pagehide 时上报；仅展开一次不重复发末次。枚举来自响应。 |
| `correction_submitted` | 用户选择不同的服务端 alternative、提交理由，且 activeItem 与新条款 DOM 已更新 | 修正前 activeItem 的六归属字段 + `attempt_count,clause_key,system_variant,corrected_variant,reason_tag,transfer_region,degraded` | 高价值全量；同 requestId+clause_key 首次 attempt_count=1、每次修正递增；同 variant 或无真实替换不触发；previousItem 缺 rule_id/rule_version 或 replayable=false 时 degraded=true，不计有效对齐层。 |
| `correction_confirmed` | 用户显式点击“Confirm this clause” | 当前 activeItem 除 `diff_detail` 外五归属字段 + `clause_key,clause_variant,transfer_region,degraded` | 高价值全量；同 requestId+clause_key+rule_version+clause_variant 仅首次有效点击，修正后再次确认使用新对象归属；当前对象缺归属或 replayable=false 时 degraded=true，静默展示不算。 |
| `false_negative_flagged` | 用户通过独立“Report a missing requirement”入口提交 | 六归属字段（`rule_id/rule_version` 显式 null）+ `missing_category,system_variant,expected_variant,reason_tag,transfer_region,degraded` | 高价值全量；可脱离任何 ClauseCard；rule_id 非空则样本无效；summary.replayable=false 时 degraded=true；empty 态归属按下方规则。 |
| `dpa_copied` | 复制 API 成功 resolve 后 | `copy_scope,item_count,time_on_result_s` | 不读取剪贴板内容；失败只给可见反馈，不发成功事件。 |
| `print_requested` | 用户点击 Print 且即将调用 `window.print()` | `print_scope,item_count,time_on_result_s` | 只表示打印请求/意图，不保证对话框成功打开，不宣称已打印或导出 PDF。 |
| `paywall_exposed` | 本期无触发 | `trigger_source,plan` | 仅 Schema 留位；0 量。 |
| `paywall_clicked` | 本期无触发 | `trigger_source,plan` | 仅 Schema 留位；0 量。 |
| `plan_activated` | 本期无触发 | `plan` | 无支付接入，不得增加 no-op 调用。 |

`check_failed` 的归属空值是正式契约要求而非可选实现：有合法 `data.summary` 时六字段全部取其原对象；无响应、业务错误无 summary 或 summary 不完整时，`rule_id/rule_version/confidence/matched_terms/diff_detail` 均为 `null`，`sample_source="user"`，`degraded=true`。manifest 必须为 `check_failed` 以及 `check_completed` 的 empty 分支登记六键，并将前五键标为 nullable；不得用 `0`、空数组、`unknown` 或首条 item 伪造归属。

`false_negative_flagged` 的 `rule_id/rule_version` 恒为 null；非 empty 结果中其余四字段取 summary 作为生成上下文，不解释为“漏报概率”。empty 响应仍按第 7.2 节携带 summary，但其 `rule_id/rule_version/confidence/matched_terms/diff_detail` 为 null、`sample_source="user"`，漏报序列化器原样读取这些空值。本期独立漏项入口不让前端推断它对应哪条现有规则，因此 `system_variant` 恒为 null，manifest 必须标 nullable；`expected_variant` 只能来自固定漏项枚举，以 `system_variant=null ↔ expected_variant=<用户选择>` 表达缺失事实对。empty 与非 empty 均可提交，不得伪造 rule_id 或禁用入口。

为满足可回放性，`correction_submitted`、`correction_confirmed`、`false_negative_flagged` 除行内字段外，还须携带**平铺反馈上下文**，候选字段仅为：`processing_purposes,processing_data_categories,processing_data_subject_categories,processing_duration,subprocessor_authorization,subprocessor_notice_days,security_measures,termination_data_disposition,termination_completion_days,breach_notice_hours`。具体选择不由前端猜测：check 的每个 item/alternative 用 `replay_context_fields` 声明该规则实际消费的字段，summary 同名字段声明独立漏报可用的生成上下文。`correction_submitted` 使用 previousItem 的清单，`correction_confirmed` 使用当前 activeItem 的清单，`false_negative_flagged` 使用 summary 的清单；未列出字段省略。

前端在提交 check 时保存规范化 L3 上下文快照，按上述清单和 manifest 事件白名单的交集投影为标量字段；这只是契约字段名投影，不是法律规则映射或语义 ID 映射。多值字段是 manifest enum 的英文逗号串，数值保持 number，不得发送嵌套 form 对象，`replay_context_fields` 数组本身也不进入事件。清单含未知或 L1/L2 名称时按第 7.2 节无效响应处理；special_category_data 和任何 L1/L2 原值永不加入。修正/确认分别依据 previousItem、当前 activeItem 的 replayable 与 rule_id/rule_version 计算 degraded；漏报的 rule_id/rule_version=null 是正常协议值，只依据 summary.replayable 判定 degraded。`replayable=false` 时仍采集行为和语义信号，但不计入有效对齐样本。这样只有 replayable=true 的 confirmation 才声称可凭五归属字段与上下文独立回放。

variant 口径同步固定：修正事件的 `system_variant=previousItem.clause_variant`、`corrected_variant=新 activeItem.clause_variant`；确认事件的 `clause_variant=当前 activeItem.clause_variant`；独立漏报按上一段使用 `system_variant=null`，不得从 missing_category 反推系统 variant。

计时与枚举口径：`requestStartedAt/responseReceivedAt/resultRenderedAt` 均读取同一 `performance.now()` 单调时钟，`check_duration_ms=responseReceivedAt-requestStartedAt`，`render_ms=resultRenderedAt-responseReceivedAt`，均取非负整数毫秒，避免系统时间回拨污染。结果活跃停留只在 `document.visibilityState=visible` 且 ResultSummary 或任一 ClauseCard 与视口相交时累计，后台和完全离屏暂停；`dwell_seconds` 在结果替换、编辑、卸载或 pagehide 时取累计秒数并只结算一次，`time_on_result_s` 是复制/打印时同一活跃时钟快照。`expanded_clause_count` 是同 requestId 展开过的唯一 clause_key 数。`copy_scope/print_scope` 本期固定 `full_dpa`；`check_failed.error_code` 使用响应业务码；客户端超时/网络失败/无效响应分别取 `NETWORK_TIMEOUT/NETWORK_ERROR/INTERNAL`（该字段为 string(32)，非 enum）。

`reason_tag` 枚举固定为 `unspecified,party_role,processing_scope,transfer,subprocessor,security,retention,breach_notice,missing_clause,other`（与 manifest 一致）；选择 `other` 也不开放自由文本上报。`matched_terms` 等多值 enum 只能英文逗号分隔。

验证期口径：到达→提交使用首页 `check_started/page_view`，提交→完成为 `check_completed/check_started`，成功→查看为 `result_viewed/check_completed`；修正/确认触发率严格为 `(correction_submitted + correction_confirmed) / check_completed`。各指标同站同日、同页面口径计算，denied 不参与会话级漏斗。

---

## 9. 数据资产三层落地

### 9.1 行为层

记录事件名、计数、处理耗时、渲染耗时、停留秒数、展开计数、结果查看、复制与打印意图。漏斗分母使用真实非 Mock 的 `check_completed`，429 不计生成失败中的法律/规则问题。行为层只回答“用户如何使用”，不推断“文书是否合规”。

### 9.2 对齐层

每条修正样本保存：结构化事实对（修正前 activeItem variant ↔ 用户 corrected variant）、`clause_key`、`transfer_region`、修正前 activeItem 六归属字段、`attempt_count` 和 `degraded`。确认样本保存当前 activeItem 除 diff_detail 外五字段、当前 variant 和 degraded。漏报样本保存缺失类别、系统/预期类别、理由标签和 degraded，rule_id/rule_version 必须为 null；是否进入有效对齐层由对应 replayable 与归属规则共同判定。

响应到事件的路径为：`response.data.items[i]` 原对象 → `state.result.items[i]` 同一引用 → `state.review[clause_key].activeItem` 初始同引用 → 渲染层只读视图 → 反馈动作接收 activeItem 引用 → manifest 白名单序列化。选择 alternative 后只改 activeItem 指针，原始 item 和 alternatives 不突变；另建展示视图模型，不得对原对象改名、删字段、格式化 confidence 或拼接 matched_terms。

真实修正闭环为：选择 alternative → 暂存 `previousItem=activeItem` → 校验其 clause_key/position 与当前项一致且 variant 不同 → activeItem 指向服务端预生成对象 → 清除该 clause 的旧 confirmedKeys 并把对应本地历史状态重新置为 draft → 重绘该 ClauseCard → 用 previousItem 归属及其 replay_context_fields 上报 correction_submitted → 后续复制、打印和确认均读取新 activeItem。全程仍保持 success，不再次调用 check，不在浏览器生成法律文本；切换输入或新生成时丢弃全部 review 指针。options 始终引用原 item 与 alternatives，允许切回原 variant，但每次真实切换都使用切换前对象归属并递增 attempt_count。

### 9.3 语义层

只采集固定 `reason_tag` 和结构化 variant，不采集双方名称、地址、服务描述、原文或自由文本修正理由。未选理由统一 `unspecified`。语义层用于发现“传输、子处理者、保留、违约通知”等规则集中问题，不建立用户法律画像。

### 9.4 可回放性验收

对 `replayable=true` 的样本，给定以下最小事实即可离线复现一次判定，不依赖原始输入：服务端 replay_context_fields 选中并由前端平铺上报的归一化反馈上下文、传输类别、条款 key/variant、系统归属字段、用户修正或确认、reason_tag。confirmation 按契约不带 diff_detail，因此其五归属字段加上下文必须足够回放；correction_submitted 另带 diff_detail。后端负责 decisions/samples/false_negatives/labels 落盘和回放；前端负责六字段零丢失、按服务端清单选择上下文、事实对非空和事件幂等。修正/确认缺少 rule_id/rule_version，或修正/确认/漏报对应对象 replayable=false，只能进入 degraded 计数，不能进入有效对齐分母；漏报按协议置空的 rule_id/rule_version 不触发 degraded。依赖 special_category_data 等 L1/L2 的规则必须走 replayable=false 降级路径，不得借回放之名上传私有事实。

---

## 10. 性能与安全落地

### 10.1 可验收性能数值

- 埋点入队同步返回，禁止业务代码 await track；正常每 5 秒或达到 50 条时批量 flush，使用 `requestIdleCallback(timeout:1000)`，降级 `setTimeout`。
- 内存队列 300 条，超出丢最旧；高价值事件入队后立即调度空闲 flush，但仍不阻塞主流程。单条 2KB、单批 32KB、50 条，超限先裁 clause_expanded 等 L4 细节。
- 仅网络失败与 5xx 重试，最多 3 次，退避 1s/2s/4s，沿用同一 event_id；400/413 终态丢弃，429 静默丢弃，其他业务错误不自动重试；最终失败累计到下一批 `dropped_count`。
- pagehide 使用 `sendBeacon` 发送 raw JSON 的 `text/plain;charset=UTF-8` Blob，返回 false/抛错后降级 fetch `keepalive` 同源 raw body，再降级异步 XHR best-effort；三种能力都只经 api 网络单点，卸载不等待回执。sendBeacon 返回 true 不等于落盘，联调仍以 JSONL 为准。
- check 10 秒超时；每次提交中止旧请求并递增 requestId，仅最新请求可写状态。api 封装必须区分超时中止与用户/新请求主动 Abort，前者进入 network_timeout，后者不报失败。重新提交时清理旧限流倒计时、IntersectionObserver 和 dwell 定时器。
- `randomUUID` 不可用时使用 `crypto.getRandomValues` 双随机；event_id 用 8 字节随机生成 16 hex。无文件上传，故无 ObjectURL；重置时释放结果引用、定时器、观察器和 AbortController。
- 历史最多 20 条，展开时才渲染；结果条款 DOM 随新结果卸载，避免长期保留公司名和文书原文。

### 10.2 安全

- 全站 HTTPS，无混合内容；API 只用同源相对路径。生产不启用 Mock。
- 服务端字符串、公司名、条款和错误信息进入 DOM 一律 `textContent`；禁止 innerHTML/document.write 插入动态内容。静态 JSON-LD 直接写在 head，不由 JS 注入。
- 动态链接仅允许 `https:`/`mailto:`，禁止 `javascript:`；事件名、clause_key、enum 只能来自常量表或服务端已登记枚举。
- track 序列化采用“事件→允许字段”白名单，不能只过滤已知危险字段；嵌套对象、数组、自由文本、L1/L2 原值在进入队列前已剔除。
- 剪贴板失败给出“Copy failed — select the text manually”可见反馈，不伪造 `dpa_copied`。打印只表示打开对话框。
- 冲突裁决固定为：**安全 > 主流程性能 > 数据完整性 > 数据密度**。宁可少收展开事件，不放宽脱敏；宁可丢超限批次，不拆包或阻塞生成。

---

## 11. 状态与数据流

### 11.1 全局状态字段

| 状态组 | 字段与职责 |
|---|---|
| 视图 | `view` 十态之一；`fieldErrors`；`error{code,message,traceId,retryAfter}`；`mockDegraded`。 |
| 输入 | `form` 当前事实；`inputSource`；`runSequence`；原始公司/邮箱只在内存或当前标签页草稿。 |
| 请求 | `requestId`、`abortController`、`requestStartedAt`、`responseReceivedAt`、`resultRenderedAt`。 |
| 结果 | `result` 原始 data；`review[clause_key]={activeItem,options=[原item,...alternatives],confirmedKeys}`；提交时的规范化 `feedbackContext`；`resultStartedAt`；`viewedResultId`；`expandedClauseKeys`；`correctionAttempts[requestId:clause_key]`。 |
| 商业 | `plan=free`、`freeQuotaUsed=null`、`quotaInfo=null`、`paywallTriggeredBy=null`；仅有效 check 响应可写权威额度。 |
| 合规 | `consent`、`sessRef`、`telemetryQueue`、`droppedCount`。 |
| 历史 | 仅本地 customer_ref、L3 preset、结果元数据和 uuid，不含文书原文或 L1/L2 原值。 |

### 11.2 唯一状态机

| 当前状态 | 唯一触发 | 下一状态与副作用 |
|---|---|---|
| 任意可交互态 | 提交表单 | validating；中止旧请求、清旧错误和倒计时。 |
| validating | 本地校验失败 | param_error；只标字段，不发 check_started/check_failed。 |
| validating | 本地校验通过 | loading；禁用提交，发 check_started，启动 10 秒计时；若仍有旧结果，先结算 dwell、卸载旧结果/review 与观察器，loading 期间不保留可交互旧文书。 |
| loading | data.items 非空且最新请求 | success；保存原始 data，再渲染并启动 viewed/dwell 观察。 |
| loading | data.items=[] | empty；保留输入，渲染 empty 状态后上报 item_count=0 的 check_completed，提供修改与独立漏报入口。 |
| loading | 400/413 | param_error；显示参数修正。 |
| loading | 429 | rate_limited；按确认的 Reset/Retry-After 口径倒计时。 |
| loading | 403 | quota_blocked；更新 quota_info，无升级入口。 |
| loading | 5xx | server_error；展示重试和 trace_id 后 6 位。 |
| loading | 超时/网络失败 | network_timeout；dev 网络不可达时可进入带 mockDegraded 的 success。 |
| loading | AbortError | 由新请求决定状态；不报错、不覆盖新结果。 |
| empty/param_error/quota_blocked/server_error/network_timeout | 用户编辑或重试 | 编辑回 idle；重试统一从 validating 开始。 |
| rate_limited | 倒计时完成 | idle；仅恢复提交，不自动重发。 |
| success | 选择并应用服务端 alternative | 保持 success；改 activeItem、清除该条款旧确认态并将本地记录置 draft，重绘对应 ClauseCard 后上报 correction_submitted；复制/打印/确认读取新对象。 |
| success | 用户修改任意生成输入 | idle；结算 dwell、释放 review 指针并卸载旧结果，防止旧文书与新输入混用。 |
| success/empty | Reset | idle；中止请求、卸载结果与 review、清当前标签页敏感草稿。 |

### 11.3 数据流

`Form → validate/normalize + feedbackContext 快照 → api.check → envelope parse → state.result 原对象 → review.activeItem → 只读视图模型渲染 → 用户确认/修正/漏项 → 按 replay_context_fields 与 manifest 双重白名单投影 → telemetry 内存队列 → /track`。修正只切换 activeItem 到服务端 alternative，复制/打印共享同一读取路径。额度与 Mock 分支不另建旁路。telemetry 的 loading/error 不进入主状态机，队列异常不弹全局错误。

Consent 门控位于事件入队前：denied 聚合器只累计 `{event,total}`，granted 才允许进入带 sess_ref 和业务字段的队列。同意状态变化时销毁另一模式队列，避免历史数据穿越同意边界。

---

## 12. 组件树

```text
App
├─ SiteHeader
├─ GeneratorPage
│  ├─ HeroAndScope
│  ├─ LegalDraftNotice
│  ├─ CustomerWorkspace
│  │  ├─ CustomerRefPicker
│  │  └─ MyHistoryPanel
│  ├─ DpaForm
│  │  ├─ PartyFields
│  │  ├─ ProcessingFields
│  │  ├─ SubprocessorRepeater
│  │  ├─ TransferModeSegmentedControl
│  │  ├─ SecurityFields
│  │  ├─ TerminationFields
│  │  └─ SubmitBar
│  ├─ RequestStatusRegion
│  ├─ MockDegradedBanner
│  ├─ ResultRegion
│  │  ├─ ResultSummary
│  │  ├─ ClauseList
│  │  │  └─ ClauseCard
│  │  │     ├─ CorrectionReasonPicker
│  │  │     └─ CorrectionConfirmAction
│  │  ├─ FalseNegativeFlag
│  │  ├─ CopyDpaAction
│  │  └─ PrintDpaAction
│  ├─ MethodologySection
│  └─ FaqSection
├─ ConsentManager
├─ SubscriptionCTA [静态 hidden]
├─ PaywallOverlay [静态 hidden]
├─ ToastRegion
└─ SiteFooter
```

| 组件 | 一句话职责（可追溯至五类前端职责） |
|---|---|
| SiteHeader/Footer | 仅渲染白名单内相对链接与免费定位，不创建死链。 |
| HeroAndScope | 说明 SaaS processor 与 EU B2B 客户的适用场景，不作合规保证。 |
| LegalDraftNotice | 在输入与结果两侧展示草案性质和法律审阅提示。 |
| CustomerWorkspace | 通过可键盘操作的 select/listbox CustomerRefPicker 管理 C01–C20，不渲染 20 个横向分段按钮，不建立在线账户或客户身份。 |
| MyHistoryPanel | 作为唯一历史可视化出口，支持打开、单条删除、Clear all 和迁移异常提示，不直存 PII。 |
| DpaForm 及字段组件 | 采集、校验、归一结构化事实并支持回车，不执行法律规则。 |
| SubprocessorRepeater | 管理 0–10 个子处理者输入与内存回收，不上报名单到埋点。 |
| TransferModeSegmentedControl | 用互斥视图段生成合法 region/mechanism 配对，防止参数冲突。 |
| SubmitBar/RequestStatusRegion | 映射十态、禁用重复提交、提供重试和倒计时。 |
| MockDegradedBanner | dev 降级时固定可见并禁用三类反馈，防止演示数据污染样本。 |
| ResultSummary | 显示服务端覆盖计数、警示和免费状态，不算法律分数。 |
| ClauseCard | 用 textContent 渲染 activeItem 并提供确认/修正动作，保留归属原引用。 |
| CorrectionReasonPicker | variant 只取当前服务端 alternatives、reason_tag 只读 Event Schema 枚举；应用后真实替换条款，未选理由提交 unspecified，无自由理由。 |
| CorrectionConfirmAction | 仅在用户显式点击后按当前 activeItem 产生确认信号，处理重复点击和 degraded。 |
| FalseNegativeFlag | 在 success 与 empty 均提供不依附已生成条款的漏项入口，强制 rule_id/rule_version=null，空结果其余归属按 nullable 契约处理。 |
| TerminationFields | 采集删除、返还或 controller choice 与完成天数，不在前端拼装 Article 28 法律文本。 |
| CopyDpaAction/PrintDpaAction | 提供真实复制和浏览器打印，成功语义准确，不调用 export。 |
| ConsentManager | 延迟、可拒绝、可撤回地控制 granted/denied 数据流。 |
| SubscriptionCTA/PaywallOverlay | 免费期静态隐藏，保留未来组件边界但无支付调用。 |
| ToastRegion | 用 role=status 提供非阻塞反馈，错误可带 trace_id 后 6 位。 |

---

## 13. 技术栈建议

- 原生 HTML5、CSS、JavaScript ES Modules，无框架、无 SPA、无构建变异；`_site_config.js` 使用同步经典脚本最先加载，业务入口再使用 module。
- 浏览器基线：Chrome/Edge/Firefox/Safari 最近两个主要版本，iOS Safari 15.4+；基线需 fetch、Promise、AbortController、IntersectionObserver。缺失 IntersectionObserver 时结果功能照常，但不发送 `result_viewed`、`viewedResultId` 保持 null，不累计或发送 `result_dwell`，复制/`print_requested` 的 `time_on_result_s=null`（manifest 必须标 nullable），并在联调数据质量记录中标注该次浏览能力缺失；不得把“已渲染”冒充“连续 500ms、50% 已查看”，也不得用页面可见代替结果可见。
- 能力降级：sendBeacon → keepalive → 异步 XHR；requestIdleCallback → setTimeout；randomUUID → getRandomValues 双随机；clipboard API → 可选中文本的手动复制提示。
- 自定义 Select 必须 button + listbox，面板与触发框等宽、键盘上下键/Home/End/Escape、ARIA 选中态和细滚动条；渐进增强时保留隐藏原生 select 的 value/change。禁止裸用操作系统下拉面板。
- FAQ 使用原生 `<details>`，默认收起；以 grid-template-rows 0fr→1fr 做 150–200ms 平滑过渡，同时尊重 reduced-motion。
- 选择器只用 `id`、`data-*`；样式类不承载业务选择。只有 ResultSummary 的短状态文本使用 `aria-live=polite aria-atomic=true`，完整 ResultRegion/ClauseList 不设 live，避免屏幕阅读器朗读整份长文书；Toast `role=status`，表单错误用 `aria-describedby`。
- 缓存策略采用统一版本号参数，不与内容哈希混用；HTML no-cache，带版本的静态资源长缓存。零前端 Nginx 规则改动，依赖既有同源 `/bff/` 与静态托管能力。
- 不引入外部字体、追踪脚本或图片 CDN；首屏无需装饰图片。所有真实图片如后续增加必须非空 alt 并登记资源白名单。
- **UI 开发工具强制约束**：正式编写任何 HTML/CSS 前必须再次调用 `ui-ux-designer`，以第 16 节 Tokens 和组件状态为输入；禁止凭直觉增加色值、渐变或动画。

---

## 14. 视图状态与错误码

| 状态 | 用户可见表现（英文文案基准） | 操作与埋点约束 |
|---|---|---|
| idle | 表单与最近工作位；结果区不伪造内容。 | 可提交/打开历史；仅自动 page_view。 |
| validating | 按钮短暂禁用，字段校验中。 | 失败不发 check_started。 |
| loading | `Generating your customer-specific draft…`，按钮 loading。 | 校验通过后已卸载可交互旧结果并结算旧 dwell；只允许最新 requestId 写入新结果。 |
| success | 草案、覆盖计数、免责声明、复制/打印和反馈入口。 | 完成渲染后再 check_completed；Mock 显示固定警示。 |
| empty | `No draft was generated. Review the required details and try again.` | 保留输入，可返回编辑和独立漏报；渲染后 check_completed 的 item_count=0，不发 result_viewed/result_dwell。 |
| param_error | `Some details need your attention.` + 字段级错误。 | 400/413 不自动重试；不清空输入。 |
| rate_limited | `Too many attempts. Try again in {seconds}s.` | 倒计时只来自确认的响应头口径；结束不自动提交。 |
| quota_blocked | `Generation is unavailable because the current service quota has been reached.` | 无“Upgrade”假入口；保留 403 独立映射。 |
| server_error | `We couldn’t generate the draft. Please try again.` + `Ref: abc123`。 | trace_id 仅展示后 6 位；服务端 msg 用 textContent。 |
| network_timeout | `We couldn’t reach the generation service. Check your connection and retry.` | 同时覆盖 10 秒超时与网络不可达；可重试，dev 仅网络不可达才允许 Mock。 |
| Mock success | `Demo data — live generation is unavailable. Corrections and missing-requirement reports are disabled.` | 不算真实 check_completed；修正/确认/漏项 disabled。 |

Toast 不承载字段级错误；错误区在结果上方且可聚焦。重新渲染结果前清旧错误。取消不显示错误，不上报失败。

---

## 15. GEO 配置

### 15.1 爬虫与信源最小集

`robots.txt` 对 GPTBot、ClaudeBot、PerplexityBot、Google-Extended、Bingbot 分别设置 `Allow: /` 和 `Disallow: /bff/`，另设通用 `User-agent: *` 同样禁止 `/bff/`。sitemap 仅列三张页面；每页有唯一 title、description、生产绝对 canonical；单英文站不设置跨语言互链或虚假 hreflang。

`llms.txt` 只描述真实生成、复制、浏览器打印、本地历史、Article 28 方法、适用边界和三张页面。不得出现“暂不支持导出/签署/同步”之类否定式残留，直接不写未上线功能。

### 15.2 语义化 DOM 与 JSON-LD

- 使用 header/nav/main/section/article/aside/footer、真实 h1–h3、form/fieldset/legend、table 和 details；结果文书用 article，FAQ 与可见文字一致。
- `<head>` 静态直出 `WebApplication + FAQPage + HowTo` JSON-LD，禁止 JS 动态注入。HowTo 的每一步必须在 How to Use 区块逐字可见，FAQ 每条问答逐字一致。
- WebApplication 只列当前功能，免费定价与页面一致；不使用虚假 aggregateRating、review、客户数、签署数或合规保证。
- 方法区设置可引用块：适用范围、GDPR Article 28/32 官方来源、模板版本、覆盖公式、生成时间口径、非法律建议免责句。官方主来源为 [EU GDPR 正文](https://eur-lex.europa.eu/eli/reg/2016/679/oj)。
- 覆盖公式为 `coverage_ratio = generated_applicable_count / applicable_required_total`。仅 EEA 时 SCC 不进入分母；选择第三国传输时相应衔接项进入分母。分母由服务端产生且可达 100%，比率不代表法律合规。

### 15.3 信源化层级

层 1 必做：语义 DOM、可引用方法块、官方 GDPR 来源、静态 JSON-LD。层 2 不做且不留空位。层 3 最小集为 robots.txt、sitemap.xml、canonical、llms.txt，内容与已上线功能一致。

---

## 16. UI/UX 规范

### 16.1 视觉方向与 Design Tokens

采用“法律纸面 + 精密工作区”风格：暖灰页面、白色表单、墨色正文、克制森林绿操作色；不使用蓝紫渐变、 oversized 圆角、发光阴影、通用 AI 插画或装饰性玻璃拟态。

| Token | 值/规则 |
|---|---|
| `color.bg` | `#F5F3EE`；页面底色。 |
| `color.surface` | `#FFFFFF`；表单与文书。 |
| `color.surfaceSubtle` | `#ECE9E1`；次级分组。 |
| `color.ink` | `#1E2421`；正文。 |
| `color.muted` | `#5E6761`；辅助文字，实际组合须测 AA。 |
| `color.accent` / `accentHover` | `#1F5A46` / `#174535`；主按钮与链接。 |
| `color.border` | `#CDD3CE`；边界，不单独承担错误表达。 |
| `color.danger` / `warning` / `success` | `#A32A2A` / `#7A4B00` / `#216E4E`；搭配文字/图标，不只靠颜色。 |
| `color.focus` | `#0B6B8F`；2px 以上 `:focus-visible` 外框并留 offset。 |
| 字体 | UI 使用系统无衬线；生成文书使用 Georgia/系统衬线。正文 16px，辅助不小于 14px，移动输入至少 16px。 |
| 字号层级 | 16/18/20/28/40px，移动 h1 不超过 32px；行高正文 1.6。 |
| 间距 | 4/8/12/16/24/32/48/64px，禁止任意新增。 |
| 圆角 | 4px 控件、8px 卡片、12px 结果容器；禁止胶囊化所有元素。 |
| 阴影 | 仅结果容器可用 `0 1px 2px rgb(30 36 33 / 8%)`，其余靠边框和留白分层。 |
| 布局 | 最大 1180px；桌面表单与侧栏 7:5，结果全宽；低于 900px 单列，375px 无横向滚动。 |
| 动效 | 仅 opacity/transform 与 details grid 行高，150–200ms；reduced-motion 下取消。 |
| 点击区 | 至少 44×44px；相邻小图标按钮保留足够间距。 |

### 16.2 关键交互

- 首屏只呈现定位、适用范围和首个字段分组，不自动弹 Consent、订阅或历史；Consent 在首次交互后出现。
- 表单分六段，条件字段随选择挂载/卸载；卸载的条件值不得偷偷随请求发送。所有按钮具备 default/hover/focus/disabled/loading/error 状态。
- 结果摘要先显示条款数、需审阅警示与复制/打印，再显示完整文书；付费锁区不存在。用户无需注册即可获得完整结果。
- 每条 ClauseCard 的确认与修正使用明确动词；修正面板只提供服务端 alternatives 与固定 reason_tag，不开放自由文本上行。应用修正后仅替换该条款、撤销该条款旧确认态并显示 `Alternative applied — review before use`，对应本地历史重新置为 draft，复制/打印立即读取新 activeItem；不得只显示“反馈已收到”却保留旧文本。
- 修正和漏项使用原生 `<dialog>`；打开前保存触发按钮，showModal 后聚焦标题或首个选项，Escape/Cancel 与关闭等价，应用或取消后焦点返回触发按钮，若按钮已因重绘卸载则聚焦对应条款标题。dialog 每次只允许一个，失败时保持输入与面板打开，不用 Toast 代替错误。
- 表单在首次 blur 后只校验该已触达字段，提交时校验全部字段；不要在每个按键时闪烁错误。字段错误与输入通过 `aria-describedby` 关联，未修正前持续显示，修正后仅清除对应错误；服务端/全局错误保留到下一次提交或明确重试，不自动消失。
- “Report a missing requirement”固定在结果操作区，未生成任何条款时也可从 empty 态进入，确保漏报能脱离已标出项触发。
- 历史记录以 customer_ref、时间、处理类别和模板版本识别；明确提示“Party details and document text are not stored in local history.”
- 成功渲染后只将焦点移到带 `tabindex=-1` 的结果 h2，并由 ResultSummary 播报“Draft generated, N clauses”；完整文书不进入 aria-live。若用户已在新响应到达前移动到其他交互控件，不抢焦点，只保留摘要播报。
- 长公司名、条款和 URL 使用 `overflow-wrap:anywhere`、正文 `white-space:pre-wrap`、移动端正文宽度 100%，桌面文书行宽不超过 70ch；375px 与 200% 缩放均无横向滚动，不对长单词强制 `word-break:break-all`。
- 打印样式隐藏导航、表单、Consent、历史、按钮和 Toast，只保留修正后的完整 activeItem 序列、模板版本与免责声明；标题与首段尽量同页，长条款允许自然分页，禁止对整张长 ClauseCard 设置 `break-inside:avoid` 造成打印溢出。
- 无障碍验收覆盖键盘完整流程、Consent 非模态焦点、dialog 焦点返回、屏幕阅读器标签、错误关联、200% 缩放和 reduced-motion；自动化扫描不能替代人工验证，也不宣称未经测试即通过 WCAG。

---

## 17. S-4 厚文本大纲

全部正文在首页静态直出，语言为英文，动态结果不得改写这些固定内容。

1. **How to Use**：准备双方信息 → 描述处理类别 → 配置子处理者 → 选择 EEA，或仅在已决定采用 SCC 时选择第三国 SCC 路径 → 选择安全措施与终止后删除/返还/controller choice → 生成并逐条审阅 → 复制或打印。
2. **Why a Customer-Specific DPA Matters for SaaS**：解释 SaaS 作为 processor、B2B 客户作为 controller 的典型关系，以及为什么通用隐私政策不能替代 DPA。
3. **What the Generator Covers**：处理主题/期限/性质/目的、数据与数据主体类别、八类处理者义务、子处理者、传输、安全附件、删除/返还、审计与协助。
4. **Method and Coverage Formula**：说明服务端条件选择、适用分母、生成覆盖公式和模板版本；明确覆盖不等于法律合规。
5. **International Transfers**：说明仅 EEA 与“用户已决定采用 SCC”的第三国 DPA 衔接路径；不得表述为所有第三国传输都必须或只能使用 SCC，完整 SCC 模块与传输合法性仍需单独审阅。
6. **Sub-processors and Security Annexes**：general/specific/none 的差异，为什么安全措施必须反映真实实践而非营销承诺。
7. **A Lightweight Workflow for 3–20 Customers**：使用 C01–C20 本地工作位和 L3 preset 复用；说明公司信息与文书原文不进入本地历史。
8. **Scope and Limits**：草案需要双方审阅与签署；工具不判断实际合法性、不验证真实安全实践、不替代律师、DPIA、RoPA 或签署流程。
9. **Data Sources and Review**：引用 GDPR 官方正文，说明模板版本来自服务端响应；不得标注未经证实的律师审阅或自动更新。
10. **FAQ**：是否需要 DPA、与隐私政策的区别、SCC 分支、子处理者、生成后步骤、数据如何保存、是否免费、是否提供法律建议。FAQPage JSON-LD 与可见内容逐字一致。

---

## 18. 部署配置与校验命令

### 18.1 四周分阶段实现

| 阶段 | 前端交付 | 硬门禁 |
|---|---|---|
| 第 1 周：契约与静态骨架 | 对齐正式 contract/manifest；完成三页面、路由白名单、Tokens、表单骨架、静态厚文本和 JSON-LD。 | 契约未生成则停在静态内容，不写请求/事件常量；ui-ux-designer 已参与。 |
| 第 2 周：真实生成闭环 | 完成 api/state、check、结果渲染、十态、取消/超时/限流、dev Mock 和复制/打印。 | 不用前端算法补结果；prod 不降级；动态 DOM 全 textContent。 |
| 第 3 周：数据资产与本地工作流 | 完成 Consent、真实 track、六字段回传、修正/确认/漏项、历史/迁移和复制反馈。 | granted/denied 均真实请求；拒绝后核心可用；L1/L2 不入事件与 localStorage。 |
| 第 4 周：验证与上线 | 完成 GEO、响应式、键盘/读屏、打印、契约自检、落盘核验、五节 DoD 和部署检查。 | contract-check 0 failed；health 三项合格；无死链、无 console 错误、无未上线入口。 |

### 18.2 MVP 验收标准

**功能真实性**：至少验证 EEA-only、用户已选第三国 SCC、无子处理者、一般授权、特定授权、特殊类别警示，以及终止后 delete/return/controller_choice 三组事实；每组均由服务端返回对应不同条款与附件。空结果不显示假文书；复制包含完整 activeItem 结果；打印仅调用浏览器打印能力，print_requested 不保证对话框成功打开。五类目标条款均有服务端 alternatives，应用后文本真实变化且六归属来源正确。法律模板须由合格审阅者签字确认，前端覆盖计数不能替代该门禁。

**状态与异常**：十态均有唯一触发；400、403、413、429、5xx、超时、取消、结构缺字段/无效 replay 清单的 2xx 响应逐项模拟通过；另测单条 item 仅 rule_id/rule_version=null 或 replayable=false 时可展示但反馈 degraded，不误入 server_error。连续提交只呈现最新结果且 loading 无旧文书可交互；429 分别验证 Reset、Retry-After、双缺失 60 秒兜底、切后台恢复和定时器清理；403 不落入通用 server_error；Mock 修正/漏项不可用。

**数据资产**：每条款六字段从响应到反馈零丢失；check_failed 即使无响应也含六键和 nullable 空值；attempt_count 同 requestId+clause_key 从 1 递增；confirmation 不带 diff_detail；修正/确认/漏报只按服务端 replay_context_fields 与 manifest 交集携带 L3 上下文，数组本身不上行；漏报 rule_id/rule_version 与 system_variant 显式 null，empty 态不伪造其他归属；修正/确认缺归属，或修正/确认/漏报对应对象 replayable=false 时带 degraded=true，漏报协议置空的 rule_id/rule_version 不误判；special_category_data 等 L1/L2 不得为回放补传；修正/确认触发率公式可按第 8 节复算。修正后 DOM、复制、打印和确认均使用同一 alternative activeItem，旧确认被撤销且历史回到 draft，不允许只记录反馈而不改结果。

**隐私与安全**：拒绝 Consent 后 denied 包只含 event/total；队列和 localStorage 无公司名、地址、邮箱、服务描述、子处理者名单、文书原文；无 innerHTML 动态注入、无 javascript: 链接、无硬编码 API 域名。

**本地历史**：C01–C20 各一条、总计最多 20 条；uuid 去重；容量满时不自动删除最旧客户；schema_version 迁移失败进入隔离区且不静默丢弃；party details 和正文不持久化；未来 memory/sync 无调用点。

**SEO/GEO/UI**：三页面 canonical、sitemap、robots、llms.txt 完整；JSON-LD 与可见 FAQ/HowTo 逐字一致；无跨语言互链；375px 无横向滚动；键盘可完成全流程；焦点清晰；颜色组合实测达到 WCAG AA；打印无导航/按钮。

### 18.3 联调与部署校验（PowerShell 5）

以下命令已于 2026-11-13 在本地基座（静态站 `127.0.0.1:8123`、后端 `127.0.0.1:8090`）执行并记录实测结果；生产部署后必须用正式域名与 HTTPS 重跑同一清单，未重跑不得标记为上线通过。

```powershell
$SiteId = 'gdpr-dpa-saas'
$BaseUrl = 'http://127.0.0.1:8090'   # 生产替换为正式站点源
$FrontendRoot = 'D:\phpstudy_pro\WWW\qianduan\gdpr-dpa-saas'

# 1) 拉取权威 manifest（构建期校验用；前端运行时不请求）
$manifest = Invoke-RestMethod -Uri "$BaseUrl/manifests/$SiteId.json" -Method Get
$manifest.events.Count   # 实测 19

# 2) 后端契约自检与站点 lint；事件名为 manifest 全集，逐字一致
cd D:\phpstudy_pro\WWW\vidrank-api
php scripts/contract-check.php --site=$SiteId --base=$BaseUrl --events=page_view,tool_started,tool_completed,tool_failed,check_started,check_completed,check_failed,result_viewed,result_dwell,clause_expanded,dpa_copied,print_requested,correction_submitted,correction_confirmed,false_negative_flagged,consent_changed,paywall_exposed,paywall_clicked,plan_activated
# 实测 5 passed, 0 failed；唯一 warning 为“本站有 check 引擎，需逐字段人工核对”，已核对
php scripts/site-lint.php
# 实测 lint OK: 39 warning(s), 0 error(s)；本站 warning 仅 L1/L2 字段不得进事件白名单 + 纯 manifest 驱动站点无内置表

# 3) check 真实请求：浏览器端已实测 200（15 条条款、coverage_ratio=1、plan=free、quota_info.unlimited=true、六字段齐全）
# 命令行复核时，先把同一请求体保存为本地临时文件；结构按 contract.md 的 controller/processor/processing/subprocessors/transfers/termination/security 组织，site_id 必须与路径一致
curl.exe -sS -X POST "$BaseUrl/bff/$SiteId/check" -H "Content-Type: application/json" --data-binary "@$env:TEMP\gdpr-check-request.json"

# 4) track granted，预期 204 且无 body
curl.exe -sS -o NUL -w "%{http_code}" -X POST "$BaseUrl/bff/$SiteId/track" -H "Content-Type: application/json" --data-binary "@C:\Users\jiajia\AppData\Local\Temp\track-granted.json"

# 5) track denied，预期 204 且无 body
curl.exe -sS -o NUL -w "%{http_code}" -X POST "$BaseUrl/bff/$SiteId/track" -H "Content-Type: application/json" --data-binary "@C:\Users\jiajia\AppData\Local\Temp\track-denied.json"
# 实测两者均 204

# 6) 204 不代表未丢弃：核对真实落盘和 health
Get-Content "D:\phpstudy_pro\WWW\vidrank-api\storage\data\events\$SiteId\2026-11-13.jsonl" -Tail 5
curl.exe -s "$BaseUrl/$SiteId/health"
# 实测 manifest_ok=true、unknown_fields_24h=0、unregistered_dropped_24h=0、bot_dropped_24h=0、events_registered.count=19；
# granted 落盘后 last_event_ts 非空，denied 行形态为 {"event":"page_view","consent":false,"ts":...,"total":1}

# 7) 仅部署探针确认占位，前端代码不得出现这些调用
curl.exe -sS -o NUL -w "%{http_code}" -X POST "$BaseUrl/bff/$SiteId/export" -H "Content-Type: application/json" --data-binary '{"site_id":"gdpr-dpa-saas"}'
curl.exe -sS -o NUL -w "%{http_code}" -X POST "$BaseUrl/bff/$SiteId/memory/sync" -H "Content-Type: application/json" --data-binary '{"site_id":"gdpr-dpa-saas"}'
# 实测均 501；这些只是人工部署探针，不进入任何前端模块。

# 8) 日聚合与离线回放
php scripts/aggregate-daily.php --site=$SiteId
# 实测 [INCR] gdpr-dpa-saas 2026-11-13: +25252 bytes → pv=18 uv=4
php scripts/replay_gdpr_dpa_saas.php --site=$SiteId --sample=10
# 实测 decisions_total=235 checked=10 consistent=10 mismatch=0 version_drift=0，consistency=100%，REPLAY OK

# 9) 静态与抓取检查（静态站根目录）
$Static = 'http://127.0.0.1:8123'
Invoke-WebRequest -Uri "$Static/robots.txt" -Method Get
Invoke-WebRequest -Uri "$Static/sitemap.xml" -Method Get
Invoke-WebRequest -Uri "$Static/llms.txt" -Method Get
# 检查 VERSION=0.3.2 与全部自定义资源 ?v=0.3.2 一致、三页面 canonical 唯一、无白名单外链接。
```

静态自检实测（2026-11-13，VERSION=0.3.2）：三页 canonical 唯一；内部链接与锚点 0 死链；JSON-LD 共 3 段（WebApplication/HowTo/FAQPage）可解析，FAQ 8 条问答与可见文本逐字一致；375px 视口 `scrollWidth=375` 无横向滚动（已修复 `fieldset` 默认 `min-inline-size` 造成的 32px 溢出）；打印样式隐藏导航、表单、按钮、结果反馈与 Consent 控件；动态 DOM 无 `innerHTML`。

另需核对后端 `storage/data/samples/gdpr-dpa-saas/`、`false_negatives/gdpr-dpa-saas/`、`labels/gdpr-dpa-saas/` 的样本与 ctx，运行后端约定的日聚合并检查漏斗、延迟和错误码；逐项完成 `BACKEND-INTEGRATION-CHECKLIST.md` 五节 DoD。静态缓存验收为 HTML no-cache、带版本资源长缓存；无需也不允许为本站新增前端 Nginx rewrite。

---

## 19. 延后清单

以下为 Post-MVP，不在本期 UI、文案、链接、FAQ、llms.txt 或代码调用中留空位：

- 后端 `export`、服务端 PDF/DOCX、批量导出；本期只有复制和浏览器打印。
- `memory/sync`、账户体系、云端多设备、本地历史上传和团队共享。
- 客户登录门户、公开分享链接、客户接受记录、电子签署和签署状态验证。
- 邮件发送、签署提醒、子处理者变更通知和外部子处理者数据库。
- 支付、Pro 套餐、真实付费墙和 plan_activated 调用。
- 既有 DPA 上传解析、compliance checker、完整 SCC 模块生成、TIA、UK Addendum 和其他法域生成。
- 自由文本条款编辑的语义上传、AI 法律建议、自动法律更新承诺。
- 多语言页面、跨语言链接、量产构建变异和 CSS 类名混淆。

另列**上线前必改（非功能延后）**：占位符保留至部署当天，替换后必须升 `VERSION` 并重跑静态自检与 §18.3 清单：

- `gdpr-dpa-saas.example.com` → 正式站点域名：三页 canonical、`_site_config.js` 的 `SITE_ORIGIN`、`sitemap.xml` 全部 `<loc>`、`robots.txt` 的 `Sitemap:` 行、`llms.txt` 三处页面链接。
- `privacy@example.com` → 正式隐私联系邮箱：隐私页 6 处、条款页 1 处。

**开发前置项已完成**：contract.md、manifest（19 事件）、语义映射（84 字段）、成功 code、`sample_source` enum、`check_failed`/`false_negative`/空 summary/`time_on_result_s` 的 nullable 规则、denied 匿名事件白名单、alternatives、`replay_context_fields` 与 `replayable` 完整响应 Schema、后端保留期（395 天 + 每日 cron）均已落地，并通过 `contract-check.php`（0 failed）、`site-lint.php`（0 error）、`replay_gdpr_dpa_saas.php`（100% 一致）验证。官方 SDK 注入点不适用：本站按站群隔离要求使用站点级 `gdpr-dpa-saas-telemetry.js`，transport 与 `sess_ref` 派生均由 `_site_config.js` 注入。

---

## 20. 地基兼容性声明

1. 本站只消费原生 PHP 单入口多站点 BFF 的同源 `/bff/gdpr-dpa-saas/check` 与 `/track`，不新增 API 子域、不直连物理 `/check`、`/track`，不依赖 CORS。
2. `export`、`memory/sync` 已是 501 占位，前端不调用；浏览器打印/复制与本地历史分别由浏览器和 localStorage 完成，不伪装成后端能力。
3. check/track 必带一致 site_id；统一解析 `{code,msg,trace_id,data}`，同时处理 HTTP 与业务 code，错误可展示 trace_id 后 6 位。
4. track 采用顶层信封、event 平铺、denied `{event,total}`、英文逗号 enum、event_id 幂等和 204 无 body；落盘与 health 才是最终验收。
5. check/track 独立限流，429/Reset/Retry-After 映射存在；免费权威在服务端 quota_info，付费分支不可达但 403 状态不删除。
6. 首页 index.html、内页特异命名平铺、标准静态资源、零新增 Nginx 配置、零构建变异；全部页面 canonical 与路由白名单闭合。
7. 核心法律规则、条款选择、覆盖计算和文本生成均在服务端；前端没有纯前端自闭环，也没有真实埋点之外的 no-op 替代。
8. 本站契约、manifest、语义映射与后端保留期均已落地并完成联调：contract-check 0 failed、site-lint 0 error、replay 100% 一致、granted/denied 均真实落盘且 health 三项为 0。剩余上线动作仅为替换域名/邮箱占位符与生产环境重跑 §18.3 清单，不涉及功能开发。

---

## 21. 本地记忆数据结构

### 21.1 存储边界与键

- localStorage 历史键：`gdpr-dpa-saas:history:v1`；迁移隔离键：`gdpr-dpa-saas:history:quarantine`。
- localStorage 同意键：`gdpr-dpa-saas:consent:v1`，只存必要偏好与状态时间，不存行为事件。
- sessionStorage：`gdpr-dpa-saas:session` 保存 sess_ref、runSequence；`gdpr-dpa-saas:tab-draft` 可暂存当前表单，标签页关闭或 Reset 时清除。
- 只有 history 存储适配器可读写历史；MyHistoryPanel 是唯一可视化出口，其他组件不得直读 localStorage。

### 21.2 History v1 结构

```json
{
  "schema_version": 1,
  "site_id": "gdpr-dpa-saas",
  "records": [
    {
      "uuid": "browser_generated_uuid",
      "timestamp": "2026-11-13T06:00:00.000Z",
      "schema_version": 1,
      "site_id": "gdpr-dpa-saas",
      "customer_ref": "C01",
      "status": "draft",
      "input_preset": {
        "purposes": ["hosted_application"],
        "data_categories": ["account_identifiers"],
        "data_subject_categories": ["customer_personnel"],
        "duration": "service_term",
        "subprocessor_authorization": "general",
        "notice_days": 30,
        "transfer_region": "third_country",
        "transfer_mechanism": "scc",
        "security_measures": ["encryption_in_transit", "access_control"],
        "breach_notice_hours": 24,
        "termination_data_disposition": "controller_choice",
        "termination_completion_days": 30
      },
      "result_meta": {
        "template_version": "server_registered_template_version",
        "item_count": 12,
        "warning_count": 0,
        "clause_variants": ["standard_processor"]
      }
    }
  ]
}
```

`timestamp` 为 UTC ISO 8601；`status` 仅 `draft` 或 `confirmed`，只有当前结果全部 required activeItem 都被显式确认后才为 confirmed，修正确认过的条款会重新置为 draft；它只表示本地条款审阅状态，绝不表示已签署。`customer_ref` 只能为 C01–C20。历史明确不含双方名称、地址、邮箱、服务摘要、子处理者名称、完整条款正文、六字段中的业务词项原值或任何事件队列。

打开历史只恢复 L3 preset 和结果元数据；`result_meta.clause_variants` 记录保存时的 activeItem variants，仅用于识别本地审阅进度，不恢复条款正文或六归属对象。用户必须重新填写双方 L1/L2 信息、重新选择 special_category_data 并重新 check，才能获得可复制的最新草案。这样既支持有限复用，又避免把本地浏览器变成客户合同数据库。

### 21.3 合并、去重、容量与删除

- 每个 customer_ref 只保留一条当前记录；工作位首次保存时生成 uuid，同一工作位的再生成、确认、修正或 preset 更新复用 uuid 并刷新 timestamp。删除该工作位后重新创建才生成新 uuid，避免同客户重复记录耗尽容量。
- 合并以 `site_id + schema_version + uuid` 为键，同 uuid 取 timestamp 较新者，不覆盖较新记录；未来 memory/sync 也按 uuid 去重，不覆盖服务端较新项。
- 最多 20 条且 customer_ref 唯一。20 个工作位已满时，新增未占用工作位不可用并提示选择已有工作位或先删除；不得自动移除最旧客户草稿。用其他记录覆盖当前工作位、单条删除和 Clear all 均需确认；同一工作位正常保存生成/修正/确认进度不重复弹确认，清空不影响 Consent 偏好。
- 本地历史持续到用户删除、浏览器清除站点数据或浏览器自身存储回收；本站达到 20 条容量时不做自动淘汰。隐私页如实披露，不宣称云端保留或跨设备可用。

### 21.4 迁移与隔离

- 每次 schema_version 升级提供纯函数迁移，如 v1→v2；先校验 site_id、uuid、timestamp 和字段白名单，再写入新键，成功后保留可恢复备份。
- 迁移失败的记录进入 quarantine，不在主面板展示、不上传、不静默丢弃；面板显示“Some local drafts need attention”，提供删除隔离数据操作。
- 无法解析的原始历史整体移至隔离键并保留用户可清除入口；任何隔离数据都不得进入 track。迁移失败不阻断新生成流程。
- 本期没有 memory/sync 调用、同步按钮或“已同步”状态；未来接入时另行评审数据分级与契约。
