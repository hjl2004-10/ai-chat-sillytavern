@echo off
chcp 65001 >nul
color 0A

echo ========================================
echo    AI Chat System - 智能启动程序 v2.0
echo    兼容 SillyTavern 格式
echo ========================================
echo.

REM 检查Python是否安装
echo [1/3] 检查 Python 环境...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ❌ 未检测到 Python！
    echo.
    echo 请先安装 Python 3.8 或更高版本：
    echo 下载地址： https://www.python.org/downloads/
    echo.
    echo 安装时请勾选 "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

REM 显示Python版本
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✓ 检测到 Python %PYTHON_VERSION%
echo.

REM 检查pip是否可用
echo [2/3] 检查 pip 包管理器...
python -m pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ pip 不可用，正在安装...
    python -m ensurepip --default-pip
    if %errorlevel% neq 0 (
        color 0C
        echo ❌ pip 安装失败！
        echo 请手动安装 pip 或重新安装 Python
        pause
        exit /b 1
    )
)
echo ✓ pip 已就绪
echo.

REM 检查并安装依赖
echo [3/3] 检查项目依赖...
echo.

REM 检查Flask
python -c "import flask" >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 正在安装 Flask...
    python -m pip install Flask --quiet
    if %errorlevel% neq 0 (
        echo ⚠ Flask 安装失败，尝试使用国内镜像...
        python -m pip install Flask -i https://pypi.tuna.tsinghua.edu.cn/simple --quiet
    )
) else (
    echo ✓ Flask 已安装
)

REM 检查Flask-CORS
python -c "import flask_cors" >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 正在安装 Flask-CORS...
    python -m pip install Flask-Cors --quiet
    if %errorlevel% neq 0 (
        echo ⚠ Flask-CORS 安装失败，尝试使用国内镜像...
        python -m pip install Flask-Cors -i https://pypi.tuna.tsinghua.edu.cn/simple --quiet
    )
) else (
    echo ✓ Flask-CORS 已安装
)

REM 检查requests
python -c "import requests" >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 正在安装 requests...
    python -m pip install requests --quiet
    if %errorlevel% neq 0 (
        echo ⚠ requests 安装失败，尝试使用国内镜像...
        python -m pip install requests -i https://pypi.tuna.tsinghua.edu.cn/simple --quiet
    )
) else (
    echo ✓ requests 已安装
)

echo.
echo ========================================
echo ✅ 环境检查完成！
echo ========================================
echo.
echo 🚀 正在启动服务器...
echo.
echo 服务器地址: http://localhost:5000
echo 按 Ctrl+C 停止服务器
echo.
echo ========================================
echo.

REM 启动服务器
python server.py

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ❌ 服务器启动失败！
    echo 请检查错误信息
    echo.
)

pause