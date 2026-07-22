"""
日计划视图
展示和管理单日内的所有计划事项，是应用程序最核心的视图
支持日期导航、分类/状态筛选、添加/编辑/删除计划、从模板创建、归档
"""
import tkinter as tk
from tkinter import ttk
from typing import Callable, Optional, List
from datetime import date, timedelta

import config
from models import Plan, Category, Template
from database import DatabaseManager
from utils.helpers import format_date, today_str, is_today, add_watermark
from widgets.plan_card import PlanCard
from widgets.plan_editor import PlanEditor
from widgets.modern_dialog import show_info, ask_yes_no


class DayView(tk.Frame):
    """日计划视图"""

    def __init__(
        self,
        parent,
        db: DatabaseManager,
        on_data_changed: Optional[Callable] = None,
        **kwargs
    ):
        """
        初始化日视图
        Args:
            parent: 父容器
            db: 数据库管理器
            on_data_changed: 数据变更回调
        """
        super().__init__(parent, bg=config.COLORS['bg_primary'], **kwargs)
        self.db = db
        self.on_data_changed = on_data_changed
        self.current_date = today_str()  # 当前显示日期
        self.categories = db.get_all_categories()  # 分类列表缓存

        # 筛选状态
        self.filter_category_id = 0  # 0 表示全部
        self.filter_status = 'all'   # 'all', 'pending', 'completed'

        # 存储 PlanCard 引用以便刷新
        self.plan_cards: List[PlanCard] = []

        self._build_ui()
        # 水印画在Canvas上（Canvas创建完成后添加）
        add_watermark(self, self.canvas)

    def _build_ui(self):
        """构建日视图界面"""
        # ---- 顶部导航栏 ----
        nav_frame = tk.Frame(self, bg='white', padx=15, pady=10)
        nav_frame.pack(fill='x')
        nav_frame.pack_propagate(False)
        nav_frame.configure(height=55)

        # 前一天按钮
        prev_btn = tk.Button(
            nav_frame,
            text='◀',
            font=config.FONT_BODY,
            fg=config.COLORS['accent'],
            bg='white',
            relief='flat',
            cursor='hand2',
            command=self._on_prev_day,
        )
        prev_btn.pack(side='left')

        # 日期标题
        self.date_title = tk.Label(
            nav_frame,
            text=format_date(self.current_date),
            font=config.FONT_HEADING,
            fg=config.COLORS['text_primary'],
            bg='white',
            padx=15,
        )
        self.date_title.pack(side='left')

        # 后一天按钮
        next_btn = tk.Button(
            nav_frame,
            text='▶',
            font=config.FONT_BODY,
            fg=config.COLORS['accent'],
            bg='white',
            relief='flat',
            cursor='hand2',
            command=self._on_next_day,
        )
        next_btn.pack(side='left')

        # 今天按钮
        today_btn = tk.Button(
            nav_frame,
            text='今天',
            font=config.FONT_SMALL,
            fg='white',
            bg=config.COLORS['accent'],
            relief='flat',
            padx=12,
            pady=3,
            cursor='hand2',
            command=self.goto_today,
        )
        today_btn.pack(side='left', padx=(15, 10))

        # 日期选择器（使用 tkcalendar）
        try:
            from tkcalendar import DateEntry
            self.date_picker = DateEntry(
                nav_frame,
                width=12,
                date_pattern='yyyy-mm-dd',
                font=config.FONT_SMALL,
                background=config.COLORS['accent'],
                foreground='white',
                borderwidth=1,
            )
            self.date_picker.set_date(date.today())
            self.date_picker.pack(side='left', padx=(5, 0))
            self.date_picker.bind('<<DateEntrySelected>>', self._on_date_picker_selected)
        except ImportError:
            self.date_picker = None

        # 右侧筛选区
        filter_frame = tk.Frame(nav_frame, bg='white')
        filter_frame.pack(side='right')

        # 状态筛选
        tk.Label(
            filter_frame, text='状态:', font=config.FONT_SMALL,
            fg=config.COLORS['text_secondary'], bg='white'
        ).pack(side='left', padx=(0, 4))

        self.status_filter_var = tk.StringVar(value='全部')
        status_values = ['全部', '待完成', '已完成', '已取消']
        status_combo = ttk.Combobox(
            filter_frame,
            textvariable=self.status_filter_var,
            values=status_values,
            state='readonly',
            width=8,
            font=config.FONT_SMALL,
        )
        status_combo.pack(side='left', padx=(0, 15))
        status_combo.bind('<<ComboboxSelected>>', self._on_filter_change)

        # 分类筛选
        tk.Label(
            filter_frame, text='分类:', font=config.FONT_SMALL,
            fg=config.COLORS['text_secondary'], bg='white'
        ).pack(side='left', padx=(0, 4))

        cat_names = ['全部'] + [c.name for c in self.categories]
        self.cat_filter_var = tk.StringVar(value='全部')
        self.cat_combo = ttk.Combobox(
            filter_frame,
            textvariable=self.cat_filter_var,
            values=cat_names,
            state='readonly',
            width=8,
            font=config.FONT_SMALL,
        )
        self.cat_combo.pack(side='left')
        self.cat_combo.bind('<<ComboboxSelected>>', self._on_filter_change)

        # ---- 计划列表区域（Canvas + Scrollbar + Frame 实现可滚动） ----
        list_container = tk.Frame(self, bg=config.COLORS['bg_primary'])
        list_container.pack(fill='both', expand=True)

        # Canvas 用于滚动
        self.canvas = tk.Canvas(
            list_container,
            bg=config.COLORS['bg_primary'],
            highlightthickness=0,
        )
        self.canvas.pack(side='left', fill='both', expand=True)

        # 滚动条
        scrollbar = ttk.Scrollbar(
            list_container,
            orient='vertical',
            command=self.canvas.yview,
        )
        scrollbar.pack(side='right', fill='y')

        self.canvas.configure(yscrollcommand=scrollbar.set)

        # 计划列表内部 Frame
        self.list_frame = tk.Frame(self.canvas, bg=config.COLORS['bg_primary'])
        self.canvas_window = self.canvas.create_window(
            (0, 0), window=self.list_frame, anchor='nw', tags='list_frame'
        )

        # 绑定事件：内部 Frame 大小变化时更新 Canvas scrollregion
        self.list_frame.bind('<Configure>', self._on_list_frame_configure)
        self.canvas.bind('<Configure>', self._on_canvas_configure)

        # 鼠标滚轮支持
        self.canvas.bind('<MouseWheel>', self._on_mousewheel)

        # ---- 底部操作栏 ----
        action_frame = tk.Frame(self, bg='white', padx=15, pady=10)
        action_frame.pack(fill='x')

        # 添加新计划按钮
        add_btn = tk.Button(
            action_frame,
            text='＋ 添加新计划',
            font=config.FONT_BODY_BOLD,
            fg='white',
            bg=config.COLORS['accent'],
            relief='flat',
            padx=16,
            pady=5,
            cursor='hand2',
            command=self.on_add_plan,
        )
        add_btn.pack(side='left')

        # 从模板创建按钮
        from_template_btn = tk.Button(
            action_frame,
            text='从模板创建 ▾',
            font=config.FONT_BODY,
            fg=config.COLORS['accent'],
            bg='white',
            relief='solid',
            borderwidth=1,
            padx=12,
            pady=5,
            cursor='hand2',
            command=self._on_add_from_template,
        )
        from_template_btn.pack(side='left', padx=(10, 0))

        # 归档本月已完成按钮（靠右）
        archive_btn = tk.Button(
            action_frame,
            text='归档本月已完成',
            font=config.FONT_SMALL,
            fg=config.COLORS['text_secondary'],
            bg='white',
            relief='solid',
            borderwidth=1,
            padx=10,
            pady=5,
            cursor='hand2',
            command=self._on_archive_completed,
        )
        archive_btn.pack(side='right')

    def _on_list_frame_configure(self, event):
        """列表 Frame 大小变化时更新 Canvas scrollregion"""
        self.canvas.configure(scrollregion=self.canvas.bbox('all'))

    def _on_canvas_configure(self, event):
        """Canvas 宽度变化时调整内部 Frame 宽度"""
        self.canvas.itemconfig(self.canvas_window, width=event.width)

    def _on_mousewheel(self, event):
        """鼠标滚轮滚动"""
        self.canvas.yview_scroll(int(-1 * (event.delta / 120)), 'units')

    def _on_date_picker_selected(self, event=None):
        """日期选择器选中日期"""
        try:
            selected = self.date_picker.get_date()
            self.load_date(selected.strftime('%Y-%m-%d'))
        except Exception:
            pass

    def _on_prev_day(self):
        """前一天"""
        dt = self._parse_date(self.current_date)
        new_date = dt - timedelta(days=1)
        self.load_date(new_date.strftime('%Y-%m-%d'))

    def _on_next_day(self):
        """后一天"""
        dt = self._parse_date(self.current_date)
        new_date = dt + timedelta(days=1)
        self.load_date(new_date.strftime('%Y-%m-%d'))

    def _parse_date(self, date_str: str) -> date:
        """解析日期字符串"""
        return date.fromisoformat(date_str)

    def _on_filter_change(self, event=None):
        """筛选条件变化"""
        # 解析状态筛选
        status_map = {'全部': 'all', '待完成': 'pending', '已完成': 'completed', '已取消': 'cancelled'}
        self.filter_status = status_map.get(self.status_filter_var.get(), 'all')

        # 解析分类筛选
        cat_name = self.cat_filter_var.get()
        if cat_name == '全部':
            self.filter_category_id = 0
        else:
            for cat in self.categories:
                if cat.name == cat_name:
                    self.filter_category_id = cat.id
                    break
            else:
                self.filter_category_id = 0

        self.refresh()

    def _on_add_from_template(self):
        """从模板创建计划"""
        templates = self.db.get_all_templates()
        if not templates:
            show_info('提示', '暂无可用模板，请先在模板管理中创建模板。')
            return

        # 弹出模板选择菜单
        menu = tk.Menu(self, tearoff=0)
        for t in templates:
            menu.add_command(
                label=f'{t.name} (使用{t.use_count}次)',
                command=lambda tmpl=t: self._create_from_template(tmpl),
            )
        # 在按钮下方弹出菜单
        try:
            menu.tk_popup(
                self.winfo_pointerx(),
                self.winfo_pointery(),
            )
        finally:
            menu.grab_release()

    def _create_from_template(self, template: Template):
        """使用模板创建计划"""
        PlanEditor(
            self,
            self.db,
            template=template,
            preset_date=self.current_date,
            callback=lambda: self._notify_change(),
        )

    def _on_archive_completed(self):
        """归档本月已完成计划"""
        dt = self._parse_date(self.current_date)
        count = self.db.archive_completed_in_month(dt.year, dt.month)
        if count > 0:
            show_info('归档成功', f'已将 {count} 个已完成计划归档到 {dt.year}年{dt.month}月。')
        else:
            show_info('提示', f'{dt.year}年{dt.month}月没有可归档的已完成计划。')
        self._notify_change()

    # ============================================================
    # 公共接口
    # ============================================================

    def load_date(self, date_str: str):
        """加载指定日期的计划列表"""
        self.current_date = date_str
        self.date_title.configure(text=format_date(date_str))

        # 同步日期选择器
        if self.date_picker:
            try:
                from tkcalendar import DateEntry
                if isinstance(self.date_picker, DateEntry):
                    self.date_picker.set_date(date_str)
            except Exception:
                pass

        self.refresh()

    def goto_today(self):
        """跳转到今天"""
        self.load_date(today_str())

    def on_add_plan(self):
        """打开新建计划对话框"""
        PlanEditor(
            self,
            self.db,
            preset_date=self.current_date,
            callback=lambda: self._notify_change(),
        )

    def on_edit_plan(self, plan_id: int):
        """编辑指定计划"""
        plan = self.db.get_plan_by_id(plan_id)
        if plan:
            PlanEditor(
                self,
                self.db,
                plan=plan,
                callback=lambda: self._notify_change(),
            )

    def on_delete_plan(self, plan_id: int):
        """删除指定计划"""
        self.db.delete_plan(plan_id)
        self._notify_change()

    def on_toggle_complete(self, plan_id: int):
        """切换计划的完成状态"""
        self.db.toggle_completed(plan_id)
        self._notify_change()

    def on_show(self):
        """视图显示时的回调"""
        self.categories = self.db.get_all_categories()
        self.refresh()

    def refresh(self):
        """刷新计划列表显示"""
        # 清空列表
        for widget in self.list_frame.winfo_children():
            widget.destroy()
        self.plan_cards.clear()

        # 加载分类缓存
        self.categories = self.db.get_all_categories()
        cat_map = {c.id: c for c in self.categories}

        # 从数据库获取计划
        plans = self.db.get_plans_by_date(self.current_date)

        # 应用筛选
        filtered_plans = plans
        if self.filter_category_id > 0:
            filtered_plans = [p for p in filtered_plans if p.category_id == self.filter_category_id]
        if self.filter_status != 'all':
            filtered_plans = [p for p in filtered_plans if p.status == self.filter_status]

        # 分组：待完成和已完成
        pending_plans = [p for p in filtered_plans if p.status == 'pending']
        completed_plans = [p for p in filtered_plans if p.status == 'completed']
        cancelled_plans = [p for p in filtered_plans if p.status == 'cancelled']

        # 如果没有计划，显示空状态提示
        if not filtered_plans:
            self._show_empty_state()
            return

        padding_frame = tk.Frame(self.list_frame, bg=config.COLORS['bg_primary'])
        padding_frame.pack(fill='x', padx=20, pady=(15, 0))

        # ---- 待完成区域 ----
        if pending_plans:
            self._add_section_header('待完成', len(pending_plans), config.COLORS['warning'])
            for plan in pending_plans:
                cat = cat_map.get(plan.category_id, self.categories[0] if self.categories else Category(name='未知'))
                card = PlanCard(
                    self.list_frame,
                    plan,
                    cat,
                    on_toggle=self.on_toggle_complete,
                    on_edit=self.on_edit_plan,
                    on_delete=self.on_delete_plan,
                )
                card.pack(fill='x', padx=20, pady=3)
                self.plan_cards.append(card)

        # ---- 已完成区域 ----
        if completed_plans:
            self._add_section_header('已完成', len(completed_plans), config.COLORS['success'])
            for plan in completed_plans:
                cat = cat_map.get(plan.category_id, self.categories[0] if self.categories else Category(name='未知'))
                card = PlanCard(
                    self.list_frame,
                    plan,
                    cat,
                    on_toggle=self.on_toggle_complete,
                    on_edit=self.on_edit_plan,
                    on_delete=self.on_delete_plan,
                )
                card.pack(fill='x', padx=20, pady=3)
                self.plan_cards.append(card)

        # ---- 已取消区域 ----
        if cancelled_plans:
            self._add_section_header('已取消', len(cancelled_plans), config.COLORS['text_muted'])
            for plan in cancelled_plans:
                cat = cat_map.get(plan.category_id, self.categories[0] if self.categories else Category(name='未知'))
                card = PlanCard(
                    self.list_frame,
                    plan,
                    cat,
                    on_toggle=self.on_toggle_complete,
                    on_edit=self.on_edit_plan,
                    on_delete=self.on_delete_plan,
                )
                card.pack(fill='x', padx=20, pady=3)
                self.plan_cards.append(card)

        # 底部空白
        bottom_spacer = tk.Frame(self.list_frame, height=20, bg=config.COLORS['bg_primary'])
        bottom_spacer.pack(fill='x')

    def _add_section_header(self, title: str, count: int, color: str):
        """添加分区标题"""
        header_frame = tk.Frame(self.list_frame, bg=config.COLORS['bg_primary'])
        header_frame.pack(fill='x', padx=20, pady=(12, 4))

        # 左侧色条
        bar = tk.Frame(header_frame, width=3, height=18, bg=color)
        bar.pack(side='left', padx=(0, 8))

        # 标题文字
        tk.Label(
            header_frame,
            text=f'{title} ({count})',
            font=config.FONT_SMALL,
            fg=color,
            bg=config.COLORS['bg_primary'],
        ).pack(side='left')

    def _show_empty_state(self):
        """显示空状态提示"""
        empty_frame = tk.Frame(self.list_frame, bg=config.COLORS['bg_primary'])
        empty_frame.pack(fill='both', expand=True, pady=80)

        tk.Label(
            empty_frame,
            text='📭',
            font=(config.FONT_FAMILY, 48),
            fg=config.COLORS['text_muted'],
            bg=config.COLORS['bg_primary'],
        ).pack()

        tk.Label(
            empty_frame,
            text='这一天还没有计划',
            font=config.FONT_BODY,
            fg=config.COLORS['text_secondary'],
            bg=config.COLORS['bg_primary'],
        ).pack(pady=(8, 4))

        tk.Label(
            empty_frame,
            text='点击下方"添加新计划"开始记录',
            font=config.FONT_SMALL,
            fg=config.COLORS['text_muted'],
            bg=config.COLORS['bg_primary'],
        ).pack()

        # 添加新计划按钮
        add_btn = tk.Button(
            empty_frame,
            text='＋ 添加新计划',
            font=config.FONT_BODY_BOLD,
            fg='white',
            bg=config.COLORS['accent'],
            relief='flat',
            padx=16,
            pady=6,
            cursor='hand2',
            command=self.on_add_plan,
        )
        add_btn.pack(pady=(16, 0))

    def _notify_change(self):
        """通知数据变更"""
        self.refresh()
        if self.on_data_changed:
            self.on_data_changed()
