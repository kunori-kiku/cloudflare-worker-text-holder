# Cloudflare Worker 文本托管器具 
[**English Doc**](README.md)

此 Cloudflare Worker 源代码提供通过预定义用户凭据和超级管理员操作安全访问私人 GitHub 存储库中的文件。

## 功能

- **普通用户操作**：
  - 根据用户名获取文本文件。
  - 针对重复登录失败的 IP 实现封禁机制。

- **超级管理员操作**：
  - 添加、列出和移除用户。
  - 列出或清除登录失败的 IP。

## 环境变量

在 Cloudflare Worker 中设置以下变量：

| 变量名称          | 描述                                                                            |
|-------------------|--------------------------------------------------------------------------------|
| `GITHUB_TOKEN`    | 拥有存储库访问权限的 GitHub 精细化令牌。                                        |
| `GITHUB_USERNAME` | 存储库所有者的 GitHub 用户名。                                                 |
| `REPO_NAME`       | GitHub 存储库的名称。                                                         |
| `DIRECTORY_PATH`  | 存储库中用于获取文件的目录路径。                                               |
| `BRANCH`          | 存储库的分支名称（例如 `main` 或 `master`）。                                  |
| `FAIL_LIMIT`      | IP 在被封禁前允许的失败次数。                                                 |
| `BAN_TIME`        | 被封禁 IP 的持续时间（以毫秒为单位）。                                         |
| `SUPER_TOKEN`     | 用于超级管理员操作的密钥。                                                     |

### 图形界面设置

1. 登录到 Cloudflare 仪表板。
2. 点击 `Workers and Pages`，选择已创建的 Worker，点击 `Settings - Variables and Secrets`。
3. 点击 `Add`，按表格左侧的名称添加条目，值可参考 `_wrangler.toml`。
4. 推荐使用 `Secret` 选项存储 GitHub 令牌。

## KV 命名空间设置

### Wrangler 设置

创建并绑定用于存储用户数据和登录失败记录的 KV 命名空间：

1. 创建命名空间：

   ```bash
   wrangler kv:namespace create "USER_DATA"
   wrangler kv:namespace create "FAILED_LOGINS"
   ```

2. 在 `wrangler.toml` 中绑定命名空间：

   ```toml
   kv_namespaces = [
     { binding = "KV", id = "<namespace-id>" }
   ]
   ```

### 图形界面手动设置

1. 登录到 Cloudflare 仪表板。
2. 点击 `Storage & Databases - KV - Create`，输入首选名称。
3. 回到 `Workers and Pages`，选择已创建的 Worker，点击 `Settings - Bindings`。
4. 点击 `Add`，添加一个名为 `KV` 的条目，指向刚创建的 KV。

## 接口

### 普通用户请求

#### 获取文件

`GET /get?username=XXX&password=XXX`

- 获取与用户名对应的文本文件（例如 `username.txt`）。
- **响应**：
  - `200`：文件内容以纯文本返回。
  - `403`：凭据错误。
  - `404`：文件不存在。

### 超级管理员请求

所有请求均需提供有效的 `superToken`。

#### 添加用户

`GET /addUser?superToken=XXX&username=YYY&password=ZZZ`

- 添加指定凭据的新用户。

#### 列出用户

`GET /listUser?superToken=XXX`

- 返回所有用户名的列表。

#### 删除用户

`GET /removeUser?superToken=XXX&username=YYY`

- 删除指定用户。

#### 列出失败 IP

`GET /listFailIP?superToken=XXX`

- 列出登录失败的 IP 地址。

#### 清除失败 IP

`GET /clearFailIP?superToken=XXX`

- 清除登录失败的 IP 列表。

## 示例用法

### 获取文件

```bash
curl -X GET "https://worker-domain/get?username=johndoe&password=securepassword"
```

### 添加用户

```bash
curl -X GET "https://worker-domain/addUser?superToken=secret&username=johndoe&password=securepassword"
```

### 列出用户

```bash
curl -X GET "https://worker-domain/listUser?superToken=secret"
```

## 错误处理

- **IP 封禁**：被封禁的 IP 将收到 `403` 响应。
- **GitHub 错误**：返回 GitHub API 错误信息以便调试。

## 部署

### Wrangler 部署

1. 在 `wrangler.toml` 中配置环境变量。
2. 使用 Wrangler CLI 部署 Worker：

   ```bash
   wrangler publish
   ```

### 图形界面部署

1. 登录到 Cloudflare 仪表板。
2. 转到 Workers 部分并创建一个新 Worker。
3. 将 Worker 脚本复制到编辑器中。
4. 设置所需环境变量并绑定 KV 命名空间（按照上述步骤）。
5. 保存并部署 Worker。