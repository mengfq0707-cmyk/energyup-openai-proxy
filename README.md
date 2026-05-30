# openai-proxy-service — Railway 部署

EnergyUp 海外 OpenAI GPT-4o 代理服务

## 端点

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/health` | 健康检查（无鉴权）|
| POST | `/chat` | GPT 对话 |
| POST | `/chat/stream` | GPT 流式对话 |
| POST | `/vision` | GPT-4o Vision |
| POST | `/tools` | Function Calling |

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `OPENAI_API_KEY` | ✅ | OpenAI API Key，`sk-...` 开头 |
| `OPENAI_MODEL` | 可选 | 默认 `gpt-4o` |
| `OPENAI_MAX_TOKENS` | 可选 | 默认 `4096` |
| `AUTH_SECRET` | 可选 | 简单鉴权，请求需携带 `x-auth-secret` header |

## 本地测试

```bash
npm install
OPENAI_API_KEY=sk-xxx node index.js
curl http://localhost:9000/health
```

## Railway 部署

详见 `DEPLOY_GUIDE.md`
