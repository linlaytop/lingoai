# 豆包 TTS 发音接入指南

本文档指导你完成豆包（火山引擎）AI 语音合成的接入，让网站拥有比浏览器自带更自然、更有感情的英语发音。

---

## 整体架构

```
浏览器 → Cloudflare Worker（代理，保管密钥）→ 豆包 TTS API → 返回 MP3 音频
```

- **Cloudflare Worker**：免费 10 万次/天，负责保管 API Key，避免密钥暴露在前端
- **豆包 TTS**：字节跳动大模型语音合成，新用户有免费试用额度

---

## 第一步：获取火山引擎 API Key

1. 注册并登录 [火山引擎控制台](https://console.volcengine.com/)
2. 完成**实名认证**（必须）
3. 进入 [豆包语音控制台](https://console.volcengine.com/speech/new)
4. 点击「开通服务」，一键开通默认项目（赠送免费试用额度）
5. 在左侧「API Key 管理」中，创建或复制已有的 **API Key**
6. 保存好这个 Key，后面要用

> 新用户首次开通会赠送免费试用额度，足够个人使用很长时间。

---

## 第二步：部署 Cloudflare Worker

1. 注册并登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧菜单 → **Workers & Pages** → **Create** → **Create Worker**
3. 给 Worker 起个名字（如 `lingoai-tts`），点击 **Deploy**
4. 点击 **Edit code**，删除默认代码
5. 打开项目中的 `worker/doubao-tts.js` 文件，复制全部内容粘贴进去
6. 点击右上角 **Deploy**

---

## 第三步：配置 Worker 环境变量

1. 在 Worker 页面 → **Settings** → **Variables and Secrets**
2. 点击 **Add**，添加变量：
   - 变量名：`DOUBAO_API_KEY`
   - 值：你在第一步获取的火山引擎 API Key
   - 类型：选择 **Secret**（加密存储）
3. 点击 **Save and Deploy**

---

## 第四步：获取 Worker URL

部署成功后，在 Worker 概览页面可以看到 URL，格式类似：
```
https://lingoai-tts.your-subdomain.workers.dev
```
复制这个 URL。

---

## 第五步：在网站中配置

1. 打开 https://linlaytop.github.io/lingoai/
2. 登录后，点击顶部导航栏的 **🔊 发音设置** 按钮
3. 开启「启用豆包发音」开关
4. 粘贴你的 Worker URL
5. 选择喜欢的音色（默认少儿故事女声，支持中英文）
6. 点击「测试发音」——如果能听到声音，说明配置成功
7. 点击「保存设置」

完成后，网站所有英语发音都会使用豆包 AI 语音合成！

---

## 音色推荐

在 [火山引擎音色列表](https://www.volcengine.com/docs/6561/1257544) 可试听所有音色。

几个适合英语学习的音色：
| 音色 ID | 说明 |
|---------|------|
| `zh_female_shaoergushi_mars_bigtts` | 少儿故事女声，中英通用（默认） |
| `BV001_streaming` | 通用女声 |
| `BV002_streaming` | 通用男声 |

> 在设置页面的音色下拉框选择「输入自定义音色 ID」可填入任意音色。

---

## 费用说明

| 服务 | 免费额度 | 超出后 |
|------|---------|--------|
| Cloudflare Workers | 10 万次/天 | $5/月 无限 |
| 豆包 TTS | 新用户试用礼包 | 按字符计费（约 ¥0.01/千字） |

个人学习使用完全在免费额度内。

---

## 常见问题

**Q: 测试发音失败怎么办？**
- 检查 Worker URL 是否正确（以 `https://` 开头）
- 检查 `DOUBAO_API_KEY` 环境变量是否已配置
- 在 Cloudflare Worker 的 Logs 里查看错误日志

**Q: 不想用了怎么关闭？**
- 在网站「发音设置」里关闭开关即可，会自动回退到浏览器自带发音

**Q: 豆包 API 调用报错？**
- 确认已完成火山引擎实名认证
- 确认已开通「语音合成大模型」服务
- 确认免费额度未用完（在控制台「开通管理」查看）
