"""
侧边栏导航组件
左侧 200px 导航栏，包含导航按钮和今日待办统计
"""
import tkinter as tk
from tkinter import ttk
from typing import Callable, Dict

import config


class Sidebar(tk.Frame):
    """左侧导航栏，包含视图切换按钮和快捷统计"""

    def __init__(self, parent, on_navigate: Callable[[str], None], db, **kwargs):
        """
        初始化侧边栏
        Args:
            parent: 父容器
            on_navigate: 导航回调函数，参数为视图名称
            db: DatabaseManager 实例
        """
        super().__init__(parent, width=config.SIDEBAR_WIDTH, bg=config.COLORS['bg_sidebar'], **kwargs)
        self.pack_propagate(False)  # 保持固定宽度
        self.on_navigate = on_navigate
        self.db = db
        self.buttons: Dict[str, tk.Button] = {}  # 存储导航按钮引用
        self._active_view = 'day'  # 当前活动视图

        self._build_ui()

    def _build_ui(self):
        """构建侧边栏界面"""
        # ---- 标题 ----
        title_label = tk.Label(
            self,
            text='📋 PlanNote',
            font=config.FONT_TITLE,
            fg=config.COLORS['text_sidebar_active'],
            bg=config.COLORS['bg_sidebar'],
            pady=20,
        )
        title_label.pack(fill='x')

        # ---- 分隔线 ----
        self._add_separator()

        # ---- 核心功能区 ----
        core_items = [
            ('day', '📅  每日记录'),
            ('weekly_report', '📝  生成周报'),
            ('ai_assist', '🤖  AI 助手'),
        ]
        for view_name, label in core_items:
            btn = tk.Button(
                self, text=label, font=config.FONT_BODY_BOLD,
                fg=config.COLORS['text_sidebar'], bg=config.COLORS['sidebar_btn'],
                activeforeground=config.COLORS['text_sidebar_active'],
                activebackground=config.COLORS['sidebar_btn_hover'],
                bd=0, padx=20, pady=12, anchor='w', cursor='hand2',
                command=lambda v=view_name: self._on_button_click(v),
            )
            btn.pack(fill='x', padx=5, pady=2)
            self.buttons[view_name] = btn

        # ---- 分隔线 + 更多折叠区 ----
        self._add_separator()

        # 更多标签（点击展开/收起）
        self.more_header = tk.Label(
            self, text='▸ 更多', font=config.FONT_SMALL,
            fg=config.COLORS['text_muted'], bg=config.COLORS['bg_sidebar'],
            padx=20, pady=6, anchor='w', cursor='hand2',
        )
        self.more_header.pack(fill='x', padx=5)
        self.more_header.bind('<Button-1>', self._toggle_more)

        # 更多区域（默认隐藏）
        self.more_frame = tk.Frame(self, bg=config.COLORS['bg_sidebar'])
        self.more_visible = False

        more_items = [
            ('week', '周视图'),
            ('month', '月视图'),
            ('archive', '归档'),
            ('statistics', '统计'),
            ('templates', '模板'),
        ]
        for view_name, label in more_items:
            btn = tk.Button(
                self.more_frame, text=f'   {label}', font=config.FONT_SMALL,
                fg=config.COLORS['text_sidebar'], bg=config.COLORS['sidebar_btn'],
                activeforeground=config.COLORS['text_sidebar_active'],
                activebackground=config.COLORS['sidebar_btn_hover'],
                bd=0, padx=30, pady=8, anchor='w', cursor='hand2',
                command=lambda v=view_name: self._on_button_click(v),
            )
            btn.pack(fill='x', padx=5)
            self.buttons[view_name] = btn

        # ---- 今日统计面板 ----
        stats_frame = tk.Frame(self, bg=config.COLORS['bg_sidebar'])
        stats_frame.pack(fill='x', padx=15, pady=15)

        self.today_count_label = tk.Label(
            stats_frame,
            text='今日待办: 0',
            font=config.FONT_SMALL,
            fg=config.COLORS['text_sidebar'],
            bg=config.COLORS['bg_sidebar'],
        )
        self.today_count_label.pack(anchor='w')

        # ---- 底部日期显示 ----
        from datetime import date
        today = date.today()
        date_label = tk.Label(
            self,
            text=f'{today.year}年{today.month}月{today.day}日',
            font=config.FONT_SMALL,
            fg=config.COLORS['text_muted'],
            bg=config.COLORS['bg_sidebar'],
            pady=10,
        )
        date_label.pack(side='bottom')

    def _add_separator(self):
        """添加分隔线"""
        sep = tk.Frame(self, height=1, bg=config.COLORS['sidebar_btn_hover'])
        sep.pack(fill='x', padx=10, pady=8)

    def _on_button_click(self, view_name: str):
        """导航按钮点击事件"""
        self.set_active(view_name)
        self.on_navigate(view_name)

    def set_active(self, view_name: str):
        """设置当前活动的导航按钮（高亮显示）"""
        # 取消之前的高亮
        if self._active_view in self.buttons:
            btn = self.buttons[self._active_view]
            btn.configure(
                fg=config.COLORS['text_sidebar'],
                bg=config.COLORS['sidebar_btn'],
            )

        # 设置新的高亮
        if view_name in self.buttons:
            btn = self.buttons[view_name]
            btn.configure(
                fg=config.COLORS['text_sidebar_active'],
                bg=config.COLORS['sidebar_btn_active'],
            )

        self._active_view = view_name

    def refresh_today_count(self):
        """刷新今日待办数量显示"""
        try:
            count = self.db.get_today_pending_count()
            self.today_count_label.configure(text=f'今日待办: {count}')
        except Exception:
            self.today_count_label.configure(text='今日待办: -')

    def refresh(self):
        """刷新侧边栏所有动态数据"""
        self.refresh_today_count()

    def _toggle_more(self, event=None):
        """展开/收起更多功能区"""
        if self.more_visible:
            self.more_frame.pack_forget()
            self.more_header.configure(text='▸ 更多')
        else:
            self.more_frame.pack(fill='x', after=self.more_header)
            self.more_header.configure(text='▾ 更多')
        self.more_visible = not self.more_visible
