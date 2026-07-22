"""
模板管理对话框
管理计划模板的增删改和应用
"""
import tkinter as tk
from tkinter import ttk
from typing import Callable, Optional, List

import config
from models import Template, Category
from database import DatabaseManager
from widgets.plan_editor import PlanEditor
from widgets.modern_dialog import show_warning, ask_yes_no


class TemplateManagerDialog(tk.Toplevel):
    """模板管理对话框（模态窗口）"""

    def __init__(
        self,
        parent,
        db: DatabaseManager,
        callback: Optional[Callable] = None,
    ):
        """
        初始化模板管理对话框
        Args:
            parent: 父窗口
            db: 数据库管理器
            callback: 数据变更回调
        """
        super().__init__(parent)
        self.db = db
        self.callback = callback
        self.templates: List[Template] = []
        self.categories = db.get_all_categories()

        # 窗口设置
        self.title('模板管理')
        self.geometry('600x450')
        self.resizable(False, False)
        self.transient(parent)
        self.grab_set()

        # 居中
        self.update_idletasks()
        x = parent.winfo_rootx() + (parent.winfo_width() - 600) // 2
        y = parent.winfo_rooty() + (parent.winfo_height() - 450) // 2
        self.geometry(f'+{x}+{y}')

        self._build_ui()
        self._load_templates()

        self.wait_window()

    def _build_ui(self):
        """构建界面"""
        main_frame = tk.Frame(self, bg=config.COLORS['bg_primary'])
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)

        # ---- 标题 ----
        header_frame = tk.Frame(main_frame, bg=config.COLORS['bg_primary'])
        header_frame.pack(fill='x', pady=(0, 15))

        tk.Label(
            header_frame,
            text='📝 模板管理',
            font=config.FONT_HEADING,
            fg=config.COLORS['text_primary'],
            bg=config.COLORS['bg_primary'],
        ).pack(side='left')

        tk.Label(
            header_frame,
            text='模板可以帮你快速创建常用的计划',
            font=config.FONT_SMALL,
            fg=config.COLORS['text_secondary'],
            bg=config.COLORS['bg_primary'],
        ).pack(side='left', padx=(10, 0))

        # ---- 模板列表 ----
        list_frame = tk.Frame(main_frame, bg='white', relief='solid', borderwidth=1)
        list_frame.pack(fill='both', expand=True, pady=(0, 15))

        # 表头
        col_header = tk.Frame(list_frame, bg=config.COLORS['bg_sidebar'])
        col_header.pack(fill='x')

        columns = [
            ('模板名称', 25),
            ('分类', 10),
            ('优先级', 10),
            ('使用次数', 8),
        ]
        for col_name, col_width in columns:
            tk.Label(
                col_header,
                text=col_name,
                font=config.FONT_SMALL,
                fg='white',
                bg=config.COLORS['bg_sidebar'],
                width=col_width,
                anchor='w',
                padx=8,
                pady=5,
            ).pack(side='left')

        # 列表区（Canvas + Scroll）
        list_inner = tk.Frame(list_frame, bg='white')
        list_inner.pack(fill='both', expand=True)

        self.list_canvas = tk.Canvas(
            list_inner,
            bg='white',
            highlightthickness=0,
            height=200,
        )
        self.list_canvas.pack(side='left', fill='both', expand=True)

        scrollbar = ttk.Scrollbar(
            list_inner,
            orient='vertical',
            command=self.list_canvas.yview,
        )
        scrollbar.pack(side='right', fill='y')
        self.list_canvas.configure(yscrollcommand=scrollbar.set)

        self.template_list_frame = tk.Frame(self.list_canvas, bg='white')
        self.list_window = self.list_canvas.create_window(
            (0, 0), window=self.template_list_frame, anchor='nw', tags='tmpl_list'
        )

        self.template_list_frame.bind('<Configure>', lambda e: self.list_canvas.configure(
            scrollregion=self.list_canvas.bbox('all')))
        self.list_canvas.bind('<Configure>', lambda e: self.list_canvas.itemconfig(
            self.list_window, width=e.width))

        # ---- 操作按钮 ----
        btn_frame = tk.Frame(main_frame, bg=config.COLORS['bg_primary'])
        btn_frame.pack(fill='x')

        # 新建模板
        new_btn = tk.Button(
            btn_frame,
            text='＋ 新建模板',
            font=config.FONT_BODY,
            fg='white',
            bg=config.COLORS['accent'],
            relief='flat',
            padx=16,
            pady=5,
            cursor='hand2',
            command=self._on_new_template,
        )
        new_btn.pack(side='left')

        # 应用模板（从选中的模板创建计划）
        apply_btn = tk.Button(
            btn_frame,
            text='应用模板',
            font=config.FONT_BODY,
            fg=config.COLORS['accent'],
            bg='white',
            relief='solid',
            borderwidth=1,
            padx=12,
            pady=5,
            cursor='hand2',
            command=self._on_apply_template,
        )
        apply_btn.pack(side='left', padx=(10, 0))

        # 关闭按钮
        close_btn = tk.Button(
            btn_frame,
            text='关闭',
            font=config.FONT_BODY,
            fg=config.COLORS['text_secondary'],
            bg='white',
            relief='solid',
            borderwidth=1,
            padx=16,
            pady=5,
            cursor='hand2',
            command=self.destroy,
        )
        close_btn.pack(side='right')

    def _load_templates(self):
        """加载模板列表"""
        # 清空
        for widget in self.template_list_frame.winfo_children():
            widget.destroy()

        self.templates = self.db.get_all_templates()

        if not self.templates:
            empty_label = tk.Label(
                self.template_list_frame,
                text='暂无模板，点击下方"新建模板"创建你的第一个模板',
                font=config.FONT_SMALL,
                fg=config.COLORS['text_muted'],
                bg='white',
                pady=30,
            )
            empty_label.pack(fill='x')
            return

        cat_map = {c.id: c for c in self.categories}
        self.selected_template_id = tk.IntVar(value=-1)

        for tmpl in self.templates:
            cat = cat_map.get(tmpl.category_id, Category(name='未知'))
            self._add_template_row(tmpl, cat)

    def _add_template_row(self, template: Template, category: Category):
        """添加模板行"""
        row_frame = tk.Frame(self.template_list_frame, bg='white')
        row_frame.pack(fill='x', pady=1)

        # 选中按钮
        rb = tk.Radiobutton(
            row_frame,
            variable=self.selected_template_id,
            value=template.id,
            bg='white',
            selectcolor='white',
            activebackground='white',
        )
        rb.pack(side='left', padx=(5, 0))

        # 名称
        name_label = tk.Label(
            row_frame,
            text=f'  {template.name}',
            font=config.FONT_BODY,
            fg=config.COLORS['text_primary'],
            bg='white',
            width=24,
            anchor='w',
            padx=5,
        )
        name_label.pack(side='left')

        # 分类
        tk.Label(
            row_frame,
            text=category.name,
            font=config.FONT_SMALL,
            fg=category.color,
            bg='white',
            width=9,
            anchor='w',
            padx=5,
        ).pack(side='left')

        # 优先级
        stars = '★' * template.priority + '☆' * (5 - template.priority)
        tk.Label(
            row_frame,
            text=stars,
            font=(config.FONT_FAMILY, 8),
            fg=config.PRIORITY_COLORS.get(template.priority),
            bg='white',
            width=9,
            anchor='w',
            padx=5,
        ).pack(side='left')

        # 使用次数
        tk.Label(
            row_frame,
            text=str(template.use_count),
            font=config.FONT_SMALL,
            fg=config.COLORS['text_secondary'],
            bg='white',
            width=7,
            anchor='center',
            padx=5,
        ).pack(side='left')

        # 删除按钮
        del_btn = tk.Label(
            row_frame,
            text='✕',
            font=config.FONT_SMALL,
            fg=config.COLORS['danger'],
            bg='white',
            cursor='hand2',
            padx=8,
        )
        del_btn.pack(side='right')
        del_btn.bind(
            '<Button-1>',
            lambda e, tid=template.id, tname=template.name: self._on_delete_template(tid, tname)
        )

        # 底部分隔线
        sep = tk.Frame(self.template_list_frame, height=1, bg=config.COLORS['border_light'])
        sep.pack(fill='x')

        # 鼠标悬停效果
        for widget in (row_frame, name_label):
            widget.bind('<Enter>', lambda e, f=row_frame: f.configure(bg=config.COLORS['bg_card_hover']))
            widget.bind('<Leave>', lambda e, f=row_frame: f.configure(bg='white'))

    def _on_new_template(self):
        """新建模板"""
        # 使用 PlanEditor 变通方式：先打开 PlanEditor，用户填写后通过 save_as_template 保存
        PlanEditor(
            self,
            self.db,
            preset_date='',
            callback=lambda: self._load_templates(),
        )

    def _on_apply_template(self):
        """应用选中的模板创建计划"""
        template_id = self.selected_template_id.get()
        if template_id < 0:
            show_warning('提示', '请先选择一个模板')
            return

        template = self.db.get_template_by_id(template_id)
        if not template:
            show_warning('提示', '模板不存在')
            return

        # 打开编辑对话框（预填充模板数据）
        PlanEditor(
            self,
            self.db,
            template=template,
            callback=lambda: self._on_template_applied(),
        )

    def _on_template_applied(self):
        """模板应用后的处理"""
        if self.callback:
            self.callback()

    def _on_delete_template(self, template_id: int, template_name: str):
        """删除模板"""
        if ask_yes_no('确认删除', f'确定要删除模板"{template_name}"吗？'):
            self.db.delete_template(template_id)
            self._load_templates()
