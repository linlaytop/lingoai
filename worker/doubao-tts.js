/**
 * Cloudflare Worker - 豆包 TTS 代理
 *
 * 部署步骤（超简单）：
 * 1. 注册 https://dash.cloudflare.com（免费）
 * 2. Workers & Pages → Create Worker → 起个名字（如 lingoai-tts）
 * 3. 把这个文件的全部代码粘贴进去（覆盖默认代码）
 * 4. 点 Deploy → 复制 URL（如 https://lingoai-tts.xxx.workers.dev）
 * 5. 在 LingoAI 网站 → 发音设置 → 填入此 URL → 保存
 */

// ===== 凭证配置（已内置，无需额外设置环境变量）=====
const DOUBAO_APP_ID = '3588670840';
const DOUBAO_ACCESS_KEY = 'W--g_u9HPwZQzNZgq5nt1tx30yjXYWGM';
const DOUBAO_RESOURCE_ID = 'volc.service_type.10029';

const DOUBAO_API_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';

// 默认音色（豆包语音合成1.0，支持中英文）
const DEFAULT_SPEAKER = 'zh_male_M392_conversation_wvae_bigtts';

export default {
  async fetch(request) {
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

    // 语速：前端 -50~100 → 豆包 -50~100
    const speechRate = typeof speed === 'number' ? Math.max(-50, Math.min(100, speed)) : 0;

    // 生成随机 Request-Id
    const requestId = crypto.randomUUID();

    try {
      const resp = await fetch(DOUBAO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-App-Key': DOUBAO_APP_ID,
          'X-Api-Access-Key': DOUBAO_ACCESS_KEY,
          'X-Api-Request-Id': requestId,
          'X-Api-Resource-Id': DOUBAO_RESOURCE_ID,
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

      // 读取完整响应（流式 JSON，每行一个 JSON 对象）
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
          // 响应格式：{"code":0,"data":"base64音频片段"}
          if (evt.code === 0 && evt.data && typeof evt.data === 'string') {
            audioBase64 += evt.data;
          }
          // 兼容事件格式：{"event":"TTSAudio","data":{"audio":"base64"}}
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
