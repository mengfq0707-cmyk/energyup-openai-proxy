/**
 * openai-proxy-service — Railway 独立部署版
 * 
 * EnergyUp 海外 OpenAI 代理服务
 * 部署位置: Railway (us-east, 海外)
 * 作用: 绕过国内网络限制，代理 GPT-4o 请求
 * 
 * 端点:
 *   GET  /health        - 健康检查
 *   POST /chat          - GPT 对话
 *   POST /chat/stream   - GPT 流式对话
 *   POST /vision        - GPT-4o Vision
 *   POST /tools         - Function Calling
 * 
 * 环境变量:
 *   OPENAI_API_KEY     (必填)
 *   OPENAI_MODEL       (可选, 默认 gpt-4o)
 *   OPENAI_MAX_TOKENS  (可选, 默认 4096)
 *   AUTH_SECRET        (可选, 简单鉴权 header: x-auth-secret)
 *   PORT               (可选, 默认 9000, Railway 会自动注入)
 */

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();

// ── CORS 配置 ────────────────────────────────────────────
app.use(cors({
  origin: [
    'https://energyuphj.cn',
    'https://www.energyuphj.cn',
    /\.energyuphj\.cn$/,
    'http://localhost:3000',
    'http://localhost:8080'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-secret']
}));

app.use(express.json({ limit: '10mb' }));

// ── 环境变量 ─────────────────────────────────────────────
const OPENAI_API_KEY    = process.env.OPENAI_API_KEY;
const OPENAI_MODEL      = process.env.OPENAI_MODEL || 'gpt-4o';
const OPENAI_MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS) || 4096;
const AUTH_SECRET       = process.env.AUTH_SECRET || '';

// ── OpenAI 客户端 ─────────────────────────────────────────
let openaiClient = null;
if (OPENAI_API_KEY && OPENAI_API_KEY !== '${OPENAI_API_KEY}' && OPENAI_API_KEY.length > 10) {
  openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
  console.log('[openai-proxy] OpenAI client initialized, model:', OPENAI_MODEL);
} else {
  console.warn('[openai-proxy] WARNING: OPENAI_API_KEY not configured!');
}

// ── 简单鉴权中间件 ────────────────────────────────────────
function authMiddleware(req, res, next) {
  if (!AUTH_SECRET) return next(); // 未配置则跳过
  const provided = req.headers['x-auth-secret'] || req.query.secret;
  if (provided === AUTH_SECRET) return next();
  return res.status(401).json({ error: 'Unauthorized', hint: 'x-auth-secret header required' });
}

// ── GET /health ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    service:          'openai-proxy-service',
    version:          '2.0.0',
    status:           'ok',
    model:            OPENAI_MODEL,
    apiKeyConfigured: !!openaiClient,
    region:           process.env.RAILWAY_REGION || 'railway',
    timestamp:        new Date().toISOString()
  });
});

// ── POST /chat ────────────────────────────────────────────
app.post('/chat', authMiddleware, async (req, res) => {
  try {
    if (!openaiClient) {
      return res.status(500).json({ error: 'OpenAI API key not configured on server' });
    }
    const {
      messages,
      model        = OPENAI_MODEL,
      temperature  = 0.7,
      max_tokens   = OPENAI_MAX_TOKENS
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    console.log(`[/chat] model=${model} messages=${messages.length}`);

    const completion = await openaiClient.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens
    });

    res.json({
      id:      completion.id,
      model:   completion.model,
      choices: completion.choices,
      usage:   completion.usage
    });

  } catch (e) {
    console.error('[/chat] error:', e.message);
    res.status(500).json({ error: e.message, type: e.type || 'api_error' });
  }
});

// ── POST /chat/stream ─────────────────────────────────────
app.post('/chat/stream', authMiddleware, async (req, res) => {
  try {
    if (!openaiClient) {
      return res.status(500).json({ error: 'OpenAI API key not configured on server' });
    }
    const {
      messages,
      model        = OPENAI_MODEL,
      temperature  = 0.7,
      max_tokens   = OPENAI_MAX_TOKENS
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const stream = await openaiClient.chat.completions.create({
      model, messages, temperature, max_tokens, stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content || '';
      if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (e) {
    console.error('[/chat/stream] error:', e.message);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// ── POST /vision ──────────────────────────────────────────
app.post('/vision', authMiddleware, async (req, res) => {
  try {
    if (!openaiClient) {
      return res.status(500).json({ error: 'OpenAI API key not configured on server' });
    }
    const { messages, model = 'gpt-4o', max_tokens = 4096 } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }
    const completion = await openaiClient.chat.completions.create({ model, messages, max_tokens });
    res.json({ id: completion.id, model: completion.model, choices: completion.choices, usage: completion.usage });
  } catch (e) {
    console.error('[/vision] error:', e.message);
    res.status(500).json({ error: e.message, type: e.type || 'api_error' });
  }
});

// ── POST /tools ───────────────────────────────────────────
app.post('/tools', authMiddleware, async (req, res) => {
  try {
    if (!openaiClient) {
      return res.status(500).json({ error: 'OpenAI API key not configured on server' });
    }
    const { messages, tools, tool_choice = 'auto', model = OPENAI_MODEL, max_tokens = OPENAI_MAX_TOKENS } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages array is required' });
    if (!tools || !Array.isArray(tools)) return res.status(400).json({ error: 'tools array is required' });
    const completion = await openaiClient.chat.completions.create({ model, messages, tools, tool_choice, max_tokens });
    res.json({ id: completion.id, model: completion.model, choices: completion.choices, usage: completion.usage });
  } catch (e) {
    console.error('[/tools] error:', e.message);
    res.status(500).json({ error: e.message, type: e.type || 'api_error' });
  }
});

// ── 启动服务器 ────────────────────────────────────────────
const PORT = process.env.PORT || 9000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[openai-proxy-service v2.0.0] listening on 0.0.0.0:${PORT}`);
  console.log(`  model:  ${OPENAI_MODEL}`);
  console.log(`  region: ${process.env.RAILWAY_REGION || 'local'}`);
  console.log(`  auth:   ${AUTH_SECRET ? 'enabled' : 'disabled'}`);
});
