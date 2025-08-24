// AI响应配置管理模块
let aiSettings = {
    // API设置
    api_base: 'http://localhost:5000/api',
    api_key: '',
    api_model: 'gpt-3.5-turbo',
    max_context: 4096,  // 最大上下文长度
    
    // 基础参数
    temperature: 1.0,
    max_tokens: 300,
    top_p: 1.0,
    top_k: 0,
    frequency_penalty: 0,
    presence_penalty: 0,
    repetition_penalty: 1.0,
    min_p: 0,
    top_a: 1.0,
    streaming: true,
    
    // 高级参数
    seed: -1,
    typical_p: 1.0,
    tfs: 1.0,
    epsilon_cutoff: 0,
    eta_cutoff: 0,
    mirostat_mode: 0,
    mirostat_tau: 5.0,
    mirostat_eta: 0.1,
    
    // 当前预设
    current_preset: 'Default',
    
    // 提示词设置
    prompts: [],
    
    // 偏置设置
    bias_preset: 'Default (none)',
    logit_bias: {}
};

// 预设列表
let presetList = [];

// 显示AI设置面板
window.showAISettingsPanel = function() {
    // 检查是否已存在面板
    let existingPanel = document.querySelector('.side-panel-overlay');
    if (existingPanel) {
        existingPanel.remove();
    }
    
    // 创建覆盖层
    const overlay = document.createElement('div');
    overlay.className = 'side-panel-overlay';
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            closeSidePanel();
        }
    };
    
    // 创建侧边面板
    const panel = document.createElement('div');
    panel.className = 'side-panel ai-settings-panel';
    panel.innerHTML = `
        <div class="side-panel-header">
            <h2>AI响应配置</h2>
            <button class="side-panel-close" onclick="closeSidePanel()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        
        <div class="side-panel-content">
            <!-- API设置 -->
            <div class="settings-section">
                <h3>API设置</h3>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">API地址</span>
                    </label>
                    <input type="text" id="api-url" class="text-input" value="${config.api_url || 'https://api.openai.com/v1'}" 
                           placeholder="https://api.openai.com/v1" onchange="updateAPIConfig('api_url', this.value)">
                    <div class="setting-hint">OpenAI兼容的API地址</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">API密钥</span>
                    </label>
                    <input type="password" id="api-key" class="text-input" value="${config.api_key || ''}" 
                           placeholder="sk-..." onchange="updateAPIConfig('api_key', this.value)">
                    <div class="setting-hint">你的API密钥</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">最大上下文长度</span>
                        <span class="setting-value" id="max-context-value">${aiSettings.max_context || 4096}</span>
                    </label>
                    <input type="range" id="max-context" min="1024" max="32768" step="1024" 
                           value="${aiSettings.max_context || 4096}" 
                           oninput="updateSetting('max_context', parseInt(this.value), 'max-context-value')">
                    <div class="setting-hint">模型的最大上下文窗口大小</div>
                </div>
            </div>
            
            <!-- 基础参数 -->
            <div class="settings-section">
                <h3>基础参数</h3>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">温度 (Temperature)</span>
                        <span class="setting-value" id="temp-value">${aiSettings.temperature}</span>
                    </label>
                    <input type="range" id="temperature" min="0" max="2" step="0.01" value="${aiSettings.temperature}" 
                           oninput="updateSetting('temperature', this.value, 'temp-value')">
                    <div class="setting-hint">控制回复的随机性（0=确定性，2=最随机）</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">最大回复长度 (Max Tokens)</span>
                        <span class="setting-value" id="max-tokens-value">${aiSettings.max_tokens}</span>
                    </label>
                    <input type="range" id="max-tokens" min="1" max="4096" step="1" value="${aiSettings.max_tokens}" 
                           oninput="updateSetting('max_tokens', this.value, 'max-tokens-value')">
                    <div class="setting-hint">AI单次回复的最大字符数</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">Top P</span>
                        <span class="setting-value" id="top-p-value">${aiSettings.top_p}</span>
                    </label>
                    <input type="range" id="top-p" min="0" max="1" step="0.01" value="${aiSettings.top_p}" 
                           oninput="updateSetting('top_p', this.value, 'top-p-value')">
                    <div class="setting-hint">核采样参数（与温度配合使用）</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">频率惩罚 (Frequency Penalty)</span>
                        <span class="setting-value" id="freq-penalty-value">${aiSettings.frequency_penalty}</span>
                    </label>
                    <input type="range" id="frequency-penalty" min="-2" max="2" step="0.01" value="${aiSettings.frequency_penalty}" 
                           oninput="updateSetting('frequency_penalty', this.value, 'freq-penalty-value')">
                    <div class="setting-hint">降低词语重复的频率（-2到2）</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">存在惩罚 (Presence Penalty)</span>
                        <span class="setting-value" id="pres-penalty-value">${aiSettings.presence_penalty}</span>
                    </label>
                    <input type="range" id="presence-penalty" min="-2" max="2" step="0.01" value="${aiSettings.presence_penalty}" 
                           oninput="updateSetting('presence_penalty', this.value, 'pres-penalty-value')">
                    <div class="setting-hint">增加新话题的可能性（-2到2）</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <input type="checkbox" id="streaming" ${aiSettings.streaming ? 'checked' : ''} 
                               onchange="updateSetting('streaming', this.checked)">
                        <span class="setting-label">流式输出</span>
                    </label>
                    <div class="setting-hint">实时显示AI的回复内容</div>
                </div>
            </div>
            
            <!-- 高级参数 -->
            <details class="settings-section advanced-section">
                <summary>高级参数</summary>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">Top K</span>
                        <span class="setting-value" id="top-k-value">${aiSettings.top_k}</span>
                    </label>
                    <input type="range" id="top-k" min="0" max="100" step="1" value="${aiSettings.top_k}" 
                           oninput="updateSetting('top_k', this.value, 'top-k-value')">
                    <div class="setting-hint">限制采样的词汇数量（0=不限制）</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">重复惩罚 (Repetition Penalty)</span>
                        <span class="setting-value" id="rep-penalty-value">${aiSettings.repetition_penalty}</span>
                    </label>
                    <input type="range" id="repetition-penalty" min="0.1" max="2" step="0.01" value="${aiSettings.repetition_penalty}" 
                           oninput="updateSetting('repetition_penalty', this.value, 'rep-penalty-value')">
                    <div class="setting-hint">惩罚重复的内容（1.0=无惩罚）</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">Min P</span>
                        <span class="setting-value" id="min-p-value">${aiSettings.min_p}</span>
                    </label>
                    <input type="range" id="min-p" min="0" max="1" step="0.01" value="${aiSettings.min_p}" 
                           oninput="updateSetting('min_p', this.value, 'min-p-value')">
                    <div class="setting-hint">最小概率阈值</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">Top A</span>
                        <span class="setting-value" id="top-a-value">${aiSettings.top_a}</span>
                    </label>
                    <input type="range" id="top-a" min="0" max="1" step="0.01" value="${aiSettings.top_a}" 
                           oninput="updateSetting('top_a', this.value, 'top-a-value')">
                    <div class="setting-hint">自适应采样参数</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">Typical P</span>
                        <span class="setting-value" id="typical-p-value">${aiSettings.typical_p}</span>
                    </label>
                    <input type="range" id="typical-p" min="0" max="1" step="0.01" value="${aiSettings.typical_p}" 
                           oninput="updateSetting('typical_p', this.value, 'typical-p-value')">
                    <div class="setting-hint">典型性采样</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">随机种子 (Seed)</span>
                        <input type="number" id="seed" value="${aiSettings.seed}" min="-1" 
                               onchange="updateSetting('seed', parseInt(this.value))">
                    </label>
                    <div class="setting-hint">固定种子可获得可重复的结果（-1=随机）</div>
                </div>
            </details>
            
            <!-- 保存按钮 -->
            <div class="settings-actions">
                <button onclick="saveAISettings()" class="save-btn">保存设置</button>
                <button onclick="resetToDefaults()" class="reset-btn">恢复默认</button>
            </div>
        </div>
    `;
    
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    
    // 添加显示动画
    setTimeout(() => {
        overlay.classList.add('show');
        panel.classList.add('show');
    }, 10);
    
};

// 更新设置值
window.updateSetting = function(key, value, displayId) {
    // 更新内存中的值
    if (typeof value === 'string' && !isNaN(value)) {
        value = parseFloat(value);
    }
    aiSettings[key] = value;
    
    // 更新显示值
    if (displayId) {
        const displayElement = document.getElementById(displayId);
        if (displayElement) {
            displayElement.textContent = value;
        }
    }
    
    // 保存到本地存储
    saveAISettingsToLocal();
};

// 更新API配置
window.updateAPIConfig = function(key, value) {
    // 更新全局config对象
    if (window.config) {
        config[key] = value;
        
        // 保存到localStorage
        localStorage.setItem('aiChatConfig', JSON.stringify(config));
        
        // 如果是API地址或密钥改变，重新加载模型列表
        if (key === 'api_url' || key === 'api_key') {
            if (typeof loadModels === 'function') {
                loadModels();
            }
        }
    }
    
    // 同时保存到aiSettings
    aiSettings[key] = value;
    saveAISettingsToLocal();
};

// 保存AI设置到本地存储
function saveAISettingsToLocal() {
    localStorage.setItem('aiSettings', JSON.stringify(aiSettings));
}

// 加载AI设置
async function loadAISettings() {
    // 从本地存储加载
    const saved = localStorage.getItem('aiSettings');
    if (saved) {
        try {
            Object.assign(aiSettings, JSON.parse(saved));
        } catch (e) {
            console.error('加载AI设置失败:', e);
        }
    }
    
    // 从服务器加载
    try {
        const response = await fetch(`${config.api_base}/ai-settings`);
        if (response.ok) {
            const data = await response.json();
            Object.assign(aiSettings, data);
            saveAISettingsToLocal();
        }
    } catch (error) {
        console.error('从服务器加载设置失败:', error);
    }
}

// 保存AI设置到服务器
window.saveAISettings = async function() {
    // 同步到全局config
    if (window.config) {
        config.temperature = aiSettings.temperature;
        config.max_tokens = aiSettings.max_tokens;
        config.streaming = aiSettings.streaming;
        config.max_context = aiSettings.max_context;
        
        // 这些参数虽然原config没有，但可以扩展
        config.frequency_penalty = aiSettings.frequency_penalty;
        config.presence_penalty = aiSettings.presence_penalty;
        config.top_p = aiSettings.top_p;
        config.top_k = aiSettings.top_k;
        config.repetition_penalty = aiSettings.repetition_penalty;
        
        // 保存到localStorage
        localStorage.setItem('aiChatConfig', JSON.stringify(config));
    }
    
    try {
        const response = await fetch(`${config.api_base}/ai-settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(aiSettings)
        });
        
        if (response.ok) {
            showToast('AI设置已保存', 'success');
        }
    } catch (error) {
        console.error('保存设置失败:', error);
        // 即使服务器保存失败，本地也已保存
        showToast('设置已保存到本地', 'info');
    }
};


// 恢复默认设置
window.resetToDefaults = function() {
    if (confirm('确定要恢复默认设置吗？当前的设置将丢失。')) {
        aiSettings = {
            temperature: 1.0,
            max_tokens: 300,
            top_p: 1.0,
            top_k: 0,
            frequency_penalty: 0,
            presence_penalty: 0,
            repetition_penalty: 1.0,
            min_p: 0,
            top_a: 1.0,
            streaming: true,
            seed: -1,
            typical_p: 1.0,
            tfs: 1.0,
            epsilon_cutoff: 0,
            eta_cutoff: 0,
            mirostat_mode: 0,
            mirostat_tau: 5.0,
            mirostat_eta: 0.1,
            current_preset: 'Default',
            prompts: [],
            bias_preset: 'Default (none)',
            logit_bias: {}
        };
        
        saveAISettingsToLocal();
        showAISettingsPanel(); // 重新加载面板
        showToast('已恢复默认设置', 'success');
    }
};

// 初始化AI设置
window.initAISettings = function() {
    // 从全局config同步基础设置
    if (window.config) {
        aiSettings.api_url = config.api_url || aiSettings.api_url;
        aiSettings.api_key = config.api_key || aiSettings.api_key;
        aiSettings.api_model = config.model || aiSettings.api_model;
        aiSettings.temperature = config.temperature !== undefined ? config.temperature : aiSettings.temperature;
        aiSettings.max_tokens = config.max_tokens || aiSettings.max_tokens;
        aiSettings.streaming = config.streaming !== undefined ? config.streaming : aiSettings.streaming;
        aiSettings.max_context = config.max_context || aiSettings.max_context;
    }
    
    loadAISettings();
};