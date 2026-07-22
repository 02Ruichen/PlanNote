"""
AI 助手视图
内置聊天面板，连接 DeepSeek V4 Pro 智能规划任务
支持上传文件(txt/pdf/docx/xlsx/csv/md/py)，AI 自动分析内容
"""
import tkinter as tk
from tkinter import ttk, filedialog
import threading
import re
import os

import config
from database import DatabaseManager
from utils.helpers import today_str
from widgets.modern_dialog import show_warning, show_info

# ---- 文件解析工具 ----

def parse_file(filepath):
    """解析文件内容，文本文件提取文字，图片转base64"""
    ext = os.path.splitext(filepath)[1].lower()
    filename = os.path.basename(filepath)

    try:
        # ---- 图片文件：转base64 ----
        if ext in ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'):
            import base64
            with open(filepath, 'rb') as f:
                img_data = base64.b64encode(f.read()).decode('utf-8')
            mime_map = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                        '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp'}
            mime = mime_map.get(ext, 'image/png')
            return filename, {
                'type': 'image',
                'base64': img_data,
                'mime': mime,
            }

        # ---- 文本类文件 ----
        if ext in ('.txt', '.md', '.py', '.json', '.xml', '.html', '.css', '.js', '.log'):
            with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                return filename, {'type': 'text', 'content': f.read()}

        # ---- PDF ----
        elif ext == '.pdf':
            from PyPDF2 import PdfReader
            reader = PdfReader(filepath)
            pages = [p.extract_text() or '' for p in reader.pages]
            return filename, {'type': 'text', 'content': '\n'.join(pages)}

        # ---- Word ----
        elif ext == '.docx':
            from docx import Document
            doc = Document(filepath)
            paras = [p.text for p in doc.paragraphs if p.text.strip()]
            return filename, {'type': 'text', 'content': '\n'.join(paras)}

        # ---- Excel ----
        elif ext == '.xlsx':
            import openpyxl
            wb = openpyxl.load_workbook(filepath, data_only=True)
            lines = []
            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                lines.append(f'--- 工作表: {sheet_name} ---')
                for row in ws.iter_rows(values_only=True):
                    row_text = '\t'.join(str(c) if c is not None else '' for c in row)
                    if row_text.strip():
                        lines.append(row_text)
            return filename, {'type': 'text', 'content': '\n'.join(lines)}

        # ---- CSV ----
        elif ext == '.csv':
            import csv
            with open(filepath, 'r', encoding='utf-8-sig', errors='replace') as f:
                reader = csv.reader(f)
                lines = ['\t'.join(row) for row in reader if any(c.strip() for c in row)]
            return filename, {'type': 'text', 'content': '\n'.join(lines)}

        else:
            return filename, {'type': 'text', 'content': f'[不支持的文件格式: {ext}]'}

    except Exception as e:
        return filename, {'type': 'text', 'content': f'[文件解析失败: {str(e)}]'}


class AIAssistView(tk.Frame):
    """AI 助手聊天面板 — 使用 DeepSeek V4 Pro"""

    SYSTEM_PROMPT = """你是一个专业的任务规划助手，叫 PlanNote AI。
用户会告诉你他们的需求，你帮他们把需求拆解成具体的可执行任务。

回复规则：
1. 理解用户意图后，给出3-5条具体任务建议
2. 每条任务末尾用这种格式标记：[[TASK:标题|优先级1-5|分类名]]
   分类可选: 工作/学习/生活/健康/其他
   例如: [[TASK:完成项目报告|4|工作]]
3. 先给出简短的建议说明，再列出标记的任务
4. 语气友好、简洁

用户点击任务标记旁的按钮即可直接添加到计划本。"""

    MODEL = 'deepseek-chat'       # DeepSeek V4 Pro 模型
    BASE_URL = 'https://api.deepseek.com'

    def __init__(self, parent, db: DatabaseManager, **kwargs):
        super().__init__(parent, bg=config.COLORS['bg_primary'], **kwargs)
        self.db = db
        self.client = None
        self.api_key = None
        self.chat_history = []

        self._load_api_key()
        self._build_ui()

    # ============================================================
    # API Key 管理
    # ============================================================

    def _load_api_key(self):
        """加载本地保存的 API Key 并初始化 DeepSeek 客户端"""
        key_file = os.path.join(config.DB_DIR, '.apikey')
        if os.path.exists(key_file):
            with open(key_file, 'r', encoding='utf-8') as f:
                self.api_key = f.read().strip()
        if self.api_key:
            self._init_client()

    def _init_client(self):
        """初始化 DeepSeek 客户端（OpenAI 兼容接口）"""
        try:
            from openai import OpenAI
            self.client = OpenAI(
                api_key=self.api_key,
                base_url=self.BASE_URL,
            )
        except Exception:
            self.client = None

    def _save_api_key(self, key):
        """保存 API Key"""
        key_file = os.path.join(config.DB_DIR, '.apikey')
        with open(key_file, 'w', encoding='utf-8') as f:
            f.write(key)
        self.api_key = key
        self._init_client()

    # ============================================================
    # UI 构建
    # ============================================================

    def _build_ui(self):
        """构建聊天界面"""
        # ---- 标题栏 ----
        header = tk.Frame(self, bg='white', padx=15, pady=10)
        header.pack(fill='x')
        header.pack_propagate(False)
        header.configure(height=50)

        tk.Label(
            header, text='🤖 AI 规划助手 (DeepSeek)',
            font=config.FONT_HEADING, fg=config.COLORS['text_primary'], bg='white',
        ).pack(side='left')

        # API Key 设置按钮
        settings_btn = tk.Button(
            header, text='API设置', font=config.FONT_SMALL,
            fg=config.COLORS['accent'], bg='white',
            relief='solid', borderwidth=1, padx=10, pady=2,
            cursor='hand2', command=self._open_api_settings,
        )
        settings_btn.pack(side='right')

        # 连接状态指示灯
        self.status_dot = tk.Label(
            header, text='●' if self.client else '○',
            font=(config.FONT_FAMILY, 10),
            fg=config.COLORS['success'] if self.client else config.COLORS['text_muted'],
            bg='white', padx=5,
        )
        self.status_dot.pack(side='right')

        # ---- 聊天记录区 ----
        chat_frame = tk.Frame(self, bg=config.COLORS['bg_primary'])
        chat_frame.pack(fill='both', expand=True, padx=10, pady=(5, 0))

        self.chat_canvas = tk.Canvas(chat_frame, bg=config.COLORS['bg_primary'], highlightthickness=0)
        self.chat_canvas.pack(side='left', fill='both', expand=True)

        chat_scroll = ttk.Scrollbar(chat_frame, orient='vertical', command=self.chat_canvas.yview)
        chat_scroll.pack(side='right', fill='y')
        self.chat_canvas.configure(yscrollcommand=chat_scroll.set)

        self.msg_frame = tk.Frame(self.chat_canvas, bg=config.COLORS['bg_primary'])
        self.msg_window = self.chat_canvas.create_window(
            (0, 0), window=self.msg_frame, anchor='nw', tags='msg_frame')

        self.msg_frame.bind('<Configure>',
            lambda e: self.chat_canvas.configure(scrollregion=self.chat_canvas.bbox('all')))
        self.chat_canvas.bind('<Configure>',
            lambda e: self.chat_canvas.itemconfig(self.msg_window, width=e.width))
        self.chat_canvas.bind('<MouseWheel>',
            lambda e: self.chat_canvas.yview_scroll(int(-1 * (e.delta / 120)), 'units'))

        # 欢迎消息 — 有Key就显示已连接
        if self.client:
            self._add_message('system', '✅ 已连接 DeepSeek V4 Pro，随时可以帮你规划任务！')
        else:
            self._add_message('ai', '你好！我是 PlanNote AI 规划助手。\n\n告诉我你想做什么，我帮你拆解成具体任务。\n\n比如你可以说：\n• "下周要准备期末考试"\n• "帮我安排一个健身计划"\n• "最近工作太忙了帮我梳理一下"')

        # ---- 附件标签栏 ----
        self.attach_bar = tk.Frame(self, bg=config.COLORS['bg_primary'])
        self.attach_bar.pack(fill='x', side='bottom', padx=10)
        self.attached_files = []  # [(filename, text_content), ...]

        # ---- 输入区 ----
        input_frame = tk.Frame(self, bg='white', padx=10, pady=8)
        input_frame.pack(fill='x', side='bottom')

        self.input_text = tk.Text(
            input_frame, font=config.FONT_BODY,
            height=3, wrap='word',
            relief='solid', borderwidth=1,
            fg=config.COLORS['text_primary'],
        )
        self.input_text.pack(side='left', fill='x', expand=True, padx=(0, 8))
        self.input_text.bind('<Control-Return>', lambda e: self._send_message())
        self.input_text.insert('1.0', '')
        self.input_text.focus_set()

        # 附件按钮
        attach_btn = tk.Button(
            input_frame, text='📎', font=config.FONT_BODY_BOLD,
            fg=config.COLORS['accent'], bg='white',
            relief='solid', borderwidth=1, padx=8, pady=8,
            cursor='hand2', command=self._attach_file,
        )
        attach_btn.pack(side='left', padx=(0, 4))

        send_btn = tk.Button(
            input_frame, text='发送', font=config.FONT_BODY_BOLD,
            fg='white', bg=config.COLORS['accent'],
            relief='flat', padx=20, pady=8,
            cursor='hand2', command=self._send_message,
        )
        send_btn.pack(side='right')

        # 提示
        hint_frame = tk.Frame(self, bg=config.COLORS['bg_primary'])
        hint_frame.pack(fill='x', padx=15, pady=(0, 5))
        tk.Label(hint_frame, text='Ctrl+Enter 发送  |  📎 上传文件(txt/pdf/docx/xlsx/csv)',
                 font=(config.FONT_FAMILY, 8), fg=config.COLORS['text_muted'],
                 bg=config.COLORS['bg_primary']).pack(side='left')

    def on_show(self):
        """视图显示时聚焦输入框"""
        self.input_text.focus_set()

    def _attach_file(self):
        """上传文件并解析内容"""
        filepath = filedialog.askopenfilename(
            title='选择文件发送给AI分析',
            filetypes=[
                ('所有支持格式', '*.txt;*.pdf;*.docx;*.xlsx;*.csv;*.md;*.py;*.png;*.jpg;*.jpeg;*.gif;*.webp'),
                ('图片文件', '*.png;*.jpg;*.jpeg;*.gif;*.webp;*.bmp'),
                ('文本文件', '*.txt;*.md;*.py;*.json;*.xml;*.html;*.css;*.js;*.log'),
                ('PDF文件', '*.pdf'),
                ('Word文档', '*.docx'),
                ('Excel表格', '*.xlsx;*.csv'),
            ],
        )
        if not filepath:
            return

        filename, data = parse_file(filepath)

        # 保存附件
        self.attached_files.append((filename, data))

        # 在附件栏显示标签
        chip = tk.Frame(self.attach_bar, bg=config.COLORS['accent_light'],
                        relief='solid', borderwidth=0, padx=6, pady=2)
        chip.pack(side='left', padx=2, pady=3)

        emoji = '🖼️' if data['type'] == 'image' else '📄'
        tk.Label(chip, text=f'{emoji} {filename}',
                 font=config.FONT_SMALL,
                 fg=config.COLORS['text_primary'],
                 bg=config.COLORS['accent_light']).pack(side='left')

        # 删除按钮
        idx = len(self.attached_files) - 1
        del_btn = tk.Label(chip, text=' ✕', font=config.FONT_SMALL,
                           fg=config.COLORS['danger'],
                           bg=config.COLORS['accent_light'], cursor='hand2')
        del_btn.pack(side='left')
        del_btn.bind('<Button-1>', lambda e, i=idx, c=chip: self._remove_attach(i, c))

        # 在聊天区显示附件预览
        if data['type'] == 'image':
            self._add_message('system', f'🖼️ 已附加图片: {filename}')
        else:
            preview = data['content'][:200] + ('...' if len(data['content']) > 200 else '')
            self._add_message('system', f'📎 已附加文件: {filename}\n```\n{preview}\n```')

    def _remove_attach(self, index, chip_widget):
        """移除附件"""
        if 0 <= index < len(self.attached_files):
            self.attached_files.pop(index)
        chip_widget.destroy()

    # ============================================================
    # API 设置对话框
    # ============================================================

    def _open_api_settings(self):
        """打开 API Key 设置对话框"""
        dialog = tk.Toplevel(self)
        dialog.title('API 设置 — DeepSeek')
        dialog.geometry('450x240')
        dialog.resizable(False, False)
        dialog.transient(self)
        dialog.grab_set()
        dialog.configure(bg='white')

        dialog.update_idletasks()
        x = self.winfo_rootx() + (self.winfo_width() - 450) // 2
        y = self.winfo_rooty() + (self.winfo_height() - 240) // 2
        dialog.geometry(f'+{x}+{y}')

        pad = tk.Frame(dialog, bg='white')
        pad.pack(fill='both', expand=True, padx=25, pady=20)

        tk.Label(pad, text='DeepSeek API Key', font=config.FONT_BODY_BOLD,
                 fg=config.COLORS['text_primary'], bg='white').pack(anchor='w')
        tk.Label(pad, text='在 platform.deepseek.com 获取  |  模型: deepseek-chat',
                 font=config.FONT_SMALL, fg=config.COLORS['text_secondary'], bg='white'
                 ).pack(anchor='w', pady=(2, 10))

        key_var = tk.StringVar(value=self.api_key or '')
        key_entry = tk.Entry(pad, textvariable=key_var, font=config.FONT_BODY,
                             show='•', relief='solid', borderwidth=1)
        key_entry.pack(fill='x', pady=(0, 15))

        btn_frame = tk.Frame(pad, bg='white')
        btn_frame.pack(fill='x')

        tk.Button(btn_frame, text='取消', font=config.FONT_BODY,
                  fg=config.COLORS['text_secondary'], bg='white',
                  relief='solid', borderwidth=1, padx=16, pady=4,
                  command=dialog.destroy).pack(side='right', padx=(10, 0))

        def save_key():
            key = key_var.get().strip()
            if key:
                self._save_api_key(key)
                self.status_dot.configure(fg=config.COLORS['success'], text='●')
                self._add_message('system', '✅ DeepSeek API Key 已设置！')
                dialog.destroy()
            else:
                show_warning('提示', '请输入 API Key')

        tk.Button(btn_frame, text='保存', font=config.FONT_BODY_BOLD,
                  fg='white', bg=config.COLORS['accent'],
                  relief='flat', padx=16, pady=4,
                  command=save_key).pack(side='right')

        dialog.wait_window()

    # ============================================================
    # 消息发送与 AI 调用
    # ============================================================

    def _send_message(self):
        """发送消息给 DeepSeek（含附件，支持图片识别）"""
        text = self.input_text.get('1.0', 'end-1c').strip()

        if not text and not self.attached_files:
            return

        if not self.client:
            self._add_message('system', '⚠️ 请先设置 API Key（点击右上角"API设置"按钮）')
            return

        # ---- 构建消息体 ----
        has_images = any(d['type'] == 'image' for _, d in self.attached_files)

        if has_images:
            # 图片使用 vision 格式：content 为数组
            user_content = []
            # 先放文本内容
            text_parts = []
            for fname, data in self.attached_files:
                if data['type'] == 'text':
                    text_parts.append(f'--- 文件: {fname} ---\n{data["content"]}')
            if text_parts:
                user_content.append({'type': 'text', 'text': '\n\n'.join(text_parts)})
            # 用户消息
            user_content.append({'type': 'text', 'text': text or '请分析以上内容，帮我规划相关任务'})
            # 图片
            for fname, data in self.attached_files:
                if data['type'] == 'image':
                    user_content.append({
                        'type': 'image_url',
                        'image_url': {
                            'url': f'data:{data["mime"]};base64,{data["base64"]}',
                            'detail': 'auto',
                        }
                    })
        else:
            # 纯文本消息
            full_text = text
            if self.attached_files:
                file_contents = []
                for fname, data in self.attached_files:
                    file_contents.append(f'--- 文件: {fname} ---\n{data["content"]}')
                full_text = '以下是一起上传的文件内容:\n\n' + '\n\n'.join(file_contents) + '\n\n---\n用户消息:\n' + (text or '请分析以上文件内容，帮我规划相关任务')
            user_content = full_text

        self.input_text.delete('1.0', 'end')

        # 显示用户消息（简短版）
        img_count = sum(1 for _, d in self.attached_files if d['type'] == 'image')
        file_count = sum(1 for _, d in self.attached_files if d['type'] != 'image')
        if img_count and file_count:
            display_text = (text or f'📎 已发送 {img_count} 张图片 + {file_count} 个文件')
        elif img_count:
            display_text = (text or f'🖼️ 已发送 {img_count} 张图片')
        elif file_count:
            display_text = (text or f'📎 已发送 {file_count} 个文件')
        else:
            display_text = text
        self._add_message('user', display_text)

        # 清除附件
        self.attached_files.clear()
        for w in self.attach_bar.winfo_children():
            w.destroy()

        # 构建消息历史
        messages = [{'role': 'system', 'content': self.SYSTEM_PROMPT}]
        for role, content in self.chat_history[-10:]:
            api_role = 'user' if role == 'user' else 'assistant'
            messages.append({'role': api_role, 'content': content})
        messages.append({'role': 'user', 'content': user_content})

        # 占位
        self._add_message('ai', '思考中...')
        thinking_msg = self.msg_frame.winfo_children()[-1]

        def call_deepseek():
            try:
                response = self.client.chat.completions.create(
                    model=self.MODEL,
                    messages=messages,
                    max_tokens=2048,
                    temperature=0.7,
                )
                reply = response.choices[0].message.content
                self.after(0, lambda: self._update_ai_reply(thinking_msg, reply))
            except Exception as e:
                self.after(0, lambda: self._update_ai_reply(
                    thinking_msg, f'❌ 出错了：{str(e)}'))

        threading.Thread(target=call_deepseek, daemon=True).start()

    def _update_ai_reply(self, thinking_widget, reply):
        """替换"思考中"占位为正式回复"""
        thinking_widget.destroy()
        self._add_message('ai', reply)

    # ============================================================
    # 消息渲染
    # ============================================================

    def _add_message(self, role, text):
        """添加消息气泡到聊天区"""
        is_user = role == 'user'
        is_ai = role == 'ai'
        is_system = role == 'system'

        bubble_bg = config.COLORS['accent'] if is_user else (
            'white' if is_ai else config.COLORS['warning_light'])
        bubble_fg = 'white' if is_user else config.COLORS['text_primary']

        msg_container = tk.Frame(self.msg_frame, bg=config.COLORS['bg_primary'])
        msg_container.pack(fill='x', padx=10, pady=4)

        avatar_text = '👤' if is_user else ('🤖' if is_ai else '💬')
        avatar = tk.Label(msg_container, text=avatar_text, font=config.FONT_BODY,
                          bg=config.COLORS['bg_primary'])
        if is_user:
            avatar.pack(side='right', padx=(5, 0))
        else:
            avatar.pack(side='left', padx=(0, 5))

        bubble_frame = tk.Frame(msg_container, bg=bubble_bg,
                                relief='solid', borderwidth=0, padx=12, pady=8)
        if is_user:
            bubble_frame.pack(side='right', padx=(0, 5))
        else:
            bubble_frame.pack(side='left', padx=(5, 0))

        if is_ai and not text.startswith('思考中') and not text.startswith('❌'):
            self._render_ai_message(bubble_frame, text)
        else:
            tk.Label(bubble_frame, text=text, font=config.FONT_BODY,
                     fg=bubble_fg, bg=bubble_bg,
                     justify='left', wraplength=500).pack()

        self.chat_canvas.after(100, lambda: self.chat_canvas.yview_moveto(1.0))
        self.chat_history.append((role, text))

    def _render_ai_message(self, parent, text):
        """解析 AI 回复中的 [[TASK:...]] 标记并渲染为可点击卡片"""
        pattern = r'\[\[TASK:([^|]+)\|(\d)\|([^\]]+)\]\]'
        parts = re.split(pattern, text)

        current_frame = tk.Frame(parent, bg='white')
        current_frame.pack(fill='x')

        i = 0
        while i < len(parts):
            if (i + 3 < len(parts) and re.match(r'^\d$', parts[i + 1])
                    and parts[i + 2] in ['工作', '学习', '生活', '健康', '其他']):
                title = parts[i].strip()
                priority = int(parts[i + 1])
                cat_name = parts[i + 2]

                task_card = tk.Frame(current_frame, bg=config.COLORS['accent_light'],
                                     relief='solid', borderwidth=0, padx=8, pady=5)
                task_card.pack(fill='x', pady=2)

                stars = '★' * priority + '☆' * (5 - priority)
                tk.Label(task_card, text=f'📋 {title}',
                         font=config.FONT_BODY_BOLD,
                         fg=config.COLORS['text_primary'],
                         bg=config.COLORS['accent_light']).pack(side='left')
                tk.Label(task_card, text=f'  [{cat_name}] {stars}',
                         font=config.FONT_SMALL,
                         fg=config.COLORS['accent'],
                         bg=config.COLORS['accent_light']).pack(side='left')

                add_btn = tk.Button(
                    task_card, text='＋添加到计划',
                    font=config.FONT_SMALL,
                    fg='white', bg=config.COLORS['success'],
                    relief='flat', padx=8, pady=2, cursor='hand2',
                    command=lambda t=title, p=priority, c=cat_name: self._add_task_to_plan(t, p, c),
                )
                add_btn.pack(side='right')
                i += 3
            else:
                if parts[i].strip():
                    tk.Label(current_frame, text=parts[i],
                             font=config.FONT_BODY,
                             fg=config.COLORS['text_primary'],
                             bg='white', justify='left', wraplength=480,
                             ).pack(anchor='w', pady=1)
                i += 1

    def _add_task_to_plan(self, title, priority, cat_name):
        """将 AI 建议的任务添加到今日计划"""
        from models import Plan

        cats = self.db.get_all_categories()
        cat_id = 1
        for c in cats:
            if c.name == cat_name:
                cat_id = c.id
                break

        plan = Plan(
            title=title,
            description='由 AI 助手 (DeepSeek) 创建',
            category_id=cat_id,
            priority=priority,
            status='pending',
            plan_date=today_str(),
        )
        self.db.create_plan(plan)
        show_info('添加成功', f'"{title}" 已添加到今日计划！\n\n切换到日计划视图查看。')
