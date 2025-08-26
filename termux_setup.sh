#!/data/data/com.termux/files/usr/bin/bash

echo "==================================="
echo "   AI Chat SillyTavern Termux Setup"
echo "==================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查是否在Termux环境
if [ ! -d "/data/data/com.termux" ]; then
    echo -e "${RED}错误: 此脚本只能在Termux环境中运行${NC}"
    exit 1
fi

echo -e "${YELLOW}步骤 1: 更新包管理器...${NC}"
pkg update -y && pkg upgrade -y

echo -e "${YELLOW}步骤 2: 安装必要的包...${NC}"
pkg install -y python git nano wget

echo -e "${YELLOW}步骤 3: 安装Python包...${NC}"
pip install --upgrade pip
pip install flask flask-cors requests

echo -e "${YELLOW}步骤 4: 创建必要的目录...${NC}"
mkdir -p ~/ai-chat-sillytavern/data
mkdir -p ~/ai-chat-sillytavern/logs
mkdir -p ~/ai-chat-sillytavern/data/characters
mkdir -p ~/ai-chat-sillytavern/data/worlds
mkdir -p ~/ai-chat-sillytavern/data/chats
mkdir -p ~/ai-chat-sillytavern/data/presets

echo -e "${YELLOW}步骤 5: 获取本机IP地址...${NC}"
# 获取WiFi IP地址
IP=$(ip addr show wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
if [ -z "$IP" ]; then
    IP="localhost"
    echo -e "${YELLOW}警告: 无法获取WiFi IP，使用localhost${NC}"
else
    echo -e "${GREEN}检测到IP地址: $IP${NC}"
fi

echo -e "${YELLOW}步骤 6: 创建启动脚本...${NC}"
cat > ~/ai-chat-sillytavern/start.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取IP地址
IP=$(ip addr show wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
if [ -z "$IP" ]; then
    IP="localhost"
fi

clear
echo -e "${BLUE}==================================="
echo "   AI Chat SillyTavern Server"
echo "===================================${NC}"
echo
echo -e "${GREEN}服务器正在启动...${NC}"
echo
echo -e "${YELLOW}访问地址:${NC}"
echo -e "  本地: ${GREEN}http://localhost:5000${NC}"
if [ "$IP" != "localhost" ]; then
    echo -e "  局域网: ${GREEN}http://$IP:5000${NC}"
fi
echo
echo -e "${YELLOW}提示:${NC}"
echo "  - 在同一WiFi下的其他设备也可以访问"
echo "  - 按 Ctrl+C 停止服务器"
echo "  - 日志文件: logs/ai_chat.log"
echo
echo -e "${BLUE}===================================${NC}"
echo

# 启动Python服务器
python server.py

EOF

chmod +x ~/ai-chat-sillytavern/start.sh

echo -e "${YELLOW}步骤 7: 创建后台运行脚本...${NC}"
cat > ~/ai-chat-sillytavern/start_background.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 检查是否已经在运行
if pgrep -f "python server.py" > /dev/null; then
    echo "服务器已经在运行中"
    echo "使用 './stop.sh' 停止服务器"
    exit 1
fi

# 后台运行服务器
nohup python server.py > logs/server.log 2>&1 &
echo $! > server.pid

IP=$(ip addr show wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
if [ -z "$IP" ]; then
    IP="localhost"
fi

echo "服务器已在后台启动"
echo "PID: $(cat server.pid)"
echo "访问地址: http://$IP:5000"
echo "日志文件: logs/server.log"
echo "使用 './stop.sh' 停止服务器"

EOF

chmod +x ~/ai-chat-sillytavern/start_background.sh

echo -e "${YELLOW}步骤 8: 创建停止脚本...${NC}"
cat > ~/ai-chat-sillytavern/stop.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

if [ -f server.pid ]; then
    PID=$(cat server.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "服务器已停止 (PID: $PID)"
        rm server.pid
    else
        echo "服务器进程不存在"
        rm server.pid
    fi
else
    # 尝试通过进程名停止
    if pgrep -f "python server.py" > /dev/null; then
        pkill -f "python server.py"
        echo "服务器已停止"
    else
        echo "服务器未运行"
    fi
fi

EOF

chmod +x ~/ai-chat-sillytavern/stop.sh

echo -e "${GREEN}==================================="
echo "   安装完成！"
echo "===================================${NC}"
echo
echo -e "${YELLOW}使用方法:${NC}"
echo "  1. 进入项目目录: cd ~/ai-chat-sillytavern"
echo "  2. 前台运行: ./start.sh"
echo "  3. 后台运行: ./start_background.sh"
echo "  4. 停止服务: ./stop.sh"
echo
echo -e "${YELLOW}访问地址:${NC}"
echo "  本地: http://localhost:5000"
if [ "$IP" != "localhost" ]; then
    echo "  局域网: http://$IP:5000"
fi
echo
echo -e "${GREEN}提示: 首次运行前，请确保已经克隆了项目代码${NC}"
echo "  git clone https://github.com/hjl2004-10/ai-chat-sillytavern.git"