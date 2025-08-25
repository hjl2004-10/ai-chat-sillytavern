# AI 对话系统 v2.0.0 🚀

一个完全兼容 SillyTavern 数据格式的智能 AI 对话系统，支持 OpenAI 兼容的 API 接口。

## 🌟 最新更新 (v2.0.0)

### 新增功能
- ✨ **角色名称显示**: 在对话框顶部显示当前角色名称，支持开关控制
- 🔄 **实时历史更新**: 新对话立即显示在历史列表中
- 🎯 **智能启动脚本**: 自动检测环境并安装依赖
- 📦 **一键安装程序**: Windows用户可使用install.bat完成所有配置
- 🔍 **环境诊断工具**: check_env.py可检测并修复环境问题

### 改进优化
- 优化了侧边栏布局，更加紧凑
- 改进了历史切换时的角色同步
- 增强了设置持久化功能

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
│   └── CLAUDE.md          # 开发指南
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

### 开发中 🔄
- [ ] 多角色群聊模式
- [ ] 语音输入输出
- [ ] 插件系统
- [ ] 主题切换

### 计划中 📋
- [ ] 移动端适配
- [ ] 云端同步
- [ ] 多语言支持
- [ ] AI 绘图集成

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
- OpenAI 提供的 API 接口标准
- 所有贡献者和用户的支持

---

💖 如果这个项目对你有帮助，请给个 Star！

📧 问题反馈：[创建 Issue](https://github.com/your-repo/issues)

🔗 项目主页：[AI Chat System](https://github.com/your-repo)