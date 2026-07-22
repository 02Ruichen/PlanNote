"""
计划卡片组件
在计划列表中显示单个计划事项，支持完成切换、编辑、删除操作
"""
import tkinter as tk
from tkinter import ttk
from typing import Callable, Optional

import config
from models import Plan, Category
from utils.helpers import truncate_text
from widgets.modern_dialog import ask_yes_no


class PlanCard(tk.Frame):
    """单个计划事项的卡片组件"""

    def __init__(
        self,
        parent,
        plan: Plan,
        category: Category,
        on_toggle: Callable[[int], None],
        on_edit: Callable[[int], None],
        on_delete: Callable[[int], None],
        **kwargs
    ):
        """
        初始化计划卡片
        Args:
            parent: 父容器
            plan: 计划数据
            category: 分类数据
            on_toggle: 切换完成状态回调
            on_edit: 编辑回调
            on_delete: 删除回调
        """
        super().__init__(parent, bg=config.COLORS['bg_card'], cursor='hand2', **kwargs)
        self.plan = plan
        self.category = category
        self.on_toggle = on_toggle
        self.on_edit = on_edit
        self.on_delete = on_delete

        # 根据状态设置样式
        self._is_completed = plan.status == 'completed'
        self._is_cancelled = plan.status == 'cancelled'

        self._build_ui()
        self._bind_events()

    def _build_ui(self):
        """构建卡片界面"""
        # 卡片主容器（带边框效果）
        card_bg = config.COLORS['bg_card']
        text_fg = config.COLORS['text_primary']
        text_fg_secondary = config.COLORS['text_secondary']

        if self._is_completed:
            card_bg = config.COLORS['completed_bg']
            text_fg = config.COLORS['completed_text']
            text_fg_secondary = config.COLORS['completed_text']
        elif self._is_cancelled:
            card_bg = config.COLORS['completed_bg']
            text_fg = config.COLORS['text_muted']

        self.configure(bg=card_bg)

        # 左侧边框色条（分类颜色）
        color_bar = tk.Frame(self, width=4, bg=self.category.color)
        color_bar.pack(side='left', fill='y')

        # 内容区
        content = tk.Frame(self, bg=card_bg)
        content.pack(side='left', fill='both', expand=True, padx=10, pady=8)

        # ---- 第一行：完成复选框 + 标题 + 优先级 + 分类标签 ----
        row1 = tk.Frame(content, bg=card_bg)
        row1.pack(fill='x')

        # 完成复选框
        self.check_var = tk.BooleanVar(value=self._is_completed)
        check_btn = tk.Checkbutton(
            row1,
            variable=self.check_var,
            command=self._on_toggle_click,
            bg=card_bg,
            activebackground=card_bg,
            selectcolor=card_bg,
            cursor='hand2',
        )
        check_btn.pack(side='left')

        # 标题文字
        title_text = self.plan.title
        title_font = config.FONT_BODY_BOLD
        if self._is_completed:
            title_font = (config.FONT_FAMILY, 10, 'overstrike')

        self.title_label = tk.Label(
            row1,
            text=title_text,
            font=title_font,
            fg=text_fg,
            bg=card_bg,
            anchor='w',
        )
        self.title_label.pack(side='left', padx=(0, 10))

        # 难度标签
        diff_label_text = f'难度:{config.PRIORITY_LABELS.get(self.plan.priority, "?")}'
        diff_label = tk.Label(
            row1, text=diff_label_text, font=config.FONT_SMALL,
            fg=config.PRIORITY_COLORS.get(self.plan.priority, config.COLORS['text_muted']),
            bg=card_bg,
        )
        diff_label.pack(side='left', padx=(0, 8))

        # 分类标签
        cat_label = tk.Label(
            row1,
            text=f'[{self.category.name}]',
            font=config.FONT_SMALL,
            fg=self.category.color,
            bg=card_bg,
        )
        cat_label.pack(side='left')

        # ---- 第二行：时间 + 描述预览 + 操作按钮 ----
        row2 = tk.Frame(content, bg=card_bg)
        row2.pack(fill='x', pady=(2, 0))

        # 时间范围
        time_str = ''
        if self.plan.start_time:
            time_str = self.plan.start_time
            if self.plan.end_time:
                time_str += f' - {self.plan.end_time}'

        if time_str:
            time_label = tk.Label(
                row2,
                text=f'🕐 {time_str}',
                font=config.FONT_SMALL,
                fg=text_fg_secondary,
                bg=card_bg,
            )
            time_label.pack(side='left', padx=(0, 12))

        # 描述预览
        if self.plan.description:
            desc_preview = truncate_text(self.plan.description, 40)
            desc_label = tk.Label(
                row2,
                text=desc_preview,
                font=config.FONT_SMALL,
                fg=text_fg_secondary,
                bg=card_bg,
                anchor='w',
            )
            desc_label.pack(side='left', fill='x', expand=True)
        else:
            spacer = tk.Frame(row2, bg=card_bg)
            spacer.pack(side='left', fill='x', expand=True)

        # 操作按钮（靠右）
        btn_frame = tk.Frame(row2, bg=card_bg)
        btn_frame.pack(side='right')

        edit_btn = tk.Label(
            btn_frame,
            text='编辑',
            font=config.FONT_SMALL,
            fg=config.COLORS['accent'],
            bg=card_bg,
            cursor='hand2',
            padx=4,
        )
        edit_btn.pack(side='left')

        del_btn = tk.Label(
            btn_frame,
            text='删除',
            font=config.FONT_SMALL,
            fg=config.COLORS['danger'],
            bg=card_bg,
            cursor='hand2',
            padx=4,
        )
        del_btn.pack(side='left')

        # 绑定编辑和删除事件
        edit_btn.bind('<Button-1>', lambda e: self.on_edit(self.plan.id))
        del_btn.bind('<Button-1>', lambda e: self._on_delete_click())

    def _bind_events(self):
        """绑定鼠标事件"""
        # 双击卡片打开编辑
        self.bind('<Double-Button-1>', lambda e: self.on_edit(self.plan.id))
        # 鼠标悬停效果
        self.bind('<Enter>', self._on_enter)
        self.bind('<Leave>', self._on_leave)

    def _on_enter(self, event):
        """鼠标进入时高亮"""
        if not self._is_completed and not self._is_cancelled:
            self.configure(bg=config.COLORS['bg_card_hover'])
            for child in self.winfo_children():
                self._set_bg_recursive(child, config.COLORS['bg_card_hover'])

    def _on_leave(self, event):
        """鼠标离开时恢复"""
        if not self._is_completed and not self._is_cancelled:
            self.configure(bg=config.COLORS['bg_card'])
            for child in self.winfo_children():
                self._set_bg_recursive(child, config.COLORS['bg_card'])
        elif self._is_completed:
            self.configure(bg=config.COLORS['completed_bg'])
            for child in self.winfo_children():
                self._set_bg_recursive(child, config.COLORS['completed_bg'])

    def _set_bg_recursive(self, widget, color):
        """递归设置子组件的背景色（跳过颜色条和复选框等特殊组件）"""
        try:
            if isinstance(widget, tk.Frame) and widget.winfo_width() <= 4:
                return  # 跳过颜色条
            widget.configure(bg=color)
        except Exception:
            pass

    def _on_toggle_click(self):
        """切换完成状态"""
        self.on_toggle(self.plan.id)

    def _on_delete_click(self):
        """删除确认"""
        if ask_yes_no('确认删除', f'确定要删除计划"{self.plan.title}"吗？\n此操作不可恢复。'):
            self.on_delete(self.plan.id)

    def update_plan(self, plan: Plan, category: Category):
        """更新卡片绑定的数据（不重新创建组件，用于优化刷新性能）"""
        self.plan = plan
        self.category = category
        # 简化处理：销毁重建
        for widget in self.winfo_children():
            widget.destroy()
        self._is_completed = plan.status == 'completed'
        self._is_cancelled = plan.status == 'cancelled'
        self._build_ui()
        self._bind_events()
