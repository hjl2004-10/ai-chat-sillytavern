# AI 对话系统 - 精简版

一个兼容 SillyTavern 数据格式的轻量级 AI 对话系统，支持 OpenAI 兼容的 API 接口。

## 功能特点

✅ **已完成的功能**：
- OpenAI 兼容 API 接口（支持各种第三方中转）
- 流式和非流式对话输出
- 上下文管理（侧边栏显示）
- 聊天记录自动保存（SillyTavern JSONL 格式）
- 模型选择功能
- 设置面板（API配置、温度、令牌数等）

## 快速开始

### 1. 安装依赖

```bash
pip install flask flask-cors requests
```

### 2. 启动后端服务器

```bash
python server.py
```

服务器将在 http://localhost:5000 启动

### 3. 打开前端页面

直接在浏览器中打开 `final.html` 文件，或使用 Live Server 等工具。

### 4. 配置 API

1. 点击右上角的设置按钮（齿轮图标）
2. 填入你的 API 信息：
   - **API地址**: 例如 `https://api.openai.com/v1` 或其他兼容接口
   - **API密钥**: 你的 API Key
   - **其他参数**: 温度、最大令牌数、是否启用流式输出

3. 保存设置后，点击顶部的"选择一个模型"按钮选择可用的模型

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

## 目录结构

```
A:\1前端计划\
├── final.html          # 前端界面
├── script.js           # 前端逻辑
├── styles.css          # 样式文件
├── server.py           # Python 后端服务器
├── data/               # 数据存储目录
│   ├── chats/          # 聊天记录
│   ├── characters/     # 角色卡（预留）
│   ├── worlds/         # 世界书（预留）
│   ├── presets/        # 预设（预留）
│   └── config.json     # 配置文件
└── README.md           # 本文件
```

## 下一步计划

🚀 **即将添加的功能**：
- 角色卡系统（导入/导出，与 SillyTavern 兼容）
- 世界书功能（关键词触发的背景知识）
- 预设管理（保存和加载不同的 AI 参数配置）
- 聊天历史管理（加载、删除、导出）
- 多角色对话支持

## 兼容性说明

本系统设计为与 SillyTavern 完全兼容：
- ✅ 可以导入 SillyTavern 的聊天记录
- ✅ 使用相同的 JSONL 格式存储
- 🔄 角色卡格式兼容（开发中）
- 🔄 世界书格式兼容（开发中）
- 🔄 预设格式兼容（开发中）

## 注意事项

1. 确保 Python 环境已安装（推荐 Python 3.8+）
2. API 密钥请妥善保管，不要泄露
3. 聊天记录会自动保存在 `data/chats` 目录
4. 首次使用需要配置 API 信息才能正常对话

## 技术栈

- **前端**: HTML5 + CSS3 + 原生 JavaScript
- **后端**: Python Flask
- **数据存储**: 文件系统（JSON/JSONL）
- **API**: OpenAI 兼容格式

## 开发者信息

这是一个精简但功能完整的 AI 对话系统，专注于核心功能的实现。如有问题或建议，欢迎反馈！