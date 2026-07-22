"""
一键生成周报面板
自动拉取本周数据 → DeepSeek 归纳 → 输出 docx
"""
import tkinter as tk
from tkinter import ttk
import threading
import os
import subprocess
from datetime import date, timedelta

import config
from database import DatabaseManager
from utils.report_generator import generate_weekly_report
from utils.helpers import add_watermark
from widgets.modern_dialog import show_warning, show_info, show_error, ask_yes_no


class WeeklyReportView(tk.Frame):
    """一键生成周报面板"""

    def __init__(self, parent, db: DatabaseManager, **kwargs):
        super().__init__(parent, bg=config.COLORS['bg_primary'], **kwargs)
        self.db = db
        self._build_ui()
        add_watermark(self, getattr(self, 'canvas', None))

    def _build_ui(self):
        """构建界面"""
        # 主容器
        container = tk.Frame(self, bg=config.COLORS['bg_primary'])
        container.pack(fill='both', expand=True, padx=40, pady=40)

        # ---- 标题 ----
        title = tk.Label(
            container, text='📝 一键生成周报',
            font=config.FONT_TITLE,
            fg=config.COLORS['text_primary'],
            bg=config.COLORS['bg_primary'],
        )
        title.pack(pady=(0, 5))

        subtitle = tk.Label(
            container,
            text='自动拉取本周任务，AI 智能归纳分类，输出标准 docx 周报',
            font=config.FONT_SMALL,
            fg=config.COLORS['text_secondary'],
            bg=config.COLORS['bg_primary'],
        )
        subtitle.pack(pady=(0, 30))

        # ---- 日期选择区 ----
        date_card = tk.Frame(container, bg='white', padx=25, pady=20)
        date_card.pack(fill='x', pady=(0, 20))

        tk.Label(date_card, text='选择日期范围',
                 font=config.FONT_BODY_BOLD,
                 fg=config.COLORS['text_primary'], bg='white').pack(anchor='w', pady=(0, 12))

        date_row = tk.Frame(date_card, bg='white')
        date_row.pack(fill='x')

        # 起始日期
        tk.Label(date_row, text='起始：', font=config.FONT_BODY,
                 fg=config.COLORS['text_secondary'], bg='white').pack(side='left')
        try:
            from tkcalendar import DateEntry
            self.start_picker = DateEntry(date_row, width=12, date_pattern='yyyy-mm-dd',
                                          font=config.FONT_BODY,
                                          background=config.COLORS['accent'], foreground='white')
        except ImportError:
            self.start_picker = tk.Entry(date_row, font=config.FONT_BODY, width=14)
        self.start_picker.pack(side='left', padx=(0, 20))

        # 结束日期
        tk.Label(date_row, text='结束：', font=config.FONT_BODY,
                 fg=config.COLORS['text_secondary'], bg='white').pack(side='left')
        try:
            from tkcalendar import DateEntry
            self.end_picker = DateEntry(date_row, width=12, date_pattern='yyyy-mm-dd',
                                        font=config.FONT_BODY,
                                        background=config.COLORS['accent'], foreground='white')
        except ImportError:
            self.end_picker = tk.Entry(date_row, font=config.FONT_BODY, width=14)
        self.end_picker.pack(side='left', padx=(0, 15))

        # 快捷按钮
        quick_frame = tk.Frame(date_row, bg='white')
        quick_frame.pack(side='right')

        def set_this_week():
            today = date.today()
            monday = today - timedelta(days=today.weekday())
            friday = monday + timedelta(days=4)
            self._set_date(self.start_picker, monday)
            self._set_date(self.end_picker, friday)

        tk.Button(quick_frame, text='本周', font=config.FONT_SMALL,
                  fg='white', bg=config.COLORS['accent'],
                  relief='flat', padx=12, pady=2,
                  cursor='hand2', command=set_this_week).pack(side='left', padx=(0, 5))

        def set_last_week():
            today = date.today()
            last_monday = today - timedelta(days=today.weekday() + 7)
            last_friday = last_monday + timedelta(days=4)
            self._set_date(self.start_picker, last_monday)
            self._set_date(self.end_picker, last_friday)

        tk.Button(quick_frame, text='上周', font=config.FONT_SMALL,
                  fg=config.COLORS['accent'], bg='white',
                  relief='solid', borderwidth=1, padx=12, pady=2,
                  cursor='hand2', command=set_last_week).pack(side='left')

        # 默认本周
        set_this_week()

        # ---- 输出目录 ----
        dir_card = tk.Frame(container, bg='white', padx=25, pady=20)
        dir_card.pack(fill='x', pady=(0, 20))

        tk.Label(dir_card, text='输出目录',
                 font=config.FONT_BODY_BOLD,
                 fg=config.COLORS['text_primary'], bg='white').pack(anchor='w', pady=(0, 8))

        dir_row = tk.Frame(dir_card, bg='white')
        dir_row.pack(fill='x')

        self.dir_var = tk.StringVar(value=r'D:\claude\计划表')
        tk.Entry(dir_row, textvariable=self.dir_var, font=config.FONT_SMALL,
                 width=50, relief='solid', borderwidth=1).pack(side='left', fill='x', expand=True, padx=(0, 8))
        tk.Button(dir_row, text='浏览...', font=config.FONT_SMALL,
                  fg=config.COLORS['accent'], bg='white',
                  relief='solid', borderwidth=1, padx=10, pady=2,
                  cursor='hand2', command=self._browse_dir).pack(side='right')

        # ---- 生成按钮 ----
        btn_frame = tk.Frame(container, bg=config.COLORS['bg_primary'])
        btn_frame.pack(fill='x')

        self.gen_btn = tk.Button(
            btn_frame, text='🚀 一键生成周报',
            font=(config.FONT_FAMILY, 13, 'bold'),
            fg='white', bg=config.COLORS['accent'],
            relief='flat', padx=30, pady=12,
            cursor='hand2', command=self._start_generate,
        )
        self.gen_btn.pack()

        # ---- 进度/结果区（大卡片，完成时变色） ----
        self.result_frame = tk.Frame(container, bg=config.COLORS['bg_primary'])
        self.result_frame.pack(fill='x', pady=(20, 0))

        self.result_card = tk.Frame(self.result_frame, bg=config.COLORS['bg_primary'])
        # 不急着pack，等有内容再显示

    # ============================================================
    # 操作逻辑
    # ============================================================

    def _set_date(self, picker, value):
        """设置日期选择器的值"""
        try:
            from tkcalendar import DateEntry
            if isinstance(picker, DateEntry):
                picker.set_date(value)
            else:
                picker.delete(0, 'end')
                picker.insert(0, value.strftime('%Y-%m-%d'))
        except Exception:
            picker.delete(0, 'end')
            picker.insert(0, value.strftime('%Y-%m-%d'))

    def _get_date(self, picker):
        """获取日期选择器的值"""
        try:
            from tkcalendar import DateEntry
            if isinstance(picker, DateEntry):
                return picker.get_date().strftime('%Y-%m-%d')
        except Exception:
            pass
        return picker.get().strip()

    def _browse_dir(self):
        """选择输出目录"""
        from tkinter import filedialog
        path = filedialog.askdirectory(title='选择周报保存目录')
        if path:
            self.dir_var.set(path)

    def _start_generate(self):
        """开始生成周报"""
        start = self._get_date(self.start_picker)
        end = self._get_date(self.end_picker)

        if not start or not end:
            show_warning('提示', '请选择日期范围')
            return

        # 清旧结果
        for w in self.result_frame.winfo_children():
            w.destroy()

        # 进度卡片
        card = tk.Frame(self.result_frame, bg='white', padx=20, pady=18)
        card.pack(fill='x')

        icon = tk.Label(card, text='⏳', font=(config.FONT_FAMILY, 32),
                        bg='white', fg=config.COLORS['warning'])
        icon.pack(pady=(0, 8))

        status = tk.Label(card, text='🔍 正在读取本周任务数据...',
                          font=config.FONT_BODY_BOLD,
                          fg=config.COLORS['text_primary'], bg='white')
        status.pack()

        # 禁用按钮
        self.gen_btn.configure(state='disabled', text='⏳ 生成中...')
        self.update()  # 强制刷新UI

        def run():
            import time, traceback
            time.sleep(0.3)
            self.after(0, lambda: status.configure(
                text='🤖 DeepSeek AI 正在归纳分类和润色...'))

            try:
                output_dir = self.dir_var.get() or r'D:\claude\计划表'
                success, message, filepath = generate_weekly_report(
                    self.db, start, end, output_dir
                )
            except Exception as e:
                success = False
                message = f'异常: {str(e)}\n{traceback.format_exc()}'
                filepath = None

            def done():
                self.gen_btn.configure(state='normal', text='🚀 一键生成周报')
                for w in self.result_frame.winfo_children():
                    w.destroy()

                if success and filepath:
                    ok = tk.Frame(self.result_frame,
                                  bg=config.COLORS['success_light'], padx=20, pady=18)
                    ok.pack(fill='x')
                    tk.Label(ok, text='✅', font=(config.FONT_FAMILY, 36),
                             bg=config.COLORS['success_light']).pack()
                    tk.Label(ok, text='生成完成！', font=config.FONT_HEADING,
                             fg=config.COLORS['success'],
                             bg=config.COLORS['success_light']).pack(pady=(4, 2))
                    tk.Label(ok, text=message, font=config.FONT_SMALL,
                             fg=config.COLORS['text_secondary'],
                             bg=config.COLORS['success_light']).pack()

                    def open_file(p):
                        if p and os.path.exists(p):
                            os.startfile(p)
                            os.startfile(os.path.dirname(p))
                    tk.Button(ok, text='📂 打开文件', font=config.FONT_BODY_BOLD,
                              fg='white', bg=config.COLORS['success'],
                              relief='flat', padx=20, pady=6, cursor='hand2',
                              command=lambda p=filepath: open_file(p)).pack(pady=(8, 0))
                    open_file(filepath)
                else:
                    # 写日志
                    with open(r'D:\claude\计划表\planner\error.log', 'w', encoding='utf-8') as f:
                        f.write(message)

                    fail = tk.Frame(self.result_frame,
                                    bg=config.COLORS['danger_light'], padx=20, pady=18)
                    fail.pack(fill='x')
                    tk.Label(fail, text='❌', font=(config.FONT_FAMILY, 36),
                             bg=config.COLORS['danger_light']).pack()
                    tk.Label(fail, text='生成失败', font=config.FONT_HEADING,
                             fg=config.COLORS['danger'],
                             bg=config.COLORS['danger_light']).pack(pady=(4, 2))
                    # 用Text组件，可选中复制
                    err_text = tk.Text(fail, font=(config.FONT_FAMILY, 8), fg=config.COLORS['text_secondary'],
                                       bg=config.COLORS['danger_light'], height=6, wrap='word',
                                       relief='flat', borderwidth=0)
                    err_text.insert('1.0', message)
                    err_text.configure(state='disabled')
                    err_text.pack(fill='x', pady=(4, 0))

            self.after(0, done)

        threading.Thread(target=run, daemon=True).start()

    def on_show(self):
        """视图显示时刷新"""
        pass
