// API配置 - 暴露到全局作用域供其他模块使用
window.config = {
    api_url: 'https://api.openai.com/v1',  // OpenAI兼容的API地址
    api_key: '',
    model: '',
    streaming: true,
    temperature: 1.0,
    // 前端控制参数
    frontend_max_history: 65536,  // 发送给AI的历史最大字符数(64k)
    frontend_max_response: 10000,  // AI回复的最大字符数（前端截断10k）
    // AI参数
    top_p: 1.0,
    frequency_penalty: 0,
    presence_penalty: 0,
    api_base: 'http://localhost:5000/api'  // 本地服务器地址
};

// 创建局部引用，方便在本文件中使用
const config = window.config;

// 缓存的模型列表
window.cachedModelList = null;
let cachedModelList = window.cachedModelList;  // 创建局部引用

// 流式响应中止控制器
let currentAbortController = null;

// 发送状态管理
let isSending = false;

// 上下文管理 - 暴露到全局供其他模块使用
window.contextMessages = [];
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

// 更新角色标题栏
function updateChatHeader() {
    const chatHeader = document.querySelector('.chat-header');
    if (!chatHeader) return;
    
    // 检查是否启用角色显示 - 从开关获取状态
    const toggle = document.getElementById('show-character-header');
    const showHeader = toggle ? toggle.checked : true; // 从开关获取状态，默认显示
    
    if (window.currentCharacter && showHeader) {
        // 有角色选中且启用显示时显示角色信息
        chatHeader.style.display = 'block';
        
        const avatar = chatHeader.querySelector('.chat-header-avatar');
        const name = chatHeader.querySelector('.chat-header-name');
        const status = chatHeader.querySelector('.chat-header-status');
        
        // 设置头像文字（取名字的第一个字符）
        avatar.textContent = window.currentCharacter.name.charAt(0).toUpperCase();
        
        // 设置名字
        name.textContent = window.currentCharacter.name;
        
        // 设置状态（可以根据角色的描述或性格设置不同的状态文字）
        if (window.currentCharacter.description) {
            // 如果有描述，显示描述的前30个字符
            const desc = window.currentCharacter.description;
            status.textContent = desc.length > 30 ? desc.substring(0, 30) + '...' : desc;
        } else {
            status.textContent = '在线';
        }
        
        // 根据角色名称生成不同的头像颜色
        const colors = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
        ];
        const colorIndex = window.currentCharacter.name.charCodeAt(0) % colors.length;
        avatar.style.background = colors[colorIndex];
    } else {
        // 没有角色或禁用显示时隐藏标题栏
        chatHeader.style.display = 'none';
    }
}

window.updateChatHeader = updateChatHeader;

// 切换角色标题栏显示
window.toggleCharacterHeader = function(show) {
    console.log('切换角色显示:', show);
    
    // 更新全局config
    config.showCharacterHeader = show;
    
    // 保存完整的config到服务器
    fetch('/api/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)  // 发送完整config，而不是部分
    }).catch(error => console.error('保存角色显示设置失败:', error));
    
    // 立即更新显示
    updateChatHeader();
    
    // 显示提示
    if (typeof showToast === 'function') {
        showToast(`角色显示已${show ? '启用' : '禁用'}`, 'info');
    }
};

// 移动端点击主内容区域关闭侧边栏
function setupMobileSidebarClose() {
    // 使用document级别的事件监听，确保捕获所有点击
    document.addEventListener('click', function(e) {
        // 只在移动端生效
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            const menuToggle = document.getElementById('menuToggle');
            
            // 如果侧边栏是展开的
            if (sidebar && !sidebar.classList.contains('hidden')) {
                // 检查点击目标是否在侧边栏内
                const clickedInsideSidebar = sidebar.contains(e.target);
                // 检查是否点击了菜单按钮
                const clickedMenuToggle = menuToggle && menuToggle.contains(e.target);
                
                // 如果点击的不是侧边栏内部，也不是菜单按钮，则关闭侧边栏
                if (!clickedInsideSidebar && !clickedMenuToggle) {
                    closeSidebar();
                }
            }
        }
    });
}

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 设置移动端侧边栏关闭功能
    setupMobileSidebarClose();
    
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
            // 设置更高的限制（500px），避免无限扩展
            this.style.height = Math.min(this.scrollHeight, 500) + 'px';
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
    
    // 设置按钮点击事件 - 改为显示AI设置面板
    document.querySelector('.icon-button').addEventListener('click', function() {
        if (typeof showAISettingsPanel === 'function') {
            showAISettingsPanel();
        } else {
            showSettings(); // 备用的旧设置界面
        }
    });
    
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
    
    // 如果有当前角色，尝试加载其最新对话
    if (window.currentCharacter) {
        await loadLatestChatForCharacter(window.currentCharacter.name);
    }
    
    // 初始化世界书（如果有的话）
    if (typeof initWorldBook === 'function') {
        initWorldBook();
    }
    
    // 初始化提示词管理器（如果有的话）
    if (typeof initPromptManager === 'function') {
        await initPromptManager();
    }
    
    // 初始化AI设置（如果有的话）
    if (typeof initAISettings === 'function') {
        initAISettings();
    }
    
    // 初始化显示
    updateHistoryDisplay();
    
    // 更新角色标题栏
    updateChatHeader();
    
    // 初始化开关状态 - 使用已经加载的全局config
    setTimeout(() => {
        // 使用全局config，不再重复请求
        const showHeader = window.config.showCharacterHeader !== undefined ? window.config.showCharacterHeader : true;
        
        const toggle = document.getElementById('show-character-header');
        if (toggle) {
            toggle.checked = showHeader;
            console.log('初始化开关状态:', showHeader);
            // 更新显示
            updateChatHeader();
        } else {
            console.log('未找到开关元素');
        }
    }, 100); // 延迟一下确保 DOM 已加载
});

// 加载配置
async function loadConfig() {
    // 先从localStorage加载本地缓存的配置
    const localConfig = null; // 不使用localStorage
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
        const response = await fetch('/api/config');
        if (response.ok) {
            const data = await response.json();
            // 如果服务器有配置，优先使用服务器的
            if (data.api_url || data.api_key) {
                // 只加载需要的参数，过滤掉废弃的
                config.api_url = data.api_url || config.api_url;
                config.api_key = data.api_key || config.api_key;
                config.model = data.model || config.model;
                config.streaming = data.streaming !== undefined ? data.streaming : config.streaming;
                config.temperature = data.temperature !== undefined ? data.temperature : config.temperature;
                config.frontend_max_history = data.frontend_max_history || config.frontend_max_history;
                config.frontend_max_response = data.frontend_max_response || config.frontend_max_response;
                config.top_p = data.top_p !== undefined ? data.top_p : config.top_p;
                config.frequency_penalty = data.frequency_penalty !== undefined ? data.frequency_penalty : config.frequency_penalty;
                config.presence_penalty = data.presence_penalty !== undefined ? data.presence_penalty : config.presence_penalty;
                config.currentPresetName = data.currentPresetName || config.currentPresetName;
                config.showCharacterHeader = data.showCharacterHeader !== undefined ? data.showCharacterHeader : config.showCharacterHeader;

                // 加载识图API配置
                config.vision_api_base = data.vision_api_base || config.vision_api_base;
                config.vision_api_path = data.vision_api_path || config.vision_api_path;
                config.vision_api_key = data.vision_api_key || config.vision_api_key;
                config.vision_model = data.vision_model || config.vision_model;
                config.vision_prompt = data.vision_prompt || config.vision_prompt;

                // 不加载 max_context, max_tokens, api_base 等废弃参数

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
    // 不使用localStorage保存配置
}

// 保存配置
async function saveConfig() {
    try {
        // 保存到本地存储
        saveConfigToLocal();
        
        // 只保存需要的配置，不包括api_base
        const configToSave = { ...config };
        delete configToSave.api_base;
        
        const response = await fetch('/api/config', {
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
window.loadModels = async function loadModels() {
    // 如果已经有配置的API，才尝试获取模型列表
    if (!config.api_key || !config.api_url) {
        console.log('等待API配置...');
        return;
    }
    
    try {
        const response = await fetch('/api/models');
        if (response.ok) {
            const data = await response.json();
            if (data.models && data.models.length > 0) {
                // 缓存模型列表
                window.cachedModelList = data.models;
                cachedModelList = window.cachedModelList;
                console.log('已缓存模型列表:', cachedModelList);
                
                // 如果当前没有选中的模型，或者选中的模型不在列表中
                if (!config.model || !data.models.includes(config.model)) {
                    // 尝试从localStorage恢复上次使用的模型
                    const lastModel = null; // 不使用localStorage
                    if (lastModel && data.models.includes(lastModel)) {
                        config.model = lastModel;
                    } else {
                        // 否则使用第一个可用的模型
                        config.model = data.models[0];
                    }
                }
                updateModelDisplay();
                // 保存当前选择的模型
                // 不使用localStorage保存
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
    // 优先使用缓存的模型列表
    let models = cachedModelList;
    
    // 如果没有缓存，才去请求
    if (!models || models.length === 0) {
        try {
            const response = await fetch('/api/models');
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
            
            // 缓存模型列表
            models = data.models;
            window.cachedModelList = models;
            cachedModelList = window.cachedModelList;
            console.log('获取并缓存模型列表:', cachedModelList);
        } catch (error) {
            console.error('获取模型列表失败:', error);
            showToast('获取模型列表失败', 'error');
            return;
        }
    } else {
        console.log('使用缓存的模型列表:', models);
    }
    
    // 创建模型选择弹窗
    const modal = createModal('选择模型', '');
    const modelList = document.createElement('div');
    modelList.className = 'model-list';
    
    models.forEach(model => {
        const modelItem = document.createElement('div');
        modelItem.className = 'model-item';
        modelItem.textContent = model;
        modelItem.onclick = () => {
            config.model = model;
            updateModelDisplay();
            // 保存选择的模型到localStorage
            // 不使用localStorage保存
            saveConfig();
            modal.remove();
        };
        modelList.appendChild(modelItem);
    });
    
    modal.querySelector('.modal-body').appendChild(modelList);
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
    config.streaming = modal.querySelector('#streaming').checked;
    
    saveConfig();
    
    // 如果API地址或密钥变了，清空缓存并重新加载模型列表
    if (oldApiUrl !== config.api_url || oldApiKey !== config.api_key) {
        window.cachedModelList = null;  // 清空缓存
        cachedModelList = null;
        loadModels();
    }
    
    modal.remove();
};

// 构建工具书注入数据
function buildToolBookPromptData(messages) {
    if (!window.toolBookManager || typeof window.toolBookManager.getActivatedEntries !== 'function') {
        return null;
    }

    try {
        console.log('[工具书] 检查触发条目...');
        const triggeredEntries = window.toolBookManager.getActivatedEntries(messages || []);
        console.log('[工具书] 触发条目:', triggeredEntries);

        if (!Array.isArray(triggeredEntries) || triggeredEntries.length === 0) {
            return null;
        }

        const beforeSegments = [];
        const afterSegments = [];

        triggeredEntries.forEach(entry => {
            const displayName = entry?.displayName || entry?.keyword || '';
            const header = displayName ? `【工具书】${displayName}` : '【工具书】';
            const body = entry?.content || '';
            const segment = `${header}
${body}`.trim();

            if ((entry?.position || 'before') === 'after') {
                afterSegments.push(segment);
            } else {
                beforeSegments.push(segment);
            }
        });

        const payload = {
            before: beforeSegments.join('\n\n'),
            after: afterSegments.join('\n\n'),
            entries: triggeredEntries
        };

        console.log('[工具书] 将注入的内容:', payload);
        return payload;
    } catch (error) {
        console.error('[工具书] 触发处理失败:', error);
        return null;
    }
}

// 发送消息
async function sendMessage() {
    // 如果正在发送中，执行停止操作
    if (isSending && currentAbortController) {
        currentAbortController.abort();
        console.log('[用户中止] 已停止AI生成');
        return;
    }
    
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
    window.contextMessages.push({ role: 'user', content: message });

    // 立即滚动到底部
    scrollToBottom();

    // 确保有currentChatId和标题
    if (!currentChatId) {
        currentChatId = `chat_${Date.now()}`;
    }
    if (!currentChatTitle || currentChatTitle === '新对话') {
        currentChatTitle = message.substring(0, 30) + (message.length > 30 ? '...' : '');
    }
    
    // 构建完整的提示词和消息
    let finalMessages = window.contextMessages;
    
    // 如果有提示词管理器，使用它来构建消息
    if (typeof buildPromptMessages === 'function') {
        // 准备用户设置
        let userPersonaData = null;
        if (window.getCurrentUserPersona) {
            userPersonaData = window.getCurrentUserPersona();
        }
        const userSettings = {
            userName: userPersonaData?.name || 'User',
            persona: userPersonaData?.description || ''
        };
        
        // 获取当前角色信息
        const character = window.currentCharacter || null;
        
        // 获取世界书信息
        let worldInfo = null;
        if (typeof checkWorldBookTriggers === 'function') {
            console.log('[世界书] 检查触发条件...');
            console.log('[世界书] 当前激活的世界书:', activeWorldBooks);
            const triggered = checkWorldBookTriggers(window.contextMessages);
            console.log('[世界书] 触发的条目:', triggered);
            if (triggered.length > 0) {
                worldInfo = {
                    before: triggered.filter(t => t.position === 'before').map(t => t.content).join('\n\n'),
                    after: triggered.filter(t => t.position === 'after').map(t => t.content).join('\n\n')
                };
                console.log('[世界书] 将注入的内容:', worldInfo);
            }
        }
        
        const toolBookData = buildToolBookPromptData(window.contextMessages);
        // 使用提示词管理器构建消息（新的对话补全格式）
        console.log('[提示词管理] 当前预设:', window.promptManager?.currentPresetName);
        console.log('[提示词管理] 预设内容:', window.promptManager?.preset);
        
        finalMessages = buildPromptMessages(window.contextMessages, character, worldInfo, userSettings, toolBookData);
        
        // 输出调试信息
        console.log('[提示词管理] 最终消息数:', finalMessages.length);
        if (finalMessages[0] && finalMessages[0].role === 'system') {
            console.log('[提示词管理] 系统提示词内容:', finalMessages[0].content.substring(0, 200));
        }
    } else {
        // 兼容旧的世界书注入方式
        if (typeof injectWorldBookContent === 'function') {
            finalMessages = injectWorldBookContent(window.contextMessages);
        }
    }
    
    // 前端历史截取控制
    if (config.frontend_max_history && config.frontend_max_history > 0) {
        let totalLength = 0;
        let truncatedMessages = [];
        
        // 从后往前遍历消息，保留最新的消息
        for (let i = finalMessages.length - 1; i >= 0; i--) {
            const messageLength = JSON.stringify(finalMessages[i]).length;
            if (totalLength + messageLength <= config.frontend_max_history) {
                truncatedMessages.unshift(finalMessages[i]);
                totalLength += messageLength;
            } else if (i === 0 && truncatedMessages.length > 0) {
                // 如果是第一条消息（通常是系统提示），尽量保留
                truncatedMessages.unshift(finalMessages[i]);
                break;
            } else {
                break;
            }
        }
        
        if (truncatedMessages.length < finalMessages.length) {
            console.log(`[历史截取] 从${finalMessages.length}条消息截取到${truncatedMessages.length}条，总字符数: ${totalLength}`);
            finalMessages = truncatedMessages;
        }
    }
    
    // 显示加载状态
    const loadingDiv = addMessageToChat('assistant', '', true);
    
    // 加载框出现时也要滚动
    scrollToBottom();
    
    try {
        // 准备请求数据（不发送max_tokens，让服务商自由发挥）
        const requestData = {
            messages: finalMessages,
            model: config.model,
            temperature: config.temperature || 1.0,
            stream: config.streaming !== undefined ? config.streaming : true,
            // AI参数
            top_p: config.top_p || 1.0,
            frequency_penalty: config.frequency_penalty || 0,
            presence_penalty: config.presence_penalty || 0,
            top_k: config.top_k,
            repetition_penalty: config.repetition_penalty,
            min_p: config.min_p,
            top_a: config.top_a,
            typical_p: config.typical_p
        };
        
        // 创建中止控制器
        const abortController = new AbortController();
        currentAbortController = abortController;
        
        // 设置发送状态，切换按钮
        isSending = true;
        updateSendButton(true);
        
        // 智能滚动控制
        let autoScroll = true;
        // 优先使用messages-container，如果不存在则使用chat-container
        const scrollContainer = document.querySelector('.messages-container') || document.querySelector('.chat-container');
        
        // 检查是否在底部（允许10px的误差）
        const isAtBottom = () => {
            if (!scrollContainer) return true;
            return scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 10;
        };
        
        // 监听用户滚动
        const scrollHandler = () => {
            // 如果用户滚动到不是底部，停止自动滚动
            autoScroll = isAtBottom();
            console.log('[智能滚动]', autoScroll ? '保持自动滚动' : '用户已手动滚动，停止自动滚动');
        };
        
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', scrollHandler);
        }
        
        if (config.streaming) {
            // 流式请求
            const response = await fetch('/api/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData),
                signal: abortController.signal
            });
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';
            
            // 移除加载动画，准备显示实际内容
            loadingDiv.remove();
            const messageDiv = addMessageToChat('assistant', '', false);
            const messageInner = messageDiv.querySelector('.message-inner');
            const contentDiv = messageInner.querySelector('.message-content');
            
            // AI消息框出现时立即滚动 - 重新获取容器因为可能刚创建
            const currentScrollContainer = document.querySelector('.messages-container') || document.querySelector('.chat-container');
            if (currentScrollContainer) {
                currentScrollContainer.scrollTop = currentScrollContainer.scrollHeight;
            }
            
            // 不再需要单独的停止按钮，因为发送按钮已经切换为停止功能
            
            try {
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
                                
                                // 前端回复截断控制
                                if (config.frontend_max_response && assistantMessage.length >= config.frontend_max_response) {
                                    assistantMessage = assistantMessage.substring(0, config.frontend_max_response);
                                    const truncatedMsg = assistantMessage + '\n\n[回复已达到最大长度限制，已自动截断]';
                                    // 使用文本修饰器处理流式内容
                                    if (window.textDecorator) {
                                        // 设置变量值
                                        if (window.currentCharacter) {
                                            window.textDecorator.setVariable('char', window.currentCharacter.name || 'Assistant');
                                        }
                                        if (window.getCurrentUserPersona) {
                                            const persona = window.getCurrentUserPersona();
                                            window.textDecorator.setVariable('user', persona.name || 'User');
                                        }
                                        contentDiv.innerHTML = window.textDecorator.processMessage(truncatedMsg, 'assistant');
                                    } else {
                                        contentDiv.innerHTML = escapeHtml(truncatedMsg).replace(/\n/g, '<br>');
                                    }
                                    console.log(`[回复截断] AI回复已达到${config.frontend_max_response}字符限制，已截断`);
                                    reader.cancel(); // 取消读取流
                                    break;
                                } else {
                                    // 处理流式内容
                                    if (window.textDecorator) {
                                        // 设置变量值
                                        if (window.currentCharacter) {
                                            window.textDecorator.setVariable('char', window.currentCharacter.name || 'Assistant');
                                        }
                                        if (window.getCurrentUserPersona) {
                                            const persona = window.getCurrentUserPersona();
                                            window.textDecorator.setVariable('user', persona.name || 'User');
                                        }
                                        // 使用处理后的HTML（流式生成时，消息索引是当前数组长度）
                                        const streamingIndex = window.contextMessages.length;
                                        contentDiv.innerHTML = window.textDecorator.processMessage(assistantMessage, 'assistant', streamingIndex);
                                    } else {
                                        contentDiv.innerHTML = escapeHtml(assistantMessage).replace(/\n/g, '<br>');
                                    }
                                }
                                // 智能自动滚动 - 只在用户没有手动滚动时才自动滚到底部
                                if (autoScroll) {
                                    scrollToBottom();
                                }
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    const abortedMsg = assistantMessage + '\n\n[生成已被用户中止]';
                    if (window.textDecorator) {
                        // 设置变量值
                        if (window.currentCharacter) {
                            window.textDecorator.setVariable('char', window.currentCharacter.name || 'Assistant');
                        }
                        if (window.getCurrentUserPersona) {
                            const persona = window.getCurrentUserPersona();
                            window.textDecorator.setVariable('user', persona.name || 'User');
                        }
                        contentDiv.innerHTML = window.textDecorator.processMessage(abortedMsg, 'assistant');
                    } else {
                        contentDiv.innerHTML = escapeHtml(abortedMsg).replace(/\n/g, '<br>');
                    }
                } else {
                    throw error;
                }
            } finally {
                // 重置发送状态
                isSending = false;
                currentAbortController = null;
                updateSendButton(false);
                
                // 清理滚动监听器
                if (scrollContainer) {
                    scrollContainer.removeEventListener('scroll', scrollHandler);
                }
            }
            
            // 添加到上下文
            if (assistantMessage) {
                window.contextMessages.push({ role: 'assistant', content: assistantMessage });
                updateHistoryDisplay();
                
                // 流式响应完成后，重新处理所有消息以确保深度正确
                // 延迟一点确保DOM已更新
                setTimeout(() => {
                    if (window.htmlRenderer && window.htmlRenderer.config.enabled) {
                        console.log('[流式完成] 重新处理所有消息，确保深度正确');
                        // 使用processAllMessages会先清除旧的渲染，然后按深度重新渲染
                        window.htmlRenderer.processAllMessages();
                    }
                }, 500); // 给一点时间让DOM完全更新
            }
        } else {
            // 非流式请求
            const response = await fetch('/api/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            const data = await response.json();
            loadingDiv.remove();
            
            if (data.choices && data.choices[0].message) {
                let assistantMessage = data.choices[0].message.content;
                
                // 前端回复截断控制
                if (config.frontend_max_response && assistantMessage.length > config.frontend_max_response) {
                    assistantMessage = assistantMessage.substring(0, config.frontend_max_response);
                    console.log(`[回复截断] AI回复超过${config.frontend_max_response}字符限制，已截断`);
                    addMessageToChat('assistant', assistantMessage + '\n\n[回复已达到最大长度限制，已自动截断]');
                } else {
                    addMessageToChat('assistant', assistantMessage);
                }
                
                // 添加到上下文
                window.contextMessages.push({ role: 'assistant', content: assistantMessage });
                updateHistoryDisplay();
            }
            
            // 重置发送状态
            isSending = false;
            currentAbortController = null;
            updateSendButton(false);
        }
        
        // 自动保存聊天
        await autoSaveChat();
        
        // 确保历史面板更新（特别是第一条消息时）
        if (window.contextMessages.length <= 2) { // user message + assistant response
            updateHistoryDisplay();
        }
        
    } catch (error) {
        console.error('发送消息失败:', error);
        loadingDiv.remove();
        showToast('发送消息失败: ' + error.message, 'error');
    } finally {
        // 确保重置状态
        isSending = false;
        currentAbortController = null;
        updateSendButton(false);
    }
}

// 更新发送按钮状态
function updateSendButton(isSending) {
    const sendButton = document.querySelector('.send-button');
    if (!sendButton) return;
    
    if (isSending) {
        // 切换为停止按钮 - 白色正方形
        sendButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24">
                <rect x="8" y="8" width="8" height="8" fill="white"/>
            </svg>
        `;
        sendButton.classList.add('stop-mode');
        sendButton.title = '停止生成';
    } else {
        // 恢复为发送按钮
        sendButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 4L12 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></path>
                <path d="M8 9L8 15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></path>
                <path d="M20 10L20 14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></path>
                <path d="M4 10L4 14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></path>
            </svg>
        `;
        sendButton.classList.remove('stop-mode');
        sendButton.title = '发送消息';
    }
}

// 添加消息到聊天界面 - ChatGPT风格
function addMessageToChat(role, content, isLoading = false, messageData = null) {
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
        // 确定消息索引：
        // 1. 如果消息已在数组中（通过refreshChatDisplay或loadHistoryChat调用），使用实际索引
        // 2. 如果消息还没在数组中（用户刚发送或AI正在生成），索引应该是即将添加的位置
        let messageIndex = -1;

        // 从前往后查找第一个匹配的消息（确保找到正确的索引）
        for (let i = 0; i < window.contextMessages.length; i++) {
            if (window.contextMessages[i].role === role && window.contextMessages[i].content === content) {
                messageIndex = i;
                break; // 找到第一个匹配就停止
            }
        }

        // 如果找不到，说明消息即将被添加（用户消息或新的AI消息）
        // 索引应该是数组的当前长度（即将添加的位置）
        if (messageIndex === -1) {
            messageIndex = window.contextMessages.length;
        }

        console.log(`[消息索引] role=${role}, 找到索引=${messageIndex}, 数组长度=${window.contextMessages.length}`);

        // 处理消息内容
        let decoratedContent = content;
        
        // 使用文本修饰器处理基础文本（HTML渲染器会通过DOM观察器独立处理）
        if (window.textDecorator) {
            // 设置变量值
            if (window.currentCharacter) {
                window.textDecorator.setVariable('char', window.currentCharacter.name || 'Assistant');
            }
            if (window.getCurrentUserPersona) {
                const persona = window.getCurrentUserPersona();
                window.textDecorator.setVariable('user', persona.name || 'User');
            }
            // 处理消息（包含HTML转义、变量替换、引号修饰）
            decoratedContent = window.textDecorator.processMessage(content, role, messageIndex);
        } else {
            // 如果没有修饰器，只做HTML转义和换行
            decoratedContent = escapeHtml(content).replace(/\n/g, '<br>');
        }
        
        messageInner.innerHTML = `
            <div class="message-header">
                <div class="message-avatar">${role === 'user' ? 'U' : 'AI'}</div>
                <div class="message-actions">
                    <button class="message-btn edit-btn" onclick="editMessage(${messageIndex})" title="编辑">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                    </button>
                    <button class="message-btn delete-btn" onclick="deleteMessage(${messageIndex})" title="删除">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                    ${role === 'assistant' ? `
                    <button class="message-btn regenerate-btn" onclick="regenerateMessage(${messageIndex})" title="重新生成">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                    </button>
                    ` : ''}
                </div>
            </div>
            <div class="message-body">
                <div class="message-content" data-index="${messageIndex}">${decoratedContent}</div>
                ${messageData && messageData.swipes && messageData.swipes.length > 1 ? `
                <div class="swipe-controls">
                    <button class="swipe-btn swipe-left" onclick="swipeMessage(${messageIndex}, -1)" title="上一个开场白">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <span class="swipe-counter">${(messageData.swipe_id || 0) + 1} / ${messageData.swipes.length}</span>
                    <button class="swipe-btn swipe-right" onclick="swipeMessage(${messageIndex}, 1)" title="下一个开场白">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    }
    
    messageDiv.appendChild(messageInner);
    messagesContainer.appendChild(messageDiv);
    
    // 滚动到聊天容器底部
    scrollToBottom();
    
    // 如果是用户的第一条消息，生成对话标题
    if (role === 'user' && window.contextMessages.length === 0 && content) {
        currentChatTitle = content.substring(0, 30) + (content.length > 30 ? '...' : '');
        // TODO: 后期可以调用AI生成更好的标题
    }
    
    return messageDiv;
}

// 开始新对话
function startNewChat() {
    // 保存当前对话(如果有内容)
    if (window.contextMessages.length > 0) {
        saveChatToHistory();
    }

    // 清空当前对话
    window.contextMessages = [];
    currentChatId = null;
    currentChatTitle = '新对话';

    // 如果有角色卡被选中,添加角色的初始消息
    if (window.currentCharacter) {
        // 获取正确的字段(优先从data里取,兼容spec_v3格式)
        const first_mes = window.currentCharacter.first_mes || window.currentCharacter.data?.first_mes;
        const alternate_greetings = window.currentCharacter.alternate_greetings || window.currentCharacter.data?.alternate_greetings;

        // 添加角色的第一条消息(如果有的话)
        if (first_mes) {
            const message = {
                role: 'assistant',
                content: first_mes,
                swipe_id: 0,  // 当前显示的开场白索引
                swipes: [first_mes]  // 所有可用的开场白
            };

            // 如果有备用开场白,添加到swipes数组
            if (alternate_greetings && alternate_greetings.length > 0) {
                message.swipes.push(...alternate_greetings);
            }

            window.contextMessages.push(message);
        }

        // 注意:系统提示会在发送消息时通过 Prompt Manager 动态构建
        // 不在这里硬编码任何系统提示
    }

    // 清空聊天界面
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
        messagesContainer.remove();
    }

    // 更新角色标题栏
    updateChatHeader();

    // 如果有角色的初始消息,显示它
    if (window.contextMessages.length > 0) {
        // 显示角色的初始消息
        window.contextMessages.forEach(msg => {
            addMessageToChat(msg.role, msg.content, false, msg);
        });

        // 显示初始消息后滚动到底部
        setTimeout(() => {
            scrollToBottom();
        }, 100);
    } else {
        // 没有角色卡时，显示欢迎界面
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
    }
    
    // 更新历史显示
    updateHistoryDisplay();
    
    // 刷新提示词管理器（如果打开）
    if (typeof refreshPromptManager === 'function') {
        refreshPromptManager();
    }
    
    showToast('已开始新对话', 'success');
}

// 更新历史对话显示
function updateHistoryDisplay() {
    // 创建或更新侧边栏的历史对话显示
    let historyPanel = document.querySelector('.history-panel');
    
    // 如果提示词管理器面板打开，更新Token统计
    if (document.querySelector('.prompt-manager-panel') && typeof updateTokenSummary === 'function') {
        updateTokenSummary();
    }
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
                </div>
            </div>
            <div class="history-list"></div>
        `;
        sidebar.appendChild(historyPanel);
    }
    
    // 更新历史列表
    const list = historyPanel.querySelector('.history-list');
    list.innerHTML = '';
    
    // 如果当前有对话但不在历史列表中（新对话），临时添加到显示
    let displayHistory = [...chatHistory];
    if (currentChatId && window.contextMessages.length > 0) {
        const existsInHistory = chatHistory.find(chat => 
            chat.chatId === currentChatId || chat.name === currentChatId
        );
        if (!existsInHistory) {
            // 创建临时的历史项显示
            const charName = window.currentCharacter ? window.currentCharacter.name : 'default';
            const tempChat = {
                chatId: currentChatId,
                name: currentChatId,
                character: charName,
                title: currentChatTitle || window.contextMessages[0]?.content?.substring(0, 30) || '新对话',
                preview: window.contextMessages[0]?.content || '',
                timestamp: new Date().toISOString(),
                messageCount: window.contextMessages.length,
                isTemp: true // 标记为临时项
            };
            displayHistory.unshift(tempChat);
        }
    }
    
    // 添加历史对话
    displayHistory.forEach((chat, index) => {
        const historyDiv = document.createElement('div');
        // 检查是否是当前选中的对话 - 更严格的判断
        let isActive = false;
        if (window.contextMessages.length > 0 && currentChatId) {
            // 优先匹配name（服务器对话），然后匹配chatId（本地对话）
            if (chat.name && chat.name === currentChatId) {
                isActive = true;
            } else if (!chat.name && chat.chatId === currentChatId) {
                isActive = true;
            }
        }
        historyDiv.className = isActive ? 'history-item active' : 'history-item';
        // 优先使用服务器返回的message_count，否则尝试使用messages数组长度
        const messageCount = chat.message_count !== undefined ? chat.message_count : 
                           (chat.messages ? chat.messages.length : 0);
        historyDiv.innerHTML = `
            <div class="history-content" onclick="loadHistoryChat(${index})">
                <div class="history-title" id="history-title-${index}" ondblclick="event.stopPropagation(); editChatTitle(${index})">
                    ${chat.title || chat.name || '未命名对话'}
                </div>
                <div class="history-meta">${messageCount} 条消息</div>
            </div>
            <div class="history-actions">
                <button class="history-edit-btn" onclick="event.stopPropagation(); editChatTitle(${index})" title="编辑标题">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="history-delete-btn" onclick="event.stopPropagation(); deleteHistoryChat(${index})" title="删除对话">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;
        list.appendChild(historyDiv);
    });
}

// 清空上下文
window.clearContext = async function() {
    window.contextMessages = [];
    updateHistoryDisplay();
    
    try {
        await fetch('/api/context/clear', {
            method: 'POST'
        });
        showToast('上下文已清空', 'success');
    } catch (error) {
        console.error('清空上下文失败:', error);
    }
};

// 自动保存聊天
async function autoSaveChat() {
    if (window.contextMessages.length === 0) return;
    
    const userName = window.getCurrentUserPersona ? window.getCurrentUserPersona().name : 'User';
    
    // 如果当前对话已经有角色名，保持不变；否则使用当前选择的角色
    let charName = 'default';
    
    // 检查当前对话是否已经关联了角色
    const currentChat = chatHistory.find(chat => 
        chat.chatId === currentChatId || chat.name === currentChatId
    );
    
    if (currentChat && currentChat.character) {
        // 使用已关联的角色
        charName = currentChat.character;
    } else if (window.currentCharacter) {
        // 使用当前选择的角色
        charName = window.currentCharacter.name;
    }
    
    // 确保currentChatId存在
    if (!currentChatId) {
        currentChatId = `chat_${Date.now()}`;
    }
    
    // 如果是新对话(不在历史列表中),立即添加到历史列表顶部
    if (!chatHistory.find(chat => chat.chatId === currentChatId || chat.name === currentChatId)) {
        const newChat = {
            chatId: currentChatId,
            name: currentChatId,
            character: charName,
            title: currentChatTitle || '新对话',
            preview: window.contextMessages[0]?.content || '',
            timestamp: new Date().toISOString(),
            messageCount: window.contextMessages.length,
            message_count: window.contextMessages.length  // 添加message_count确保显示正确
        };
        chatHistory.unshift(newChat);  // 使用unshift添加到数组开头
        console.log('[自动保存] 新对话已添加到历史列表:', currentChatId, '消息数:', window.contextMessages.length);
        // 立即更新历史显示
        updateHistoryDisplay();
    }
    
    try {
        const response = await fetch('/api/chats/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                character_name: charName,
                chat_name: currentChatId,
                messages: window.contextMessages,
                metadata: {
                    user_name: userName,
                    title: currentChatTitle || window.contextMessages[0]?.content?.substring(0, 30) || '新对话',
                    create_date: new Date().toISOString()
                }
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (!currentChatId) {
                currentChatId = data.chat_name;
            }
            
            // 更新本地历史记录中的消息数量
            const chatIndex = chatHistory.findIndex(chat =>
                chat.chatId === currentChatId || chat.name === currentChatId
            );
            if (chatIndex !== -1) {
                chatHistory[chatIndex].message_count = window.contextMessages.length;
                chatHistory[chatIndex].messageCount = window.contextMessages.length;
                console.log('[自动保存] 对话消息数已更新:', currentChatId, '消息数:', window.contextMessages.length);
                // 立即更新显示
                updateHistoryDisplay();
            } else {
                console.warn('[自动保存] 未在本地历史中找到对话:', currentChatId);
            }
        }
    } catch (error) {
        console.error('自动保存失败:', error);
        // 降级到localStorage
        saveChatToHistory();
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
    if (window.contextMessages.length === 0) {
        showToast('当前没有对话内容', 'warning');
        return;
    }
    
    // 获取用户和角色名称
    const userName = window.getCurrentUserPersona ? window.getCurrentUserPersona().name : 'User';
    const charName = window.currentCharacter ? window.currentCharacter.name : 'Assistant';
    
    // 转换为SillyTavern的JSONL格式
    let jsonlContent = '';
    
    // 第一行：元数据
    const metadata = {
        user_name: userName,
        character_name: charName,
        create_date: new Date().toISOString(),
        chat_metadata: {
            note: '',
            title: currentChatTitle
        }
    };
    jsonlContent += JSON.stringify(metadata) + '\n';
    
    // 后续行：消息（过滤掉系统消息，因为系统提示不应该在对话历史中）
    window.contextMessages.filter(msg => msg.role !== 'system').forEach((msg, index) => {
        const entry = {
            name: msg.role === 'user' ? userName : charName,
            is_user: msg.role === 'user',
            is_system: false,
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

// 已删除exportAllChats功能
/* window.exportAllChats = function() {
    const allChats = [...chatHistory];
    
    // 添加当前对话（如果有）
    if (window.contextMessages.length > 0) {
        allChats.unshift({
            title: currentChatTitle,
            chatId: currentChatId || 'temp_' + Date.now(),
            messages: window.contextMessages,
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
}; */

// 导入SillyTavern格式的对话
window.importChat = function(file) {
    // 检查文件名，支持jsonl和json
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.jsonl') && !fileName.endsWith('.json')) {
        // 如果文件没有正确的扩展名，仍然尝试解析
        console.log('[导入] 文件扩展名不是jsonl或json，但仍然尝试解析');
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const lines = e.target.result.split('\n').filter(line => line.trim());
            const messages = [];
            let chatMetadata = null;
            
            lines.forEach((line, index) => {
                const entry = JSON.parse(line);
                
                // 第一行可能是元数据
                if (index === 0 && entry.user_name && entry.character_name) {
                    chatMetadata = entry;
                    // 如果有对应的角色，尝试选择它
                    if (entry.character_name && window.characterList) {
                        const charIndex = window.characterList.findIndex(c => c.name === entry.character_name);
                        if (charIndex !== -1) {
                            window.selectCharacter(charIndex);
                        }
                    }
                } else if (entry.mes) {
                    // 普通消息
                    messages.push({
                        role: entry.is_user ? 'user' : 'assistant',
                        content: entry.mes || entry.content || ''
                    });
                }
            });
            
            if (messages.length > 0) {
                // 保存当前对话
                if (window.contextMessages.length > 0) {
                    saveChatToHistory();
                }
                
                // 加载导入的对话
                window.contextMessages = messages;
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
                window.contextMessages.forEach(msg => {
                    addMessageToChat(msg.role, msg.content);
                });
                
                // 立即保存导入的对话到历史
                saveChatToHistory();
                
                // 导入对话后滚动到底部
                setTimeout(() => {
                    scrollToBottom();
                }, 100);
                
                // 如果有角色名称，尝试保存到服务器
                if (chatMetadata && chatMetadata.character_name) {
                    autoSaveChat();
                }
                
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
    if (window.contextMessages.length === 0) return;
    
    // 检查是否已经存在相同ID的对话
    const existingIndex = chatHistory.findIndex(chat => chat.chatId === currentChatId);
    
    const chat = {
        title: currentChatTitle,
        chatId: currentChatId || 'chat_' + Date.now(),
        messages: [...window.contextMessages.filter(msg => msg.role !== 'system')], // 过滤系统消息
        timestamp: new Date().toISOString(),
        characterName: window.currentCharacter ? window.currentCharacter.name : null // 添加角色名称
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

// 加载特定角色的最新对话
async function loadLatestChatForCharacter(characterName) {
    if (!characterName) return;
    
    try {
        // 获取该角色的对话列表
        const response = await fetch(`/api/chats/list?character=${encodeURIComponent(characterName)}`);
        
        if (response.ok) {
            const data = await response.json();
            const chats = data.chats || [];
            
            if (chats.length > 0) {
                // 加载最新的对话
                const latestChat = chats[0]; // 已按时间排序，第一个是最新的
                const chatResponse = await fetch(`/api/chats/get?character=${encodeURIComponent(characterName)}&chat_name=${encodeURIComponent(latestChat.name)}`);
                
                if (chatResponse.ok) {
                    const chatData = await chatResponse.json();
                    
                    // 恢复对话内容
                    window.contextMessages = chatData.messages || [];
                    currentChatId = latestChat.name;
                    currentChatTitle = latestChat.title || latestChat.name;
                    
                    // 刷新显示
                    refreshChatDisplay();
                    updateHistoryDisplay();
                    
                    // 加载最新对话后滚动到底部
                    setTimeout(() => {
                        scrollToBottom();
                    }, 100);
                }
            }
        }
    } catch (error) {
        console.error('加载最新对话失败:', error);
    }
}

// 加载历史对话列表
async function loadChatHistory() {
    const charName = window.currentCharacter ? window.currentCharacter.name : null;
    
    try {
        // 从服务器加载对话列表
        const url = charName ? `/api/chats/list?character=${encodeURIComponent(charName)}` : '/api/chats/list';
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            // 清空旧的历史记录，只使用服务器返回的数据
            chatHistory = data.chats || [];
            
            // 去重：基于name或chatId
            const seen = new Set();
            chatHistory = chatHistory.filter(chat => {
                const key = chat.name || chat.chatId;
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            });
            
            // 同步到localStorage作为缓存
            // 不使用localStorage保存
        } else {
            throw new Error('服务器响应错误');
        }
    } catch (error) {
        console.error('从服务器加载失败，使用本地缓存:', error);
        // 降级到localStorage
        const saved = null; // 不使用localStorage
        if (saved) {
            try {
                chatHistory = JSON.parse(saved);
                // 如果有角色过滤，只显示该角色的对话
                if (charName) {
                    chatHistory = chatHistory.filter(chat => chat.characterName === charName || chat.character === charName);
                }
            } catch (e) {
                chatHistory = [];
            }
        }
    }
}

// 加载历史对话
async function loadHistoryChat(index) {
    // 保存当前对话
    if (window.contextMessages.length > 0) {
        saveChatToHistory();
    }
    
    // 加载选中的对话
    const chat = chatHistory[index];
    if (!chat) return;
    
    // 切换到对话对应的角色
    if (chat.character && window.selectCharacterByName) {
        // 尝试切换到对应角色
        const switched = await window.selectCharacterByName(chat.character);
        if (!switched) {
            showToast(`警告：无法切换到角色 ${chat.character}`, 'warning');
        }
    } else if (chat.characterName && window.selectCharacterByName) {
        // 兼容旧格式
        const switched = await window.selectCharacterByName(chat.characterName);
        if (!switched) {
            showToast(`警告：无法切换到角色 ${chat.characterName}`, 'warning');
        }
    }
    
    // 如果对话来自服务器（有name和character属性），需要从服务器加载完整内容
    if (chat.name && chat.character && !chat.messages) {
        try {
            showToast('正在加载对话...', 'info');
            const response = await fetch(`/api/chats/get?character=${encodeURIComponent(chat.character)}&chat_name=${encodeURIComponent(chat.name)}`);
            
            if (response.ok) {
                const data = await response.json();
                
                // 更新window.contextMessages为服务器返回的消息
                window.contextMessages = data.messages || [];
                currentChatId = chat.name;
                currentChatTitle = chat.title || chat.name;
                
                // 更新缓存中的对话数据
                chatHistory[index].messages = window.contextMessages;
                chatHistory[index].chatId = currentChatId;
                
            } else {
                throw new Error('加载对话失败');
            }
        } catch (error) {
            console.error('从服务器加载对话失败:', error);
            showToast('加载对话失败: ' + error.message, 'error');
            return;
        }
    } else {
        // 从本地缓存加载
        window.contextMessages = [...(chat.messages || [])];
        currentChatId = chat.chatId || chat.name;
        currentChatTitle = chat.title || chat.name || '未命名对话';
    }
    
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
    window.contextMessages.forEach(msg => {
        addMessageToChat(msg.role, msg.content);
    });
    
    // 更新历史显示
    updateHistoryDisplay();
    
    // 加载完对话后滚动到底部显示最新消息
    setTimeout(() => {
        scrollToBottom();
        
        // 触发HTML渲染器处理所有消息
        if (window.htmlRenderer && window.htmlRenderer.config.enabled) {
            console.log('[加载历史] 触发HTML渲染');
            window.htmlRenderer.processAllMessages();
        }
    }, 100);
    
    // 更新角色标题栏
    updateChatHeader();
    
    // 刷新提示词管理器（如果打开）
    if (typeof refreshPromptManager === 'function') {
        refreshPromptManager();
    }
    
    showToast(`已加载对话: ${currentChatTitle}`, 'success');
}

// 编辑消息
window.editMessage = function(index) {
    if (index < 0 || index >= window.contextMessages.length) return;
    
    const message = window.contextMessages[index];
    const messageContent = document.querySelector(`.message-content[data-index="${index}"]`);
    
    if (!messageContent) return;
    
    // 创建编辑框
    const currentContent = message.content;
    const textarea = document.createElement('textarea');
    textarea.className = 'message-edit-textarea';
    textarea.value = currentContent;
    textarea.style.width = '100%';
    textarea.style.minHeight = '100px';
    
    // 创建按钮组
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'edit-buttons';
    buttonGroup.innerHTML = `
        <button onclick="saveEditedMessage(${index})" class="save-edit-btn">保存</button>
        <button onclick="cancelEditMessage(${index})" class="cancel-edit-btn">取消</button>
    `;
    
    // 替换内容
    messageContent.innerHTML = '';
    messageContent.appendChild(textarea);
    messageContent.appendChild(buttonGroup);
    
    // 聚焦并选中文本
    textarea.focus();
    textarea.select();
};

// 保存编辑的消息
window.saveEditedMessage = function(index) {
    const messageContent = document.querySelector(`.message-content[data-index="${index}"]`);
    const textarea = messageContent.querySelector('textarea');
    
    if (!textarea) return;
    
    const newContent = textarea.value.trim();
    if (newContent) {
        // 更新消息数组
        window.contextMessages[index].content = newContent;

        // 恢复显示 - 使用文本修饰器，但保留data-index属性
        const role = window.contextMessages[index].role;
        let decoratedContent;

        if (window.textDecorator) {
            // 设置变量值
            if (window.currentCharacter) {
                window.textDecorator.setVariable('char', window.currentCharacter.name || 'Assistant');
            }
            if (window.getCurrentUserPersona) {
                const persona = window.getCurrentUserPersona();
                window.textDecorator.setVariable('user', persona.name || 'User');
            }
            decoratedContent = window.textDecorator.processMessage(newContent, role);
        } else {
            decoratedContent = escapeHtml(newContent).replace(/\n/g, '<br>');
        }

        // 恢复HTML内容，同时保留data-index属性
        messageContent.innerHTML = decoratedContent;
        messageContent.setAttribute('data-index', index); // 确保data-index不会丢失

        // 自动保存
        autoSaveChat();
        showToast('消息已更新', 'success');
    }
};

// 取消编辑
window.cancelEditMessage = function(index) {
    const messageContent = document.querySelector(`.message-content[data-index="${index}"]`);
    const message = window.contextMessages[index];

    // 恢复原内容 - 使用文本修饰器，但保留data-index属性
    let decoratedContent;

    if (window.textDecorator) {
        // 设置变量值
        if (window.currentCharacter) {
            window.textDecorator.setVariable('char', window.currentCharacter.name || 'Assistant');
        }
        if (window.getCurrentUserPersona) {
            const persona = window.getCurrentUserPersona();
            window.textDecorator.setVariable('user', persona.name || 'User');
        }
        decoratedContent = window.textDecorator.processMessage(message.content, message.role);
    } else {
        decoratedContent = escapeHtml(message.content).replace(/\n/g, '<br>');
    }

    // 恢复HTML内容，同时保留data-index属性
    messageContent.innerHTML = decoratedContent;
    messageContent.setAttribute('data-index', index); // 确保data-index不会丢失
};

// 删除消息
window.deleteMessage = function(index) {
    if (index < 0 || index >= window.contextMessages.length) return;
    
    if (confirm('确定要删除这条消息吗？')) {
        // 从数组中删除
        window.contextMessages.splice(index, 1);
        
        // 重新渲染所有消息
        refreshChatDisplay();
        
        // 自动保存
        autoSaveChat();
        showToast('消息已删除', 'success');
    }
};

// 重新生成消息（仅AI消息）
window.regenerateMessage = async function(index) {
    if (index < 0 || index >= window.contextMessages.length) return;
    
    const message = window.contextMessages[index];
    if (message.role !== 'assistant') return;
    
    // 如果正在发送中，禁止操作
    if (isSending) {
        showToast('正在发送中，请稍后再试', 'warning');
        return;
    }
    
    // 删除当前AI回复及之后的所有消息
    window.contextMessages.splice(index);
    
    // 刷新显示（删除旧消息）
    refreshChatDisplay();
    
    // 添加加载状态
    const loadingDiv = addMessageToChat('assistant', '', true);
    
    // 滚动到底部
    scrollToBottom();
    
    // 直接发送新的AI请求
    try {
        // 设置发送状态
        isSending = true;
        updateSendButton(true);
        
        // 创建中止控制器
        currentAbortController = new AbortController();
        
        // 构建上下文消息（与正常发送保持一致）
        let finalMessages = window.contextMessages;
        
        // 如果有提示词管理器，使用它来构建消息（与正常发送保持一致）
        if (typeof buildPromptMessages === 'function') {
            // 准备用户设置
            let userPersonaData = null;
            if (window.getCurrentUserPersona) {
                userPersonaData = window.getCurrentUserPersona();
            }
            const userSettings = {
                userName: userPersonaData?.name || 'User',
                persona: userPersonaData?.description || ''
            };
            
            // 获取当前角色信息
            const character = window.currentCharacter || null;
            
            // 获取世界书信息
            let worldInfo = null;
            if (typeof checkWorldBookTriggers === 'function') {
                console.log('[世界书] 检查触发条件...');
                console.log('[世界书] 当前激活的世界书:', activeWorldBooks);
                const triggered = checkWorldBookTriggers(window.contextMessages);
                console.log('[世界书] 触发的条目:', triggered);
                if (triggered.length > 0) {
                    worldInfo = {
                        before: triggered.filter(t => t.position === 'before').map(t => t.content).join('\n\n'),
                        after: triggered.filter(t => t.position === 'after').map(t => t.content).join('\n\n')
                    };
                    console.log('[世界书] 将注入的内容:', worldInfo);
                }
            }
            
            const toolBookData = buildToolBookPromptData(window.contextMessages);
            // 使用提示词管理器构建消息
            console.log('[提示词管理] 当前预设:', window.promptManager?.currentPresetName);
            console.log('[提示词管理] 预设内容:', window.promptManager?.preset);
            
            finalMessages = buildPromptMessages(window.contextMessages, character, worldInfo, userSettings, toolBookData);
            
            // 输出调试信息
            console.log('[提示词管理] 最终消息数:', finalMessages.length);
            if (finalMessages[0] && finalMessages[0].role === 'system') {
                console.log('[提示词管理] 系统提示词内容:', finalMessages[0].content.substring(0, 200));
            }
        } else {
            // 兼容旧的世界书注入方式
            if (typeof injectWorldBookContent === 'function') {
                finalMessages = injectWorldBookContent(window.contextMessages);
            }
        }
        
        // 前端历史截取控制（与正常发送保持一致）
        if (config.frontend_max_history && config.frontend_max_history > 0) {
            let totalLength = 0;
            let truncatedMessages = [];
            
            // 从后往前遍历消息，保留最新的消息
            for (let i = finalMessages.length - 1; i >= 0; i--) {
                const messageLength = JSON.stringify(finalMessages[i]).length;
                if (totalLength + messageLength <= config.frontend_max_history) {
                    truncatedMessages.unshift(finalMessages[i]);
                    totalLength += messageLength;
                } else if (i === 0 && truncatedMessages.length > 0) {
                    // 如果是第一条消息（通常是系统提示），尽量保留
                    truncatedMessages.unshift(finalMessages[i]);
                    break;
                } else {
                    break;
                }
            }
            
            if (truncatedMessages.length < finalMessages.length) {
                console.log(`[历史截取] 从${finalMessages.length}条消息截取到${truncatedMessages.length}条，总字符数: ${totalLength}`);
                finalMessages = truncatedMessages;
            }
        }
        
        // 准备请求数据（与正常发送保持完全一致）
        const requestData = {
            messages: finalMessages,
            model: config.model,
            temperature: config.temperature || 1.0,
            stream: config.streaming !== undefined ? config.streaming : true,
            // AI参数
            top_p: config.top_p || 1.0,
            frequency_penalty: config.frequency_penalty || 0,
            presence_penalty: config.presence_penalty || 0,
            top_k: config.top_k,
            repetition_penalty: config.repetition_penalty,
            min_p: config.min_p,
            top_a: config.top_a,
            typical_p: config.typical_p
        };
        
        // 智能滚动控制（与正常发送保持一致）
        let autoScroll = true;
        const scrollContainer = document.querySelector('.messages-container') || document.querySelector('.chat-container');
        
        const isAtBottom = () => {
            if (!scrollContainer) return true;
            return scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 10;
        };
        
        const scrollHandler = () => {
            autoScroll = isAtBottom();
            console.log('[智能滚动]', autoScroll ? '保持自动滚动' : '用户已手动滚动，停止自动滚动');
        };
        
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', scrollHandler);
        }
        
        // 发送请求
        const response = await fetch('/api/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData),
            signal: currentAbortController.signal
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        // 移除加载动画，创建新的AI消息
        loadingDiv.remove();
        const messageDiv = addMessageToChat('assistant', '', false);
        const messageInner = messageDiv.querySelector('.message-inner');
        const contentDiv = messageInner.querySelector('.message-content');
        const messageTextDiv = contentDiv.querySelector('.message-text');
        
        // 添加新的AI消息到上下文
        const assistantMessage = { role: 'assistant', content: '' };
        window.contextMessages.push(assistantMessage);
        
        // 处理响应（流式或非流式）
        if (config.streaming !== false) {
            // 流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') break;
                        
                        try {
                            const json = JSON.parse(data);
                            if (json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content) {
                                assistantMessage.content += json.choices[0].delta.content;
                                // 增量更新消息内容
                                if (contentDiv) {
                                    // 使用文本修饰器处理消息内容
                                    if (window.textDecorator) {
                                        // 设置变量值
                                        if (window.currentCharacter) {
                                            window.textDecorator.setVariable('char', window.currentCharacter.name || 'Assistant');
                                        }
                                        if (window.getCurrentUserPersona) {
                                            const persona = window.getCurrentUserPersona();
                                            window.textDecorator.setVariable('user', persona.name || 'User');
                                        }
                                        contentDiv.innerHTML = window.textDecorator.processMessage(assistantMessage.content, 'assistant');
                                    } else {
                                        contentDiv.innerHTML = escapeHtml(assistantMessage.content).replace(/\n/g, '<br>');
                                    }
                                    // 如果启用自动滚动，滚动到底部
                                    if (autoScroll) {
                                        scrollToBottom();
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('解析流式数据失败:', e);
                        }
                    }
                }
            }
        } else {
            // 非流式响应
            const data = await response.json();
            if (data.choices && data.choices[0] && data.choices[0].message) {
                assistantMessage.content = data.choices[0].message.content;
                if (contentDiv) {
                    // 使用文本修饰器处理消息内容
                    if (window.textDecorator) {
                        // 设置变量值
                        if (window.currentCharacter) {
                            window.textDecorator.setVariable('char', window.currentCharacter.name || 'Assistant');
                        }
                        if (window.getCurrentUserPersona) {
                            const persona = window.getCurrentUserPersona();
                            window.textDecorator.setVariable('user', persona.name || 'User');
                        }
                        contentDiv.innerHTML = window.textDecorator.processMessage(assistantMessage.content, 'assistant');
                    } else {
                        contentDiv.innerHTML = escapeHtml(assistantMessage.content).replace(/\n/g, '<br>');
                    }
                    if (autoScroll) {
                        scrollToBottom();
                    }
                }
            }
        }
        
        // 移除滚动监听器
        if (scrollContainer) {
            scrollContainer.removeEventListener('scroll', scrollHandler);
        }
        
        // 保存对话
        await autoSaveChat();
        
        // 记录AI日志（与正常发送保持一致）
        console.log('[AI响应完成] 消息长度:', assistantMessage.content.length);
        
    } catch (error) {
        // 移除加载动画
        if (loadingDiv && loadingDiv.parentNode) {
            loadingDiv.remove();
        }
        
        if (error.name === 'AbortError') {
            console.log('[用户中止] 重新生成已取消');
        } else {
            console.error('重新生成失败:', error);
            showToast('重新生成失败: ' + error.message, 'error');
        }
    } finally {
        // 重置状态
        isSending = false;
        currentAbortController = null;
        updateSendButton(false);
    }
};

// 刷新聊天显示
function refreshChatDisplay() {
    const messagesContainer = document.querySelector('.messages-container');
    if (!messagesContainer) return;

    // 清空消息（但不清空容器，因为输入框可能在里面）
    const allMessages = messagesContainer.querySelectorAll('.message');
    allMessages.forEach(msg => msg.remove());

    // 重新添加所有消息 - 使用实际的数组索引确保正确性
    window.contextMessages.forEach((msg, actualIndex) => {
        const index = actualIndex; // 确保使用正确的索引
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.role}-message`;
        
        const messageInner = document.createElement('div');
        messageInner.className = 'message-inner';
        // 使用文本修饰器处理消息内容
        let decoratedContent = msg.content;
        if (window.textDecorator) {
            // 设置变量值
            if (window.currentCharacter) {
                window.textDecorator.setVariable('char', window.currentCharacter.name || 'Assistant');
            }
            if (window.getCurrentUserPersona) {
                const persona = window.getCurrentUserPersona();
                window.textDecorator.setVariable('user', persona.name || 'User');
            }
            decoratedContent = window.textDecorator.processMessage(msg.content, msg.role, index);
        } else {
            decoratedContent = escapeHtml(msg.content).replace(/\n/g, '<br>');
        }
        
        messageInner.innerHTML = `
            <div class="message-header">
                <div class="message-avatar">${msg.role === 'user' ? 'U' : 'AI'}</div>
                <div class="message-actions">
                    <button class="message-btn edit-btn" onclick="editMessage(${index})" title="编辑">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                    </button>
                    <button class="message-btn delete-btn" onclick="deleteMessage(${index})" title="删除">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                    ${msg.role === 'assistant' ? `
                    <button class="message-btn regenerate-btn" onclick="regenerateMessage(${index})" title="重新生成">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                    </button>
                    ` : ''}
                </div>
            </div>
            <div class="message-body">
                <div class="message-content" data-index="${index}">${decoratedContent}</div>
                ${msg.swipes && msg.swipes.length > 1 ? `
                <div class="swipe-controls">
                    <button class="swipe-btn swipe-left" onclick="swipeMessage(${index}, -1)" title="上一个开场白">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <span class="swipe-counter">${(msg.swipe_id || 0) + 1} / ${msg.swipes.length}</span>
                    <button class="swipe-btn swipe-right" onclick="swipeMessage(${index}, 1)" title="下一个开场白">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>
                ` : ''}
            </div>
        `;
        
        messageDiv.appendChild(messageInner);
        messagesContainer.appendChild(messageDiv);
    });
    
    // 滚动到底部
    scrollToBottom();
    
    // 触发HTML渲染器处理所有消息
    if (window.htmlRenderer && window.htmlRenderer.config.enabled) {
        setTimeout(() => {
            console.log('[刷新显示] 触发HTML渲染');
            window.htmlRenderer.processAllMessages();
        }, 100);
    }
}

// 滚动到底部的统一函数
function scrollToBottom() {
    // 首先尝试滚动.messages-container（消息容器）
    const messagesContainer = document.querySelector('.messages-container');
    
    if (messagesContainer) {
        // 消息容器存在，滚动它
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // 确保滚动生效
        requestAnimationFrame(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    } else {
        // 如果没有消息容器，滚动.chat-container（欢迎界面等）
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
}

// 编辑对话标题
window.editChatTitle = async function(index) {
    let titleElement, chat, isCurrentChat = false;
    
    if (index === 'current') {
        // 编辑当前对话
        titleElement = document.getElementById('current-chat-title');
        isCurrentChat = true;
    } else {
        // 编辑历史对话
        titleElement = document.getElementById(`history-title-${index}`);
        chat = chatHistory[index];
        if (!chat) return;
    }
    
    if (!titleElement) return;
    
    // 保存原始内容
    const originalTitle = isCurrentChat ? currentChatTitle : (chat.title || chat.name);
    const displayTitle = titleElement.textContent.replace('📝 ', '').trim();
    
    // 创建输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'chat-title-edit-input';
    input.value = displayTitle;
    input.style.width = '100%';
    
    // 替换标题元素
    titleElement.innerHTML = '';
    titleElement.appendChild(input);
    
    // 聚焦并选中
    input.focus();
    input.select();
    
    // 保存函数
    const saveTitle = async () => {
        const newTitle = input.value.trim();
        
        if (newTitle && newTitle !== originalTitle) {
            if (isCurrentChat) {
                // 更新当前对话标题
                currentChatTitle = newTitle;
                
                // 如果有chatId，同时更新服务器
                if (currentChatId && window.currentCharacter) {
                    try {
                        await fetch('/api/chats/rename', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                character: window.currentCharacter.name,
                                old_name: currentChatId,
                                new_name: newTitle
                            })
                        });
                    } catch (error) {
                        console.error('重命名失败:', error);
                    }
                }
            } else {
                // 更新历史对话标题
                chat.title = newTitle;
                
                // 更新服务器
                if (chat.character && chat.name) {
                    try {
                        await fetch('/api/chats/rename', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                character: chat.character,
                                old_name: chat.name,
                                new_name: newTitle
                            })
                        });
                        chat.name = newTitle; // 更新文件名
                    } catch (error) {
                        console.error('重命名失败:', error);
                    }
                }
                
                // 更新localStorage
                // 不使用localStorage保存
            }
            
            // 恢复显示
            titleElement.textContent = isCurrentChat ? `📝 ${newTitle}` : newTitle;
            showToast('标题已更新', 'success');
        } else {
            // 恢复原标题
            titleElement.textContent = isCurrentChat ? `📝 ${originalTitle}` : originalTitle;
        }
    };
    
    // 绑定事件
    input.addEventListener('blur', saveTitle);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        } else if (e.key === 'Escape') {
            input.value = originalTitle;
            input.blur();
        }
    });
};

// 删除历史对话
window.deleteHistoryChat = async function(index) {
    const chat = chatHistory[index];
    if (!chat) return;
    
    const chatTitle = chat.title || chat.name || '未命名对话';
    
    // 确认删除
    if (confirm(`确定要删除对话 "${chatTitle}" 吗？`)) {
        try {
            // 如果是服务器上的对话，需要调用API删除
            if (chat.name && chat.character) {
                const response = await fetch(`/api/chats/delete?character=${encodeURIComponent(chat.character)}&chat_name=${encodeURIComponent(chat.name)}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    throw new Error('服务器删除失败');
                }
            }
            
            // 从历史数组中移除
            chatHistory.splice(index, 1);
            
            // 更新localStorage
            // 不使用localStorage保存
            
            // 如果删除的是当前对话，清空当前对话
            if ((chat.chatId === currentChatId || chat.name === currentChatId)) {
                window.contextMessages = [];
                currentChatId = null;
                currentChatTitle = '新对话';
                
                // 清空界面
                const messagesContainer = document.querySelector('.messages-container');
                if (messagesContainer) {
                    messagesContainer.remove();
                }
                
                // 显示欢迎界面
                const welcomeSection = document.querySelector('.welcome-section');
                if (welcomeSection) {
                    welcomeSection.style.display = 'flex';
                }
            }
            
            // 更新显示
            updateHistoryDisplay();
            
            showToast('对话已删除', 'success');
        } catch (error) {
            console.error('删除失败:', error);
            showToast('删除失败: ' + error.message, 'error');
        }
    }
};

// ==================== 开场白切换(Swipe)功能 ====================

// 切换消息的备用版本
window.swipeMessage = function(messageIndex, direction) {
    const message = window.contextMessages[messageIndex];
    if (!message || !message.swipes || message.swipes.length <= 1) {
        return;
    }

    // 计算新的swipe_id
    let newSwipeId = (message.swipe_id || 0) + direction;

    // 循环处理
    if (newSwipeId < 0) {
        newSwipeId = message.swipes.length - 1;
    } else if (newSwipeId >= message.swipes.length) {
        newSwipeId = 0;
    }

    // 更新消息
    message.swipe_id = newSwipeId;
    message.content = message.swipes[newSwipeId];

    // 刷新显示
    refreshChatDisplay();
};
 