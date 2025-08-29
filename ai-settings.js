// AI响应配置管理模块
// 直接使用全局的config对象，不需要单独的aiSettings

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
                        <span class="setting-label">历史截取长度</span>
                        <span class="setting-value" id="frontend-history-value">${config.frontend_max_history || 65536}字符</span>
                    </label>
                    <input type="range" id="frontend-max-history" min="5000" max="200000" step="1000" 
                           value="${config.frontend_max_history || 65536}" 
                           oninput="updateSetting('frontend_max_history', parseInt(this.value), 'frontend-history-value', '字符')">
                    <div class="setting-hint">发送给AI的历史消息最大字符数（前端控制）</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">回复截断长度</span>
                        <span class="setting-value" id="frontend-response-value">${config.frontend_max_response || 10000}字符</span>
                    </label>
                    <input type="range" id="frontend-max-response" min="1000" max="50000" step="500" 
                           value="${config.frontend_max_response || 10000}" 
                           oninput="updateSetting('frontend_max_response', parseInt(this.value), 'frontend-response-value', '字符')">
                    <div class="setting-hint">前端主动截断AI回复的最大字符数</div>
                </div>
            </div>
            
            <!-- 基础参数 -->
            <div class="settings-section">
                <h3>基础参数</h3>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">温度 (Temperature)</span>
                        <span class="setting-value" id="temp-value">${config.temperature || 1.0}</span>
                    </label>
                    <input type="range" id="temperature" min="0" max="2" step="0.01" value="${config.temperature || 1.0}" 
                           oninput="updateSetting('temperature', this.value, 'temp-value')">
                    <div class="setting-hint">控制回复的随机性（0=确定性，2=最随机）</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">Top P</span>
                        <span class="setting-value" id="top-p-value">${config.top_p || 1.0}</span>
                    </label>
                    <input type="range" id="top-p" min="0" max="1" step="0.01" value="${config.top_p || 1.0}" 
                           oninput="updateSetting('top_p', this.value, 'top-p-value')">
                    <div class="setting-hint">核采样参数（与温度配合使用）</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">频率惩罚 (Frequency Penalty)</span>
                        <span class="setting-value" id="freq-penalty-value">${config.frequency_penalty || 0}</span>
                    </label>
                    <input type="range" id="frequency-penalty" min="-2" max="2" step="0.01" value="${config.frequency_penalty || 0}" 
                           oninput="updateSetting('frequency_penalty', this.value, 'freq-penalty-value')">
                    <div class="setting-hint">降低词语重复的频率（-2到2）</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">存在惩罚 (Presence Penalty)</span>
                        <span class="setting-value" id="pres-penalty-value">${config.presence_penalty || 0}</span>
                    </label>
                    <input type="range" id="presence-penalty" min="-2" max="2" step="0.01" value="${config.presence_penalty || 0}" 
                           oninput="updateSetting('presence_penalty', this.value, 'pres-penalty-value')">
                    <div class="setting-hint">增加新话题的可能性（-2到2）</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <input type="checkbox" id="streaming" ${config.streaming ? 'checked' : ''} 
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
                        <span class="setting-value" id="top-k-value">${config.top_k || 0}</span>
                    </label>
                    <input type="range" id="top-k" min="0" max="100" step="1" value="${config.top_k || 0}" 
                           oninput="updateSetting('top_k', this.value, 'top-k-value')">
                    <div class="setting-hint">限制采样的词汇数量（0=不限制）</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">重复惩罚 (Repetition Penalty)</span>
                        <span class="setting-value" id="rep-penalty-value">${config.repetition_penalty || 1.0}</span>
                    </label>
                    <input type="range" id="repetition-penalty" min="0.1" max="2" step="0.01" value="${config.repetition_penalty || 1.0}" 
                           oninput="updateSetting('repetition_penalty', this.value, 'rep-penalty-value')">
                    <div class="setting-hint">惩罚重复的内容（1.0=无惩罚）</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">Min P</span>
                        <span class="setting-value" id="min-p-value">${config.min_p || 0}</span>
                    </label>
                    <input type="range" id="min-p" min="0" max="1" step="0.01" value="${config.min_p || 0}" 
                           oninput="updateSetting('min_p', this.value, 'min-p-value')">
                    <div class="setting-hint">最小概率阈值</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">Top A</span>
                        <span class="setting-value" id="top-a-value">${config.top_a || 1.0}</span>
                    </label>
                    <input type="range" id="top-a" min="0" max="1" step="0.01" value="${config.top_a || 1.0}" 
                           oninput="updateSetting('top_a', this.value, 'top-a-value')">
                    <div class="setting-hint">自适应采样参数</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">Typical P</span>
                        <span class="setting-value" id="typical-p-value">${config.typical_p || 1.0}</span>
                    </label>
                    <input type="range" id="typical-p" min="0" max="1" step="0.01" value="${config.typical_p || 1.0}" 
                           oninput="updateSetting('typical_p', this.value, 'typical-p-value')">
                    <div class="setting-hint">典型性采样</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">随机种子 (Seed)</span>
                        <input type="number" id="seed" value="${config.seed || -1}" min="-1" 
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
window.updateSetting = function(key, value, displayId, unit) {
    // 更新内存中的值
    if (typeof value === 'string' && !isNaN(value)) {
        value = parseFloat(value);
    }
    
    console.log(`[updateSetting] 调用: ${key} = ${value}`);
    console.log(`[updateSetting] window.config存在?`, window.config ? '是' : '否');
    
    // 直接更新config对象
    if (window.config) {
        const oldValue = window.config[key];
        window.config[key] = value;
        console.log(`[updateSetting] 已更新 config.${key}: ${oldValue} -> ${value}`);
    } else {
        console.error('[updateSetting] window.config不存在！无法更新');
    }
    
    // 更新显示值
    if (displayId) {
        const displayElement = document.getElementById(displayId);
        if (displayElement) {
            displayElement.textContent = value + (unit ? unit : '');
        }
    }
    
};

// 更新API配置
window.updateAPIConfig = function(key, value) {
    // 更新全局config对象
    if (window.config) {
        config[key] = value;
        
        // 保存到localStorage
        // 不使用localStorage
        
        // 如果是API地址或密钥改变，重新加载模型列表
        if (key === 'api_url' || key === 'api_key') {
            if (typeof loadModels === 'function') {
                loadModels();
            }
        }
    }
    
};



// 保存AI设置到服务器
window.saveAISettings = async function() {
    console.log('[saveAISettings] 开始保存AI设置...');
    console.log('[saveAISettings] window.config存在?', window.config ? '是' : '否');
    console.log('[saveAISettings] 当前config.frontend_max_history:', window.config?.frontend_max_history);
    console.log('[saveAISettings] 当前config.frontend_max_response:', window.config?.frontend_max_response);
    console.log('[saveAISettings] 当前config.temperature:', window.config?.temperature);
    
    // 不需要从aiSettings同步，因为updateSetting已经实时同步到config了
    
    // 保存到统一的config接口
    try {
        console.log('[saveAISettings] 即将发送的完整config对象:', JSON.stringify(window.config, null, 2));
        
        // 使用相对路径，让浏览器自动处理
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(window.config)  // 保存整个config对象
        });
        
        if (response.ok) {
            showToast('AI设置已保存', 'success');
            const savedData = await response.json();
            console.log('服务器返回的config:', savedData.config);
            console.log('确认保存的frontend_max_history:', savedData.config.frontend_max_history);
            console.log('确认保存的frontend_max_response:', savedData.config.frontend_max_response);
            
            // 刷新模型列表（如果API配置改变了）
            console.log('[saveAISettings] 准备刷新模型列表...');
            if (typeof loadModels === 'function') {
                // 清空缓存的模型列表
                if (window.cachedModelList) {
                    window.cachedModelList = null;
                }
                
                // 重新加载模型列表
                await loadModels();
                console.log('[saveAISettings] 模型列表已刷新');
                
                // 如果模型选择器打开了，也更新一下显示
                const modelSpan = document.querySelector('.model-selector span');
                if (modelSpan && window.config.model) {
                    modelSpan.textContent = window.config.model;
                }
            }
        } else {
            console.error('保存失败，状态码:', response.status);
            showToast('保存设置失败', 'error');
        }
    } catch (error) {
        console.error('保存设置失败:', error);
        showToast('保存设置失败', 'error');
    }
};


// 恢复默认设置
window.resetToDefaults = function() {
    if (confirm('确定要恢复默认设置吗？当前的设置将丢失。')) {
        // 更新config为默认值
        config.temperature = 1.0;
        config.frontend_max_history = 65536;
        config.frontend_max_response = 10000;
        config.top_p = 1.0;
        config.top_k = 0;
        config.frequency_penalty = 0;
        config.presence_penalty = 0;
        config.repetition_penalty = 1.0;
        config.min_p = 0;
        config.top_a = 1.0;
        config.streaming = true;
        config.seed = -1;
        config.typical_p = 1.0;
        config.tfs = 1.0;
        config.epsilon_cutoff = 0;
        config.eta_cutoff = 0;
        config.mirostat_mode = 0;
        config.mirostat_tau = 5.0;
        config.mirostat_eta = 0.1;
        
        showAISettingsPanel(); // 重新加载面板
        showToast('已恢复默认设置', 'success');
    }
};

// 初始化AI设置
window.initAISettings = function() {
    // 不需要做任何事，config已经在script.js加载了
    console.log('AI设置已初始化，使用全局config');
};