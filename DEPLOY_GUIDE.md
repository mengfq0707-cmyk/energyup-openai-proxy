# Railway 部署操作指南

> **目标**：将 `openai-proxy-service` 部署至 Railway 海外服务器（US East），使 `?action=ai-chat` 真正调通 OpenAI API

---

## 第一步：注册 Railway 账号（3分钟）

1. 打开 https://railway.app
2. 点击 **Start a New Project**
3. 选择 **Sign in with GitHub**（需要 GitHub 账号）
4. 如果没有 GitHub 账号，先去 https://github.com 注册一个（2分钟）
5. 授权 Railway 访问 GitHub

> Railway 免费层：每月 $5 使用额度，足够测试和轻量生产使用

---

## 第二步：创建 GitHub 仓库并上传代码

### 方法一：直接在 GitHub 网页上传（最简单）

1. 打开 https://github.com/new
2. 仓库名填：`energyup-openai-proxy`
3. 选 **Private**（私有，保护 API Key）
4. 点击 **Create repository**
5. 点击 **uploading an existing file**
6. 将以下文件拖拽上传：
   - `C:\Users\0\EnergyUp\deploy\openai-proxy-railway\index.js`
   - `C:\Users\0\EnergyUp\deploy\openai-proxy-railway\package.json`
   - `C:\Users\0\EnergyUp\deploy\openai-proxy-railway\.gitignore`
7. 点击 **Commit changes**

### 方法二：使用 Git 命令行

```bash
cd C:\Users\0\EnergyUp\deploy\openai-proxy-railway
git init
git add .
git commit -m "Initial: openai-proxy-service v2.0.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/energyup-openai-proxy.git
git push -u origin main
```

---

## 第三步：在 Railway 部署（5分钟）

1. 打开 https://railway.app/new
2. 选择 **Deploy from GitHub repo**
3. 选择刚才创建的 `energyup-openai-proxy` 仓库
4. Railway 自动检测 Node.js 项目并开始构建
5. 等待构建完成（约 2-3 分钟）

---

## 第四步：配置环境变量（关键！）

1. 进入项目 Dashboard
2. 点击你的服务（service）
3. 点击 **Variables** 标签
4. 点击 **+ New Variable**，添加以下变量：

| 变量名 | 值 |
|--------|-----|
| `OPENAI_API_KEY` | `sk-xxxxxxxxxxxx`（你的 OpenAI Key）|
| `OPENAI_MODEL` | `gpt-4o` |
| `OPENAI_MAX_TOKENS` | `4096` |
| `AUTH_SECRET` | 随机字符串，如 `energyup-proxy-2026`（用于保护接口）|

5. 添加完毕后，Railway 自动重启服务

---

## 第五步：获取部署 URL

1. 点击 **Settings** 标签
2. 在 **Networking** 部分，点击 **Generate Domain**
3. 复制生成的 URL，格式类似：
   ```
   https://energyup-openai-proxy-production.up.railway.app
   ```

---

## 第六步：验证部署是否成功

在浏览器或终端访问 Health 端点：

```bash
curl https://你的域名.up.railway.app/health
```

期望返回：
```json
{
  "service": "openai-proxy-service",
  "version": "2.0.0",
  "status": "ok",
  "model": "gpt-4o",
  "apiKeyConfigured": true,
  "region": "...",
  "timestamp": "2026-..."
}
```

**`apiKeyConfigured: true`** 说明 API Key 已正确配置 ✅

---

## 第七步：测试 AI 对话

```bash
curl -X POST https://你的域名.up.railway.app/chat \
  -H "Content-Type: application/json" \
  -H "x-auth-secret: energyup-proxy-2026" \
  -d '{"messages": [{"role": "user", "content": "你好"}]}'
```

---

## 第八步：更新 gateway-service（部署完成后通知我）

获得 Railway URL 后，我来修改 `gateway-service` 的 `OPENAI_PROXY_URL` 环境变量，使 `?action=ai-chat` 真正走到海外服务器。

**你只需要把 Railway URL 告诉我即可，我来完成剩余配置。**

---

## 预期最终链路

```
前端 → gateway-service?action=ai-chat
      → HTTP 请求 → Railway (US East)
          → openai-proxy-service
              → api.openai.com (OpenAI API)
```
