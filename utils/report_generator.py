"""
周报自动生成模块
一键提取本周数据 → DeepSeek AI 归纳分类 → 输出标准 docx 周报
全程自动化，用户只需点击一次按钮
"""
import os
import re
from datetime import date, timedelta
from database import DatabaseManager
import config


def generate_weekly_report(db_or_path, start_date: str, end_date: str, output_dir: str = None):
    """
    一键生成周报的主入口。线程安全——内部自建数据库连接。
    Args:
        db_or_path: DatabaseManager 实例 或 数据库路径字符串
        start_date: 起始日期 YYYY-MM-DD
        end_date: 结束日期 YYYY-MM-DD
        output_dir: 输出目录
    Returns:
        (success: bool, message: str, filepath: str or None)
    """
    # ---- 线程安全：自建数据库连接 ----
    if isinstance(db_or_path, str):
        db = DatabaseManager(db_or_path)
        own_db = True
    else:
        db = DatabaseManager(db_or_path.db_path)  # 用路径建新连接，避免跨线程问题
        own_db = True

    try:
        result = _do_generate(db, start_date, end_date, output_dir)
        return result
    finally:
        if own_db:
            db.close()


def _do_generate(db, start_date, end_date, output_dir):
    """实际的生成逻辑"""
    # ---- Step 1: 拉取本周数据 ----
    plans = db.get_plans_by_date_range(start_date, end_date)
    if not plans:
        return False, f'{start_date} 至 {end_date} 期间没有任务记录，请先在日计划中录入。', None

    # 按日期分组
    categories = db.get_all_categories()
    cat_map = {c.id: c.name for c in categories}

    daily_summary = {}
    for plan in plans:
        day = plan.plan_date
        if day not in daily_summary:
            daily_summary[day] = []
        cat_name = cat_map.get(plan.category_id, '其他')
        daily_summary[day].append({
            'title': plan.title,
            'desc': plan.description,
            'category': cat_name,
            'status': plan.status,
            'priority': plan.priority,
        })

    # 格式化为可读文本
    sorted_days = sorted(daily_summary.keys())
    daily_texts = []
    for day in sorted_days:
        # 转换为周几
        dt = date.fromisoformat(day)
        weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        wd = weekdays[dt.weekday()]
        items = daily_summary[day]
        item_texts = [f'  {i+1}. [{it["category"]}] {it["title"]}'
                      + (f' — {it["desc"]}' if it.get("desc") else '')
                      for i, it in enumerate(items)]
        daily_texts.append(f'{day} ({wd}):\n' + '\n'.join(item_texts))
    raw_data = '\n\n'.join(daily_texts)

    # ---- Step 2: 调用 DeepSeek AI 归纳 ----
    # 加载周报模板风格参考
    template_style = _load_template_style()

    system_prompt = f"""你是周报撰写助手。根据用户提供的一周工作日志，生成标准格式的周报。

【输出格式 - 必须严格遵循！】

{template_style}

【格式要求】
1. 第一行：刘芮辰
2. 第二行：（YYYY.MM.DD - MM.DD）格式的日期
3. 【本周工作内容】下按工作大类编号（1. 2. 3.），每个大类下列(1)(2)(3)子项
4. 类别命名：会务与活动执行、文宣与通知发布、人事与资料管理、财务与流程跟进、活动策划与表单制作 等，根据实际内容灵活归类
5. 将相似任务合并到同一大类下，每个大类2-4条子项，总共5-8个大类
6. 语言风格：正式汇报语气，动词开头（完成/推进/撰写/协助/整理/参与/跟进），每条一句话概括
7. 【下周工作计划】基于上周趋势和未完成事项，推测5-8条合理计划，编号列出
8. 直接输出最终周报内容，不要任何额外解释"""

    user_prompt = f"请根据以下每日工作记录生成周报：\n\n{raw_data}"

    ai_reply = _call_deepseek(system_prompt, user_prompt)
    if ai_reply is None:
        return False, 'DeepSeek API 调用失败，请检查 API Key 配置。', None

    # ---- Step 3: 解析 AI 回复并生成 docx ----
    if output_dir is None:
        output_dir = os.path.dirname(os.path.abspath(__file__))

    # 解析年月日生成文件名
    sd = date.fromisoformat(start_date)
    ed = date.fromisoformat(end_date)
    filename = f'周报{sd.month}.{sd.day}-{ed.month}.{ed.day}.docx'
    filepath = os.path.join(output_dir, filename)

    try:
        _create_docx(ai_reply, sd, ed, filepath)
        return True, f'周报已生成：{filename}', filepath
    except Exception as e:
        return False, f'生成文档失败：{str(e)}', None


# ============================================================
# 内部辅助
# ============================================================

_db_manager = None  # 模块级缓存

def _load_template_style():
    """加载周报模板风格"""
    return """
刘芮辰
（2026.07.13 - 07.17）
【本周工作内容】
1. 会务与活动执行
   (1) 制作座位表、签到表并打印，完成开营仪式踩点布场与彩排
   (2) 担任仪式中控，负责嘉宾接待、学生引导及参访带队
   (3) 会后盘点物料，完成整理归档
2. 文宣与通知发布
   (1) 优化校对执委会专项计划开营仪式主持稿、新闻稿
   (2) 排布乘车安排并草拟乘车通知
3. 人事与资料管理
   (1) 梳理专项实习生电子资料，列出缺漏清单
   (2) 整理粤港澳大湾区计划实习生入职资料
   (3) 核对并填写专项与大湾区参保表格
4. 财务与流程跟进
   (1) 处理"通琴号"实习证明用印OA申请以及原件扫描归档
   (2) 打印归档研学、摄影摄像、借款纸质材料
   (3) 推进专项职业课合同OA流程
5. 活动策划与表单制作
   (1) 构思业余小活动方案，制作活动安排表及拼豆活动在线收集表
   (2) 制作粤港澳大湾区银行账户信息收集表

【下周工作计划】
1. 参与跟进执委会专项趣味拼豆活动的全流程执行与现场协调
2. 持续跟进执委会专项计划与粤港澳大湾区计划的材料补充和归档工作
3. 协助项目各环节OA申报工作
4. 协助执委会专项计划与粤港澳大湾区计划银行信息收集与反馈工作
5. 筹备专项职业课程后续对接及物料准备
6. 完成并及时协助其他领导交办的任务和事项
"""


def _call_deepseek(system_prompt, user_content):
    """调用 DeepSeek API 生成周报"""
    try:
        from openai import OpenAI
        import config as cfg

        # 加载 API Key
        key_file = os.path.join(cfg.DB_DIR, '.apikey')
        api_key = None
        if os.path.exists(key_file):
            with open(key_file, 'r', encoding='utf-8') as f:
                api_key = f.read().strip()
        if not api_key:
            return None

        client = OpenAI(api_key=api_key, base_url='https://api.deepseek.com')
        response = client.chat.completions.create(
            model='deepseek-chat',
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_content},
            ],
            max_tokens=2048,
            temperature=0.7,
        )
        return response.choices[0].message.content
    except Exception:
        return None


def _set_font(run, font_name='宋体', size=None, bold=False):
    """正确设置中文字体（含东亚字体属性）"""
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
    run.font.name = font_name
    if size:
        run.font.size = size
    run.font.bold = bold
    # 设置东亚字体
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.insert(0, rFonts)
    rFonts.set(qn('w:eastAsia'), font_name)


def _create_docx(content, start_date: date, end_date: date, filepath: str):
    """将 AI 生成的内容写入 docx 文件"""
    from docx import Document
    from docx.shared import Pt, Cm
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement

    doc = Document()

    # 设置默认样式
    style = doc.styles['Normal']
    style.font.name = '宋体'
    style.font.size = Pt(11)
    style.paragraph_format.line_spacing = 1.5
    # 东亚字体
    rPr = style.element.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.insert(0, rFonts)
    rFonts.set(qn('w:eastAsia'), '宋体')

    # 解析内容：分离 姓名/日期/上周总结/本周计划
    lines = content.strip().split('\n')
    body_lines = []
    name_line = '刘芮辰'
    date_line = f'{start_date.year}-{end_date.month}-{end_date.day}'

    # 尝试从AI回复中提取姓名和日期，否则用默认值
    for line in lines:
        stripped = line.strip()
        # 跳过空行
        if not stripped:
            continue
        # 检测姓名行（第一行非空且不含特殊标记）
        if stripped and not any(kw in stripped for kw in ['上周', '本周', '工作', '【', '】', '(1)', '1.', '日期']):
            if len(stripped) < 10 and '：' not in stripped and ':' not in stripped:
                name_line = stripped
                continue
        # 检测日期行
        if '2026' in stripped or '2025' in stripped or '2027' in stripped:
            date_line = stripped
            continue
        body_lines.append(stripped)

    # ---- 标题（姓名） ----
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run(name_line)
    run.font.size = Pt(14)
    run.font.bold = True
    _set_font(run, '宋体')

    # ---- 日期 ----
    p = doc.add_paragraph()
    run = p.add_run(date_line)
    run.font.size = Pt(11)
    _set_font(run, '宋体')

    # ---- 正文 ----
    body_text = '\n'.join(body_lines)

    # 按【本周工作内容】和【下周工作计划】分段
    section_pattern = '本周工作内容'
    if section_pattern in body_text:
        parts = body_text.split('【下周工作计划】', 1)
        work_content = parts[0].replace('【本周工作内容】', '').strip()
        work_plan = parts[1].strip() if len(parts) > 1 else ''

        # 【本周工作内容】
        p = doc.add_paragraph()
        run = p.add_run('【本周工作内容】')
        run.font.size = Pt(12)
        run.font.bold = True
        _set_font(run, '宋体')

        for line in work_content.split('\n'):
            line = line.strip()
            if not line:
                continue
            p = doc.add_paragraph()
            run = p.add_run(line)
            # 大类标题加粗
            if line and line[0].isdigit() and '. ' in line[:4]:
                run.font.size = Pt(11)
                run.font.bold = True
            else:
                run.font.size = Pt(11)
            _set_font(run, '宋体')

        # 空行
        doc.add_paragraph()

        # 【下周工作计划】
        p = doc.add_paragraph()
        run = p.add_run('【下周工作计划】')
        run.font.size = Pt(12)
        run.font.bold = True
        _set_font(run, '宋体')

        for line in work_plan.split('\n'):
            line = line.strip()
            if not line:
                continue
            p = doc.add_paragraph()
            run = p.add_run(line)
            run.font.size = Pt(11)
            _set_font(run, '宋体')
    else:
        # AI 没有按标准格式，直接输出
        for line in body_lines:
            line = line.strip()
            if not line:
                continue
            p = doc.add_paragraph()
            run = p.add_run(line)
            run.font.size = Pt(11)
            _set_font(run, '宋体')

    doc.save(filepath)
