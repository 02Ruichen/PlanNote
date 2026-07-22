"""
程序入口模块
创建 App 实例并启动主循环
"""
import sys
import os

# 确保能找到 planner 包
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import App


def main():
    """程序主入口"""
    app = App()
    app.run()


if __name__ == '__main__':
    main()
