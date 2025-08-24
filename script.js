// API配置
let config = {
    api_url: 'https://api.openai.com/v1',  // OpenAI兼容的API地址
    api_key: '',
    model: '',
    streaming: true,
    temperature: 0.7,
    max_tokens: 2048,
    api_base: 'http://localhost:5000/api'  // 本地服务器地址
};

// 上下文管理
let contextMessages = [];
let currentChatId = null;
let currentChatTitle = '新对话';

// 历史对话管理
let chatHistory = [];  // 存储所有历史对话

// DOM元素
let chatContainer = null;
let chatInput = null;
let modelSelector = null;
let sendButton = null;

// 侧边栏控制
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const menuToggle = document.getElementById('menuToggle');
    
    sidebar.classList.toggle('hidden');
    mainContent.classList.toggle('expanded');
    
    // 当侧边栏隐藏时，显示菜单按钮
    if (sidebar.classList.contains('hidden')) {
        menuToggle.classList.add('show');
    } else {
        menuToggle.classList.remove('show');
    }
}

// 收缩侧边栏
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const menuToggle = document.getElementById('menuToggle');
    
    if (!sidebar.classList.contains('hidden')) {
        sidebar.classList.add('hidden');
        mainContent.classList.add('expanded');
        menuToggle.classList.add('show');
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 获取DOM元素
    chatContainer = document.querySelector('.chat-container');
    chatInput = document.querySelector('.chat-input');
    sendButton = document.querySelector('.send-button');
    modelSelector = document.querySelector('.model-selector');
    
    // 自动调整输入框高度
    const textarea = document.querySelector('.chat-input');
    if (textarea) {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 200) + 'px';
        });
    }
    
    // 绑定事件
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 设置按钮点击事件
    document.querySelector('.icon-button').addEventListener('click', showSettings);
    
    // 模型选择器点击事件
    modelSelector.addEventListener('click', showModelSelector);
    
    // 新对话按钮点击事件
    const newChatBtn = document.querySelector('.sidebar-nav-item');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', startNewChat);
    }
    
    // 点击聊天容器的空白区域收缩侧边栏
    if (chatContainer) {
        chatContainer.addEventListener('click', function(e) {
            // 如果点击的是聊天容器本身或欢迎界面
            if (e.target === chatContainer || 
                e.target.classList.contains('welcome-section') ||
                e.target.classList.contains('welcome-title') ||
                e.target.classList.contains('suggestions') ||
                e.target.classList.contains('suggestions-header') ||
                e.target.classList.contains('suggestions-list')) {
                
                const sidebar = document.getElementById('sidebar');
                if (sidebar && !sidebar.classList.contains('hidden')) {
                    closeSidebar();
                }
            }
        });
    }
    
    // 加载配置
    await loadConfig();
    
    // 加载模型列表
    await loadModels();
    
    // 加载历史对话列表
    await loadChatHistory();
    
    // 初始化世界书（如果有的话）
    if (typeof initWorldBook === 'function') {
        initWorldBook();
    }
    
    // 初始化显示
    updateHistoryDisplay();
});

// 加载配置
async function loadConfig() {
    // 先从localStorage加载本地缓存的配置
    const localConfig = localStorage.getItem('aiChatConfig');
    if (localConfig) {
        try {
            const savedConfig = JSON.parse(localConfig);
            // 更新配置但保留api_base
            const api_base = config.api_base;
            Object.assign(config, savedConfig);
            config.api_base = api_base;
            
            // 更新模型显示
            if (config.model) {
                updateModelDisplay();
            }
        } catch (e) {
            console.error('加载本地配置失败:', e);
        }
    }
    
    // 再尝试从服务器加载配置
    try {
        const response = await fetch(`${config.api_base}/config`);
        if (response.ok) {
            const data = await response.json();
            // 如果服务器有配置，优先使用服务器的
            if (data.api_url || data.api_key) {
                const api_base = config.api_base;
                Object.assign(config, data);
                config.api_base = api_base;
                
                // 保存到本地
                saveConfigToLocal();
            }
        }
    } catch (error) {
        console.error('加载服务器配置失败:', error);
    }
}

// 保存配置到本地存储
function saveConfigToLocal() {
    const configToSave = { ...config };
    delete configToSave.api_base;
    localStorage.setItem('aiChatConfig', JSON.stringify(configToSave));
}

// 保存配置
async function saveConfig() {
    try {
        // 保存到本地存储
        saveConfigToLocal();
        
        // 只保存需要的配置，不包括api_base
        const configToSave = { ...config };
        delete configToSave.api_base;
        
        const response = await fetch(`${config.api_base}/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(configToSave)
        });
        
        if (response.ok) {
            showToast('配置已保存', 'success');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showToast('保存配置失败', 'error');
    }
}

// 加载模型列表
async function loadModels() {
    // 如果已经有配置的API，才尝试获取模型列表
    if (!config.api_key || !config.api_url) {
        console.log('等待API配置...');
        return;
    }
    
    try {
        const response = await fetch(`${config.api_base}/models`);
        if (response.ok) {
            const data = await response.json();
            if (data.models && data.models.length > 0) {
                // 如果当前没有选中的模型，或者选中的模型不在列表中
                if (!config.model || !data.models.includes(config.model)) {
                    // 尝试从localStorage恢复上次使用的模型
                    const lastModel = localStorage.getItem('lastUsedModel');
                    if (lastModel && data.models.includes(lastModel)) {
                        config.model = lastModel;
                    } else {
                        // 否则使用第一个可用的模型
                        config.model = data.models[0];
                    }
                }
                updateModelDisplay();
                // 保存当前选择的模型
                localStorage.setItem('lastUsedModel', config.model);
                saveConfigToLocal();
            }
        }
    } catch (error) {
        console.error('加载模型列表失败:', error);
        // 即使失败了，如果有缓存的模型，也显示出来
        if (config.model) {
            updateModelDisplay();
        }
    }
}

// 更新模型显示
function updateModelDisplay() {
    const modelSpan = modelSelector.querySelector('span');
    modelSpan.textContent = config.model || '选择一个模型';
}

// 显示模型选择器
async function showModelSelector() {
    try {
        const response = await fetch(`${config.api_base}/models`);
        if (!response.ok) {
            showToast('请先配置API', 'warning');
            showSettings();
            return;
        }
        
        const data = await response.json();
        if (!data.models || data.models.length === 0) {
            showToast('没有可用的模型', 'warning');
            return;
        }
        
        // 创建模型选择弹窗
        const modal = createModal('选择模型', '');
        const modelList = document.createElement('div');
        modelList.className = 'model-list';
        
        data.models.forEach(model => {
            const modelItem = document.createElement('div');
            modelItem.className = 'model-item';
            modelItem.textContent = model;
            modelItem.onclick = () => {
                config.model = model;
                updateModelDisplay();
                // 保存选择的模型到localStorage
                localStorage.setItem('lastUsedModel', model);
                saveConfig();
                modal.remove();
            };
            modelList.appendChild(modelItem);
        });
        
        modal.querySelector('.modal-body').appendChild(modelList);
    } catch (error) {
        console.error('获取模型列表失败:', error);
        showToast('获取模型列表失败', 'error');
    }
}

// 显示设置界面
function showSettings() {
    const modal = createModal('设置', '');
    const settingsForm = document.createElement('div');
    settingsForm.className = 'settings-form';
    settingsForm.innerHTML = `
        <div class="form-group">
            <label>API地址:</label>
            <input type="text" id="api-url" value="${config.api_url || ''}" placeholder="https://api.openai.com/v1">
        </div>
        <div class="form-group">
            <label>API密钥:</label>
            <input type="password" id="api-key" value="${config.api_key || ''}" placeholder="sk-...">
        </div>
        <div class="form-group">
            <label>温度 (Temperature):</label>
            <input type="range" id="temperature" min="0" max="2" step="0.1" value="${config.temperature}">
            <span id="temp-value">${config.temperature}</span>
        </div>
        <div class="form-group">
            <label>最大令牌数:</label>
            <input type="number" id="max-tokens" value="${config.max_tokens}" min="1" max="4096">
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="streaming" ${config.streaming ? 'checked' : ''}>
                启用流式输出
            </label>
        </div>
        <div class="form-buttons">
            <button onclick="saveSettingsFromModal()">保存</button>
            <button onclick="this.closest('.modal').remove()">取消</button>
        </div>
    `;
    
    modal.querySelector('.modal-body').appendChild(settingsForm);
    
    // 温度滑块事件
    const tempSlider = modal.querySelector('#temperature');
    const tempValue = modal.querySelector('#temp-value');
    tempSlider.oninput = () => {
        tempValue.textContent = tempSlider.value;
    };
}

// 从设置弹窗保存配置
window.saveSettingsFromModal = function() {
    const modal = document.querySelector('.modal');
    const oldApiUrl = config.api_url;
    const oldApiKey = config.api_key;
    
    config.api_url = modal.querySelector('#api-url').value;
    config.api_key = modal.querySelector('#api-key').value;
    config.temperature = parseFloat(modal.querySelector('#temperature').value);
    config.max_tokens = parseInt(modal.querySelector('#max-tokens').value);
    config.streaming = modal.querySelector('#streaming').checked;
    
    saveConfig();
    
    // 如果API地址或密钥变了，重新加载模型列表
    if (oldApiUrl !== config.api_url || oldApiKey !== config.api_key) {
        loadModels();
    }
    
    modal.remove();
};

// 发送消息
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    if (!config.api_key || !config.model) {
        showToast('请先配置API和选择模型', 'warning');
        showSettings();
        return;
    }
    
    // 清空输入框
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    // 添加用户消息到界面
    addMessageToChat('user', message);
    
    // 添加到上下文
    contextMessages.push({ role: 'user', content: message });
    updateHistoryDisplay();
    
    // 应用世界书（如果有的话）
    let messagesWithWorldBook = contextMessages;
    if (typeof injectWorldBookContent === 'function') {
        messagesWithWorldBook = injectWorldBookContent(contextMessages);
    }
    
    // 显示加载状态
    const loadingDiv = addMessageToChat('assistant', '', true);
    
    try {
        // 准备请求数据（使用包含世界书的消息）
        const requestData = {
            messages: messagesWithWorldBook,
            model: config.model,
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            stream: config.streaming
        };
        
        if (config.streaming) {
            // 流式请求
            const response = await fetch(`${config.api_base}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';
            
            // 移除加载动画，准备显示实际内容
            loadingDiv.remove();
            const messageDiv = addMessageToChat('assistant', '', false);
            const messageInner = messageDiv.querySelector('.message-inner');
            const contentDiv = messageInner.querySelector('.message-content');
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                                assistantMessage += parsed.choices[0].delta.content;
                                contentDiv.textContent = assistantMessage;
                                // 自动滚动到底部
                                messageDiv.scrollIntoView({ behavior: 'smooth' });
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            }
            
            // 添加到上下文
            if (assistantMessage) {
                contextMessages.push({ role: 'assistant', content: assistantMessage });
                updateHistoryDisplay();
            }
        } else {
            // 非流式请求
            const response = await fetch(`${config.api_base}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            const data = await response.json();
            loadingDiv.remove();
            
            if (data.choices && data.choices[0].message) {
                const assistantMessage = data.choices[0].message.content;
                addMessageToChat('assistant', assistantMessage);
                
                // 添加到上下文
                contextMessages.push({ role: 'assistant', content: assistantMessage });
                updateHistoryDisplay();
            }
        }
        
        // 自动保存聊天
        await autoSaveChat();
        
    } catch (error) {
        console.error('发送消息失败:', error);
        loadingDiv.remove();
        showToast('发送消息失败: ' + error.message, 'error');
    }
}

// 添加消息到聊天界面 - ChatGPT风格
function addMessageToChat(role, content, isLoading = false) {
    // 移除欢迎界面
    const welcomeSection = document.querySelector('.welcome-section');
    if (welcomeSection) {
        welcomeSection.style.display = 'none';
    }
    
    // 确保有消息容器
    let messagesContainer = document.querySelector('.messages-container');
    if (!messagesContainer) {
        messagesContainer = document.createElement('div');
        messagesContainer.className = 'messages-container';
        chatContainer.appendChild(messagesContainer);
        
        // 移动输入框到底部
        const inputWrapper = document.querySelector('.chat-input-wrapper');
        if (inputWrapper) {
            chatContainer.appendChild(inputWrapper);
        }
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    const messageInner = document.createElement('div');
    messageInner.className = 'message-inner';
    
    if (isLoading) {
        messageInner.innerHTML = `
            <div class="message-avatar">${role === 'user' ? 'U' : 'AI'}</div>
            <div class="message-content">
                <div class="loading-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
    } else {
        messageInner.innerHTML = `
            <div class="message-avatar">${role === 'user' ? 'U' : 'AI'}</div>
            <div class="message-content">${escapeHtml(content)}</div>
        `;
    }
    
    messageDiv.appendChild(messageInner);
    messagesContainer.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth' });
    
    // 如果是用户的第一条消息，生成对话标题
    if (role === 'user' && contextMessages.length === 0 && content) {
        currentChatTitle = content.substring(0, 30) + (content.length > 30 ? '...' : '');
        // TODO: 后期可以调用AI生成更好的标题
    }
    
    return messageDiv;
}

// 开始新对话
function startNewChat() {
    // 保存当前对话（如果有内容）
    if (contextMessages.length > 0) {
        saveChatToHistory();
    }
    
    // 清空当前对话
    contextMessages = [];
    currentChatId = null;
    currentChatTitle = '新对话';
    
    // 清空聊天界面
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
        messagesContainer.remove();
    }
    
    // 确保输入框在正确的位置
    const inputWrapper = document.querySelector('.chat-input-wrapper');
    const welcomeSection = document.querySelector('.welcome-section');
    
    if (welcomeSection && inputWrapper) {
        // 显示欢迎界面
        welcomeSection.style.display = 'flex';
        
        // 确保输入框在欢迎界面内
        if (!welcomeSection.contains(inputWrapper)) {
            welcomeSection.appendChild(inputWrapper);
        }
    }
    
    // 更新历史显示
    updateHistoryDisplay();
    
    showToast('已开始新对话', 'success');
}

// 更新历史对话显示
function updateHistoryDisplay() {
    // 创建或更新侧边栏的历史对话显示
    let historyPanel = document.querySelector('.history-panel');
    if (!historyPanel) {
        // 在侧边栏添加历史面板
        const sidebar = document.querySelector('.sidebar-nav');
        historyPanel = document.createElement('div');
        historyPanel.className = 'history-panel';
        historyPanel.innerHTML = `
            <div class="history-header">
                <span>历史对话</span>
                <div class="history-actions">
                    <button onclick="exportCurrentChat()" title="导出当前对话">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>
                    <button onclick="exportAllChats()" title="导出所有对话">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                            <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                            <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="history-list"></div>
        `;
        sidebar.appendChild(historyPanel);
    }
    
    // 更新历史列表
    const list = historyPanel.querySelector('.history-list');
    list.innerHTML = '';
    
    // 添加当前对话（如果有内容）
    if (contextMessages.length > 0) {
        const currentDiv = document.createElement('div');
        currentDiv.className = 'history-item active';
        currentDiv.innerHTML = `
            <div class="history-title">📝 ${currentChatTitle}</div>
            <div class="history-meta">${contextMessages.length} 条消息</div>
        `;
        list.appendChild(currentDiv);
    }
    
    // 添加历史对话
    chatHistory.forEach((chat, index) => {
        const historyDiv = document.createElement('div');
        historyDiv.className = 'history-item';
        historyDiv.innerHTML = `
            <div class="history-content" onclick="loadHistoryChat(${index})">
                <div class="history-title">${chat.title}</div>
                <div class="history-meta">${chat.messages.length} 条消息</div>
            </div>
            <button class="history-delete-btn" onclick="event.stopPropagation(); deleteHistoryChat(${index})" title="删除对话">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        `;
        list.appendChild(historyDiv);
    });
}

// 清空上下文
window.clearContext = async function() {
    contextMessages = [];
    updateHistoryDisplay();
    
    try {
        await fetch(`${config.api_base}/context/clear`, {
            method: 'POST'
        });
        showToast('上下文已清空', 'success');
    } catch (error) {
        console.error('清空上下文失败:', error);
    }
};

// 自动保存聊天
async function autoSaveChat() {
    if (contextMessages.length === 0) return;
    
    try {
        const response = await fetch(`${config.api_base}/chat/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: currentChatId || undefined
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            currentChatId = data.chat_id;
        }
    } catch (error) {
        console.error('自动保存失败:', error);
    }
}

// 创建模态框
function createModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">${content}</div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

// 显示提示消息
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 导出当前对话为JSONL（SillyTavern格式）
window.exportCurrentChat = function() {
    if (contextMessages.length === 0) {
        showToast('当前没有对话内容', 'warning');
        return;
    }
    
    // 转换为SillyTavern的JSONL格式
    let jsonlContent = '';
    contextMessages.forEach((msg, index) => {
        const entry = {
            name: msg.role === 'user' ? 'You' : 'Assistant',
            is_user: msg.role === 'user',
            is_system: msg.role === 'system',
            send_date: new Date().toISOString(),
            mes: msg.content,
            swipes: [msg.content],
            swipe_id: 0,
            gen_started: new Date().toISOString(),
            gen_finished: new Date().toISOString()
        };
        jsonlContent += JSON.stringify(entry) + '\n';
    });
    
    const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // SillyTavern的命名格式
    a.download = `chat_${currentChatTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('对话已导出（SillyTavern格式）', 'success');
};

// 导出所有对话（批量导出）
window.exportAllChats = function() {
    const allChats = [...chatHistory];
    
    // 添加当前对话（如果有）
    if (contextMessages.length > 0) {
        allChats.unshift({
            title: currentChatTitle,
            chatId: currentChatId || 'temp_' + Date.now(),
            messages: contextMessages,
            timestamp: new Date().toISOString()
        });
    }
    
    if (allChats.length === 0) {
        showToast('没有对话记录', 'warning');
        return;
    }
    
    // 为每个对话创建一个JSONL文件并打包
    allChats.forEach((chat, index) => {
        let jsonlContent = '';
        chat.messages.forEach(msg => {
            const entry = {
                name: msg.role === 'user' ? 'You' : 'Assistant',
                is_user: msg.role === 'user',
                is_system: msg.role === 'system',
                send_date: chat.timestamp || new Date().toISOString(),
                mes: msg.content,
                swipes: [msg.content],
                swipe_id: 0,
                gen_started: chat.timestamp || new Date().toISOString(),
                gen_finished: chat.timestamp || new Date().toISOString()
            };
            jsonlContent += JSON.stringify(entry) + '\n';
        });
        
        const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_${chat.title.replace(/[^a-zA-Z0-9]/g, '_')}_${index}.jsonl`;
        
        // 延迟下载避免浏览器阻止
        setTimeout(() => {
            a.click();
            URL.revokeObjectURL(url);
        }, index * 100);
    });
    
    showToast(`正在导出 ${allChats.length} 个对话`, 'success');
};

// 导入SillyTavern格式的对话
window.importChat = function(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const lines = e.target.result.split('\n').filter(line => line.trim());
            const messages = [];
            
            lines.forEach(line => {
                const entry = JSON.parse(line);
                messages.push({
                    role: entry.is_user ? 'user' : 'assistant',
                    content: entry.mes
                });
            });
            
            if (messages.length > 0) {
                // 保存当前对话
                if (contextMessages.length > 0) {
                    saveChatToHistory();
                }
                
                // 加载导入的对话
                contextMessages = messages;
                currentChatTitle = messages[0]?.content.substring(0, 30) + '...' || '导入的对话';
                currentChatId = 'imported_' + Date.now();
                
                // 清空现有消息容器
                let messagesContainer = document.querySelector('.messages-container');
                if (messagesContainer) {
                    messagesContainer.remove();
                }
                
                // 隐藏欢迎界面
                const welcomeSection = document.querySelector('.welcome-section');
                if (welcomeSection) {
                    welcomeSection.style.display = 'none';
                }
                
                // 重新创建消息容器
                messagesContainer = document.createElement('div');
                messagesContainer.className = 'messages-container';
                chatContainer.appendChild(messagesContainer);
                
                // 重新添加输入框
                const inputWrapper = document.querySelector('.chat-input-wrapper');
                if (inputWrapper) {
                    chatContainer.appendChild(inputWrapper);
                }
                
                // 显示所有消息
                contextMessages.forEach(msg => {
                    addMessageToChat(msg.role, msg.content);
                });
                
                updateHistoryDisplay();
                showToast('对话导入成功', 'success');
            }
        } catch (error) {
            showToast('导入失败：文件格式错误', 'error');
            console.error('导入错误:', error);
        }
    };
    reader.readAsText(file);
};

// 保存对话到历史
function saveChatToHistory() {
    if (contextMessages.length === 0) return;
    
    // 检查是否已经存在相同ID的对话
    const existingIndex = chatHistory.findIndex(chat => chat.chatId === currentChatId);
    
    const chat = {
        title: currentChatTitle,
        chatId: currentChatId || 'chat_' + Date.now(),
        messages: [...contextMessages],
        timestamp: new Date().toISOString()
    };
    
    if (existingIndex !== -1) {
        // 如果已存在，更新它
        chatHistory[existingIndex] = chat;
    } else {
        // 如果不存在，添加到历史（最多保存20个）
        chatHistory.unshift(chat);
        if (chatHistory.length > 20) {
            chatHistory.pop();
        }
    }
    
    // 保存到localStorage
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

// 加载历史对话列表
async function loadChatHistory() {
    // 从localStorage加载
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
        try {
            chatHistory = JSON.parse(saved);
        } catch (e) {
            chatHistory = [];
        }
    }
    
    // 也可以从服务器加载
    try {
        const response = await fetch(`${config.api_base}/chat/list`);
        if (response.ok) {
            const data = await response.json();
            // 可以合并服务器和本地的数据
        }
    } catch (error) {
        console.error('加载服务器聊天列表失败:', error);
    }
}

// 加载历史对话
function loadHistoryChat(index) {
    // 保存当前对话
    if (contextMessages.length > 0) {
        saveChatToHistory();
    }
    
    // 加载选中的对话
    const chat = chatHistory[index];
    if (!chat) return;
    
    contextMessages = [...chat.messages];
    currentChatId = chat.chatId;
    currentChatTitle = chat.title;
    
    // 清空现有消息容器
    let messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
        messagesContainer.remove();
    }
    
    // 隐藏欢迎界面
    const welcomeSection = document.querySelector('.welcome-section');
    if (welcomeSection) {
        welcomeSection.style.display = 'none';
    }
    
    // 重新创建消息容器
    messagesContainer = document.createElement('div');
    messagesContainer.className = 'messages-container';
    chatContainer.appendChild(messagesContainer);
    
    // 重新添加输入框
    const inputWrapper = document.querySelector('.chat-input-wrapper');
    if (inputWrapper) {
        chatContainer.appendChild(inputWrapper);
    }
    
    // 显示所有消息
    contextMessages.forEach(msg => {
        addMessageToChat(msg.role, msg.content);
    });
    
    // 更新历史显示
    updateHistoryDisplay();
    
    showToast(`已加载对话: ${chat.title}`, 'success');
}

// 删除历史对话
window.deleteHistoryChat = function(index) {
    const chat = chatHistory[index];
    if (!chat) return;
    
    // 确认删除
    if (confirm(`确定要删除对话 "${chat.title}" 吗？`)) {
        // 从历史数组中移除
        chatHistory.splice(index, 1);
        
        // 更新localStorage
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        
        // 更新显示
        updateHistoryDisplay();
        
        showToast('对话已删除', 'success');
    }
};
 