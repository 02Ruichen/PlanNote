"""
现代风格弹窗组件
替换系统原生 messagebox 的复古外观，统一黑体 + 莫兰迪风格
"""
import tkinter as tk
import config


def show_info(title, message, parent=None):
    """现代风格信息弹窗（兼容 messagebox API）"""
    _ModernDialog(parent, title, message, 'info')


def show_warning(title, message, parent=None):
    """现代风格警告弹窗（兼容 messagebox API）"""
    _ModernDialog(parent, title, message, 'warning')


def show_error(title, message, parent=None):
    """现代风格错误弹窗（兼容 messagebox API）"""
    _ModernDialog(parent, title, message, 'error')


def ask_yes_no(title, message, parent=None):
    """现代风格确认弹窗，返回 True/False"""
    dlg = _ModernDialog(parent, title, message, 'confirm')
    return dlg.result


class _ModernDialog(tk.Toplevel):
    """现代风格通用弹窗"""

    ICONS = {
        'info': ('ℹ️', config.COLORS['accent']),
        'warning': ('⚠️', config.COLORS['warning']),
        'error': ('❌', config.COLORS['danger']),
        'confirm': ('💬', config.COLORS['accent']),
    }

    def __init__(self, parent, title, message, dtype='info'):
        super().__init__(parent)
        self.result = False

        # 窗口属性
        self.title(title)
        self.resizable(False, False)
        if parent:
            self.transient(parent)
        self.grab_set()
        self.configure(bg='white')

        # 计算窗口大小
        w, h = 380, 170
        self.geometry(f'{w}x{h}')
        self.update_idletasks()
        if parent is None:
            # 屏幕居中
            sw = self.winfo_screenwidth()
            sh = self.winfo_screenheight()
            x = (sw - w) // 2
            y = (sh - h) // 2
        else:
            x = parent.winfo_rootx() + (parent.winfo_width() - w) // 2
            y = parent.winfo_rooty() + (parent.winfo_height() - h) // 2
        self.geometry(f'+{x}+{y}')

        icon, accent = self.ICONS.get(dtype, ('', config.COLORS['accent']))

        # 主容器
        main = tk.Frame(self, bg='white', padx=30, pady=25)
        main.pack(fill='both', expand=True)

        # 图标 + 消息行
        top = tk.Frame(main, bg='white')
        top.pack(fill='x', pady=(0, 15))

        tk.Label(top, text=icon, font=(config.FONT_FAMILY, 28),
                 bg='white').pack(side='left', padx=(0, 15))

        msg_label = tk.Label(
            top, text=message, font=config.FONT_BODY,
            fg=config.COLORS['text_primary'], bg='white',
            justify='left', wraplength=320, anchor='w',
        )
        msg_label.pack(side='left', fill='both', expand=True)

        # 按钮区
        btn_frame = tk.Frame(main, bg='white')
        btn_frame.pack(fill='x', pady=(5, 0))

        if dtype == 'confirm':
            tk.Button(btn_frame, text='取消', font=config.FONT_BODY,
                      fg=config.COLORS['text_secondary'], bg='white',
                      relief='solid', borderwidth=1, padx=20, pady=6,
                      cursor='hand2', command=self.destroy,
                      activebackground=config.COLORS['bg_primary'],
                      ).pack(side='right', padx=(10, 0))
            tk.Button(btn_frame, text='确定', font=config.FONT_BODY_BOLD,
                      fg='white', bg=accent,
                      relief='flat', padx=20, pady=6,
                      cursor='hand2', command=self._on_confirm,
                      activebackground=accent,
                      ).pack(side='right')
        else:
            tk.Button(btn_frame, text='确定', font=config.FONT_BODY_BOLD,
                      fg='white', bg=accent,
                      relief='flat', padx=30, pady=6,
                      cursor='hand2', command=self.destroy,
                      activebackground=accent,
                      ).pack()

        self.wait_window()

    def _on_confirm(self):
        self.result = True
        self.destroy()
