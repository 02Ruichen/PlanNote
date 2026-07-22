"""
主应用模块
创建主窗口，管理侧边栏和视图切换，持有全局数据库实例
"""
import tkinter as tk
from tkinter import ttk
from typing import Dict, Optional

import config
from database import DatabaseManager
from widgets.modern_dialog import ask_yes_no
from widgets.sidebar import Sidebar
from views.day_view import DayView
from views.week_view import WeekView
from views.month_view import MonthView
from views.archive_view import ArchiveView
from views.statistics_view import StatisticsView
from views.ai_assist_view import AIAssistView
from views.weekly_report_view import WeeklyReportView
from widgets.template_manager import TemplateManagerDialog


class App:
    """主应用程序类，管理窗口生命周期和视图切换"""

    def __init__(self):
        """初始化应用程序"""
        # 初始化数据库
        self.db = DatabaseManager()

        # 创建主窗口
        self.root = tk.Tk()
        self.root.title('PlanNote - 个人计划管理')
        self.root.geometry(f'{config.WINDOW_WIDTH}x{config.WINDOW_HEIGHT}')
        self.root.minsize(config.WINDOW_MIN_WIDTH, config.WINDOW_MIN_HEIGHT)
        self.root.configure(bg=config.COLORS['bg_primary'])

        # 设置窗口图标（如果有的话）
        try:
            self.root.iconbitmap(default='')
        except Exception:
            pass

        # ---- 配置 ttk 主题，现代化控件外观 ----
        self._setup_ttk_style()

        # 绑定窗口关闭事件
        self.root.protocol('WM_DELETE_WINDOW', self.on_closing)

        # 视图容器字典
        self.views: Dict[str, tk.Frame] = {}
        self.current_view: Optional[tk.Frame] = None

        # 构建界面
        self._build_ui()

        # 默认显示日视图
        self.switch_view('day')

        # 刷新侧边栏统计
        self.sidebar.refresh()

    def _build_ui(self):
        """构建主界面布局"""
        # ---- 主容器（水平排列侧边栏和内容区） ----
        main_container = tk.Frame(self.root, bg=config.COLORS['bg_primary'])
        main_container.pack(fill='both', expand=True)

        # ---- 左侧边栏 ----
        self.sidebar = Sidebar(main_container, on_navigate=self.switch_view, db=self.db)
        self.sidebar.pack(side='left', fill='y')

        # ---- 分隔线 ----
        separator = tk.Frame(main_container, width=1, bg=config.COLORS['border'])
        separator.pack(side='left', fill='y')

        # ---- 右侧内容区 ----
        self.content_frame = tk.Frame(main_container, bg=config.COLORS['bg_primary'])
        self.content_frame.pack(side='left', fill='both', expand=True)

        # ---- 水印（在内容区最底层，始终显示） ----
        self._create_watermark()

        # ---- 预创建所有视图（隐藏状态） ----
        self._create_views()

        # ---- 状态栏 ----
        self._build_statusbar()

    def _create_views(self):
        """预创建所有视图实例"""
        # 日视图
        self.views['day'] = DayView(
            self.content_frame, self.db, on_data_changed=self._on_data_changed
        )

        # 周视图
        self.views['week'] = WeekView(
            self.content_frame, self.db, on_day_click=self._on_week_day_click
        )

        # 月视图
        self.views['month'] = MonthView(
            self.content_frame, self.db, on_day_selected=self._on_month_day_selected
        )

        # 归档视图
        self.views['archive'] = ArchiveView(
            self.content_frame, self.db, on_data_changed=self._on_data_changed
        )

        # 统计视图
        self.views['statistics'] = StatisticsView(
            self.content_frame, self.db
        )

        # AI 助手视图
        self.views['ai_assist'] = AIAssistView(
            self.content_frame, self.db
        )

        # 一键生成周报视图
        self.views['weekly_report'] = WeeklyReportView(
            self.content_frame, self.db
        )

    def _build_statusbar(self):
        """构建底部状态栏"""
        self.statusbar = tk.Frame(
            self.root,
            height=25,
            bg=config.COLORS['bg_sidebar'],
        )
        self.statusbar.pack(side='bottom', fill='x')
        self.statusbar.pack_propagate(False)

        # 状态文字
        self.status_label = tk.Label(
            self.statusbar,
            text='就绪',
            font=config.FONT_SMALL,
            fg=config.COLORS['text_sidebar'],
            bg=config.COLORS['bg_sidebar'],
            anchor='w',
            padx=10,
        )
        self.status_label.pack(side='left')

        # 右侧日期
        from datetime import date
        self.status_date_label = tk.Label(
            self.statusbar,
            text=date.today().strftime('%Y-%m-%d'),
            font=config.FONT_SMALL,
            fg=config.COLORS['text_sidebar'],
            bg=config.COLORS['bg_sidebar'],
            padx=10,
        )
        self.status_date_label.pack(side='right')

    def switch_view(self, view_name: str):
        """
        切换右侧内容区视图
        Args:
            view_name: 视图名称 ('day', 'week', 'month', 'archive', 'statistics', 'templates')
        """
        # 模板管理是弹出对话框，不是切换视图
        if view_name == 'templates':
            self._open_template_manager()
            return

        # 隐藏当前视图
        if self.current_view:
            self.current_view.pack_forget()

        # 显示目标视图
        if view_name in self.views:
            view = self.views[view_name]
            view.pack(fill='both', expand=True)
            view.tkraise()

            # 触发视图的显示回调
            if hasattr(view, 'on_show'):
                view.on_show()

            self.current_view = view

        # 确保水印始终在视图后面
        self._refresh_watermark()

        # 更新侧边栏高亮
        self.sidebar.set_active(view_name)

        # 更新状态栏
        view_labels = {
            'day': '日计划视图',
            'week': '周计划视图',
            'month': '月计划视图',
            'archive': '归档查询',
            'statistics': '统计面板',
            'ai_assist': 'AI 规划助手',
            'weekly_report': '生成周报',
        }
        self.set_status(view_labels.get(view_name, ''))

    def _open_template_manager(self):
        """打开模板管理对话框"""
        TemplateManagerDialog(self.root, self.db, callback=self._on_data_changed)

    def _on_data_changed(self):
        """数据变更回调：刷新侧边栏和当前视图"""
        self.sidebar.refresh()
        if self.current_view and hasattr(self.current_view, 'refresh'):
            self.current_view.refresh()

    def _on_week_day_click(self, date_str: str):
        """周视图中某天被点击时，切换到日视图并定位到该日期"""
        self.switch_view('day')
        if 'day' in self.views:
            self.views['day'].load_date(date_str)

    def _on_month_day_selected(self, date_str: str):
        """月视图中某天被选中时，更新详情（由 month_view 内部处理）"""
        pass  # month_view 内部已有处理逻辑

    def set_status(self, text: str):
        """设置状态栏文字"""
        self.status_label.configure(text=text)

    def _setup_ttk_style(self):
        """配置 ttk 控件样式，使界面更现代"""
        style = ttk.Style()
        # 使用 clam 主题（扁平现代风格）
        try:
            style.theme_use('clam')
        except Exception:
            pass

        # 配色变量
        bg = config.COLORS['bg_primary']
        fg = config.COLORS['text_primary']
        accent = config.COLORS['accent']
        border = config.COLORS['border']

        # Combobox 样式
        style.configure('TCombobox',
            fieldbackground='white',
            background='white',
            foreground=fg,
            arrowcolor=accent,
            bordercolor=border,
            lightcolor='white',
            darkcolor=border,
            selectbackground=config.COLORS['accent_light'],
            selectforeground=fg,
        )
        style.map('TCombobox',
            fieldbackground=[('readonly', 'white')],
            background=[('active', accent), ('!active', 'white')],
        )

        # Scrollbar 样式
        style.configure('TScrollbar',
            background=bg,
            troughcolor=bg,
            bordercolor=bg,
            arrowcolor=accent,
        )

    def _create_watermark(self):
        """在内容区底层创建水印"""
        self.watermark = tk.Label(
            self.content_frame,
            text=config.WATERMARK_TEXT,
            font=(config.FONT_FAMILY, config.WATERMARK_SIZE, 'italic'),
            fg=config.WATERMARK_COLOR,
            bg=config.COLORS['bg_primary'],
        )
        # 居中放置，防止被内容遮挡
        self.watermark.place(relx=0.5, rely=0.5, anchor='center')
        # 始终保持在最底层
        self.watermark.lower()

    def _refresh_watermark(self):
        """切换视图时确保水印在最底层"""
        if hasattr(self, 'watermark') and self.watermark.winfo_exists():
            self.watermark.lift()  # 先提上来
            self.watermark.lower()  # 再降到最底层

    def on_closing(self):
        """窗口关闭事件处理"""
        if ask_yes_no('退出确认', '确定要退出计划本吗？', parent=self.root):
            self.db.close()
            self.root.destroy()

    def run(self):
        """启动应用程序主循环"""
        # 设置键盘快捷键
        self._bind_shortcuts()
        self.root.mainloop()

    def _bind_shortcuts(self):
        """绑定键盘快捷键"""
        # Ctrl+N: 新建计划（在日视图中）
        self.root.bind('<Control-n>', lambda e: self._shortcut_new_plan())
        self.root.bind('<Control-N>', lambda e: self._shortcut_new_plan())

        # Ctrl+D: 跳转到今天
        self.root.bind('<Control-d>', lambda e: self._shortcut_goto_today())
        self.root.bind('<Control-D>', lambda e: self._shortcut_goto_today())

        # Ctrl+1~5: 切换视图
        self.root.bind('<Control-Key-1>', lambda e: self.switch_view('day'))
        self.root.bind('<Control-Key-2>', lambda e: self.switch_view('week'))
        self.root.bind('<Control-Key-3>', lambda e: self.switch_view('month'))
        self.root.bind('<Control-Key-4>', lambda e: self.switch_view('archive'))
        self.root.bind('<Control-Key-5>', lambda e: self.switch_view('statistics'))

    def _shortcut_new_plan(self):
        """快捷键：新建计划"""
        self.switch_view('day')
        if 'day' in self.views:
            self.views['day'].on_add_plan()

    def _shortcut_goto_today(self):
        """快捷键：跳转到今天"""
        self.switch_view('day')
        if 'day' in self.views:
            self.views['day'].goto_today()
