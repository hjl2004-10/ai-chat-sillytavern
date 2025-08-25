#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
环境检查工具 - AI Chat System
用于诊断Python环境和依赖问题
"""

import sys
import platform
import subprocess
from pathlib import Path

def print_header():
    """打印头部信息"""
    print("=" * 50)
    print("   AI Chat System - 环境诊断工具")
    print("=" * 50)
    print()

def check_python():
    """检查Python版本"""
    print("【Python 环境】")
    print(f"Python 版本: {sys.version}")
    print(f"Python 路径: {sys.executable}")
    print(f"平台: {platform.platform()}")
    
    # 检查版本是否满足要求
    if sys.version_info < (3, 7):
        print("⚠ 警告: Python 版本过低，建议使用 3.7 或更高版本")
        return False
    else:
        print("✓ Python 版本符合要求")
        return True
    print()

def check_pip():
    """检查pip"""
    print("\n【Pip 包管理器】")
    try:
        import pip
        print(f"✓ pip 已安装")
        # 获取pip版本
        result = subprocess.run([sys.executable, "-m", "pip", "--version"], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"pip 信息: {result.stdout.strip()}")
        return True
    except ImportError:
        print("✗ pip 未安装")
        print("请运行: python -m ensurepip --default-pip")
        return False

def check_package(package_name, import_name=None):
    """检查单个包是否安装"""
    if import_name is None:
        import_name = package_name.lower().replace("-", "_")
    
    try:
        __import__(import_name)
        # 获取版本信息
        try:
            module = sys.modules[import_name]
            version = getattr(module, "__version__", "未知版本")
            print(f"  ✓ {package_name}: {version}")
            return True
        except:
            print(f"  ✓ {package_name}: 已安装")
            return True
    except ImportError:
        print(f"  ✗ {package_name}: 未安装")
        return False

def check_dependencies():
    """检查项目依赖"""
    print("\n【项目依赖检查】")
    
    required_packages = [
        ("Flask", "flask"),
        ("Flask-Cors", "flask_cors"),
        ("requests", "requests")
    ]
    
    all_installed = True
    missing_packages = []
    
    for package, import_name in required_packages:
        if not check_package(package, import_name):
            all_installed = False
            missing_packages.append(package)
    
    if all_installed:
        print("\n✓ 所有依赖已安装")
    else:
        print(f"\n✗ 缺少以下依赖: {', '.join(missing_packages)}")
        print("\n安装命令:")
        print(f"  pip install {' '.join(missing_packages)}")
        print("\n或使用国内镜像:")
        print(f"  pip install {' '.join(missing_packages)} -i https://pypi.tuna.tsinghua.edu.cn/simple")
    
    return all_installed

def check_project_files():
    """检查项目文件"""
    print("\n【项目文件检查】")
    
    required_files = [
        "server.py",
        "final.html",
        "script.js",
        "styles.css",
        "characters.js",
        "world.js",
        "prompt-manager.js",
        "user-persona.js"
    ]
    
    all_exist = True
    for file in required_files:
        if Path(file).exists():
            print(f"  ✓ {file}")
        else:
            print(f"  ✗ {file} - 文件缺失")
            all_exist = False
    
    if all_exist:
        print("\n✓ 所有项目文件完整")
    else:
        print("\n✗ 部分项目文件缺失，请检查是否完整下载")
    
    return all_exist

def check_port():
    """检查端口5000是否可用"""
    print("\n【端口检查】")
    import socket
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', 5000))
    sock.close()
    
    if result == 0:
        print("⚠ 端口 5000 已被占用")
        print("  可能已有服务器在运行，或被其他程序占用")
        return False
    else:
        print("✓ 端口 5000 可用")
        return True

def main():
    """主函数"""
    print_header()
    
    # 运行所有检查
    results = {
        "Python": check_python(),
        "Pip": check_pip(),
        "依赖": check_dependencies(),
        "文件": check_project_files(),
        "端口": check_port()
    }
    
    # 总结
    print("\n" + "=" * 50)
    print("【诊断结果】")
    
    all_pass = all(results.values())
    
    if all_pass:
        print("✅ 环境检查通过！可以运行 start.bat 启动服务器")
    else:
        print("❌ 发现以下问题:")
        for name, status in results.items():
            if not status:
                print(f"  - {name} 检查未通过")
        print("\n请根据上述提示修复问题后再启动服务器")
    
    print("=" * 50)
    
    return 0 if all_pass else 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n错误: {e}")
        sys.exit(1)