"""
工具函数模块
提供日期处理、格式化、文本截断、水印等辅助功能
"""
from datetime import datetime, date, timedelta
from typing import Optional, List, Tuple
import calendar as cal
import tkinter as tk
import os
import config


# ============================================================
# 水印工具（使用恶魔叮抠图）
# ============================================================

# 全局缓存：避免图片被垃圾回收
_watermark_images = []


def add_watermark(parent, canvas=None):
    """
    在指定容器上添加恶魔叮图片水印
    优先画在Canvas上（保证可见），否则用Label放在容器中央
    """
    try:
        from PIL import Image, ImageTk
        import sys

        if getattr(sys, 'frozen', False):
            wm_path = os.path.join(sys._MEIPASS, 'watermark.png')
        else:
            wm_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'watermark.png')
        if not os.path.exists(wm_path):
            return None

        pil_img = Image.open(wm_path)
        ratio = 300 / pil_img.width
        new_size = (300, int(pil_img.height * ratio))
        resized = pil_img.resize(new_size, Image.LANCZOS)
        tk_img = ImageTk.PhotoImage(resized)
        _watermark_images.append(tk_img)

        if canvas is not None:
            # 画在Canvas上，下移80%图高避免被导航栏挡住
            img_h = new_size[1]
            def _place_wm(cv):
                cw = cv.winfo_width() if cv.winfo_width() > 10 else 800
                ch = cv.winfo_height() if cv.winfo_height() > 10 else 600
                # x居中，y下移（中心下移80%图高）
                cx = cw // 2
                cy = ch // 2 + int(img_h * 0.5)
                return cx, cy
            cx, cy = _place_wm(canvas)
            canvas.create_image(cx, cy, image=tk_img, anchor='center', tags='watermark_img')
            canvas.tag_lower('watermark_img')
            def _recenter(e):
                nx, ny = _place_wm(canvas)
                canvas.coords('watermark_img', nx, ny)
            canvas.bind('<Configure>', _recenter, add='+')
            return tk_img
        else:
            # 无Canvas时用Label，放在容器中央
            label = tk.Label(
                parent,
                image=tk_img,
                borderwidth=0,
                bg=parent.cget('bg') if parent.cget('bg') else config.COLORS['bg_primary'],
            )
            label.image = tk_img
            label.place(relx=0.5, rely=0.5, anchor='center')
            parent.after(200, lambda: label.lower() if label.winfo_exists() else None)
            return label
    except Exception:
        return None


# ============================================================
# 日期工具
# ============================================================

def today_str() -> str:
    """获取今天日期字符串 YYYY-MM-DD"""
    return date.today().strftime('%Y-%m-%d')


def now_str() -> str:
    """获取当前日期时间字符串"""
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def format_date(date_str: str) -> str:
    """将 YYYY-MM-DD 格式化为中文日期显示"""
    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        weekdays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
        weekday = weekdays[dt.weekday()]
        return f'{dt.year}年{dt.month}月{dt.day}日 {weekday}'
    except (ValueError, TypeError):
        return date_str


def format_date_short(date_str: str) -> str:
    """将 YYYY-MM-DD 格式化为简短显示，如 '6月25日 周四'"""
    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        weekdays_short = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        weekday = weekdays_short[dt.weekday()]
        return f'{dt.month}月{dt.day}日 {weekday}'
    except (ValueError, TypeError):
        return date_str


def get_week_range(year: int, week_num: int) -> Tuple[str, str]:
    """获取指定年份和周数的起止日期"""
    first_day = date.fromisocalendar(year, week_num, 1)
    last_day = first_day + timedelta(days=6)
    return first_day.strftime('%Y-%m-%d'), last_day.strftime('%Y-%m-%d')


def get_current_week() -> Tuple[int, int]:
    """获取当前年份和周数（ISO 标准）"""
    today = date.today()
    return today.isocalendar()[:2]


def get_current_month() -> Tuple[int, int]:
    """获取当前年份和月份"""
    today = date.today()
    return today.year, today.month


def get_month_day_count(year: int, month: int) -> int:
    """获取指定月份的天数"""
    return cal.monthrange(year, month)[1]


def get_weekday_name(day_index: int, short: bool = True) -> str:
    """获取星期名称，day_index: 0=周一, 6=周日"""
    if short:
        names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    else:
        names = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
    return names[day_index] if 0 <= day_index <= 6 else ''


def get_month_navigator_text(year: int, month: int) -> str:
    """获取月份导航显示文本"""
    return f'{year}年 {month}月'


def get_week_navigator_text(year: int, week_num: int) -> str:
    """获取周导航显示文本"""
    start, end = get_week_range(year, week_num)
    start_short = datetime.strptime(start, '%Y-%m-%d').strftime('%m/%d')
    end_short = datetime.strptime(end, '%Y-%m-%d').strftime('%m/%d')
    return f'{year}年 第{week_num}周 ({start_short}-{end_short})'


def priority_to_stars(priority: int) -> str:
    """将优先级数字转换为星星显示"""
    return '★' * priority + '☆' * (5 - priority)


def truncate_text(text: str, max_length: int = 30) -> str:
    """截断文本，超出长度加省略号"""
    if len(text) <= max_length:
        return text
    return text[:max_length - 1] + '…'


def is_today(date_str: str) -> bool:
    """判断给定日期是否为今天"""
    return date_str == today_str()


def get_month_label(month_str: str) -> str:
    """将 YYYY-MM 格式化为中文月份标签"""
    try:
        year, month = month_str.split('-')
        return f'{year}年{int(month)}月'
    except (ValueError, TypeError):
        return month_str


def parse_db_datetime(dt_str: Optional[str]) -> str:
    """解析数据库中的日期时间字符串为显示格式"""
    if not dt_str:
        return ''
    try:
        if ' ' in dt_str:
            date_part, time_part = dt_str.split(' ', 1)
            dt = datetime.strptime(date_part, '%Y-%m-%d')
            weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
            weekday = weekdays[dt.weekday()]
            return f'{dt.month}月{dt.day}日 {weekday} {time_part[:5]}'
        else:
            return format_date_short(dt_str)
    except (ValueError, TypeError):
        return dt_str or ''
