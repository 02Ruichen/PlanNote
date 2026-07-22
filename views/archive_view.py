"""
归档查询视图
按月份浏览已归档/已完成的计划，支持取消归档
"""
import tkinter as tk
from tkinter import ttk
from typing import Callable, Optional, List
from datetime import datetime

import config
from models import Plan, Category
from database import DatabaseManager
from utils.helpers import (
    get_month_label, format_date_short, truncate_text, priority_to_stars,
    add_watermark,
)
from widgets.modern_dialog import ask_yes_no


class ArchiveView(tk.Frame):
    """归档查询视图"""

    def __init__(
        self,
        parent,
        db: DatabaseManager,
        on_data_changed: Optional[Callable] = None,
        **kwargs
    ):
        """
        初始化归档视图
        Args:
            parent: 父容器
            db: 数据库管理器
            on_data_changed: 数据变更回调
        """
        super().__init__(parent, bg=config.COLORS['bg_primary'], **kwargs)
        self.db = db
        self.on_data_changed = on_data_changed

        # 筛选条件
        self.selected_month: Optional[str] = None  # None 表示全部

        self._build_ui()
        add_watermark(self, self.canvas)

    def _build_ui(self):
        """构建归档视图界面"""
        # ---- 顶部栏 ----
        top_frame = tk.Frame(self, bg='white', padx=15, pady=10)
        top_frame.pack(fill='x')
        top_frame.pack_propagate(False)
        top_frame.configure(height=55)

        # 标题
        tk.Label(
            top_frame,
            text='📁 归档查询',
            font=config.FONT_HEADING,
            fg=config.COLORS['text_primary'],
            bg='white',
        ).pack(side='left')

        # 月份筛选
        tk.Label(
            top_frame,
            text='归档月份:',
            font=config.FONT_SMALL,
            fg=config.COLORS['text_secondary'],
            bg='white',
        ).pack(side='left', padx=(30, 4))

        self.month_var = tk.StringVar(value='全部')
        month_values = ['全部']
        self.month_combo = ttk.Combobox(
            top_frame,
            textvariable=self.month_var,
            values=month_values,
            state='readonly',
            width=18,
            font=config.FONT_SMALL,
        )
        self.month_combo.pack(side='left')
        self.month_combo.bind('<<ComboboxSelected>>', self._on_month_filter_change)

        # 刷新按钮
        refresh_btn = tk.Button(
            top_frame,
            text='刷新',
            font=config.FONT_SMALL,
            fg=config.COLORS['accent'],
            bg='white',
            relief='solid',
            borderwidth=1,
            padx=10,
            pady=2,
            cursor='hand2',
            command=self.refresh,
        )
        refresh_btn.pack(side='right')

        # ---- 列表区域 ----
        list_container = tk.Frame(self, bg=config.COLORS['bg_primary'])
        list_container.pack(fill='both', expand=True)

        self.canvas = tk.Canvas(
            list_container,
            bg=config.COLORS['bg_primary'],
            highlightthickness=0,
        )
        self.canvas.pack(side='left', fill='both', expand=True)

        scrollbar = ttk.Scrollbar(
            list_container,
            orient='vertical',
            command=self.canvas.yview,
        )
        scrollbar.pack(side='right', fill='y')
        self.canvas.configure(yscrollcommand=scrollbar.set)

        self.list_frame = tk.Frame(self.canvas, bg=config.COLORS['bg_primary'])
        self.canvas_window = self.canvas.create_window(
            (0, 0), window=self.list_frame, anchor='nw', tags='list_frame'
        )

        self.list_frame.bind('<Configure>', self._on_list_frame_configure)
        self.canvas.bind('<Configure>', self._on_canvas_configure)
        self.canvas.bind('<MouseWheel>', self._on_mousewheel)

    def _on_list_frame_configure(self, event):
        self.canvas.configure(scrollregion=self.canvas.bbox('all'))

    def _on_canvas_configure(self, event):
        self.canvas.itemconfig(self.canvas_window, width=event.width)

    def _on_mousewheel(self, event):
        self.canvas.yview_scroll(int(-1 * (event.delta / 120)), 'units')

    def _on_month_filter_change(self, event=None):
        """月份筛选变化"""
        month_str = self.month_var.get()
        if month_str == '全部':
            self.selected_month = None
        else:
            # 从显示格式还原为 YYYY-MM
            for m in self.db.get_archived_months():
                if get_month_label(m) == month_str:
                    self.selected_month = m
                    break
        self.refresh()

    def on_show(self):
        """视图显示时的回调"""
        self.refresh()

    def refresh(self):
        """刷新归档列表"""
        # 清空列表
        for widget in self.list_frame.winfo_children():
            widget.destroy()

        # 更新月份下拉列表
        archived_months = self.db.get_archived_months()
        month_display = ['全部'] + [get_month_label(m) for m in archived_months]
        current_selection = self.month_var.get()
        self.month_combo['values'] = month_display
        if current_selection in month_display:
            self.month_var.set(current_selection)
        else:
            self.month_var.set('全部')
            self.selected_month = None

        # 获取归档计划
        plans = self.db.get_archived_plans(self.selected_month)

        if not plans:
            self._show_empty_state()
            return

        # 获取分类映射
        categories = self.db.get_all_categories()
        cat_map = {c.id: c for c in categories}

        # 统计信息
        count_label = tk.Label(
            self.list_frame,
            text=f'共找到 {len(plans)} 条归档记录',
            font=config.FONT_SMALL,
            fg=config.COLORS['text_secondary'],
            bg=config.COLORS['bg_primary'],
            anchor='w',
        )
        count_label.pack(fill='x', padx=20, pady=(15, 10))

        # 按月分组显示
        from itertools import groupby
        # 先按 archived_month 排序
        plans_by_month = {}
        for plan in plans:
            month = plan.archived_month or '未知月份'
            if month not in plans_by_month:
                plans_by_month[month] = []
            plans_by_month[month].append(plan)

        for month in sorted(plans_by_month.keys(), reverse=True):
            month_plans = plans_by_month[month]
            # 月份标题
            header_frame = tk.Frame(self.list_frame, bg=config.COLORS['bg_primary'])
            header_frame.pack(fill='x', padx=20, pady=(15, 8))

            tk.Frame(header_frame, width=4, height=18, bg=config.COLORS['accent']).pack(side='left', padx=(0, 8))
            tk.Label(
                header_frame,
                text=f'{get_month_label(month)} · {len(month_plans)}条',
                font=config.FONT_BODY_BOLD,
                fg=config.COLORS['text_primary'],
                bg=config.COLORS['bg_primary'],
            ).pack(side='left')

            # 该月的计划
            for plan in month_plans:
                cat = cat_map.get(plan.category_id, Category(name='未知', color='#CCC'))
                self._add_archive_item(plan, cat)

        # 底部空白
        spacer = tk.Frame(self.list_frame, height=20, bg=config.COLORS['bg_primary'])
        spacer.pack(fill='x')

    def _add_archive_item(self, plan: Plan, category: Category):
        """添加归档计划条目"""
        card = tk.Frame(
            self.list_frame,
            bg=config.COLORS['completed_bg'],
        )
        card.pack(fill='x', padx=20, pady=1)

        # 分类色条
        bar = tk.Frame(card, width=4, bg=category.color)
        bar.pack(side='left', fill='y')

        # 内容区
        content = tk.Frame(card, bg=config.COLORS['completed_bg'])
        content.pack(side='left', fill='both', expand=True, padx=10, pady=6)

        # 第一行：日期 + 完成状态 + 标题 + 分类
        row1 = tk.Frame(content, bg=config.COLORS['completed_bg'])
        row1.pack(fill='x')

        # 日期
        tk.Label(
            row1,
            text=format_date_short(plan.plan_date),
            font=config.FONT_SMALL,
            fg=config.COLORS['text_secondary'],
            bg=config.COLORS['completed_bg'],
        ).pack(side='left', padx=(0, 8))

        # 完成标记
        tk.Label(
            row1,
            text='✔ 已完成',
            font=config.FONT_SMALL,
            fg=config.COLORS['success'],
            bg=config.COLORS['completed_bg'],
        ).pack(side='left', padx=(0, 8))

        # 标题
        tk.Label(
            row1,
            text=plan.title,
            font=config.FONT_BODY,
            fg=config.COLORS['completed_text'],
            bg=config.COLORS['completed_bg'],
            anchor='w',
        ).pack(side='left')

        # 分类标签（靠右）
        tk.Label(
            row1,
            text=f'[{category.name}]',
            font=config.FONT_SMALL,
            fg=category.color,
            bg=config.COLORS['completed_bg'],
        ).pack(side='right')

        # 优先级
        if plan.priority >= 3:
            tk.Label(
                row1,
                text='★' * plan.priority,
                font=(config.FONT_FAMILY, 7),
                fg=config.COLORS['text_muted'],
                bg=config.COLORS['completed_bg'],
            ).pack(side='right', padx=(0, 6))

        # 第二行：描述预览 + 取消归档按钮
        if plan.description or plan.completed_at:
            row2 = tk.Frame(content, bg=config.COLORS['completed_bg'])
            row2.pack(fill='x', pady=(2, 0))

            if plan.description:
                tk.Label(
                    row2,
                    text=truncate_text(plan.description, 50),
                    font=config.FONT_SMALL,
                    fg=config.COLORS['text_muted'],
                    bg=config.COLORS['completed_bg'],
                    anchor='w',
                ).pack(side='left')

            # 取消归档按钮
            unarchive_btn = tk.Label(
                row2,
                text='取消归档',
                font=config.FONT_SMALL,
                fg=config.COLORS['accent'],
                bg=config.COLORS['completed_bg'],
                cursor='hand2',
                padx=4,
            )
            unarchive_btn.pack(side='right')
            unarchive_btn.bind('<Button-1>', lambda e, pid=plan.id: self._on_unarchive(pid))

    def _on_unarchive(self, plan_id: int):
        """取消归档"""
        if ask_yes_no('确认', '确定要取消归档此计划吗？\n计划将恢复为活跃状态。'):
            self.db.unarchive_plan(plan_id)
            self.refresh()
            if self.on_data_changed:
                self.on_data_changed()

    def _show_empty_state(self):
        """显示空状态"""
        empty_frame = tk.Frame(self.list_frame, bg=config.COLORS['bg_primary'])
        empty_frame.pack(fill='both', expand=True, pady=80)

        tk.Label(
            empty_frame,
            text='📂',
            font=(config.FONT_FAMILY, 48),
            fg=config.COLORS['text_muted'],
            bg=config.COLORS['bg_primary'],
        ).pack()

        tk.Label(
            empty_frame,
            text='暂无归档记录',
            font=config.FONT_BODY,
            fg=config.COLORS['text_secondary'],
            bg=config.COLORS['bg_primary'],
        ).pack(pady=(8, 4))

        tk.Label(
            empty_frame,
            text='在日视图中完成计划后，点击"归档本月已完成"即可归档',
            font=config.FONT_SMALL,
            fg=config.COLORS['text_muted'],
            bg=config.COLORS['bg_primary'],
        ).pack()
