# FastAPI Server Learning Notes

下面这份内容是把聊天里那条关于 `finance-platform` 中 `apps/server` 的讲解，按原答案完整整理到文档中，不做删减，方便后面直接回看。

---

可以。你现在最适合的学习方式，不是先背 FastAPI 语法，而是顺着你这个项目的真实代码，理解一个后端服务是怎么“启动 -> 配置 -> 连接数据库 -> 定义接口 -> 处理业务”的。

我就从入口开始，按这个顺序讲：

1. 服务怎么启动
2. `FastAPI` 应用对象在哪里
3. 路由怎么注册
4. 数据库怎么接进来
5. 数据模型是什么
6. 一个接口是怎么工作的
7. Chat / Agent 这一层又是怎么接上的

我会尽量站在前端视角讲，不会太拘泥 Python 细节，但会把关键语法顺手解释掉。

## 1. 从启动命令开始

你平时启动 server 用的是：

```bash
cd /Users/ellaxin/workspace/finance-platform/apps/server
.venv/bin/uvicorn app.main:app --port 8000
```

这句的意思你可以拆成：

- `.venv/bin/uvicorn`
  用虚拟环境里的 `uvicorn` 启动 Python Web 服务
- `app.main:app`
  去 [`apps/server/app/main.py`](/Users/ellaxin/workspace/finance-platform/apps/server/app/main.py) 里找到变量 `app`
- `--port 8000`
  服务监听 8000 端口

所以整个服务的真正入口就是：

[apps/server/app/main.py](/Users/ellaxin/workspace/finance-platform/apps/server/app/main.py)

---

## 2. `main.py` 是 FastAPI 应用入口

看这段最关键：

```python
app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
)
```

这行你可以理解成：

“创建一个 FastAPI 应用实例。”

这就有点像前端里：

```ts
const app = createApp(...)
```

或者 React 里你创建一个根应用的感觉。

在 FastAPI 里，后面所有接口、路由、中间件，都会挂在这个 `app` 上。

---

## 3. 中间件：先给 app 加能力

`main.py` 里还有这段：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

这是加了一个 `CORS` 中间件。

前端视角你可以这样理解：

- 浏览器里 `mobile web` 页面在 `localhost:8081`
- 后端在 `127.0.0.1:8000`
- 这是跨域请求
- 如果后端不允许，浏览器会拦

所以这个中间件就是告诉浏览器：

“这个后端允许前端跨域调用我。”

`middleware` 这个概念你可以类比成：
“在请求真正到达接口函数之前，先经过一层通用处理。”

前端很像：
- 请求拦截器
- 路由守卫
- 全局插件

---

## 4. 数据库初始化也在入口里做

继续看 `main.py`：

```python
Base.metadata.create_all(bind=engine)
```

这句很重要。

意思是：
“根据你定义好的 Python 数据模型，在数据库里自动创建表。”

这里的：
- `Base` 来自 [`apps/server/app/db.py`](/Users/ellaxin/workspace/finance-platform/apps/server/app/db.py)
- `engine` 也是从 `db.py` 来的

你可以先把它理解成：

“把 Python 里的表结构定义，同步到数据库里。”

这很像前端里：
- 先定义 TypeScript 类型
- 再让系统按这个类型生成结构

只不过这里不是生成类型，而是建数据库表。

---

## 5. SQLite 的兼容修补逻辑

`main.py` 后面还有一段：

```python
if engine.url.get_backend_name() == "sqlite":
    ...
    connection.execute(text("ALTER TABLE ..."))
```

这个意思是：

- 如果当前数据库是 SQLite
- 那就检查某些旧表是不是缺列
- 如果缺了，就用 SQL 给它补上

这是一个很实用但比较“工程化”的做法。

说明这个项目现在没有正式上 Alembic migration，而是先做了轻量兼容补丁。

你现在不用深究细节，只要知道：

- `create_all()` 负责建新表
- `ALTER TABLE` 这段负责补老表字段

---

## 6. 真正把接口挂进 app

在 `main.py` 里还有这句：

```python
app.include_router(api_router, prefix=settings.api_prefix)
```

这里的 `api_router` 来自：

[apps/server/app/api/router.py](/Users/ellaxin/workspace/finance-platform/apps/server/app/api/router.py)

这句的意思是：

“把所有 API 路由统一挂到 app 上，并且统一加 `/api` 前缀。”

所以你最后访问的是：
- `/api/health`
- `/api/chat`
- `/api/users/...`

这和前端路由很像：
- 先拆分多个路由模块
- 再在根路由里统一注册

---

## 7. `router.py` 是路由总入口

看 [`apps/server/app/api/router.py`](/Users/ellaxin/workspace/finance-platform/apps/server/app/api/router.py)：

```python
api_router = APIRouter()
api_router.include_router(chat_router)
api_router.include_router(chat_context_router)
api_router.include_router(finance_router)
```

这个文件的职责非常简单：

“把不同业务模块的 router 拼起来。”

你可以把它类比成前端里的：

- `routes/index.ts`
- 或者 `combineReducers`
- 或者把多个模块化 API 合并导出

所以这几个 router 的职责大概是：

- `finance_router`
  财务数据 CRUD
- `chat_context_router`
  给 agent / chat 用的结构化分析接口
- `chat_router`
  真正的聊天接口

---

## 8. 配置文件：后端的环境变量入口

看 [`apps/server/app/core/config.py`](/Users/ellaxin/workspace/finance-platform/apps/server/app/core/config.py)

```python
class Settings(BaseSettings):
    app_name: str = "Finance Agent API"
    api_prefix: str = "/api"
    database_url: str = "sqlite:///./finance_agent.db"
    chat_provider: str = "codex"
```

这个文件的作用是：

“统一管理服务端配置。”

你可以把它理解成后端版的：

- `env.ts`
- `config.ts`
- `process.env` 的类型安全封装

这里用的是 `pydantic-settings`，好处是：
- 可以从 `.env` 自动读取
- 有类型
- 比直接手写 `os.environ.get()` 更清晰

例如：
- `database_url`
  数据库连接地址
- `chat_provider`
  当前聊天用的是 `codex` 还是 `openai`

---

## 9. `db.py`：数据库连接层

看 [`apps/server/app/db.py`](/Users/ellaxin/workspace/finance-platform/apps/server/app/db.py)

这里有三个核心东西：

**第一，`Base`**
```python
class Base(DeclarativeBase):
    pass
```

这是所有 ORM 模型的基类。

你后面定义 `User`、`AnnualPlan` 这些表时，都会继承它。

**第二，`engine`**
```python
engine = create_engine(settings.database_url, connect_args=connect_args)
```

`engine` 可以理解成：
“数据库连接引擎 / 连接入口。”

**第三，`SessionLocal` 和 `get_db()`**
```python
SessionLocal = sessionmaker(...)
```

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

这个是 FastAPI 里非常典型的写法。

意思是：
- 每次请求来时，创建一个数据库 session
- 请求处理完后，自动关闭

你可以把 `db session` 理解成：
“一次请求期间操作数据库的上下文对象。”

这很像前端里：
- 发请求时创建一个执行上下文
- 用完销毁

但它操作的是数据库，不是浏览器状态。

---

## 10. `yield` 是什么意思

这里你作为前端转后端，需要先知道一个够用版本：

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

`yield` 在这里不是普通返回，而是：

“先把 `db` 交出去给 FastAPI 用，请求结束后再回来执行 `finally` 关闭它。”

你现在不用深入生成器机制，先记住：

`FastAPI 常用 yield dependency 来做请求级资源管理`

比如：
- 数据库连接
- 临时文件
- 外部资源句柄

---

## 11. `models.py`：数据库表结构

看 [`apps/server/app/models.py`](/Users/ellaxin/workspace/finance-platform/apps/server/app/models.py)

这个文件定义了数据库里有哪些表。

比如：

```python
class User(Base):
    __tablename__ = "users"
```

这就表示：
- 有一张表叫 `users`

下面这些字段：

```python
id: Mapped[str] = mapped_column(String, primary_key=True)
name: Mapped[str] = mapped_column(String, default="Demo User")
```

意思就是：
- `id` 是字符串主键
- `name` 是字符串字段

---

## 12. 你可以把 ORM model 看成“数据库版 interface”

你前端熟 TypeScript，可以这样类比：

前端你会写：

```ts
type User = {
  id: string
  name: string
}
```

后端 ORM model 有点像：
- 不仅描述数据形状
- 还真的映射到数据库表
- 并且能用它来查表、建表、关联表

所以 `models.py` 不是普通类型文件，而是：
`数据库结构定义 + ORM 映射`

---

## 13. 这里的几张核心表

这个项目里目前最重要的是这几张：

- `User`
  用户
- `AnnualIncomeItem`
  年收入项
- `AnnualExpenseItem`
  年支出项
- `AnnualPlan`
  年度规划，比如储蓄目标
- `AssetItem`
  资产项

比如 `AnnualIncomeItem`：

```python
class AnnualIncomeItem(Base):
    __tablename__ = "annual_income_items"
    user_id = ForeignKey("users.id")
    year
    name
    amount
    period
```

意思就是：
某个用户在某一年有一条收入项，包含：
- 名称
- 金额
- 周期（年 / 月）

---

## 14. `ForeignKey` 和 `relationship` 是什么

这是你学习后端时一个关键概念。

比如：

```python
user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
```

意思是：
- 这条收入项属于某个用户
- `user_id` 指向 `users.id`

这就是数据库里的“外键”。

然后：

```python
user: Mapped[User] = relationship(back_populates="income_items")
```

这表示：
- ORM 层也知道它和 `User` 有关系
- 以后可以更自然地通过对象访问关联数据

你可以先把它理解成：
- `ForeignKey` 是数据库层关系
- `relationship` 是 Python ORM 层关系

---

## 15. `finance.py`：最典型的 FastAPI 路由文件

这是你学习 FastAPI 最值得看的文件：

[apps/server/app/api/finance.py](/Users/ellaxin/workspace/finance-platform/apps/server/app/api/finance.py)

为什么说它典型？因为它同时包含了：
- 请求参数
- 请求体
- 响应体
- 数据库读写
- 业务逻辑

---

## 16. FastAPI 里的三类数据来源

看一个接口，比如：

```python
@finance_router.get("/annual-income", response_model=NamedAmountListResponse)
def get_annual_income(
    user_id: str,
    year: YearParam,
    db: Session = Depends(get_db),
)
```

这里你会看到 3 种来源：

**1. 路径参数**
- `user_id`
来自 `/users/{user_id}`

**2. 查询参数**
- `year`
来自 URL query，比如 `?year=2026`

**3. 依赖注入**
- `db: Session = Depends(get_db)`
不是用户传的，而是 FastAPI 自动注入数据库 session

这就是 FastAPI 很强的一点：
函数参数本身就几乎等于接口定义。

---

## 17. `Depends(get_db)` 是什么

这个是 FastAPI 核心机制之一。

```python
db: Session = Depends(get_db)
```

意思是：
“这个参数不从请求里取，而是调用 `get_db()` 帮我准备好。”

你可以把 `Depends` 理解成：
`依赖注入`

前端里没完全对应物，但有点像：
- React context 注入
- hook 帮你拿公共资源
- middleware 给 handler 塞上下文

---

## 18. Pydantic 模型：后端版表单校验

在 `finance.py` 里你会看到：

```python
class NamedAmountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    amount: int = Field(ge=0)
    period: str = Field(default="year", pattern="^(year|month)$")
```

这个模型的作用是：
- 定义请求体长什么样
- 自动校验参数是否合法
- 自动生成 OpenAPI 文档

前端你可以把它类比成：
- `zod schema`
- 或者 `yup`
- 或者表单提交前的类型校验

FastAPI + Pydantic 的一个很大优势就是：
`接口类型定义、校验、文档可以基本写在一起`

---

## 19. 一个完整的“新增收入”接口是怎么工作的

看这段：

```python
@finance_router.post("/annual-income", response_model=NamedAmountResponse, status_code=201)
def add_annual_income(...):
```

这表示：
- HTTP 方法是 `POST`
- 路径是 `/annual-income`
- 返回值类型是 `NamedAmountResponse`
- 状态码是 `201 Created`

里面做的事情是：

1. `get_or_create_user`
确保用户存在
2. 创建 `AnnualIncomeItem(...)`
3. `db.add(item)`
把对象加入 session
4. `db.commit()`
提交事务
5. `db.refresh(item)`
从数据库刷新，拿到最新值
6. 返回响应对象

这个流程非常标准。

---

## 20. SQLAlchemy ORM 的基本读写你先记住这几个

在这个项目里最常见的是：

**查**
```python
db.scalars(select(...)).all()
```

**查一条**
```python
db.scalar(select(...))
```

**新增**
```python
db.add(item)
db.commit()
db.refresh(item)
```

**删除**
一般会是：
```python
db.delete(item)
db.commit()
```

对你来说，先不必背所有 ORM API，把这几个模式看熟就够了。

---

## 21. `finance.py` 不只是 CRUD，还做了分析

比如 `get_analysis()` 这个接口。

它不是简单读表，而是：
- 先查收入项、支出项、年度计划
- 再做计算
- 最后返回一个前端友好的结构

这说明一个后端接口常常有两层职责：
- 数据访问
- 业务计算

这一点跟前端很不一样。

前端常常：
- 后端给我什么，我展示什么

后端则常常：
- 原始数据很多很散
- 我要整理、换算、聚合后再返回给前端

---

## 22. `analysis.py`：业务服务层

看 [`apps/server/app/services/analysis.py`](/Users/ellaxin/workspace/finance-platform/apps/server/app/services/analysis.py)

这是你学习“后端怎么组织业务代码”的很好的例子。

这里没有 HTTP 路由，而是纯业务函数，比如：
- `build_analysis_snapshot`
- `analyze_saving_goal`
- `analyze_spending_breakdown`
- `build_projection`
- `simulate_financial_scenario`

这说明：
- `api/` 层负责对外提供接口
- `services/` 层负责业务计算

这个分层很重要。

你可以类比前端：
- `pages/` 或 route 文件：负责页面/接口入口
- `services/` 或 utils：负责业务逻辑

---

## 23. `AnalysisSnapshot` 是什么

```python
@dataclass
class AnalysisSnapshot:
```

这里用了 `dataclass`。

你可以把它理解成：
“一个结构清晰的 Python 数据对象，用来承载一整组已经算好的财务快照。”

它很像前端里：

```ts
type AnalysisSnapshot = { ... }
```

只是 Python 的 `dataclass` 是运行时真实对象，而不只是类型。

---

## 24. 为什么先 build snapshot 再分析

这一步是很好的设计。

`build_analysis_snapshot()` 会先统一算出：
- 当前收入
- 当前支出
- 当前储蓄
- 月储蓄速度
- 当前资产
- 年度目标等

然后后面的函数再基于这个 snapshot 去做不同分析。

好处是：
- 避免重复查询数据库
- 避免每个函数重新算一遍
- 逻辑更清晰

这就像前端里你先把原始接口数据 normalize 一下，再交给多个组件用。

---

## 25. `chat.py`：Agent / Tool Chaining 层

看 [`apps/server/app/api/chat.py`](/Users/ellaxin/workspace/finance-platform/apps/server/app/api/chat.py)

这个文件是现在整个项目最“agent 化”的部分。

它做的事情不是普通 CRUD，而是：

1. 接收用户问题
2. 判断用户问题要用哪些分析工具
3. 调对应分析函数
4. 组装 prompt
5. 调模型
6. 返回结果

这就是一个很典型的：
`工具增强型聊天接口`

---

## 26. 工具链在这里怎么实现

比如：

```python
def select_context_sections(message: str) -> list[str]:
```

它会根据关键词判断：
- 要不要用 `saving_goal`
- 要不要用 `spending_breakdown`
- 要不要用 `projection`
- 要不要用 `what_if`

这是一个很轻量的 planner。

然后：

```python
def build_chat_context(payload, db):
```

会真正去调用这些分析函数，把结果组装成 `context`。

这就是：
`tool chaining`

不是只调一个工具，而是按问题串起多个分析步骤。

---

## 27. 为什么不是直接把数据库数据喂给模型

这是你这个项目里很值得学习的工程点。

你没有让模型自己去看原始收入/支出明细直接胡算，而是：

- 后端函数先精确计算
- 再把结构化结果给模型
- 模型只负责解释、建议、总结

这是一种很成熟的 agent 设计方式。

你以后学 Flask 也一样适用，这不是 FastAPI 独有的，而是后端架构思想。

---

## 28. `stream_chat_reply()` 很适合理解 SSE

这个函数：

```python
def stream_chat_reply(...)
```

不是直接返回最终字符串，而是不断 `yield`：

- `status`
- `tool`
- `chunk`
- `done`

然后在：

```python
@chat_router.post("/stream")
```

里通过 `StreamingResponse` 返回给前端。

这就是你现在项目里的流式响应实现。

你可以把它理解成：
- 普通接口：一次性 `return`
- SSE 接口：分多次 `yield`

这个区别非常重要。

---

## 29. FastAPI 为什么适合你入门

你作为前端转后端，我觉得 FastAPI 特别合适，原因就是它很“显性”：

- 参数定义很直观
- 请求体/响应体有类型
- 文档自动生成
- 路由和依赖注入很清楚
- 不需要你一开始就理解太多魔法

你在这个项目里能明显感受到：
- `main.py` 像应用入口
- `router.py` 像路由分发
- `models.py` 像数据库 schema
- `services/` 像业务逻辑层

这套结构比很多 Flask 入门项目更清晰。

---

## 30. 那 Flask 和 FastAPI 的关系怎么理解

你说你后面还想学 Flask，我建议这样理解：

- `FastAPI` 更现代，类型更强，自动文档更好
- `Flask` 更轻、更自由、更基础

学习顺序上你现在先看 FastAPI 并不亏，因为很多后端通用概念都是一样的：

- 路由
- 请求 / 响应
- 数据库
- 中间件
- 配置
- 服务分层
- 依赖注入 / 上下文管理

等你再学 Flask，你会更容易对比出：
“哪些是 Web 框架共性，哪些是 FastAPI 特有语法。”

---

## 建议你接下来怎么学这个 server

我建议你按这个顺序反复看这几个文件：

1. 入口和框架骨架  
[apps/server/app/main.py](/Users/ellaxin/workspace/finance-platform/apps/server/app/main.py)

2. 路由汇总  
[apps/server/app/api/router.py](/Users/ellaxin/workspace/finance-platform/apps/server/app/api/router.py)

3. 数据库连接  
[apps/server/app/db.py](/Users/ellaxin/workspace/finance-platform/apps/server/app/db.py)

4. 数据模型  
[apps/server/app/models.py](/Users/ellaxin/workspace/finance-platform/apps/server/app/models.py)

5. 最基础业务接口  
[apps/server/app/api/finance.py](/Users/ellaxin/workspace/finance-platform/apps/server/app/api/finance.py)

6. 业务服务层  
[apps/server/app/services/analysis.py](/Users/ellaxin/workspace/finance-platform/apps/server/app/services/analysis.py)

7. Agent 聊天层  
[apps/server/app/api/chat.py](/Users/ellaxin/workspace/finance-platform/apps/server/app/api/chat.py)

---

## 一句话总结

这个 `apps/server` 的结构可以这样记：

- `main.py`：创建 FastAPI app，挂中间件，初始化数据库，注册路由
- `config.py`：读配置
- `db.py`：建数据库连接和 session
- `models.py`：定义数据库表
- `api/`：定义 HTTP 接口
- `services/`：封装业务计算
- `chat.py`：把分析函数和模型调用编排成 agent 接口

如果你愿意，我下一步可以继续做两件很适合学习的事之一：

1. 只挑 `finance.py` 里一个接口，逐行给你讲清楚 FastAPI 是怎么处理请求的  
2. 对比讲一下：如果这个项目用 Flask 写，入口、路由、数据库层大概会长什么样

我更推荐先做 `1`。
