# AI 对话系统 v2.5.0 🚀

简体中文 | [English](./README.en.md)

一个完全兼容 SillyTavern 数据格式的智能 AI 对话系统，支持 OpenAI 兼容的 API 接口。

## 🌟 最新更新 (v2.5.0)

### 🎯 新增功能
- 📄 **文档上传与解析系统**: 智能文档处理功能
  - 支持多种文档格式（PDF、Word、Excel、PPT、JSON、TXT等）
  - 拖拽上传或点击上传
  - 实时文档预览和内容提取
  - 文档内容自动附加到对话
  - 使用开源Unstructured库，支持高级解析
  - 轻量级备用解析器（PyPDF2）
## 📝 版本说明

### 分支管理
- **main分支**: v2.5.0及后续扩展版本（包含文档解析等新功能，但是稳定性不好，学习建议用2.4版）
- **stable-v2.4分支**: 稳定版本，保持原生SillyTavern兼容性

> 如果您需要稳定的原生功能版本，请切换到 `stable-v2.4` 分支：
> ```bash
> git checkout stable-v2.4
> ```

### ⚠️ 重要提示
- **新增依赖**: 需要安装 `PyPDF2` 以支持PDF解析
  ```bash
  pip install PyPDF2
  # 或使用完整安装
  pip install -r requirements.txt
  ```
- **可选高级依赖**: 安装 `unstructured` 以支持更多格式（Word、Excel、PPT等）
  ```bash
  pip install unstructured[all-docs]
  ```

### 🛠️ 系统优化
- **HTML渲染器改进**:
  - 严格限制渲染范围，仅在对话区域生效
  - 修复深度控制，确保按设定层数渲染
  - 优化清除机制，旧渲染自动移除
- **界面优化**:
  - 修复移动端侧边栏点击关闭问题
  - 正则脚本列表显示优化（字数限制+HTML转义）
  - 修复历史对话数量实时更新问题

### 🐛 Bug修复
- 修复流式响应后HTML未立即渲染的问题
- 修复历史对话切换后内容丢失的问题
- 修复HTML代码块换行显示问题
- 防止设置界面的HTML被意外渲染



---

## 📜 历史版本

### v2.4.0 更新
- 🔄 **正则表达式替换系统**: 强大的文本处理功能
  - 支持全局和角色专属正则脚本
  - 实时测试和预览替换效果
  - 支持捕获组和复杂模式匹配

### v2.3.0 更新

### 🔥 重要修复
- 🔧 **配置文件问题修复**: 解决了手机端通过IP访问时配置无法保存的问题
- 🎨 **消息样式优化**: 修复了AI消息按钮占用文字空间的布局问题
- 📱 **移动端体验优化**: 侧边栏调整为半屏显示，不再全屏遮挡

### v2.1.0 更新
- ✨ **文本装饰器系统**: 支持文本高亮、删除线、颜色标记等富文本编辑
- 🎨 **富文本编辑工具栏**: 便捷的文本格式化按钮
- 📝 **Markdown预览**: 实时预览Markdown格式的文本效果
- 🚀 **服务器部署优化**: 使用绝对路径管理，支持多服务器部署
- 💾 **数据迁移便捷**: 直接复制data文件夹即可完成全部数据迁移

### v2.0.0 更新
- ✨ 角色名称显示控制
- 🔄 实时历史更新
- 🎯 智能启动脚本
- 📦 一键安装程序
- 🔍 环境诊断工具

## ✅ 核心功能

### 对话功能
- 🤖 OpenAI 兼容 API 接口（支持各种第三方中转）
- 📡 流式和非流式对话输出
- 💬 完整的上下文管理
- 💾 聊天记录自动保存（SillyTavern JSONL 格式）
- 🎯 实时历史列表更新

### 角色系统
- 👤 角色卡导入/导出（兼容 SillyTavern spec_v2 格式）
- 🎭 角色名称实时显示
- 🔄 角色切换自动同步
- 📚 角色收藏和管理

### 世界书功能
- 📖 世界书条目管理
- 🔍 关键词触发机制
- 📊 优先级和顺序控制
- 💼 批量导入导出

### 预设管理
- ⚙️ 完整的预设系统（兼容 SillyTavern 格式）
- 📝 自定义系统提示词
- 🎨 多种预设模板
- 💾 预设导入导出

### 用户设置
- 🎨 用户角色自定义
- 🖼️ 头像上传和管理
- ⚡ API 配置管理
- 🎛️ 参数调节（温度、令牌数等）

## 📱 安卓 Termux 部署

### 完整安装步骤

#### 步骤 1：准备工作
```bash
# 打开 Termux，给存储权限（第一次使用）
termux-setup-storage
```

#### 步骤 2：退出 Ubuntu（如果你之前安装过）
```bash
# 如果你在 Ubuntu 环境中，先退出
exit  # 可能需要输入两次
```

#### 步骤 3：更新系统
```bash
# 更新 Termux 包管理器
pkg update && pkg upgrade -y
```

#### 步骤 4：安装必要软件
```bash
# 安装 Python、Git 和 SSL 支持
pkg install -y openssl ca-certificates python git
```

#### 步骤 5：安装 Python 依赖包
```bash
# 尝试安装依赖
pip install flask flask-cors requests
```

**⚠️ 如果步骤 5 出现 SSL 错误：**
```bash
# 修复 SSL 问题
pkg reinstall openssl ca-certificates python
python -m ensurepip --upgrade
# 设置国内镜像源
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
# 重新安装依赖
pip install flask flask-cors requests
```

#### 步骤 6：克隆项目
```bash
# 进入主目录并克隆
cd ~
git clone https://github.com/hjl2004-10/ai-chat-sillytavern.git
cd ai-chat-sillytavern
```

#### 步骤 7：启动服务
```bash
# 运行服务器
python server.py
# 服务器将在 http://localhost:5000 启动
```

#### 步骤 8：访问应用
打开手机浏览器，访问：`http://localhost:5000`

### 常见问题解决

**问题：SSL 证书错误**
```bash
pkg reinstall openssl ca-certificates python
python -m ensurepip --upgrade
```

**问题：pip 安装超时**
```bash
# 使用国内镜像
pip config set global.index-url https://pypi.doubanio.com/simple
# 或阿里云镜像
pip config set global.index-url https://mirrors.aliyun.com/pypi/simple
```

**问题：git clone 失败**
```bash
# 直接下载 zip 文件
wget https://github.com/hjl2004-10/ai-chat-sillytavern/archive/refs/heads/main.zip
unzip main.zip
cd ai-chat-sillytavern-main
```

### 🔄 Ubuntu 环境切换

**如何重新进入 Ubuntu（如果需要）**
```bash
# 进入 Ubuntu 环境
proot-distro login ubuntu
# 或者简写
pd login ubuntu

# 退出 Ubuntu 回到 Termux
exit  # 可能需要输入两次
```

**完全卸载 Ubuntu（如果不再需要）**
```bash
pkg uninstall proot-distro
```

## 🚀 快速开始

### 方式一：智能启动（推荐）

#### Windows 用户
```bash
# 双击运行
start.bat
```

#### Linux/Mac 用户
```bash
# 添加执行权限并运行
chmod +x start.sh
./start.sh
```

**智能启动脚本会自动：**
- ✅ 检测 Python 环境
- ✅ 安装缺失的依赖
- ✅ 启动后端服务器
- ✅ 显示访问地址

### 方式二：一键安装（Windows）

```bash
# 双击运行（需要管理员权限）
install.bat
```

**安装程序会自动：**
- 📥 下载并安装 Python（如果未安装）
- 📦 安装所有项目依赖
- 🔗 创建桌面快捷方式
- 🚀 启动应用程序

### 方式三：手动安装

1. **安装 Python 3.8+**
   - 下载地址：https://www.python.org/downloads/
   - 安装时勾选 "Add Python to PATH"

2. **安装依赖**
   ```bash
   pip install -r requirements.txt
   # 或使用国内镜像
   pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
   ```

3. **启动服务器**
   ```bash
   python server.py
   ```

4. **访问应用**
   - 打开浏览器访问：http://localhost:5000

## ⚙️ 配置指南

### API 配置

1. **打开设置面板**
   - 点击右上角的设置按钮（⚙️ 图标）

2. **填写 API 信息**
   - **API地址**: 
     - OpenAI官方: `https://api.openai.com/v1`
     - 国内中转: `https://api.example.com/v1`
   - **API密钥**: 你的 API Key
   - **模型选择**: 点击"选择模型"按钮

3. **调整参数**
   - **温度** (0-2): 控制回复的创造性
   - **最大令牌数**: 控制回复长度
   - **流式输出**: 实时显示生成内容

### 角色配置

1. **导入角色卡**
   - 点击侧边栏"角色"按钮
   - 支持 PNG 图片格式（内嵌数据）
   - 支持 JSON 格式（spec_v2）

2. **角色显示控制**
   - 在侧边栏找到"角色名显示"开关
   - 开启后对话框顶部显示当前角色
   - 切换历史时自动更新角色

### 环境诊断

如遇到问题，运行诊断工具：
```bash
python check_env.py
```

诊断工具会检查：
- ✅ Python 版本
- ✅ 依赖包安装
- ✅ 项目文件完整性
- ✅ 端口可用性

## 数据格式说明

### 聊天记录格式
聊天记录保存在 `data/chats/` 目录下，使用 JSONL 格式（与 SillyTavern 兼容）：

```json
{"name":"You","is_user":true,"is_system":false,"send_date":"2024-01-01T12:00:00","mes":"用户消息内容","swipes":["用户消息内容"],"swipe_id":0}
{"name":"Assistant","is_user":false,"is_system":false,"send_date":"2024-01-01T12:00:01","mes":"AI回复内容","swipes":["AI回复内容"],"swipe_id":0}
```

### 上下文格式
上下文使用标准的 OpenAI 消息格式：

```json
[
  {"role": "user", "content": "用户消息"},
  {"role": "assistant", "content": "AI回复"}
]
```

## 📁 项目结构

```
A:\1前端计划\
├── 🎯 核心文件
│   ├── final.html          # 主界面
│   ├── script.js           # 核心逻辑
│   ├── styles.css          # 界面样式
│   └── server.py           # 后端服务
│
├── 🧩 功能模块
│   ├── characters.js       # 角色管理
│   ├── world.js           # 世界书系统
│   ├── prompt-manager.js   # 预设管理
│   ├── user-persona.js     # 用户设置
│   └── ai-settings.js      # AI参数配置
│
├── 🚀 启动脚本
│   ├── start.bat          # Windows智能启动
│   ├── start.sh           # Linux/Mac智能启动
│   ├── install.bat        # Windows一键安装
│   └── check_env.py       # 环境诊断工具
│
├── 📦 配置文件
│   ├── requirements.txt   # Python依赖
│  
│
└── 💾 数据目录
    └── data/
        ├── chats/         # 聊天记录 (JSONL)
        ├── characters/    # 角色卡 (JSON)
        ├── worlds/        # 世界书 (JSON)
        ├── presets/       # 预设配置 (JSON)
        └── config.json    # 全局配置
```

## 🎯 发展路线

### 已完成 ✅
- [x] 角色卡系统（完全兼容 SillyTavern）
- [x] 世界书功能（关键词触发机制）
- [x] 预设管理系统（导入/导出）
- [x] 聊天历史管理
- [x] 角色名称显示控制
- [x] 智能启动脚本
- [x] 环境自动配置
- [x] html修饰
- [x] 正则表达式
- [x] 文件上传与转化
### 开发中 🔄
暂时停止

### 计划中 📋
暂时停止

## 🔄 SillyTavern 兼容性

### 完全兼容 ✅
- ✅ **聊天记录**: JSONL 格式，可双向导入导出
- ✅ **角色卡**: spec_v2 格式，支持 PNG 和 JSON
- ✅ **世界书**: 相同的条目结构和触发机制
- ✅ **预设系统**: 兼容的提示词格式
- ✅ **API 配置**: 相同的接口规范

### 数据互通
```
SillyTavern ←→ AI Chat System
     ↓              ↓
  [导出文件]    [导出文件]
     ↓              ↓
   可互相导入和使用
```

## ⚠️ 注意事项

### 系统要求
- **Python**: 3.8 或更高版本
- **浏览器**: Chrome/Edge/Firefox 最新版
- **内存**: 建议 4GB 以上
- **网络**: 需要访问 API 服务

### 安全建议
- 🔐 API 密钥请妥善保管，不要分享或上传
- 💾 重要对话请定期备份
- 🔒 不要在公共网络使用敏感 API
- 📁 数据文件建议定期备份

### 常见问题

**Q: 服务器启动失败？**
A: 运行 `python check_env.py` 进行诊断

**Q: 无法连接到 API？**
A: 检查网络和 API 密钥是否正确

**Q: 角色卡导入失败？**
A: 确保文件格式为 spec_v2 标准

**Q: 端口 5000 被占用？**
A: 关闭占用程序或修改 server.py 中的端口

## 🛠️ 技术栈

### 前端技术
- **框架**: 原生 JavaScript (无依赖)
- **样式**: CSS3 + Flexbox/Grid
- **存储**: LocalStorage + IndexedDB
- **通信**: Fetch API + EventSource

### 后端技术
- **框架**: Flask 3.0
- **跨域**: Flask-CORS
- **请求**: Requests
- **数据**: JSON/JSONL 文件存储

### 开发工具
- **版本控制**: Git
- **包管理**: pip/requirements.txt
- **诊断工具**: check_env.py

## 👥 贡献指南

### 如何贡献
1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 开发规范
- 代码风格遵循项目现有规范
- 新功能需保持 SillyTavern 兼容性
- 提交信息使用中文或英文均可
- 重要更改请更新文档

## 📄 许可证

MIT License - 自由使用和修改

## 🙏 致谢

- SillyTavern 项目提供的数据格式规范
- OpenAI 提供的 API 接口标准和open-web-ui界面示例
- 所有贡献者和用户的支持

---

💖 如果这个项目对你有帮助，请给个 Star！

📧 问题反馈：3353467972@qq.com
