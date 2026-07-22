"""
月计划视图
使用 tkcalendar 日历组件 + 右侧计划列表面板
有计划的日期用分类颜色标记圆点
"""
import tkinter as tk
from tkinter import ttk
from typing import Callable, Optional, List, Dict
from datetime import date, datetime

import config
from models import Plan, Category
from database import DatabaseManager
from utils.helpers import (
    get_current_month, get_month_navigator_text, format_date_short,
    truncate_text, priority_to_stars, add_watermark,
)


class MonthView(tk.Frame):
    """月计划视图：左侧日历 + 右侧选中日计划列表"""

    def __init__(
        self,
        parent,
        db: DatabaseManager,
        on_day_selected: Optional[Callable[[str], None]] = None,
        **kwargs
    ):
        """
        初始化月视图
        Args:
            parent: 父容器
            db: 数据库管理器
            on_day_selected: 日期选中回调（可选）
        """
        super().__init__(parent, bg=config.COLORS['bg_primary'], **kwargs)
        self.db = db
        self.on_day_selected = on_day_selected

        # 当前月份
        self.current_year, self.current_month = get_current_month()
        self.selected_date: Optional[str] = None  # 当前选中的日期

        # 月份中有计划的日期集合
        self.dates_with_plans: set = set()

        # 分类颜色缓存
        self.categories: List[Category] = []

        self._build_ui()
        add_watermark(self, self.detail_canvas)

    def _build_ui(self):
        """构建月视图界面"""
        # ---- 顶部导航栏 ----
        nav_frame = tk.Frame(self, bg='white', padx=15, pady=10)
        nav_frame.pack(fill='x')
        nav_frame.pack_propagate(False)
        nav_frame.configure(height=55)

        prev_btn = tk.Button(
            nav_frame,
            text='◀ 上月',
            font=config.FONT_BODY,
            fg=config.COLORS['accent'],
            bg='white',
            relief='flat',
            cursor='hand2',
            command=self._on_prev_month,
        )
        prev_btn.pack(side='left')

        self.month_title = tk.Label(
            nav_frame,
            text='',
            font=config.FONT_HEADING,
            fg=config.COLORS['text_primary'],
            bg='white',
            padx=15,
        )
        self.month_title.pack(side='left')

        next_btn = tk.Button(
            nav_frame,
            text='下月 ▶',
            font=config.FONT_BODY,
            fg=config.COLORS['accent'],
            bg='white',
            relief='flat',
            cursor='hand2',
            command=self._on_next_month,
        )
        next_btn.pack(side='left')

        # 本月按钮
        today_btn = tk.Button(
            nav_frame,
            text='本月',
            font=config.FONT_SMALL,
            fg='white',
            bg=config.COLORS['accent'],
            relief='flat',
            padx=12,
            pady=3,
            cursor='hand2',
            command=self._goto_current_month,
        )
        today_btn.pack(side='left', padx=(15, 0))

        # ---- 主体区域（左右分栏） ----
        main_frame = tk.Frame(self, bg=config.COLORS['bg_primary'])
        main_frame.pack(fill='both', expand=True, padx=15, pady=10)

        # 左侧日历
        self._build_calendar_panel(main_frame)

        # 右侧计划列表
        self._build_detail_panel(main_frame)

    def _build_calendar_panel(self, parent: tk.Frame):
        """构建左侧日历面板"""
        calendar_frame = tk.Frame(parent, bg='white', padx=10, pady=10)
        calendar_frame.pack(side='left', fill='both', padx=(0, 10))

        try:
            from tkcalendar import Calendar

            self.cal = Calendar(
                calendar_frame,
                selectmode='day',
                date_pattern='yyyy-mm-dd',
                font=config.FONT_BODY,
                normalforeground=config.COLORS['text_primary'],
                weekendforeground=config.COLORS['danger'],
                othermonthforeground=config.COLORS['text_muted'],
                background=config.COLORS['accent'],
                foreground='white',
                selectbackground=config.COLORS['accent'],
                selectforeground='white',
                headersbackground='white',
                headersforeground=config.COLORS['text_secondary'],
                bordercolor=config.COLORS['border'],
                showweeknumbers=False,
                firstweekday='sunday',  # 周日为第一天（对中国用户更自然）
            )
            self.cal.pack(fill='both', expand=True)

            # 绑定日期选择事件
            self.cal.bind('<<CalendarSelected>>', self._on_calendar_select)
            self.cal.bind('<<CalendarMonthChanged>>', self._on_calendar_month_changed)

        except ImportError:
            # 降级方案：使用简单的日期标签
            self.cal = None
            tk.Label(
                calendar_frame,
                text='请安装 tkcalendar:\npip install tkcalendar',
                font=config.FONT_BODY,
                fg=config.COLORS['text_muted'],
                bg='white',
            ).pack(expand=True)

    def _build_detail_panel(self, parent: tk.Frame):
        """构建右侧计划列表面板"""
        detail_frame = tk.Frame(parent, bg='white', padx=15, pady=15, width=400)
        detail_frame.pack(side='right', fill='both', expand=True)
        detail_frame.pack_propagate(False)

        # 选中日期标题
        self.selected_date_label = tk.Label(
            detail_frame,
            text='请选择日期',
            font=config.FONT_HEADING,
            fg=config.COLORS['text_primary'],
            bg='white',
            anchor='w',
        )
        self.selected_date_label.pack(fill='x', pady=(0, 10))

        # 分隔线
        sep = tk.Frame(detail_frame, height=1, bg=config.COLORS['border'])
        sep.pack(fill='x', pady=(0, 10))

        # Canvas + Scroll 实现可滚动列表
        canvas_frame = tk.Frame(detail_frame, bg='white')
        canvas_frame.pack(fill='both', expand=True)

        self.detail_canvas = tk.Canvas(
            canvas_frame,
            bg='white',
            highlightthickness=0,
        )
        self.detail_canvas.pack(side='left', fill='both', expand=True)

        detail_scrollbar = ttk.Scrollbar(
            canvas_frame,
            orient='vertical',
            command=self.detail_canvas.yview,
        )
        detail_scrollbar.pack(side='right', fill='y')
        self.detail_canvas.configure(yscrollcommand=detail_scrollbar.set)

        self.detail_list_frame = tk.Frame(self.detail_canvas, bg='white')
        self.detail_window = self.detail_canvas.create_window(
            (0, 0), window=self.detail_list_frame, anchor='nw', tags='detail_list'
        )

        self.detail_list_frame.bind('<Configure>', self._on_detail_list_configure)
        self.detail_canvas.bind('<Configure>', self._on_detail_canvas_configure)
        self.detail_canvas.bind('<MouseWheel>', lambda e: self.detail_canvas.yview_scroll(int(-1*(e.delta/120)), 'units'))

    def _on_detail_list_configure(self, event):
        self.detail_canvas.configure(scrollregion=self.detail_canvas.bbox('all'))

    def _on_detail_canvas_configure(self, event):
        self.detail_canvas.itemconfig(self.detail_window, width=event.width)

    def _on_prev_month(self):
        """上个月"""
        if self.current_month == 1:
            self.current_year -= 1
            self.current_month = 12
        else:
            self.current_month -= 1
        self.refresh()

    def _on_next_month(self):
        """下个月"""
        if self.current_month == 12:
            self.current_year += 1
            self.current_month = 1
        else:
            self.current_month += 1
        self.refresh()

    def _goto_current_month(self):
        """跳转到本月"""
        self.current_year, self.current_month = get_current_month()
        self.refresh()

    def _on_calendar_select(self, event=None):
        """日历日期选中"""
        if self.cal:
            self.selected_date = self.cal.get_date().strftime('%Y-%m-%d')
            self._update_detail_panel()
            if self.on_day_selected:
                self.on_day_selected(self.selected_date)

    def _on_calendar_month_changed(self, event=None):
        """日历月份切换（用户点击了日历自带的翻页按钮）"""
        if self.cal:
            cal_date = self.cal.get_date()
            self.current_year = cal_date.year
            self.current_month = cal_date.month
            self.month_title.configure(text=get_month_navigator_text(self.current_year, self.current_month))
            self._load_month_dates()
            self._refresh_calendar_tags()

    def on_show(self):
        """视图显示时的回调"""
        self.refresh()

    def refresh(self):
        """刷新月视图"""
        self.categories = self.db.get_all_categories()
        self.month_title.configure(text=get_month_navigator_text(self.current_year, self.current_month))

        # 更新日历显示
        if self.cal:
            # 设置日历到当前年月
            try:
                self.cal.set_date(date(self.current_year, self.current_month, 1))
            except Exception:
                pass

        # 加载有计划的日期
        self._load_month_dates()
        self._refresh_calendar_tags()

        # 更新详情面板
        self._update_detail_panel()

    def _load_month_dates(self):
        """加载当前月份中有计划的日期"""
        dates = self.db.get_month_dates_with_plans(self.current_year, self.current_month)
        self.dates_with_plans = set(dates)

    def _refresh_calendar_tags(self):
        """刷新日历中的标记点（有计划的日期标色点）"""
        if not self.cal:
            return

        # 清除之前的标记
        self.cal.calevent_remove('all')

        # 为有计划的日期添加标记
        for date_str in self.dates_with_plans:
            try:
                dt = datetime.strptime(date_str, '%Y-%m-%d').date()
                # 获取该日期下优先级最高的分类颜色
                plans = self.db.get_plans_by_date(date_str)
                if plans:
                    # 使用第一个未完成计划的分类颜色
                    color = config.COLORS['accent']
                    for plan in plans:
                        if plan.status == 'pending':
                            for cat in self.categories:
                                if cat.id == plan.category_id:
                                    color = cat.color
                                    break
                            break
                    self.cal.calevent_create(dt, '', tags=[color, 'has_plan'])
            except Exception:
                pass

        # 配置标记的显示样式
        for cat in self.categories:
            try:
                self.cal.tag_config(cat.color, background=cat.color, foreground='white')
            except Exception:
                pass
        try:
            self.cal.tag_config('has_plan', background=config.COLORS['accent'])
        except Exception:
            pass

        # 标记今天
        today = date.today()
        try:
            self.cal.calevent_create(today, '今天', tags=['today'])
            self.cal.tag_config('today', background=config.COLORS['warning'], foreground='white')
        except Exception:
            pass

    def _update_detail_panel(self):
        """更新右侧详情面板"""
        # 清空列表
        for widget in self.detail_list_frame.winfo_children():
            widget.destroy()

        if not self.selected_date:
            self.selected_date_label.configure(text='请选择日期')
            # 显示提示
            tk.Label(
                self.detail_list_frame,
                text='👈 点击左侧日历\n查看该日计划',
                font=config.FONT_BODY,
                fg=config.COLORS['text_muted'],
                bg='white',
                justify='center',
            ).pack(expand=True, pady=40)
            return

        # 更新标题
        self.selected_date_label.configure(text=format_date_short(self.selected_date))

        # 获取该日计划
        plans = self.db.get_plans_by_date(self.selected_date)
        cat_map = {c.id: c for c in self.categories}

        if not plans:
            tk.Label(
                self.detail_list_frame,
                text='该日无计划',
                font=config.FONT_BODY,
                fg=config.COLORS['text_muted'],
                bg='white',
            ).pack(pady=20)
            return

        # 显示计划列表
        for plan in plans:
            cat = cat_map.get(plan.category_id, Category(name='?', color='#CCC'))
            self._add_plan_item(plan, cat)

    def _add_plan_item(self, plan: Plan, category: Category):
        """在详情面板中添加一个计划条目"""
        is_completed = plan.status == 'completed'

        item_frame = tk.Frame(self.detail_list_frame, bg='white')
        item_frame.pack(fill='x', pady=2)

        # 分类颜色条
        bar = tk.Frame(item_frame, width=3, height=24, bg=category.color)
        bar.pack(side='left', fill='y', padx=(0, 8))

        # 完成状态标记
        status_mark = '✔' if is_completed else '○'
        status_color = config.COLORS['success'] if is_completed else config.COLORS['text_muted']
        tk.Label(
            item_frame,
            text=status_mark,
            font=config.FONT_BODY,
            fg=status_color,
            bg='white',
        ).pack(side='left', padx=(0, 6))

        # 标题
        title_fg = config.COLORS['completed_text'] if is_completed else config.COLORS['text_primary']
        title_label = tk.Label(
            item_frame,
            text=truncate_text(plan.title, 25),
            font=config.FONT_BODY,
            fg=title_fg,
            bg='white',
            anchor='w',
        )
        title_label.pack(side='left')

        # 优先级（靠右）
        if plan.priority >= 3:
            tk.Label(
                item_frame,
                text='★' * plan.priority,
                font=(config.FONT_FAMILY, 7),
                fg=config.PRIORITY_COLORS.get(plan.priority),
                bg='white',
            ).pack(side='right')

        # 底部描边
        sep = tk.Frame(self.detail_list_frame, height=1, bg=config.COLORS['border_light'])
        sep.pack(fill='x')
