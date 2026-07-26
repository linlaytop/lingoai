# 豆包 TTS 接入指南（超简版）

## 前提

凭证已内置在 `worker/doubao-tts.js` 代码中，无需额外配置环境变量。

## 部署步骤（只需 3 步）

### 第 1 步：注册 Cloudflare

1. 打开 https://dash.cloudflare.com/sign-up
2. 用邮箱注册（免费，不需要信用卡）

### 第 2 步：创建 Worker 并粘贴代码

1. 登录后点左侧 **Workers & Pages**
2. 点 **Create** → **Create Worker**
3. 起个名字（如 `lingoai-tts`）→ 点 **Deploy**
4. 点 **Edit code**（编辑代码）
5. 把 `worker/doubao-tts.js` 的**全部内容**粘贴进去（覆盖默认代码）
6. 点 **Deploy** → 部署成功

### 第 3 步：复制 URL 填到网站

1. 在 Worker 概览页复制 URL（格式如 `https://lingoai-tts.xxx.workers.dev`）
2. 打开 LingoAI 网站 → 点导航栏 **🔊 发音设置**
3. 开启豆包发音 → 填入 Worker URL → 点测试 → 保存

完成！之后所有发音都是豆包 AI 高品质语音。

---

## 凭证信息（已内置在代码中）

| 凭证 | 值 |
|------|-----|
| APP ID | 3588670840 |
| Access Token | W--g_u9HPwZQzNZgq5nt1tx30yjXYWGM |
| Resource ID | volc.service_type.10029 |
| 默认音色 | zh_female_shaoergushi_mars_bigtts |

## 常见问题

**Q: 发音没声音？**
A: 检查 Worker URL 是否正确，点测试按钮看是否返回音频。

**Q: Cloudflare Worker 免费额度够用吗？**
A: 免费 10 万次/天，个人学习完全够用。

**Q: 想换音色怎么办？**
A: 在发音设置里选择不同音色，或修改 Worker 代码中的 DEFAULT_SPEAKER。
