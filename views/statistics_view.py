"""
统计面板视图
使用 tkinter Canvas 自绘柱状图和趋势图，展示计划完成情况的统计
"""
import tkinter as tk
from tkinter import ttk
from typing import List, Dict, Optional
from datetime import date, timedelta

import config
from database import DatabaseManager
from utils.helpers import today_str, add_watermark


class StatisticsView(tk.Frame):
    """统计面板视图"""

    def __init__(self, parent, db: DatabaseManager, **kwargs):
        """
        初始化统计视图
        Args:
            parent: 父容器
            db: 数据库管理器
        """
        super().__init__(parent, bg=config.COLORS['bg_primary'], **kwargs)
        self.db = db

        # 统计范围（默认最近30天）
        self.range_days = 30
        self.start_date = (date.today() - timedelta(days=29)).strftime('%Y-%m-%d')
        self.end_date = today_str()

        self._build_ui()
        # 统计视图无Canvas，用Label方式
        add_watermark(self, canvas=None)

    def _build_ui(self):
        """构建统计界面"""
        # ---- 顶部栏 ----
        top_frame = tk.Frame(self, bg='white', padx=15, pady=10)
        top_frame.pack(fill='x')
        top_frame.pack_propagate(False)
        top_frame.configure(height=55)

        tk.Label(
            top_frame,
            text='📊 统计面板',
            font=config.FONT_HEADING,
            fg=config.COLORS['text_primary'],
            bg='white',
        ).pack(side='left')

        # 统计范围选择
        tk.Label(
            top_frame,
            text='统计范围:',
            font=config.FONT_SMALL,
            fg=config.COLORS['text_secondary'],
            bg='white',
        ).pack(side='left', padx=(30, 4))

        self.range_var = tk.StringVar(value='最近30天')
        range_combo = ttk.Combobox(
            top_frame,
            textvariable=self.range_var,
            values=['最近7天', '最近14天', '最近30天', '最近90天'],
            state='readonly',
            width=12,
            font=config.FONT_SMALL,
        )
        range_combo.pack(side='left')
        range_combo.bind('<<ComboboxSelected>>', self._on_range_change)

    def on_show(self):
        """视图显示时的回调"""
        self.refresh()

    def _on_range_change(self, event=None):
        """统计范围变化"""
        range_map = {
            '最近7天': 7,
            '最近14天': 14,
            '最近30天': 30,
            '最近90天': 90,
        }
        self.range_days = range_map.get(self.range_var.get(), 30)
        self.start_date = (date.today() - timedelta(days=self.range_days - 1)).strftime('%Y-%m-%d')
        self.refresh()

    def refresh(self):
        """刷新统计数据"""
        # 清除当前内容
        for widget in self.winfo_children():
            if widget not in [self.winfo_children()[0]]:  # 保留 top_frame
                widget.destroy()

        # 获取统计数据
        stats = self.db.get_completion_stats(self.start_date, self.end_date)
        cat_stats = self.db.get_stats_by_category(self.start_date, self.end_date)
        priority_dist = self.db.get_priority_distribution(self.start_date, self.end_date)
        daily_trend = self.db.get_daily_completed_trend(self.range_days)

        # 构建内容区
        content = tk.Frame(self, bg=config.COLORS['bg_primary'])
        content.pack(fill='both', expand=True, padx=15, pady=10)

        # ---- 概览卡片行 ----
        cards_frame = tk.Frame(content, bg=config.COLORS['bg_primary'])
        cards_frame.pack(fill='x', pady=(0, 10))

        self._add_stat_card(cards_frame, '总计划', str(stats['total']), config.COLORS['accent'])
        self._add_stat_card(cards_frame, '已完成', str(stats['completed']), config.COLORS['success'])
        self._add_stat_card(cards_frame, '待完成', str(stats['pending']), config.COLORS['warning'])
        self._add_stat_card(cards_frame, '完成率', f"{stats['completion_rate']}%", config.COLORS['danger'])

        # ---- 主体区域（左右分栏） ----
        main_area = tk.Frame(content, bg=config.COLORS['bg_primary'])
        main_area.pack(fill='both', expand=True)

        # 左侧：分类完成率柱状图
        left_panel = tk.Frame(main_area, bg='white', padx=15, pady=15)
        left_panel.pack(side='left', fill='both', expand=True, padx=(0, 5))

        tk.Label(
            left_panel,
            text='各分类完成率',
            font=config.FONT_BODY_BOLD,
            fg=config.COLORS['text_primary'],
            bg='white',
            anchor='w',
        ).pack(fill='x', pady=(0, 10))

        self._draw_category_chart(left_panel, cat_stats)

        # 右侧：每日趋势柱状图
        right_panel = tk.Frame(main_area, bg='white', padx=15, pady=15)
        right_panel.pack(side='right', fill='both', expand=True, padx=(5, 0))

        tk.Label(
            right_panel,
            text='每日完成趋势',
            font=config.FONT_BODY_BOLD,
            fg=config.COLORS['text_primary'],
            bg='white',
            anchor='w',
        ).pack(fill='x', pady=(0, 10))

        self._draw_trend_chart(right_panel, daily_trend)

    def _add_stat_card(self, parent: tk.Frame, label: str, value: str, color: str):
        """添加统计概览卡片"""
        card = tk.Frame(parent, bg='white', relief='solid', borderwidth=1, padx=20, pady=15)
        card.pack(side='left', padx=5, fill='x', expand=True)

        # 指标名称
        tk.Label(
            card,
            text=label,
            font=config.FONT_SMALL,
            fg=config.COLORS['text_secondary'],
            bg='white',
        ).pack()

        # 指标值
        tk.Label(
            card,
            text=value,
            font=config.FONT_LARGE,
            fg=color,
            bg='white',
        ).pack()

    def _draw_category_chart(self, parent: tk.Frame, cat_stats: List[Dict]):
        """绘制分类完成率柱状图"""
        if not cat_stats:
            tk.Label(
                parent,
                text='暂无数据',
                font=config.FONT_SMALL,
                fg=config.COLORS['text_muted'],
                bg='white',
            ).pack(expand=True)
            return

        chart_width = 350
        chart_height = 200
        padding_left = 30
        padding_bottom = 30
        padding_top = 10
        padding_right = 10

        canvas = tk.Canvas(
            parent,
            width=chart_width + padding_left + padding_right,
            height=chart_height + padding_top + padding_bottom,
            bg='white',
            highlightthickness=0,
        )
        canvas.pack(fill='both', expand=True)

        # 计算柱状图参数
        num_cats = len(cat_stats)
        bar_area_width = chart_width - padding_left - padding_right
        bar_width = min(40, bar_area_width / num_cats - 15)
        spacing = bar_area_width / num_cats

        # Y轴最大值（完成率最大100，但柱状图以计划总数来衡量）
        max_total = max(c['total'] for c in cat_stats) if cat_stats else 1
        if max_total == 0:
            max_total = 1

        # 绘制坐标轴
        canvas.create_line(
            padding_left, padding_top,
            padding_left, chart_height + padding_top,
            fill=config.COLORS['border'],
            width=1,
        )
        canvas.create_line(
            padding_left, chart_height + padding_top,
            chart_width + padding_left, chart_height + padding_top,
            fill=config.COLORS['border'],
            width=1,
        )

        # 绘制 Y 轴刻度
        for i in range(0, max_total + 1, max(1, max_total // 4)):
            y = chart_height + padding_top - (i / max_total) * chart_height
            canvas.create_line(
                padding_left - 3, y, padding_left, y,
                fill=config.COLORS['text_muted'],
            )
            canvas.create_text(
                padding_left - 5, y,
                text=str(i),
                anchor='e',
                font=config.FONT_SMALL,
                fill=config.COLORS['text_secondary'],
            )

        # 绘制柱状图
        for i, cat in enumerate(cat_stats):
            x = padding_left + i * spacing + (spacing - bar_width) / 2

            # 计划总数柱（浅色背景）
            total_height = (cat['total'] / max_total) * chart_height if max_total > 0 else 0
            canvas.create_rectangle(
                x, chart_height + padding_top - total_height,
                x + bar_width, chart_height + padding_top,
                fill=cat['color'],
                outline='',
                width=0,
            )

            # 已完成柱（深色前景）
            if cat['completed'] > 0:
                completed_height = (cat['completed'] / max_total) * chart_height if max_total > 0 else 0
                canvas.create_rectangle(
                    x + 3, chart_height + padding_top - completed_height,
                    x + bar_width - 3, chart_height + padding_top,
                    fill=self._darken_color(cat['color']),
                    outline='',
                    width=0,
                )

            # 完成率文字
            canvas.create_text(
                x + bar_width / 2, chart_height + padding_top - total_height - 8,
                text=f"{cat['completion_rate']}%",
                font=(config.FONT_FAMILY, 8),
                fill=config.COLORS['text_primary'],
            )

            # 分类名称
            canvas.create_text(
                x + bar_width / 2, chart_height + padding_top + 12,
                text=cat['name'],
                font=(config.FONT_FAMILY, 8),
                fill=config.COLORS['text_secondary'],
            )

    def _draw_trend_chart(self, parent: tk.Frame, daily_trend: List[Dict]):
        """绘制每日完成趋势柱状图"""
        if not daily_trend:
            tk.Label(
                parent,
                text='暂无数据',
                font=config.FONT_SMALL,
                fg=config.COLORS['text_muted'],
                bg='white',
            ).pack(expand=True)
            return

        chart_width = 350
        chart_height = 200
        padding_left = 35
        padding_bottom = 30
        padding_top = 10
        padding_right = 10

        canvas = tk.Canvas(
            parent,
            width=chart_width + padding_left + padding_right,
            height=chart_height + padding_top + padding_bottom,
            bg='white',
            highlightthickness=0,
        )
        canvas.pack(fill='both', expand=True)

        # 数据最大值
        max_val = max(d['count'] for d in daily_trend) if daily_trend else 1
        if max_val == 0:
            max_val = 1

        num_days = len(daily_trend)
        bar_area_width = chart_width - padding_left - padding_right
        bar_width = max(3, bar_area_width / num_days - 1)
        spacing = bar_area_width / num_days

        # 坐标轴
        canvas.create_line(
            padding_left, padding_top,
            padding_left, chart_height + padding_top,
            fill=config.COLORS['border'],
        )
        canvas.create_line(
            padding_left, chart_height + padding_top,
            chart_width + padding_left, chart_height + padding_top,
            fill=config.COLORS['border'],
        )

        # Y轴刻度
        for i in range(0, max_val + 1, max(1, max_val // 4)):
            y = chart_height + padding_top - (i / max_val) * chart_height if max_val > 0 else 0
            canvas.create_line(
                padding_left - 3, y, padding_left, y,
                fill=config.COLORS['text_muted'],
            )
            canvas.create_text(
                padding_left - 5, y,
                text=str(i),
                anchor='e',
                font=config.FONT_SMALL,
                fill=config.COLORS['text_secondary'],
            )

        # 绘制柱状图（每7天一个标签）
        show_labels_every = max(1, num_days // 7)

        for i, day in enumerate(daily_trend):
            x = padding_left + i * spacing

            # 柱子颜色（今天用强调色）
            bar_color = config.COLORS['accent'] if day['date'] == today_str() else config.COLORS['accent_light']
            outline_color = config.COLORS['accent']

            bar_height = (day['count'] / max_val) * chart_height if max_val > 0 else 0
            if bar_height > 0:
                canvas.create_rectangle(
                    x, chart_height + padding_top - bar_height,
                    x + bar_width, chart_height + padding_top,
                    fill=bar_color,
                    outline=outline_color,
                    width=0.5,
                )

                # 悬停提示数据（显示具体数值的柱子）
                if day['count'] > 0:
                    canvas.create_text(
                        x + bar_width / 2, chart_height + padding_top - bar_height - 6,
                        text=str(day['count']),
                        font=(config.FONT_FAMILY, 7),
                        fill=config.COLORS['text_primary'],
                    )

            # X轴日期标签（间隔显示）
            if i % show_labels_every == 0:
                try:
                    from datetime import datetime
                    dt = datetime.strptime(day['date'], '%Y-%m-%d')
                    label = f'{dt.month}/{dt.day}'
                except ValueError:
                    label = day['date'][-5:]  # MM-DD
                canvas.create_text(
                    x + bar_width / 2, chart_height + padding_top + 12,
                    text=label,
                    font=(config.FONT_FAMILY, 7),
                    fill=config.COLORS['text_secondary'],
                    angle=0,
                )

    @staticmethod
    def _darken_color(hex_color: str, factor: float = 0.7) -> str:
        """将十六进制颜色变暗"""
        hex_color = hex_color.lstrip('#')
        r = int(int(hex_color[0:2], 16) * factor)
        g = int(int(hex_color[2:4], 16) * factor)
        b = int(int(hex_color[4:6], 16) * factor)
        return f'#{r:02x}{g:02x}{b:02x}'
