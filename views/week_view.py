"""
周计划视图
以 7 列网格展示一周内每天的计划分布，点击某天可跳转到日视图
"""
import tkinter as tk
from tkinter import ttk
from typing import Callable, Optional, List, Dict
from datetime import date, timedelta

import config
from models import Plan, Category
from database import DatabaseManager
from utils.helpers import (
    get_current_week, get_week_range, get_week_navigator_text,
    get_weekday_name, format_date_short, truncate_text,
    priority_to_stars, add_watermark,
)


class WeekView(tk.Frame):
    """周计划视图，7列网格显示"""

    def __init__(
        self,
        parent,
        db: DatabaseManager,
        on_day_click: Optional[Callable[[str], None]] = None,
        **kwargs
    ):
        """
        初始化周视图
        Args:
            parent: 父容器
            db: 数据库管理器
            on_day_click: 点击某天时的回调，参数为日期字符串
        """
        super().__init__(parent, bg=config.COLORS['bg_primary'], **kwargs)
        self.db = db
        self.on_day_click = on_day_click

        # 当前周
        self.current_year, self.current_week = get_current_week()

        # 列 Frame 引用
        self.day_columns: Dict[int, tk.Frame] = {}
        self.day_labels: Dict[int, tk.Label] = {}

        self._build_ui()
        add_watermark(self, self.canvas)

    def _build_ui(self):
        """构建周视图界面"""
        # ---- 顶部导航栏 ----
        nav_frame = tk.Frame(self, bg='white', padx=15, pady=10)
        nav_frame.pack(fill='x')
        nav_frame.pack_propagate(False)
        nav_frame.configure(height=55)

        # 上一周按钮
        prev_btn = tk.Button(
            nav_frame,
            text='◀ 上周',
            font=config.FONT_BODY,
            fg=config.COLORS['accent'],
            bg='white',
            relief='flat',
            cursor='hand2',
            command=self._on_prev_week,
        )
        prev_btn.pack(side='left')

        # 周标题
        self.week_title = tk.Label(
            nav_frame,
            text='',
            font=config.FONT_HEADING,
            fg=config.COLORS['text_primary'],
            bg='white',
            padx=15,
        )
        self.week_title.pack(side='left')

        # 下一周按钮
        next_btn = tk.Button(
            nav_frame,
            text='下周 ▶',
            font=config.FONT_BODY,
            fg=config.COLORS['accent'],
            bg='white',
            relief='flat',
            cursor='hand2',
            command=self._on_next_week,
        )
        next_btn.pack(side='left')

        # 本周按钮
        today_btn = tk.Button(
            nav_frame,
            text='本周',
            font=config.FONT_SMALL,
            fg='white',
            bg=config.COLORS['accent'],
            relief='flat',
            padx=12,
            pady=3,
            cursor='hand2',
            command=self._goto_current_week,
        )
        today_btn.pack(side='left', padx=(15, 0))

        # ---- 7天网格容器 ----
        # Canvas + 内部 Frame 实现滚动（与日视图相同方案）
        grid_container = tk.Frame(self, bg=config.COLORS['bg_primary'])
        grid_container.pack(fill='both', expand=True)

        self.canvas = tk.Canvas(
            grid_container,
            bg=config.COLORS['bg_primary'],
            highlightthickness=0,
        )
        self.canvas.pack(side='left', fill='both', expand=True)

        scrollbar = ttk.Scrollbar(
            grid_container,
            orient='vertical',
            command=self.canvas.yview,
        )
        scrollbar.pack(side='right', fill='y')
        self.canvas.configure(yscrollcommand=scrollbar.set)

        # 周网格内部 Frame
        self.grid_frame = tk.Frame(self.canvas, bg=config.COLORS['bg_primary'])
        self.canvas_window = self.canvas.create_window(
            (0, 0), window=self.grid_frame, anchor='nw', tags='grid_frame'
        )

        self.grid_frame.bind('<Configure>', self._on_grid_configure)
        self.canvas.bind('<Configure>', self._on_canvas_configure)
        self.canvas.bind('<MouseWheel>', self._on_mousewheel)

        # ---- 7列网格布局 ----
        # 表头行
        header_frame = tk.Frame(self.grid_frame, bg=config.COLORS['bg_primary'])
        header_frame.pack(fill='x', padx=10, pady=(10, 0))

        self.day_header_frames: Dict[int, tk.Frame] = {}
        for i in range(7):
            col_frame = tk.Frame(header_frame, bg='white', relief='solid', borderwidth=1, bd=1)
            col_frame.pack(side='left', fill='x', expand=True, padx=1)

            weekday_label = tk.Label(
                col_frame,
                text='',
                font=config.FONT_BODY_BOLD,
                fg=config.COLORS['text_primary'],
                bg='white',
                pady=6,
            )
            weekday_label.pack(fill='x')

            self.day_labels[i] = weekday_label

        # 7列内容容器
        content_frame = tk.Frame(self.grid_frame, bg=config.COLORS['bg_primary'])
        content_frame.pack(fill='both', expand=True, padx=10, pady=(0, 10))

        for i in range(7):
            col_frame = tk.Frame(content_frame, bg='white', relief='solid', borderwidth=1, bd=1)
            col_frame.pack(side='left', fill='both', expand=True, padx=1)
            self.day_columns[i] = col_frame

            # 绑定点击事件跳转到日视图
            col_frame.bind('<Button-1>', lambda e, idx=i: self._on_column_click(idx))
            col_frame.bind('<Double-Button-1>', lambda e, idx=i: self._on_column_click(idx))

    def _on_grid_configure(self, event):
        """网格 Frame 变化时更新 Canvas"""
        self.canvas.configure(scrollregion=self.canvas.bbox('all'))

    def _on_canvas_configure(self, event):
        """Canvas 宽度变化时调整内部 Frame 宽度"""
        self.canvas.itemconfig(self.canvas_window, width=event.width)

    def _on_mousewheel(self, event):
        """鼠标滚轮"""
        self.canvas.yview_scroll(int(-1 * (event.delta / 120)), 'units')

    def _on_prev_week(self):
        """上一周"""
        self.current_week -= 1
        if self.current_week < 1:
            self.current_year -= 1
            self.current_week = 52  # 简化处理
        self.refresh()

    def _on_next_week(self):
        """下一周"""
        self.current_week += 1
        if self.current_week > 52:
            self.current_year += 1
            self.current_week = 1  # 简化处理
        self.refresh()

    def _goto_current_week(self):
        """跳转到本周"""
        self.current_year, self.current_week = get_current_week()
        self.refresh()

    def _on_column_click(self, day_index: int):
        """点击某列跳转到日视图"""
        start_date, _ = get_week_range(self.current_year, self.current_week)
        dt = date.fromisoformat(start_date) + timedelta(days=day_index)
        date_str = dt.strftime('%Y-%m-%d')
        if self.on_day_click:
            self.on_day_click(date_str)

    def on_show(self):
        """视图显示时的回调"""
        self.refresh()

    def refresh(self):
        """刷新周视图"""
        # 更新标题
        self.week_title.configure(
            text=get_week_navigator_text(self.current_year, self.current_week)
        )

        # 获取本周日期范围
        start_date, _ = get_week_range(self.current_year, self.current_week)
        start_dt = date.fromisoformat(start_date)

        # 获取本周所有计划（按日期分组）
        plans = self.db.get_plans_by_week(self.current_year, self.current_week)
        plans_by_date: Dict[str, List[Plan]] = {}
        for p in plans:
            if p.plan_date not in plans_by_date:
                plans_by_date[p.plan_date] = []
            plans_by_date[p.plan_date].append(p)

        # 获取分类映射
        categories = self.db.get_all_categories()
        cat_map = {c.id: c for c in categories}

        today = date.today()

        # 更新每一天的列
        for i in range(7):
            dt = start_dt + timedelta(days=i)
            date_str = dt.strftime('%Y-%m-%d')
            is_today = dt == today

            # 列头
            header_text = f'{get_weekday_name(i)}\n{dt.month}/{dt.day}'
            if is_today:
                header_text += ' ★'  # 标记今天
            self.day_labels[i].configure(
                text=header_text,
                fg=config.COLORS['accent'] if is_today else config.COLORS['text_primary'],
            )

            # 清空列内容
            col_frame = self.day_columns[i]
            for widget in col_frame.winfo_children():
                widget.destroy()

            # 该天的计划
            day_plans = plans_by_date.get(date_str, [])

            if not day_plans:
                # 空列
                empty_label = tk.Label(
                    col_frame,
                    text='--',
                    font=config.FONT_SMALL,
                    fg=config.COLORS['text_muted'],
                    bg='white',
                    pady=20,
                )
                empty_label.pack()
                empty_label.bind('<Button-1>', lambda e, d=date_str: self._on_day_label_click(d))
            else:
                # 计划卡片列表
                for plan in day_plans:
                    cat = cat_map.get(plan.category_id, Category(name='?', color='#CCC'))
                    self._add_plan_mini_card(col_frame, plan, cat)

    def _add_plan_mini_card(self, parent: tk.Frame, plan: Plan, category: Category):
        """在列中添加小型计划卡片"""
        is_completed = plan.status == 'completed'

        card = tk.Frame(
            parent,
            bg=config.COLORS['completed_bg'] if is_completed else config.COLORS['accent_light'],
            cursor='hand2',
        )
        card.pack(fill='x', padx=3, pady=1)

        # 左侧色条
        bar = tk.Frame(card, width=3, bg=category.color)
        bar.pack(side='left', fill='y')

        # 内容
        content = tk.Frame(
            card,
            bg=config.COLORS['completed_bg'] if is_completed else config.COLORS['accent_light'],
        )
        content.pack(side='left', fill='x', padx=4, pady=3)

        # 标题
        title_text = truncate_text(plan.title, 12)
        title_fg = config.COLORS['completed_text'] if is_completed else config.COLORS['text_primary']
        title_label = tk.Label(
            content,
            text=title_text,
            font=config.FONT_SMALL,
            fg=title_fg,
            bg=config.COLORS['completed_bg'] if is_completed else config.COLORS['accent_light'],
            anchor='w',
        )
        title_label.pack()

        # 优先级
        if plan.priority >= 4:
            priority_label = tk.Label(
                content,
                text=priority_to_stars(plan.priority),
                font=(config.FONT_FAMILY, 7),
                fg=config.PRIORITY_COLORS.get(plan.priority),
                bg=config.COLORS['completed_bg'] if is_completed else config.COLORS['accent_light'],
            )
            priority_label.pack()

        # 点击跳转
        date_str = plan.plan_date
        card.bind('<Button-1>', lambda e, d=date_str: self._on_day_label_click(d))
        content.bind('<Button-1>', lambda e, d=date_str: self._on_day_label_click(d))

    def _on_day_label_click(self, date_str: str):
        """点击某天跳转到日视图"""
        if self.on_day_click:
            self.on_day_click(date_str)
