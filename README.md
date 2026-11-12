# PlanNote 📋

> 极简工作记录 + AI 自动周报生成

**🌐 在线体验：https://02ruichen.github.io/PlanNote/** — 点开即用，不用注册，数据留在你自己的设备上。

每天记录做了什么，周末一键生成标准格式周报。

## ✨ v2 · 网页版（已可运行）

PlanNote 已从桌面应用重塑为 **纯前端网页 + PWA**：点开就能用，可以装到桌面当 App，数据留在自己设备上。

👉 **入口：[`app/index.html`](app/index.html)**（作品介绍页）· 应用本体是 [`app/app.html`](app/app.html) · 说明见 [`app/README.md`](app/README.md)

- **形态**：原生 JS + CSS，零构建零依赖；可安装为 PWA，离线可用
- **数据**：IndexedDB 存储（直接双击本地文件时自动降级到 localStorage），支持导出 / 导入 JSON 备份
- **AI 周报**：在设置里填一个 API Key（DeepSeek / 任意 OpenAI 兼容接口）即可直接调用，无后端；Key 只存本机，搭好点「测试连接」当场验证
- **视觉**：保留莫兰迪配色，升级为现代质感（换字、圆角、暖灰阴影、克制的玻璃拟态、去水印）
- **已实现**：日 / 周 / 月视图、统计面板、AI 周报（真调 API + 自定义规则）、自定义模块、备份、深色模式
- **交互**：日视图只有一个添加入口，但按钮写清用途——「添加任务」直接记下，「详细填写」展开完整表单（自动带上已打的字）；周 / 月视图顶栏为「新建任务」
- **模块**：工作 / 学习 / 生活 / 健康 之外可自建（如「长期开发」），日视图顶部按模块筛选，新任务自动归入当前模块
- **周报规则**：可粘贴公司模板 / 格式要求 / 历史样例，生成时作为硬性要求优先于默认结构
- **周报范围**：可以只给某一个项目出周报（提示词里明确声明「只统计这一个模块」），每份按「周 + 范围」分别留存
- **Key 安全**：所有设置操作（含「清空全部数据」）都只改对应字段，API Key 不会被覆盖，导出备份也不包含 Key
- **测试**：`test/run-tests.mjs` 用无头 Chrome 真点真跑，覆盖自定义项目、按项目出周报、规则生效，跑在一次性临时浏览器目录里，不碰本机数据
- **二期**：模板管理、归档视图、复杂重复规则、AI 聊天助手

本地预览：`cd app && python -m http.server 8777`，浏览器打开 http://127.0.0.1:8777

## ✨ 功能（桌面版 v1）

| 功能 | 说明 |
|------|------|
| 📅 每日记录 | 打开就写，每行一条，Enter 换行，Ctrl+Enter 保存 |
| 📝 一键周报 | 自动拉取本周记录，DeepSeek AI 归纳分类润色，输出 docx |
| 🤖 AI 助手 | 内置聊天面板，上传文件/图片让 AI 帮你拆任务 |
| 🎨 莫兰迪色系 | 低饱和度灰调配色，柔和护眼 |
| 🔖 任务难度 | 很简单 → 很困难，写周报时 AI 会参考 |

## 🚀 快速开始（你朋友看这里）

### 方式一：直接运行（推荐）

1. 下载 `dist/PlanNote.exe`
2. 双击运行，什么都不用装

### 方式二：源码运行

```bash
# 1. 安装依赖
pip install openai tkcalendar PyPDF2 python-docx openpyxl Pillow pywin32

# 2. 运行
python main.py
```

### 配置 AI 功能（可选）

1. 打开 PlanNote → 左侧「🤖 AI 助手」
2. 点右上角「API 设置」
3. 填入 DeepSeek API Key（在 [platform.deepseek.com](https://platform.deepseek.com) 获取）
4. Key 保存在本地 `.apikey` 文件，不上传任何服务器

## 📂 项目结构

```
planner/
├── main.py              # 入口
├── app.py               # 主窗口 & 视图切换
├── config.py            # 莫兰迪配色 & 字体
├── database.py          # SQLite 数据库
├── models.py            # 数据模型
├── views/
│   ├── day_view.py          # 每日记录
│   ├── weekly_report_view.py # 一键周报
│   └── ai_assist_view.py    # AI 助手
├── widgets/
│   ├── plan_editor.py    # 极简编辑弹窗
│   ├── modern_dialog.py  # 现代风格弹窗
│   └── sidebar.py        # 侧边栏
└── utils/
    ├── report_generator.py  # 周报生成引擎
    └── helpers.py           # 工具函数
```

## 🛠 技术栈

- Python 3 + tkinter（GUI）
- SQLite（数据存储）
- DeepSeek API（AI 周报 & 助手）
- python-docx（Word 文档生成）

## 📄 License

MIT
