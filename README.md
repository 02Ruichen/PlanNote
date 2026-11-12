# PlanNote 📋

> 极简工作记录 + AI 自动周报生成

每天记录做了什么，周末一键生成标准格式周报。

## 🚧 v2 · 网页版重塑（进行中）

PlanNote 正在从桌面应用重塑为 **纯前端网页 + PWA**，让「点开链接就能用」和「装到桌面天天用」同时成立。

- **形态**：纯前端 Web，可安装为 PWA；数据存浏览器本地（IndexedDB），支持导出 / 导入 JSON 备份
- **AI**：极简代理后端，API Key 存在服务端，访问者无需自备 Key 即可生成周报
- **视觉**：保留莫兰迪配色，升级为现代质感（圆角、暖灰阴影、克制的玻璃拟态、去水印）
- **设计打样**：[`design/style-swatch.html`](design/style-swatch.html)
- **第一版范围**：日 / 周 / 月视图 + 统计 + AI 周报 + 备份；模板、归档、AI 聊天、任务池列入二期

## ✨ 功能

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
