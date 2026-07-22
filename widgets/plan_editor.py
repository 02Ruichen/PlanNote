"""
极简计划编辑弹窗
一个输入框搞定：记录今天做了什么
可选：日期、难度、分类
"""
import tkinter as tk
from tkinter import ttk
from typing import Callable, Optional
from datetime import date

import config
from models import Plan
from database import DatabaseManager
from widgets.modern_dialog import show_warning, show_info


class PlanEditor(tk.Toplevel):
    """极简编辑对话框"""

    def __init__(self, parent, db: DatabaseManager, plan: Optional[Plan] = None,
                 preset_date: Optional[str] = None, callback: Optional[Callable] = None,
                 template=None):  # template 参数保持兼容旧接口
        super().__init__(parent)
        self.db = db
        self.plan = plan
        self.callback = callback

        # 窗口
        self.title('记录今天做了什么')
        self.resizable(False, False)
        self.transient(parent)
        self.grab_set()
        self.configure(bg='white')

        w, h = 480, 320
        self.geometry(f'{w}x{h}')
        self.update_idletasks()
        x = parent.winfo_rootx() + (parent.winfo_width() - w) // 2
        y = parent.winfo_rooty() + (parent.winfo_height() - h) // 2
        self.geometry(f'+{x}+{y}')

        # 加载分类
        self.categories = db.get_all_categories()

        # ---- 构建界面 ----
        main = tk.Frame(self, bg='white', padx=25, pady=20)
        main.pack(fill='both', expand=True)

        # 日期行
        date_row = tk.Frame(main, bg='white')
        date_row.pack(fill='x', pady=(0, 10))
        tk.Label(date_row, text='日期', font=config.FONT_SMALL,
                 fg=config.COLORS['text_secondary'], bg='white').pack(side='left')
        try:
            from tkcalendar import DateEntry
            self.date_entry = DateEntry(date_row, width=12, date_pattern='yyyy-mm-dd',
                                        font=config.FONT_SMALL,
                                        background=config.COLORS['accent'], foreground='white')
        except ImportError:
            self.date_entry = tk.Entry(date_row, font=config.FONT_SMALL, width=14)
        self.date_entry.pack(side='left', padx=(8, 0))

        # 难度和分类选择行
        opts_row = tk.Frame(main, bg='white')
        opts_row.pack(fill='x', pady=(0, 10))

        # 难度
        tk.Label(opts_row, text='难度', font=config.FONT_SMALL,
                 fg=config.COLORS['text_secondary'], bg='white').pack(side='left')
        self.diff_var = tk.IntVar(value=3)
        for i in range(1, 6):
            lbl = config.PRIORITY_LABELS[i]
            rb = tk.Radiobutton(
                opts_row, text=lbl, variable=self.diff_var, value=i,
                font=(config.FONT_FAMILY, 8),
                bg='white', fg=config.PRIORITY_COLORS[i],
                selectcolor='white', activebackground='white',
            )
            rb.pack(side='left', padx=(2, 0))

        # 分类（靠右）
        tk.Label(opts_row, text='分类', font=config.FONT_SMALL,
                 fg=config.COLORS['text_secondary'], bg='white').pack(side='right')
        self.cat_var = tk.StringVar(value=self.categories[0].name if self.categories else '')
        cat_combo = ttk.Combobox(
            opts_row, textvariable=self.cat_var,
            values=[c.name for c in self.categories],
            state='readonly', width=8, font=config.FONT_SMALL,
        )
        cat_combo.pack(side='right', padx=(0, 8))

        # ---- 核心：大输入框 ----
        tk.Label(main, text='今天做了什么？',
                 font=config.FONT_BODY_BOLD,
                 fg=config.COLORS['text_primary'], bg='white').pack(anchor='w', pady=(5, 5))

        self.desc_text = tk.Text(
            main, font=config.FONT_BODY,
            height=5, wrap='word',
            relief='solid', borderwidth=1, padx=8, pady=6,
            fg=config.COLORS['text_primary'],
        )
        self.desc_text.pack(fill='both', expand=True, pady=(0, 12))
        self.desc_text.focus_set()

        # 提示
        tk.Label(main, text='每行一条，Enter 换行。例如：\n完成项目报告\n整理实习生入职资料\n撰写新闻稿',
                 font=(config.FONT_FAMILY, 8),
                 fg=config.COLORS['text_muted'], bg='white', justify='left',
                 ).pack(anchor='w', pady=(0, 10))

        # 按钮
        btn_row = tk.Frame(main, bg='white')
        btn_row.pack(fill='x')
        tk.Button(btn_row, text='取消', font=config.FONT_BODY,
                  fg=config.COLORS['text_secondary'], bg='white',
                  relief='solid', borderwidth=1, padx=16, pady=5,
                  cursor='hand2', command=self.destroy).pack(side='right', padx=(10, 0))
        tk.Button(btn_row, text='保存', font=config.FONT_BODY_BOLD,
                  fg='white', bg=config.COLORS['accent'],
                  relief='flat', padx=20, pady=5,
                  cursor='hand2', command=self._on_save).pack(side='right')

        # 编辑模式：加载已有数据
        if plan:
            self._load_plan(plan)
        elif preset_date:
            self._set_date(preset_date)

        self.bind('<Control-Return>', lambda e: self._on_save())
        self.wait_window()

    def _set_date(self, ds):
        try:
            from tkcalendar import DateEntry
            if isinstance(self.date_entry, DateEntry):
                self.date_entry.set_date(ds)
            else:
                self.date_entry.delete(0, 'end'); self.date_entry.insert(0, ds)
        except: pass

    def _get_date(self):
        try:
            from tkcalendar import DateEntry
            if isinstance(self.date_entry, DateEntry):
                return self.date_entry.get_date().strftime('%Y-%m-%d')
        except: pass
        return self.date_entry.get().strip() or date.today().strftime('%Y-%m-%d')

    def _load_plan(self, plan):
        self.desc_text.insert('1.0', plan.title)
        if plan.description:
            self.desc_text.insert('end', f'\n{plan.description}')
        for c in self.categories:
            if c.id == plan.category_id:
                self.cat_var.set(c.name); break
        self.diff_var.set(plan.priority)
        self._set_date(plan.plan_date)

    def _on_save(self):
        """保存：每行作为一个独立计划"""
        raw = self.desc_text.get('1.0', 'end-1c').strip()
        if not raw:
            show_warning('提示', '请输入今天做了什么', parent=self)
            return

        cat_name = self.cat_var.get()
        cat_id = 1
        for c in self.categories:
            if c.name == cat_name:
                cat_id = c.id; break

        plan_date = self._get_date()
        priority = self.diff_var.get()

        # 每行一个计划，直接作为内容，不做标题/描述分割
        lines = [l.strip() for l in raw.split('\n') if l.strip()]
        for line in lines:
            p = Plan(
                id=self.plan.id if self.plan else None,
                title=line[:200],
                description='',
                category_id=cat_id,
                priority=priority,
                status=self.plan.status if self.plan else 'pending',
                plan_date=plan_date,
            )
            if self.plan and self.plan.id:
                self.db.update_plan(p)
            else:
                self.db.create_plan(p)

        if self.callback:
            self.callback()
        self.destroy()
