# LingoAI - 英语学习平台

一个功能丰富的 AI 英语学习应用，包含闪卡学习、闯关游戏、对话练习、课程系统等功能。

## 功能特性

- **闪卡学习** - 50+ 内置单词和句子，支持翻转动画
- **闯关游戏** - 经典闯关、配对游戏、飞机大战、僵尸英语、沙漠飙车、听力训练
- **对话练习** - AI 对话场景模拟
- **课程系统** - 系统化英语学习路径
- **考试测验** - 句子填空和选择题
- **AI 连读** - 发音练习
- **用户系统** - 注册、登录、学习进度追踪
- **管理后台** - 用户管理、数据统计、词库管理
- **打卡系统** - 每日学习打卡

## 技术栈

- React 19 + TypeScript
- Vite 8 (构建工具)
- TailwindCSS v4
- localStorage 本地存储 (无需后端)
- Web Speech API (TTS 语音)
- GitHub Actions (CI/CD)

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npx vite build
```

## 部署

项目使用 GitHub Actions 自动部署到 GitHub Pages：
- 推送到 `main` 分支后自动触发部署
- 访问地址：https://linlaytop.github.io/lingoai/

## 管理员账号

- 邮箱：`admin@lingoai.com`
- 密码：`admin123`

## 许可证

MIT License
