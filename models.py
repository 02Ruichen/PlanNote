"""
数据模型模块
使用 dataclass 定义应用程序的核心数据结构
"""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Category:
    """分类数据模型"""
    id: Optional[int] = None
    name: str = ''
    color: str = '#4A90D9'
    icon: str = ''
    sort_order: int = 0
    created_at: str = ''

    def __str__(self):
        return self.name


@dataclass
class Plan:
    """计划事项数据模型"""
    id: Optional[int] = None          # None 表示尚未插入数据库
    title: str = ''                    # 计划标题
    description: str = ''              # 详细备注
    category_id: int = 1               # 所属分类ID
    priority: int = 3                  # 优先级 1-5
    status: str = 'pending'            # pending / completed / cancelled
    plan_date: str = ''                # 计划日期 YYYY-MM-DD
    start_time: Optional[str] = None   # 开始时间 HH:MM
    end_time: Optional[str] = None     # 结束时间 HH:MM
    is_recurring: bool = False         # 是否为重复计划
    recurring_rule: Optional[str] = None  # 重复规则（预留）
    template_id: Optional[int] = None  # 来源模板ID
    is_archived: bool = False          # 是否已手动归档
    archived_month: Optional[str] = None  # 归档到的月份 YYYY-MM
    completed_at: Optional[str] = None    # 完成时间
    created_at: str = ''
    updated_at: str = ''

    def __str__(self):
        return self.title


@dataclass
class Template:
    """计划模板数据模型"""
    id: Optional[int] = None
    name: str = ''                     # 模板名称
    title_template: str = ''           # 标题模板
    description_template: str = ''     # 备注模板
    category_id: int = 1
    priority: int = 3
    start_time: Optional[str] = None   # 默认开始时间
    end_time: Optional[str] = None     # 默认结束时间
    use_count: int = 0                 # 使用次数统计
    is_default: bool = False           # 是否为默认模板
    created_at: str = ''

    def __str__(self):
        return self.name
