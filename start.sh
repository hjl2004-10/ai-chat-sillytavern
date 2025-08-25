#!/bin/bash

# 设置颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

clear

echo -e "${BLUE}========================================"
echo "   AI Chat System - 智能启动程序 v2.0"
echo "   兼容 SillyTavern 格式"
echo "========================================${NC}"
echo

# 检查Python是否安装
echo -e "${YELLOW}[1/3] 检查 Python 环境...${NC}"
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${RED}❌ 未检测到 Python！${NC}"
    echo
    echo "请先安装 Python 3.8 或更高版本："
    echo
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macOS 用户请运行: brew install python3"
    elif [[ -f /etc/debian_version ]]; then
        echo "Debian/Ubuntu 用户请运行: sudo apt-get install python3 python3-pip"
    elif [[ -f /etc/redhat-release ]]; then
        echo "RHEL/CentOS 用户请运行: sudo yum install python3 python3-pip"
    else
        echo "请访问: https://www.python.org/downloads/"
    fi
    echo
    exit 1
fi

# 确定Python命令
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    PIP_CMD="pip3"
else
    PYTHON_CMD="python"
    PIP_CMD="pip"
fi

# 显示Python版本
PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | cut -d' ' -f2)
echo -e "${GREEN}✓ 检测到 Python $PYTHON_VERSION${NC}"
echo

# 检查pip是否可用
echo -e "${YELLOW}[2/3] 检查 pip 包管理器...${NC}"
if ! command -v $PIP_CMD &> /dev/null; then
    echo -e "${YELLOW}⚠ pip 不可用，正在安装...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "请运行: brew install python3"
    elif [[ -f /etc/debian_version ]]; then
        sudo apt-get install -y python3-pip
    elif [[ -f /etc/redhat-release ]]; then
        sudo yum install -y python3-pip
    else
        $PYTHON_CMD -m ensurepip --default-pip
    fi
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ pip 安装失败！${NC}"
        echo "请手动安装 pip 或重新安装 Python"
        exit 1
    fi
fi
echo -e "${GREEN}✓ pip 已就绪${NC}"
echo

# 检查并安装依赖
echo -e "${YELLOW}[3/3] 检查项目依赖...${NC}"
echo

# 创建虚拟环境（可选）
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}创建虚拟环境...${NC}"
    $PYTHON_CMD -m venv venv
    source venv/bin/activate
else
    source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
fi

# 安装依赖函数
install_package() {
    local package=$1
    local import_name=$2
    
    $PYTHON_CMD -c "import $import_name" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}📦 正在安装 $package...${NC}"
        $PIP_CMD install $package --quiet
        if [ $? -ne 0 ]; then
            echo -e "${YELLOW}⚠ $package 安装失败，尝试使用国内镜像...${NC}"
            $PIP_CMD install $package -i https://pypi.tuna.tsinghua.edu.cn/simple --quiet
        fi
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ $package 安装成功${NC}"
        else
            echo -e "${RED}❌ $package 安装失败${NC}"
            return 1
        fi
    else
        echo -e "${GREEN}✓ $package 已安装${NC}"
    fi
    return 0
}

# 检查并安装依赖
install_package "Flask" "flask"
install_package "Flask-Cors" "flask_cors"
install_package "requests" "requests"

echo
echo -e "${GREEN}========================================"
echo "✅ 环境检查完成！"
echo "========================================${NC}"
echo
echo -e "${BLUE}🚀 正在启动服务器...${NC}"
echo
echo "服务器地址: http://localhost:5000"
echo "按 Ctrl+C 停止服务器"
echo
echo "========================================"
echo

# 启动服务器
$PYTHON_CMD server.py

if [ $? -ne 0 ]; then
    echo
    echo -e "${RED}❌ 服务器启动失败！${NC}"
    echo "请检查错误信息"
    echo
fi