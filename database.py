"""
数据库管理模块
使用 SQLite 存储所有数据，提供完整的 CRUD 操作和统计查询
采用单例模式，确保整个应用只有一个数据库连接
"""
import sqlite3
import os
from typing import List, Optional, Dict, Tuple
from datetime import datetime, date, timedelta

from models import Category, Plan, Template
import config


class DatabaseManager:
    """数据库管理器，封装所有 SQLite 操作"""

    def __init__(self, db_path: str = None):
        """初始化数据库连接并建表"""
        self.db_path = db_path or config.DB_PATH
        self.conn: Optional[sqlite3.Connection] = None
        self._connect()
        self._create_tables()
        self._insert_default_categories()

    def _connect(self):
        """建立数据库连接，启用 WAL 模式和外键约束"""
        self.conn = sqlite3.connect(self.db_path)
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")
        self.conn.row_factory = sqlite3.Row  # 使查询结果支持按列名访问

    def close(self):
        """关闭数据库连接"""
        if self.conn:
            self.conn.close()

    # ============================================================
    # 建表
    # ============================================================

    def _create_tables(self):
        """创建所有数据表（如果不存在）"""
        cursor = self.conn.cursor()

        # 分类表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT    NOT NULL,
                color       TEXT    NOT NULL DEFAULT '#4A90D9',
                icon        TEXT    DEFAULT '',
                sort_order  INTEGER DEFAULT 0,
                created_at  TEXT    DEFAULT (datetime('now','localtime'))
            )
        ''')

        # 计划事项表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS plans (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                title           TEXT    NOT NULL,
                description     TEXT    DEFAULT '',
                category_id     INTEGER DEFAULT 1,
                priority        INTEGER DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
                status          TEXT    DEFAULT 'pending'
                    CHECK(status IN ('pending','completed','cancelled')),
                plan_date       TEXT    NOT NULL,
                start_time      TEXT,
                end_time        TEXT,
                is_recurring    INTEGER DEFAULT 0,
                recurring_rule  TEXT,
                template_id     INTEGER,
                is_archived     INTEGER DEFAULT 0,
                archived_month  TEXT,
                completed_at    TEXT,
                created_at      TEXT    DEFAULT (datetime('now','localtime')),
                updated_at      TEXT    DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (category_id) REFERENCES categories(id),
                FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
            )
        ''')

        # 模板表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS templates (
                id                   INTEGER PRIMARY KEY AUTOINCREMENT,
                name                 TEXT NOT NULL,
                title_template       TEXT DEFAULT '',
                description_template TEXT DEFAULT '',
                category_id          INTEGER DEFAULT 1,
                priority             INTEGER DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
                start_time           TEXT,
                end_time             TEXT,
                use_count            INTEGER DEFAULT 0,
                is_default           INTEGER DEFAULT 0,
                created_at           TEXT DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (category_id) REFERENCES categories(id)
            )
        ''')

        # 索引
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_plans_date
            ON plans(plan_date)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_plans_status
            ON plans(status)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_plans_category
            ON plans(category_id)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_plans_archive
            ON plans(is_archived, archived_month)
        ''')

        self.conn.commit()

    def _insert_default_categories(self):
        """插入预置分类（仅当分类表为空时）"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM categories")
        if cursor.fetchone()[0] == 0:
            defaults = [
                ('工作', '#C49898', 1),   # 灰调玫瑰
                ('学习', '#A898B8', 2),   # 灰调紫
                ('生活', '#98A898', 3),   # 灰调绿
                ('健康', '#C4B098', 4),   # 灰调暖棕
                ('其他', '#A8A0A8', 5),   # 中性灰
            ]
            cursor.executemany(
                'INSERT INTO categories (name, color, sort_order) VALUES (?, ?, ?)',
                defaults
            )
            self.conn.commit()

    # ============================================================
    # 分类操作
    # ============================================================

    def get_all_categories(self) -> List[Category]:
        """获取所有分类，按排序权重排列"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM categories ORDER BY sort_order')
        return [self._row_to_category(row) for row in cursor.fetchall()]

    def get_category_by_id(self, category_id: int) -> Optional[Category]:
        """根据ID获取分类"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM categories WHERE id = ?', (category_id,))
        row = cursor.fetchone()
        return self._row_to_category(row) if row else None

    def add_category(self, name: str, color: str = '#4A90D9') -> int:
        """添加新分类，返回新分类ID"""
        cursor = self.conn.cursor()
        # 获取最大排序值
        cursor.execute('SELECT MAX(sort_order) FROM categories')
        max_order = cursor.fetchone()[0] or 0
        cursor.execute(
            'INSERT INTO categories (name, color, sort_order) VALUES (?, ?, ?)',
            (name, color, max_order + 1)
        )
        self.conn.commit()
        return cursor.lastrowid

    def update_category(self, category_id: int, **kwargs):
        """更新分类信息"""
        if not kwargs:
            return
        sets = ', '.join(f'{k} = ?' for k in kwargs)
        values = list(kwargs.values()) + [category_id]
        self.conn.execute(f'UPDATE categories SET {sets} WHERE id = ?', values)
        self.conn.commit()

    def delete_category(self, category_id: int) -> bool:
        """删除分类，但至少保留一个分类。返回是否成功"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM categories')
        if cursor.fetchone()[0] <= 1:
            return False  # 至少保留一个分类
        # 将该分类下的计划移到第一个分类
        cursor.execute('SELECT id FROM categories ORDER BY sort_order LIMIT 1')
        fallback_id = cursor.fetchone()[0]
        cursor.execute(
            'UPDATE plans SET category_id = ? WHERE category_id = ?',
            (fallback_id, category_id)
        )
        cursor.execute('DELETE FROM categories WHERE id = ?', (category_id,))
        self.conn.commit()
        return True

    # ============================================================
    # 计划 CRUD
    # ============================================================

    def create_plan(self, plan: Plan) -> int:
        """创建新计划，返回新计划的ID"""
        cursor = self.conn.cursor()
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute('''
            INSERT INTO plans (
                title, description, category_id, priority, status,
                plan_date, start_time, end_time, is_recurring,
                recurring_rule, template_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            plan.title,
            plan.description,
            plan.category_id,
            plan.priority,
            plan.status,
            plan.plan_date,
            plan.start_time,
            plan.end_time,
            1 if plan.is_recurring else 0,
            plan.recurring_rule,
            plan.template_id,
            now,
            now,
        ))
        self.conn.commit()
        return cursor.lastrowid

    def update_plan(self, plan: Plan):
        """更新计划的所有字段"""
        cursor = self.conn.cursor()
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute('''
            UPDATE plans SET
                title = ?, description = ?, category_id = ?, priority = ?,
                status = ?, plan_date = ?, start_time = ?, end_time = ?,
                is_recurring = ?, recurring_rule = ?, template_id = ?,
                is_archived = ?, archived_month = ?, completed_at = ?,
                updated_at = ?
            WHERE id = ?
        ''', (
            plan.title,
            plan.description,
            plan.category_id,
            plan.priority,
            plan.status,
            plan.plan_date,
            plan.start_time,
            plan.end_time,
            1 if plan.is_recurring else 0,
            plan.recurring_rule,
            plan.template_id,
            1 if plan.is_archived else 0,
            plan.archived_month,
            plan.completed_at,
            now,
            plan.id,
        ))
        self.conn.commit()

    def delete_plan(self, plan_id: int):
        """删除计划"""
        self.conn.execute('DELETE FROM plans WHERE id = ?', (plan_id,))
        self.conn.commit()

    def get_plan_by_id(self, plan_id: int) -> Optional[Plan]:
        """根据ID获取单个计划"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM plans WHERE id = ?', (plan_id,))
        row = cursor.fetchone()
        return self._row_to_plan(row) if row else None

    def get_plans_by_date(self, date_str: str, status: str = None) -> List[Plan]:
        """获取指定日期的所有计划（可按状态筛选）"""
        cursor = self.conn.cursor()
        if status:
            cursor.execute(
                'SELECT * FROM plans WHERE plan_date = ? AND status = ? AND is_archived = 0 ORDER BY priority DESC, created_at ASC',
                (date_str, status)
            )
        else:
            cursor.execute(
                'SELECT * FROM plans WHERE plan_date = ? AND is_archived = 0 ORDER BY status, priority DESC, created_at ASC',
                (date_str,)
            )
        return [self._row_to_plan(row) for row in cursor.fetchall()]

    def get_plans_by_week(self, year: int, week_num: int) -> List[Plan]:
        """获取指定周的所有计划"""
        from datetime import date, timedelta
        first_day = date.fromisocalendar(year, week_num, 1)
        last_day = first_day + timedelta(days=6)
        date_range_start = first_day.strftime('%Y-%m-%d')
        date_range_end = last_day.strftime('%Y-%m-%d')

        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT * FROM plans
            WHERE plan_date >= ? AND plan_date <= ? AND is_archived = 0
            ORDER BY plan_date, priority DESC, created_at ASC
        ''', (date_range_start, date_range_end))
        return [self._row_to_plan(row) for row in cursor.fetchall()]

    def get_plans_by_month(self, year: int, month: int) -> List[Plan]:
        """获取指定月的所有计划"""
        month_str = f'{year:04d}-{month:02d}'
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT * FROM plans
            WHERE plan_date LIKE ? AND is_archived = 0
            ORDER BY plan_date, priority DESC, created_at ASC
        ''', (f'{month_str}%',))
        return [self._row_to_plan(row) for row in cursor.fetchall()]

    def get_plans_by_date_range(self, start_date: str, end_date: str) -> List[Plan]:
        """获取指定日期范围内的所有非归档计划"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT * FROM plans
            WHERE plan_date >= ? AND plan_date <= ? AND is_archived = 0
            ORDER BY plan_date, priority DESC, created_at ASC
        ''', (start_date, end_date))
        return [self._row_to_plan(row) for row in cursor.fetchall()]

    def get_plans_by_category(self, category_id: int, date_from: str = None,
                               date_to: str = None) -> List[Plan]:
        """按分类获取计划，可选日期范围"""
        cursor = self.conn.cursor()
        query = 'SELECT * FROM plans WHERE category_id = ? AND is_archived = 0'
        params = [category_id]
        if date_from:
            query += ' AND plan_date >= ?'
            params.append(date_from)
        if date_to:
            query += ' AND plan_date <= ?'
            params.append(date_to)
        query += ' ORDER BY plan_date DESC, priority DESC'
        cursor.execute(query, params)
        return [self._row_to_plan(row) for row in cursor.fetchall()]

    def toggle_completed(self, plan_id: int) -> str:
        """切换计划的完成状态，返回新状态"""
        plan = self.get_plan_by_id(plan_id)
        if not plan:
            return 'pending'

        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        if plan.status == 'completed':
            new_status = 'pending'
            completed_at = None
        else:
            new_status = 'completed'
            completed_at = now

        self.conn.execute(
            'UPDATE plans SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?',
            (new_status, completed_at, now, plan_id)
        )
        self.conn.commit()
        return new_status

    # ============================================================
    # 归档操作
    # ============================================================

    def archive_plans(self, plan_ids: List[int], month: str = None):
        """批量归档计划到指定月份"""
        if not plan_ids:
            return
        if month is None:
            month = datetime.now().strftime('%Y-%m')

        placeholders = ','.join('?' * len(plan_ids))
        self.conn.execute(
            f'UPDATE plans SET is_archived = 1, archived_month = ?, updated_at = ? WHERE id IN ({placeholders})',
            [month, datetime.now().strftime('%Y-%m-%d %H:%M:%S')] + plan_ids
        )
        self.conn.commit()

    def unarchive_plan(self, plan_id: int):
        """取消归档，将计划恢复为活跃状态"""
        self.conn.execute(
            'UPDATE plans SET is_archived = 0, archived_month = NULL, updated_at = ? WHERE id = ?',
            (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), plan_id)
        )
        self.conn.commit()

    def get_archived_months(self) -> List[str]:
        """获取所有有归档记录的月份列表"""
        cursor = self.conn.cursor()
        cursor.execute(
            'SELECT DISTINCT archived_month FROM plans WHERE is_archived = 1 AND archived_month IS NOT NULL ORDER BY archived_month DESC'
        )
        return [row[0] for row in cursor.fetchall()]

    def get_archived_plans(self, month: str = None) -> List[Plan]:
        """获取归档计划，可按月份筛选"""
        cursor = self.conn.cursor()
        if month:
            cursor.execute(
                'SELECT * FROM plans WHERE is_archived = 1 AND archived_month = ? ORDER BY plan_date DESC, priority DESC',
                (month,)
            )
        else:
            cursor.execute(
                'SELECT * FROM plans WHERE is_archived = 1 ORDER BY archived_month DESC, plan_date DESC'
            )
        return [self._row_to_plan(row) for row in cursor.fetchall()]

    def archive_completed_in_month(self, year: int, month: int) -> int:
        """将指定月份中所有已完成的计划归档，返回归档数量"""
        month_str = f'{year:04d}-{month:02d}'
        cursor = self.conn.cursor()
        cursor.execute(
            'SELECT COUNT(*) FROM plans WHERE plan_date LIKE ? AND status = "completed" AND is_archived = 0',
            (f'{month_str}%',)
        )
        count = cursor.fetchone()[0]
        if count > 0:
            now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute(
                'UPDATE plans SET is_archived = 1, archived_month = ?, updated_at = ? WHERE plan_date LIKE ? AND status = "completed" AND is_archived = 0',
                (month_str, now, f'{month_str}%')
            )
            self.conn.commit()
        return count

    # ============================================================
    # 模板操作
    # ============================================================

    def create_template(self, template: Template) -> int:
        """创建新模板，返回模板ID"""
        cursor = self.conn.cursor()
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute('''
            INSERT INTO templates (
                name, title_template, description_template,
                category_id, priority, start_time, end_time,
                use_count, is_default, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            template.name,
            template.title_template,
            template.description_template,
            template.category_id,
            template.priority,
            template.start_time,
            template.end_time,
            template.use_count,
            1 if template.is_default else 0,
            now,
        ))
        self.conn.commit()
        return cursor.lastrowid

    def get_all_templates(self) -> List[Template]:
        """获取所有模板"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM templates ORDER BY use_count DESC, created_at DESC')
        return [self._row_to_template(row) for row in cursor.fetchall()]

    def get_template_by_id(self, template_id: int) -> Optional[Template]:
        """根据ID获取模板"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM templates WHERE id = ?', (template_id,))
        row = cursor.fetchone()
        return self._row_to_template(row) if row else None

    def update_template(self, template: Template):
        """更新模板"""
        cursor = self.conn.cursor()
        cursor.execute('''
            UPDATE templates SET
                name = ?, title_template = ?, description_template = ?,
                category_id = ?, priority = ?, start_time = ?,
                end_time = ?, is_default = ?
            WHERE id = ?
        ''', (
            template.name,
            template.title_template,
            template.description_template,
            template.category_id,
            template.priority,
            template.start_time,
            template.end_time,
            1 if template.is_default else 0,
            template.id,
        ))
        self.conn.commit()

    def delete_template(self, template_id: int):
        """删除模板"""
        self.conn.execute('DELETE FROM templates WHERE id = ?', (template_id,))
        self.conn.commit()

    def increment_template_use(self, template_id: int):
        """增加模板使用次数"""
        self.conn.execute(
            'UPDATE templates SET use_count = use_count + 1 WHERE id = ?',
            (template_id,)
        )
        self.conn.commit()

    # ============================================================
    # 统计查询
    # ============================================================

    def get_completion_stats(self, start_date: str, end_date: str) -> Dict:
        """获取指定日期范围内的完成统计"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM plans
            WHERE plan_date >= ? AND plan_date <= ? AND is_archived = 0
        ''', (start_date, end_date))
        row = cursor.fetchone()
        total = row['total'] or 0
        completed = row['completed'] or 0
        return {
            'total': total,
            'completed': completed,
            'pending': row['pending'] or 0,
            'cancelled': row['cancelled'] or 0,
            'completion_rate': round(completed / total * 100, 1) if total > 0 else 0,
        }

    def get_stats_by_category(self, start_date: str, end_date: str) -> List[Dict]:
        """获取各分类的完成统计"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT
                c.id, c.name, c.color,
                COUNT(p.id) as total,
                SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completed
            FROM categories c
            LEFT JOIN plans p ON c.id = p.category_id
                AND p.plan_date >= ? AND p.plan_date <= ? AND p.is_archived = 0
            GROUP BY c.id
            ORDER BY c.sort_order
        ''', (start_date, end_date))
        result = []
        for row in cursor.fetchall():
            total = row['total'] or 0
            completed = row['completed'] or 0
            result.append({
                'id': row['id'],
                'name': row['name'],
                'color': row['color'],
                'total': total,
                'completed': completed,
                'completion_rate': round(completed / total * 100, 1) if total > 0 else 0,
            })
        return result

    def get_priority_distribution(self, start_date: str, end_date: str) -> Dict[int, int]:
        """获取优先级分布统计"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT priority, COUNT(*) as count
            FROM plans
            WHERE plan_date >= ? AND plan_date <= ? AND is_archived = 0
            GROUP BY priority
            ORDER BY priority
        ''', (start_date, end_date))
        result = {i: 0 for i in range(1, 6)}
        for row in cursor.fetchall():
            result[row['priority']] = row['count']
        return result

    def get_daily_completed_trend(self, days: int = 30) -> List[Dict]:
        """获取最近N天每日完成数量趋势"""
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT plan_date, COUNT(*) as count
            FROM plans
            WHERE plan_date >= ? AND plan_date <= ? AND status = 'completed'
            GROUP BY plan_date
            ORDER BY plan_date
        ''', (start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')))

        daily_data = {row['plan_date']: row['count'] for row in cursor.fetchall()}

        # 填充没有数据的日期
        result = []
        current = start_date
        while current <= end_date:
            date_str = current.strftime('%Y-%m-%d')
            result.append({
                'date': date_str,
                'count': daily_data.get(date_str, 0),
            })
            current += timedelta(days=1)
        return result

    def get_today_pending_count(self) -> int:
        """获取今日待完成计划数量"""
        cursor = self.conn.cursor()
        cursor.execute(
            'SELECT COUNT(*) FROM plans WHERE plan_date = ? AND status = "pending" AND is_archived = 0',
            (date.today().strftime('%Y-%m-%d'),)
        )
        return cursor.fetchone()[0]

    def get_month_dates_with_plans(self, year: int, month: int) -> List[str]:
        """获取指定月份中有计划的日期列表（用于月视图标记）"""
        month_str = f'{year:04d}-{month:02d}'
        cursor = self.conn.cursor()
        cursor.execute(
            'SELECT DISTINCT plan_date FROM plans WHERE plan_date LIKE ? AND is_archived = 0 ORDER BY plan_date',
            (f'{month_str}%',)
        )
        return [row[0] for row in cursor.fetchall()]

    # ============================================================
    # 行转换辅助方法
    # ============================================================

    def _row_to_category(self, row) -> Category:
        """将数据库行转换为 Category 对象"""
        return Category(
            id=row['id'],
            name=row['name'],
            color=row['color'],
            icon=row['icon'] or '',
            sort_order=row['sort_order'],
            created_at=row['created_at'] or '',
        )

    def _row_to_plan(self, row) -> Plan:
        """将数据库行转换为 Plan 对象"""
        return Plan(
            id=row['id'],
            title=row['title'],
            description=row['description'] or '',
            category_id=row['category_id'],
            priority=row['priority'],
            status=row['status'],
            plan_date=row['plan_date'],
            start_time=row['start_time'],
            end_time=row['end_time'],
            is_recurring=bool(row['is_recurring']),
            recurring_rule=row['recurring_rule'],
            template_id=row['template_id'],
            is_archived=bool(row['is_archived']),
            archived_month=row['archived_month'],
            completed_at=row['completed_at'],
            created_at=row['created_at'] or '',
            updated_at=row['updated_at'] or '',
        )

    def _row_to_template(self, row) -> Template:
        """将数据库行转换为 Template 对象"""
        return Template(
            id=row['id'],
            name=row['name'],
            title_template=row['title_template'] or '',
            description_template=row['description_template'] or '',
            category_id=row['category_id'],
            priority=row['priority'],
            start_time=row['start_time'],
            end_time=row['end_time'],
            use_count=row['use_count'],
            is_default=bool(row['is_default']),
            created_at=row['created_at'] or '',
        )
