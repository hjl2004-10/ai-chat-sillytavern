// 前端修饰配置面板模块

// 显示前端修饰面板
window.showFrontendDecoratorPanel = function() {
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
    
    // 获取当前配置
    const config = window.htmlRenderer ? window.htmlRenderer.getConfig() : {
        enabled: false,
        allowScript: false,
        maxDepth: 1
    };
    
    // 创建侧边面板
    const panel = document.createElement('div');
    panel.className = 'side-panel frontend-decorator-panel';
    panel.innerHTML = `
        <div class="side-panel-header">
            <h2>前端修饰设置</h2>
            <button class="side-panel-close" onclick="closeSidePanel()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        
        <div class="side-panel-content">
            <!-- 基础文本修饰 -->
            <div class="settings-section">
                <h3>基础文本修饰</h3>
                <div class="setting-item">
                    <label>
                        <span class="setting-label">引号美化</span>
                    </label>
                    <label class="switch">
                        <input type="checkbox" checked disabled>
                        <span class="slider"></span>
                    </label>
                    <div class="setting-hint">美化引号内容显示（已默认启用）</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">动作文本</span>
                    </label>
                    <label class="switch">
                        <input type="checkbox" checked disabled>
                        <span class="slider"></span>
                    </label>
                    <div class="setting-hint">*星号*包围的文本显示为斜体（已默认启用）</div>
                </div>
            </div>
            
            <!-- HTML渲染设置 -->
            <div class="settings-section">
                <h3>HTML渲染 <span class="badge-beta">实验性</span></h3>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">启用HTML渲染</span>
                    </label>
                    <label class="switch">
                        <input type="checkbox" id="enable-html-render" ${config.enabled ? 'checked' : ''} 
                               onchange="toggleHtmlRenderer(this.checked)">
                        <span class="slider"></span>
                    </label>
                    <div class="setting-hint">允许AI消息中渲染HTML内容</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">执行JavaScript</span>
                    </label>
                    <label class="switch">
                        <input type="checkbox" id="allow-js-execution" ${config.allowScript ? 'checked' : ''} 
                               onchange="toggleJsExecution(this.checked)" ${!config.enabled ? 'disabled' : ''}>
                        <span class="slider"></span>
                    </label>
                    <div class="setting-hint">⚠️ 允许执行嵌入的JavaScript代码</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">渲染深度</span>
                        <span class="setting-value" id="render-depth-value">${config.maxDepth}条</span>
                    </label>
                    <input type="range" id="render-max-depth" min="1" max="10" step="1" 
                           value="${config.maxDepth}" 
                           oninput="updateRenderDepth(this.value)"
                           ${!config.enabled ? 'disabled' : ''}>
                    <div class="setting-hint">渲染最新N条AI消息中的HTML（1-10条）</div>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">包含用户消息</span>
                    </label>
                    <label class="switch">
                        <input type="checkbox" id="include-user-messages" 
                               ${config.includeUserMessages ? 'checked' : ''} 
                               onchange="toggleIncludeUser(this.checked)" ${!config.enabled ? 'disabled' : ''}>
                        <span class="slider"></span>
                    </label>
                    <div class="setting-hint">是否渲染用户消息中的HTML（默认仅AI消息）</div>
                </div>
            </div>
            
            <!-- 测试区域 -->
            <div class="settings-section">
                <h3>测试功能</h3>
                <div class="setting-item">
                    <button onclick="testHtmlRender()" class="action-btn primary">
                        测试HTML渲染
                    </button>
                    <button onclick="clearHtmlCache()" class="action-btn">
                        清除缓存
                    </button>
                </div>
                
                <div class="setting-item">
                    <label>
                        <span class="setting-label">测试代码</span>
                    </label>
                    <textarea id="test-html-code" class="code-input" rows="6" placeholder="输入HTML代码进行测试...">&lt;div style="padding: 10px; background: linear-gradient(45deg, #667eea, #764ba2); color: white; border-radius: 8px;"&gt;
    &lt;h3&gt;Hello World!&lt;/h3&gt;
    &lt;p&gt;这是一个HTML渲染测试&lt;/p&gt;
&lt;/div&gt;</textarea>
                </div>
            </div>
            
            <!-- 保存按钮 -->
            <div class="settings-actions">
                <button onclick="saveFrontendConfig()" class="save-btn">保存设置</button>
                <button onclick="resetFrontendDefaults()" class="reset-btn">恢复默认</button>
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

// 切换HTML渲染器
window.toggleHtmlRenderer = function(enabled) {
    if (window.htmlRenderer) {
        window.htmlRenderer.toggle(enabled);
        
        // 更新相关控件状态
        const jsCheckbox = document.getElementById('allow-js-execution');
        const depthSlider = document.getElementById('render-max-depth');
        
        if (jsCheckbox) jsCheckbox.disabled = !enabled;
        if (depthSlider) depthSlider.disabled = !enabled;
        
        // 如果禁用，同时禁用JS执行
        if (!enabled && jsCheckbox && jsCheckbox.checked) {
            jsCheckbox.checked = false;
            window.htmlRenderer.toggleScript(false);
        }
        
        showToast(`HTML渲染已${enabled ? '启用' : '禁用'}`, 'success');
    }
};

// 切换JS执行
window.toggleJsExecution = function(enabled) {
    if (window.htmlRenderer) {
        window.htmlRenderer.toggleScript(enabled);
        
        if (enabled) {
            showToast('⚠️ JavaScript执行已启用，请谨慎使用', 'warning');
        } else {
            showToast('JavaScript执行已禁用', 'success');
        }
    }
};

// 更新渲染深度
window.updateRenderDepth = function(depth) {
    const depthValue = parseInt(depth);
    
    if (window.htmlRenderer) {
        window.htmlRenderer.setMaxDepth(depthValue);
        
        // 更新显示
        const display = document.getElementById('render-depth-value');
        if (display) {
            display.textContent = depthValue + '条';
        }
    }
};

// 切换是否包含用户消息
window.toggleIncludeUser = function(enabled) {
    if (window.htmlRenderer) {
        window.htmlRenderer.toggleIncludeUser(enabled);
        
        if (enabled) {
            showToast('已启用用户消息HTML渲染', 'success');
        } else {
            showToast('已禁用用户消息HTML渲染', 'success');
        }
    }
};

// 测试HTML渲染
window.testHtmlRender = function() {
    const testCode = document.getElementById('test-html-code')?.value || 
        `<div style="padding: 15px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="margin: 0 0 10px 0;">✨ HTML渲染测试</h2>
            <p>这是一个<b>HTML渲染</b>测试消息！</p>
            <button onclick="alert('按钮点击成功！')" style="background: white; color: #764ba2; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                点击我
            </button>
        </div>`;
    
    // 创建测试消息
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
        // 先检查是否启用了HTML渲染
        if (!window.htmlRenderer || !window.htmlRenderer.config.enabled) {
            showToast('请先启用HTML渲染功能', 'warning');
            return;
        }
        
        const testDiv = document.createElement('div');
        testDiv.className = 'message assistant-message test-message';
        
        // 使用HTML渲染器处理
        const rendered = window.htmlRenderer.processMessage(testCode, 999, 0);
        
        testDiv.innerHTML = `
            <div class="message-inner">
                <div class="message-header">
                    <div class="message-avatar">
                        <img src="img/assistant.png" alt="Assistant" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2240%22 fill=%22%23667eea%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2230%22 font-family=%22sans-serif%22>AI</text></svg>'">
                    </div>
                    <div class="message-actions">
                        <button onclick="this.closest('.test-message').remove()" title="删除测试消息">
                            ✕
                        </button>
                    </div>
                </div>
                <div class="message-body">
                    <div class="message-content">
                        ${rendered || testCode}
                    </div>
                    <div class="message-timestamp">${new Date().toLocaleTimeString()} (测试)</div>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(testDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        showToast('测试消息已添加', 'success');
    } else {
        showToast('请先开始对话', 'warning');
    }
};

// 清除HTML缓存
window.clearHtmlCache = function() {
    if (window.htmlRenderer) {
        window.htmlRenderer.clearCache();
        showToast('HTML渲染缓存已清除', 'success');
    }
};

// 保存前端配置
window.saveFrontendConfig = async function() {
    if (window.htmlRenderer) {
        await window.htmlRenderer.saveConfig();
        showToast('前端修饰设置已保存', 'success');
    }
};

// 恢复默认设置
window.resetFrontendDefaults = function() {
    if (confirm('确定要恢复默认设置吗？')) {
        if (window.htmlRenderer) {
            window.htmlRenderer.config = {
                enabled: false,
                allowScript: false,
                maxDepth: 1
            };
            window.htmlRenderer.saveConfig();
            
            // 重新加载面板
            showFrontendDecoratorPanel();
            showToast('已恢复默认设置', 'success');
        }
    }
};