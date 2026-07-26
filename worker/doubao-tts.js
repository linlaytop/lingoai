/**
 * Cloudflare Worker - 豆包 TTS 代理
 *
 * 部署步骤：
 * 1. 登录 https://dash.cloudflare.com → Workers & Pages → Create
 * 2. 粘贴此代码
 * 3. Settings → Variables → 添加 DOUBAO_API_KEY = 你的火山引擎 API Key
 * 4. 部署后复制 Worker URL（如 https://xxx.your-subdomain.workers.dev）
 * 5. 在 LingoAI 网站设置里填入此 URL
 */

const DOUBAO_API_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';

// 默认音色（豆包语音合成1.0，支持中英文）
// 更多音色见：https://www.volcengine.com/docs/6561/1257544
const DEFAULT_SPEAKER = 'zh_female_shaoergushi_mars_bigtts';

export default {
  async fetch(request, env) {
    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const apiKey = env.DOUBAO_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Worker 未配置 DOUBAO_API_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: '请求体格式错误' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const { text, speaker, speed } = body;
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: '缺少 text 参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 语速转换：前端 -50~100 → 豆包 -50~100
    const speechRate = typeof speed === 'number' ? Math.max(-50, Math.min(100, speed)) : 0;

    try {
      const resp = await fetch(DOUBAO_API_URL, {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
          'X-Api-Resource-Id': 'seed-tts-1.0',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: { uid: 'lingoai' },
          namespace: 'BidirectionalTTS',
          req_params: {
            text: text,
            speaker: speaker || DEFAULT_SPEAKER,
            audio_params: {
              format: 'mp3',
              sample_rate: 24000,
              speech_rate: speechRate,
            },
          },
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return new Response(JSON.stringify({ error: `豆包API错误 ${resp.status}`, detail: errText }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // 读取完整流式响应（HTTP Chunked，每行一个 JSON 事件）
      const rawText = await resp.text();
      const lines = rawText.split('\n').filter((l) => l.trim());

      // 拼接所有音频 base64 片段
      let audioBase64 = '';
      for (const line of lines) {
        let jsonStr = line.trim();
        // 兼容 SSE 格式（data: {...}）
        if (jsonStr.startsWith('data:')) {
          jsonStr = jsonStr.slice(5).trim();
        }
        if (!jsonStr.startsWith('{')) continue;
        try {
          const evt = JSON.parse(jsonStr);
          // TTSAudio 事件携带 base64 音频
          if (evt.event === 'TTSAudio' && evt.data && evt.data.audio) {
            audioBase64 += evt.data.audio;
          }
        } catch {
          // 跳过无法解析的行
        }
      }

      if (!audioBase64) {
        return new Response(JSON.stringify({ error: '未获取到音频数据', raw: rawText.slice(0, 500) }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // base64 → 二进制
      const binaryStr = atob(audioBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      return new Response(bytes, {
        headers: {
          'Content-Type': 'audio/mp3',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: '代理请求失败', detail: String(err) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};
