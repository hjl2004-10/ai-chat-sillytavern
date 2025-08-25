@echo off
chcp 65001 >nul
color 0B

echo ╔════════════════════════════════════════╗
echo ║   AI Chat System - 一键安装程序       ║
echo ║   SillyTavern Compatible v2.0         ║
echo ╚════════════════════════════════════════╝
echo.

REM 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ 需要管理员权限来安装某些组件
    echo.
)

echo [步骤 1/4] 检查系统环境...
echo ─────────────────────────────
echo.

REM 检查Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未安装 Python
    echo.
    echo 是否自动下载并安装 Python? (Y/N)
    set /p install_python=
    if /i "%install_python%"=="Y" (
        echo 正在下载 Python 安装程序...
        powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.0/python-3.12.0-amd64.exe' -OutFile 'python_installer.exe'"
        echo.
        echo 正在安装 Python...
        echo 请在安装程序中勾选 "Add Python to PATH"
        start /wait python_installer.exe
        del python_installer.exe
        echo.
        echo Python 安装完成！请重新运行此脚本。
        pause
        exit
    ) else (
        echo 请手动安装 Python 后再运行此脚本
        echo 下载地址: https://www.python.org/downloads/
        pause
        exit
    )
) else (
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
    echo ✅ Python %PYTHON_VERSION% 已安装
)
echo.

echo [步骤 2/4] 升级 pip...
echo ─────────────────────────────
python -m pip install --upgrade pip --quiet
if %errorlevel% equ 0 (
    echo ✅ pip 已升级到最新版本
) else (
    echo ⚠ pip 升级失败，使用当前版本
)
echo.

echo [步骤 3/4] 安装项目依赖...
echo ─────────────────────────────
echo.

REM 如果存在requirements.txt，使用它安装
if exist requirements.txt (
    echo 📦 从 requirements.txt 安装依赖...
    python -m pip install -r requirements.txt --quiet
    if %errorlevel% neq 0 (
        echo ⚠ 部分依赖安装失败，尝试使用国内镜像...
        python -m pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple --quiet
    )
) else (
    echo 📦 安装 Flask...
    python -m pip install Flask --quiet
    
    echo 📦 安装 Flask-CORS...
    python -m pip install Flask-Cors --quiet
    
    echo 📦 安装 requests...
    python -m pip install requests --quiet
)

echo.
echo ✅ 依赖安装完成！
echo.

echo [步骤 4/4] 创建快捷方式...
echo ─────────────────────────────

REM 创建桌面快捷方式
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\AI Chat System.lnk'); $Shortcut.TargetPath = '%CD%\start.bat'; $Shortcut.WorkingDirectory = '%CD%'; $Shortcut.IconLocation = '%SystemRoot%\System32\shell32.dll,13'; $Shortcut.Save()"

if %errorlevel% equ 0 (
    echo ✅ 桌面快捷方式已创建
) else (
    echo ⚠ 快捷方式创建失败
)
echo.

echo ╔════════════════════════════════════════╗
echo ║         🎉 安装完成！                  ║
echo ╚════════════════════════════════════════╝
echo.
echo 您可以通过以下方式启动程序：
echo 1. 双击桌面上的 "AI Chat System" 快捷方式
echo 2. 运行 start.bat
echo.
echo 启动后访问: http://localhost:5000
echo.
echo 按任意键启动程序...
pause >nul

start.bat