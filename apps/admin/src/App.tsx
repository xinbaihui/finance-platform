import { FormEvent, useEffect, useMemo, useState } from "react";

type AdminUser = {
  id: string;
  name: string;
  role: string;
  email: string;
  status: "Active" | "Pending";
  updatedAt: string;
};

type UserDetail = {
  id: string;
  name: string;
  year: number;
  metrics: {
    assetTotal: number;
    annualIncome: number;
    annualExpense: number;
    savingTarget: number;
  };
  incomeItems: Array<{
    id: number;
    name: string;
    amount: number;
    period: string;
  }>;
  expenseItems: Array<{
    id: number;
    name: string;
    amount: number;
    period: string;
  }>;
};

type RouteState = {
  page: "login" | "users" | "settings";
  userId: string;
};

const mockUsers: AdminUser[] = [
  {
    id: "user_289f6b934b8e",
    name: "EllaXin",
    role: "Admin",
    email: "xinbaihui20091111@126.com",
    status: "Active",
    updatedAt: "2026-04-23 10:20",
  },
  {
    id: "user_budget_001",
    name: "Wendy Lin",
    role: "Operator",
    email: "wendy.lin@example.com",
    status: "Active",
    updatedAt: "2026-04-22 18:40",
  },
  {
    id: "user_goal_009",
    name: "Jason Chen",
    role: "Analyst",
    email: "jason.chen@example.com",
    status: "Pending",
    updatedAt: "2026-04-21 09:15",
  },
];

const ADMIN_API_BASE_URL = "http://127.0.0.1:8000/api";

function parseRoute(pathname: string): RouteState {
  if (pathname === "/settings") {
    return { page: "settings", userId: "" };
  }

  if (pathname === "/users") {
    return { page: "users", userId: "" };
  }

  if (pathname.startsWith("/users/")) {
    const userId = decodeURIComponent(pathname.replace("/users/", ""));
    return { page: "users", userId };
  }

  return { page: "login", userId: "" };
}

function buildUsersPath(userId = ""): string {
  return userId ? `/users/${encodeURIComponent(userId)}` : "/users";
}

export function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [route, setRoute] = useState<RouteState>(() => parseRoute(window.location.pathname));
  const [email, setEmail] = useState("admin@finance-agent.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const selectedUserId = route.page === "users" ? route.userId : "";

  useEffect(() => {
    function handlePopState() {
      setRoute(parseRoute(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!authenticated && route.page !== "login") {
      window.history.replaceState({}, "", "/login");
      setRoute({ page: "login", userId: "" });
    }
  }, [authenticated, route.page]);

  useEffect(() => {
    if (!authenticated || route.page !== "users") {
      return;
    }

    let disposed = false;

    async function loadUsers() {
      setLoadingUsers(true);
      setUsersError("");

      try {
        const response = await fetch(`${ADMIN_API_BASE_URL}/admin/users`);
        if (!response.ok) {
          throw new Error("加载用户列表失败");
        }

        const payload = (await response.json()) as {
          items?: AdminUser[];
        };

        if (!disposed) {
          setUsers(payload.items ?? []);
        }
      } catch (fetchError) {
        if (!disposed) {
          setUsers([]);
          setUsersError(
            fetchError instanceof Error ? fetchError.message : "无法获取用户列表",
          );
        }
      } finally {
        if (!disposed) {
          setLoadingUsers(false);
        }
      }
    }

    loadUsers();

    return () => {
      disposed = true;
    };
  }, [authenticated, route.page]);

  useEffect(() => {
    if (!authenticated || route.page !== "users" || !selectedUserId) {
      setUserDetail(null);
      setDetailError("");
      setDetailLoading(false);
      return;
    }

    let disposed = false;

    async function loadDetail() {
      setDetailLoading(true);
      setDetailError("");

      try {
        const response = await fetch(`${ADMIN_API_BASE_URL}/admin/users/${selectedUserId}`);
        if (!response.ok) {
          throw new Error("加载用户详情失败");
        }

        const payload = (await response.json()) as UserDetail;
        if (!disposed) {
          setUserDetail(payload);
        }
      } catch (fetchError) {
        if (!disposed) {
          setUserDetail(null);
          setDetailError(
            fetchError instanceof Error ? fetchError.message : "无法获取用户详情",
          );
        }
      } finally {
        if (!disposed) {
          setDetailLoading(false);
        }
      }
    }

    loadDetail();

    return () => {
      disposed = true;
    };
  }, [authenticated, route.page, selectedUserId]);

  const filteredUsers = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    const source = authenticated ? users : mockUsers;

    if (!query) {
      return source;
    }

    return source.filter((user) =>
      [user.name, user.email, user.role, user.id].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [authenticated, keyword, users]);

  function navigate(nextPath: string, replace = false) {
    const method = replace ? "replaceState" : "pushState";
    window.history[method]({}, "", nextPath);
    setRoute(parseRoute(nextPath));
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("请输入邮箱和密码。");
      return;
    }

    setError("");
    setKeyword("");
    setUserDetail(null);
    setDetailError("");
    setDetailLoading(false);
    setAuthenticated(true);
    navigate("/users");
  }

  if (!authenticated || route.page === "login") {
    return (
      <main className="shell">
        <section className="auth-card">
          <div className="brand-block">
            <h1>Finance Admin</h1>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <label className="field">
              <span>邮箱</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@finance-agent.local"
              />
            </label>

            <label className="field">
              <span>密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入密码"
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button className="primary-button" type="submit">
              登录
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="masthead">
        <div className="masthead-brand">
          <h1 className="masthead-title">Finance Admin</h1>
        </div>

        <div className="masthead-user">
          <div className="masthead-user-copy">
            <strong>admin</strong>
          </div>
          <div className="avatar masthead-avatar">E</div>
        </div>
      </header>

      <div className="dashboard-shell">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <button
              className={`nav-item${route.page === "users" ? " nav-item-active" : ""}`}
              type="button"
              onClick={() => navigate("/users")}
            >
              用户管理
            </button>
            <button
              className={`nav-item${route.page === "settings" ? " nav-item-active" : ""}`}
              type="button"
              onClick={() => navigate("/settings")}
            >
              设置管理
            </button>
          </nav>
        </aside>

        <section className="dashboard-main">
          {route.page === "users" ? (
            <>
              <header className="page-header">
                <label className="search-box">
                  <input
                    type="text"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="按姓名、邮箱或角色搜索"
                  />
                </label>
              </header>

              <div className={`content-grid${selectedUserId ? "" : " content-grid-single"}`}>
                <section className="table-card">
                  <div className="table-header">
                    <h3>用户列表</h3>
                    <span>
                      {loadingUsers ? "正在加载..." : `${filteredUsers.length} 条记录`}
                    </span>
                  </div>

                  <div className="table-wrap">
                    {usersError ? <p className="table-error">{usersError}</p> : null}
                    <table>
                      <thead>
                        <tr>
                          <th>用户</th>
                          <th>ID</th>
                          <th>角色</th>
                          <th>状态</th>
                          <th>最近更新</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr
                            key={user.id}
                            className={user.id === selectedUserId ? "row-selected" : ""}
                            onClick={() => navigate(buildUsersPath(user.id))}
                          >
                            <td>
                              <div className="user-cell">
                            <div className="avatar">{user.name.slice(0, 1)}</div>
                            <div>
                              <div className="user-name">{user.name}</div>
                              {user.email && user.email !== "--" ? (
                                <div className="user-email">{user.email}</div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                            <td className="mono">{user.id}</td>
                            <td>{user.role}</td>
                            <td>
                              <span
                                className={
                                  user.status === "Active"
                                    ? "status-chip status-active"
                                    : "status-chip"
                                }
                              >
                                {user.status}
                              </span>
                            </td>
                            <td>{user.updatedAt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {selectedUserId ? (
                  <aside className="detail-card">
                    <div className="table-header">
                      <h3>财务详情</h3>
                      <div className="detail-header-actions">
                        <span>
                          {detailLoading ? "正在加载..." : `年度 ${userDetail?.year ?? 2026}`}
                        </span>
                        <button
                          className="detail-close"
                          type="button"
                          aria-label="关闭财务详情"
                          onClick={() => navigate("/users")}
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {detailError ? <p className="table-error">{detailError}</p> : null}

                    {userDetail ? (
                      <div className="detail-body">
                        <div className="detail-user">
                          <div className="avatar avatar-large">{userDetail.name.slice(0, 1)}</div>
                          <div>
                            <div className="user-name">{userDetail.name}</div>
                            <div className="user-email">{userDetail.id}</div>
                          </div>
                        </div>

                        <div className="detail-metrics">
                          <article className="mini-metric">
                            <span>资产总值</span>
                            <strong>{userDetail.metrics.assetTotal.toLocaleString()}</strong>
                          </article>
                          <article className="mini-metric">
                            <span>年度收入</span>
                            <strong>{userDetail.metrics.annualIncome.toLocaleString()}</strong>
                          </article>
                          <article className="mini-metric">
                            <span>年度支出</span>
                            <strong>{userDetail.metrics.annualExpense.toLocaleString()}</strong>
                          </article>
                          <article className="mini-metric">
                            <span>储蓄目标</span>
                            <strong>{userDetail.metrics.savingTarget.toLocaleString()}</strong>
                          </article>
                        </div>

                        <section className="detail-section">
                          <h4>收入项目</h4>
                          <ul className="detail-list">
                            {userDetail.incomeItems.map((item) => (
                              <li key={item.id}>
                                <span>{item.name}</span>
                                <span>
                                  {item.amount.toLocaleString()} /{" "}
                                  {item.period === "month" ? "月" : "年"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </section>

                        <section className="detail-section">
                          <h4>支出项目</h4>
                          <ul className="detail-list">
                            {userDetail.expenseItems.map((item) => (
                              <li key={item.id}>
                                <span>{item.name}</span>
                                <span>
                                  {item.amount.toLocaleString()} /{" "}
                                  {item.period === "month" ? "月" : "年"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      </div>
                    ) : null}
                  </aside>
                ) : null}
              </div>
            </>
          ) : (
            <section className="settings-page">
              <div className="settings-grid">
                <article className="settings-card">
                  <div className="settings-card-header">
                    <h3>Agent 设置</h3>
                    <span>运行策略</span>
                  </div>
                  <div className="settings-list">
                    <div className="settings-row">
                      <div>
                        <strong>默认模型</strong>
                        <p>Codex CLI Provider</p>
                      </div>
                      <span className="settings-chip">已启用</span>
                    </div>
                    <div className="settings-row">
                      <div>
                        <strong>流式响应</strong>
                        <p>聊天页优先使用 SSE 返回状态和分段回复</p>
                      </div>
                      <span className="settings-chip">SSE</span>
                    </div>
                    <div className="settings-row">
                      <div>
                        <strong>工具链模式</strong>
                        <p>根据问题自动选择概览、储蓄分析、支出结构与预测</p>
                      </div>
                      <span className="settings-chip">Auto</span>
                    </div>
                  </div>
                </article>

                <article className="settings-card">
                  <div className="settings-card-header">
                    <h3>平台策略</h3>
                    <span>数据口径</span>
                  </div>
                  <div className="settings-list">
                    <div className="settings-row">
                      <div>
                        <strong>金额单位</strong>
                        <p>数据库统一按元存储，管理后台展示支持元与万元</p>
                      </div>
                      <span className="settings-chip">CNY</span>
                    </div>
                    <div className="settings-row">
                      <div>
                        <strong>当前收入计算</strong>
                        <p>按已过月份累计月度收入，一次性收入直接计入</p>
                      </div>
                      <span className="settings-chip">2026</span>
                    </div>
                    <div className="settings-row">
                      <div>
                        <strong>当前支出口径</strong>
                        <p>月度支出累计到当前月份，一次性支出直接记入本年</p>
                      </div>
                      <span className="settings-chip">累计</span>
                    </div>
                  </div>
                </article>

                <article className="settings-card settings-card-wide">
                  <div className="settings-card-header">
                    <h3>后台说明</h3>
                    <span>管理概览</span>
                  </div>
                  <div className="settings-notes">
                    <p>当前后台用于查看理财副驾驶平台用户、年度收入支出、储蓄目标和资产情况。</p>
                    <p>后续可以继续扩展运营配置、Prompt 管理、角色权限和异常会话排查能力。</p>
                  </div>
                </article>
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
