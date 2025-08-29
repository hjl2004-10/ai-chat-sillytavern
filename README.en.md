# AI Chat System v2.2.0 🚀

[简体中文](./README.md) | English

A smart AI chat system fully compatible with SillyTavern data format, supporting OpenAI-compatible API interfaces.

## 🌟 Latest Updates (v2.2.0)

### 🔥 Important Fixes
- 🔧 **Config File Issue Fixed**: Resolved the issue where configuration cannot be saved when accessing via IP on mobile
- 🎨 **Message Style Optimization**: Fixed layout issue where AI message buttons occupied text space
- 📱 **Mobile Experience Optimization**: Sidebar adjusted to half-screen display, no longer full-screen blocking

### v2.1.0 Features
- ✨ **Text Decorator System**: Support for text highlighting, strikethrough, color marking and other rich text editing
- 🎨 **Rich Text Editing Toolbar**: Convenient text formatting buttons
- 📝 **Markdown Preview**: Real-time preview of Markdown formatted text
- 🚀 **Server Deployment Optimization**: Uses absolute path management, supports multi-server deployment
- 💾 **Convenient Data Migration**: Simply copy the data folder to complete all data migration

### v2.0.0 Features
- ✨ Character name display control
- 🔄 Real-time history updates
- 🎯 Smart startup script
- 📦 One-click installer
- 🔍 Environment diagnostic tool

## ✅ Core Features

### Chat Features
- 🤖 OpenAI compatible API interface (supports various third-party proxies)
- 📡 Streaming and non-streaming chat output
- 💬 Complete context management
- 💾 Automatic chat history saving (SillyTavern JSONL format)
- 🎯 Real-time history list updates

### Character System
- 👤 Character card import/export (compatible with SillyTavern spec_v2 format)
- 🎭 Real-time character name display
- 🔄 Automatic synchronization on character switching
- 📚 Character favorites and management

### World Book Features
- 📖 World book entry management
- 🔍 Keyword trigger mechanism
- 📊 Priority and order control
- 💼 Batch import/export

### Preset Management
- ⚙️ Complete preset system (compatible with SillyTavern format)
- 🎨 Custom system prompts
- 💾 Preset import/export
- 🔄 Quick preset switching

### User Persona
- 👤 Custom user identity
- 🖼️ Avatar upload support
- 📝 Detailed description fields
- 🔄 Real-time synchronization

### Text Decorators
- ✨ Quote beautification ("content" displays in special style)
- 🎭 Action text (*action* displays in italic)
- 🎨 Rich text editing toolbar
- 📝 Support for text highlighting, strikethrough, etc.
- 🔤 Variable replacement ({{char}}, {{user}})

## 🚀 Quick Start

### Environment Requirements
- Python 3.7+
- Modern browser (Chrome, Firefox, Edge, etc.)

### Installation Steps

#### Windows Users
1. **One-click Installation**
   ```batch
   run_windows.bat
   ```
   The script will automatically:
   - Check Python environment
   - Install required dependencies
   - Start the server
   - Open browser

#### Mac/Linux Users
1. **Installation and Running**
   ```bash
   # Install dependencies
   pip install flask flask-cors requests
   
   # Start server
   python server.py
   ```

2. **Access Application**
   - Open browser and visit: `http://localhost:5000`

### Server Deployment

1. **Upload Code**
   ```bash
   # Clone repository
   git clone https://github.com/yourusername/ai-chat-sillytavern.git
   cd ai-chat-sillytavern
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start Service**
   ```bash
   # Direct run
   python server.py
   
   # Or use nohup for background
   nohup python server.py > server.log 2>&1 &
   ```

4. **Configure Firewall**
   ```bash
   # Open port 5000
   sudo ufw allow 5000
   ```

5. **Access Service**
   - Local: `http://localhost:5000`
   - LAN: `http://server-ip:5000`

## 📁 Data Structure

```
data/
├── config.json           # API configuration
├── characters/          # Character cards
├── worlds/             # World books
├── presets/            # Presets
├── chats/              # Chat history
│   └── character_name/
│       └── chat_name.jsonl
├── avatars/            # User avatars
└── user_persona.json   # User persona
```

## 🔧 Configuration Guide

### API Configuration
1. Click settings button in top navigation
2. Enter API address (e.g., `https://api.openai.com/v1`)
3. Enter API key
4. Select model
5. Save configuration

### Supported API Formats
- ✅ OpenAI official API
- ✅ Azure OpenAI
- ✅ Claude API (via proxy)
- ✅ Third-party compatible APIs

## 📊 Data Compatibility

### Fully Compatible with SillyTavern
- Character cards: spec_v2 format
- World books: Direct import/export
- Presets: Compatible format
- Chat history: JSONL format

### Data Migration
1. **From SillyTavern**
   - Copy character files to `data/characters/`
   - Copy world book files to `data/worlds/`
   - Copy preset files to `data/presets/`

2. **To SillyTavern**
   - Directly copy corresponding JSON files

## 🎨 Interface Features

### Modern Design
- 🌓 Dark/Light mode switching
- 📱 Responsive layout
- 🎯 Clean interface
- ⚡ Smooth animations

### Operation Convenience
- ⌨️ Keyboard shortcuts
- 🖱️ Drag and drop support
- 📋 One-click copy
- 🔍 Search functionality

## 🛠️ Advanced Features

### Text Processing
- Markdown rendering
- Code highlighting
- Emoji support
- Special format recognition

### Context Management
- Smart context truncation
- Historical message management
- Token count statistics
- Context preview

## 📝 Update Log

### v2.2.0 (Latest)
- Fixed configuration save issue on mobile
- Optimized message button layout
- Improved mobile sidebar display

### v2.1.0
- Added text decorator system
- Added rich text editing toolbar
- Optimized server deployment

### v2.0.0
- Refactored project structure
- Added character name display control
- Improved real-time update mechanism

## 🤝 Contribution

Welcome to submit Issues and Pull Requests!

## 📄 License

MIT License

## 🙏 Acknowledgments

- SillyTavern team - for data format standards
- OpenAI - for API interface standards
- All contributors - for valuable suggestions and feedback

---

Made with ❤️ by AI Chat System Team