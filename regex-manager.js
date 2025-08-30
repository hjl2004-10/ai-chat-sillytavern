// 正则管理器模块 - UI和交互逻辑
class RegexManager {
    constructor() {
        this.currentEditingScript = null;
        this.testMode = false;
        this.panelOpen = false;
        
        // 初始化
        this.init();
    }
    
    init() {
        // 确保正则引擎已加载
        if (!window.regexEngine) {
            console.error('[正则管理器] 正则引擎未加载');
            return;
        }
        
        console.log('[正则管理器] 初始化完成');
    }
    
    // 显示正则管理面板
    showPanel() {
        // 检查是否已存在面板
        let existingPanel = document.querySelector('.regex-panel-overlay');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        // 创建覆盖层
        const overlay = document.createElement('div');
        overlay.className = 'regex-panel-overlay';
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                this.closePanel();
            }
        };
        
        // 创建面板
        const panel = document.createElement('div');
        panel.className = 'regex-panel';
        panel.innerHTML = this.getPanelHTML();
        
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        
        // 添加动画
        setTimeout(() => {
            overlay.classList.add('show');
            panel.classList.add('show');
        }, 10);
        
        this.panelOpen = true;
        this.bindPanelEvents();
        this.loadScriptsList();
    }
    
    // 获取面板HTML
    getPanelHTML() {
        return `
            <div class="regex-panel-header">
                <h2>正则表达式管理</h2>
                <button class="regex-panel-close" onclick="regexManager.closePanel()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            
            <div class="regex-panel-tabs">
                <button class="tab-btn active" data-tab="global" onclick="regexManager.switchTab('global')">
                    全局脚本
                </button>
                <button class="tab-btn" data-tab="character" onclick="regexManager.switchTab('character')">
                    角色脚本
                </button>
                <button class="tab-btn" data-tab="editor" onclick="regexManager.switchTab('editor')">
                    编辑器
                </button>
            </div>
            
            <div class="regex-panel-content">
                <!-- 全局脚本标签页 -->
                <div class="tab-content active" id="global-tab">
                    <div class="scripts-toolbar">
                        <button class="btn-primary" onclick="regexManager.createNewScript()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                            新建脚本
                        </button>
                        <button class="btn-secondary" onclick="regexManager.importScript()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                            </svg>
                            导入
                        </button>
                    </div>
                    <div class="scripts-list" id="global-scripts-list">
                        <!-- 脚本列表将在这里动态生成 -->
                    </div>
                </div>
                
                <!-- 角色脚本标签页 -->
                <div class="tab-content" id="character-tab">
                    <div class="scripts-toolbar">
                        <button class="btn-primary" onclick="regexManager.createNewScript(true)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                            新建角色脚本
                        </button>
                        <button class="btn-secondary" onclick="regexManager.importScript(true)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                            </svg>
                            导入
                        </button>
                    </div>
                    <div class="scripts-list" id="character-scripts-list">
                        <!-- 角色脚本列表 -->
                    </div>
                </div>
                
                <!-- 编辑器标签页 -->
                <div class="tab-content" id="editor-tab">
                    <div class="editor-form">
                        <div class="form-group">
                            <label>脚本名称 <span class="required">*</span></label>
                            <input type="text" id="script-name" placeholder="输入脚本名称">
                        </div>
                        
                        <div class="form-group">
                            <label>查找正则 <span class="required">*</span></label>
                            <textarea id="find-regex" rows="3" placeholder="输入查找的正则表达式"></textarea>
                            <div class="form-hint">支持标准JavaScript正则语法，如: /hello/gi, \\b\\w+\\b</div>
                        </div>
                        
                        <div class="form-group">
                            <label>替换文本</label>
                            <textarea id="replace-string" rows="3" placeholder="输入替换文本"></textarea>
                            <div class="form-hint">支持 $1, $2 捕获组和 {{match}} 占位符</div>
                        </div>
                        
                        <div class="form-group">
                            <label>应用位置</label>
                            <div class="checkbox-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" name="placement" value="1" checked>
                                    <span>用户输入</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="placement" value="2" checked>
                                    <span>AI输出</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="placement" value="5">
                                    <span>世界信息</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>高级选项</label>
                            <div class="checkbox-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="markdown-only">
                                    <span>仅Markdown模式</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="prompt-only">
                                    <span>仅提示词模式</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="run-on-edit" checked>
                                    <span>编辑时运行</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="disabled">
                                    <span>禁用脚本</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>测试区域</label>
                            <div class="test-area">
                                <textarea id="test-input" rows="3" placeholder="输入测试文本"></textarea>
                                <button class="btn-test" onclick="regexManager.testScript()">
                                    测试脚本
                                </button>
                                <div class="test-output" id="test-output">
                                    <!-- 测试结果 -->
                                </div>
                            </div>
                        </div>
                        
                        <div class="editor-actions">
                            <button class="btn-primary" onclick="regexManager.saveScript()">
                                保存脚本
                            </button>
                            <button class="btn-secondary" onclick="regexManager.clearEditor()">
                                清空
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // 切换标签页
    switchTab(tabName) {
        // 更新标签按钮
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // 更新内容区域
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
        
        // 如果切换到角色标签，检查是否有选中的角色
        if (tabName === 'character') {
            this.loadCharacterScripts();
        }
    }
    
    // 加载脚本列表
    loadScriptsList() {
        const container = document.getElementById('global-scripts-list');
        if (!container) return;
        
        const scripts = window.regexEngine.globalScripts;
        
        if (scripts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p>暂无全局脚本</p>
                    <button class="btn-primary" onclick="regexManager.createNewScript()">创建第一个脚本</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = scripts.map(script => this.renderScriptItem(script, false)).join('');
    }
    
    // 加载角色脚本
    loadCharacterScripts() {
        const container = document.getElementById('character-scripts-list');
        if (!container) return;
        
        // 获取当前选中的角色
        const characterId = window.currentCharacter?.name || null;
        
        if (!characterId) {
            container.innerHTML = `
                <div class="character-notice">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="10" cy="10" r="9"/>
                        <path d="M10 6v4M10 14h.01"/>
                    </svg>
                    <span>请先选择一个角色</span>
                </div>
            `;
            return;
        }
        
        const scripts = window.regexEngine.characterScripts[characterId] || [];
        
        if (scripts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>该角色暂无专属脚本</p>
                    <button class="btn-primary" onclick="regexManager.createNewScript(true)">创建角色脚本</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = scripts.map(script => this.renderScriptItem(script, true)).join('');
    }
    
    // 渲染脚本项
    renderScriptItem(script, isCharacter) {
        const statusClass = script.disabled ? 'disabled' : 'enabled';
        const statusIcon = script.disabled ? '⏸' : '▶';
        return `
            <div class="script-item ${statusClass}" data-id="${script.id}">
                <div class="script-header">
                    <span class="script-status">${statusIcon}</span>
                    <span class="script-name">${script.scriptName || '未命名脚本'}</span>
                    <div class="script-actions">
                        <button class="btn-icon" onclick="regexManager.toggleScript('${script.id}', ${isCharacter})" title="${script.disabled ? '启用' : '禁用'}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                ${script.disabled ? '<path d="M5 12l5 5L20 7"/>' : '<rect x="6" y="4" width="12" height="16" rx="2"/><path d="M10 10h4M10 14h4"/>'}
                            </svg>
                        </button>
                        <button class="btn-icon" onclick="regexManager.editScript('${script.id}', ${isCharacter})" title="编辑">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn-icon" onclick="regexManager.duplicateScript('${script.id}', ${isCharacter})" title="复制">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                            </svg>
                        </button>
                        <button class="btn-icon" onclick="regexManager.exportScript('${script.id}', ${isCharacter})" title="导出">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 9l-5 5-5-5M12 12.8V2.5"/>
                            </svg>
                        </button>
                        <button class="btn-icon danger" onclick="regexManager.deleteScript('${script.id}', ${isCharacter})" title="删除">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="script-details">
                    <code>${this.escapeHtml(this.truncateText(script.findRegex || '无', 50))}</code>
                    ${script.replaceString ? `<span>→</span> <code>${this.escapeHtml(this.truncateText(script.replaceString, 50))}</code>` : ''}
                </div>
            </div>
        `;
    }
    
    // 创建新脚本
    createNewScript(isCharacter = false) {
        this.currentEditingScript = null;
        this.isCreatingCharacterScript = isCharacter; // 记录是否创建角色脚本
        this.switchTab('editor');
        this.clearEditor();
    }
    
    // 编辑脚本
    editScript(scriptId, isCharacter) {
        const characterId = isCharacter ? (window.currentCharacter?.name || null) : null;
        let script = null;
        
        if (isCharacter && characterId) {
            const scripts = window.regexEngine.characterScripts[characterId] || [];
            script = scripts.find(s => s.id === scriptId);
        } else {
            script = window.regexEngine.globalScripts.find(s => s.id === scriptId);
        }
        
        if (!script) {
            showToast('脚本未找到', 'error');
            return;
        }
        
        this.currentEditingScript = {
            ...script,
            isCharacter,
            characterId
        };
        
        this.switchTab('editor');
        this.loadScriptToEditor(script);
    }
    
    // 加载脚本到编辑器
    loadScriptToEditor(script) {
        document.getElementById('script-name').value = script.scriptName || '';
        document.getElementById('find-regex').value = script.findRegex || '';
        document.getElementById('replace-string').value = script.replaceString || '';
        
        // 设置复选框
        document.querySelectorAll('input[name="placement"]').forEach(cb => {
            cb.checked = script.placement && script.placement.includes(parseInt(cb.value));
        });
        
        document.getElementById('markdown-only').checked = script.markdownOnly || false;
        document.getElementById('prompt-only').checked = script.promptOnly || false;
        document.getElementById('run-on-edit').checked = script.runOnEdit !== false;
        document.getElementById('disabled').checked = script.disabled || false;
    }
    
    // 保存脚本
    async saveScript() {
        const scriptName = document.getElementById('script-name').value.trim();
        const findRegex = document.getElementById('find-regex').value.trim();
        const replaceString = document.getElementById('replace-string').value;
        
        if (!scriptName || !findRegex) {
            showToast('请填写脚本名称和查找正则', 'error');
            return;
        }
        
        // 获取选中的placement
        const placement = Array.from(document.querySelectorAll('input[name="placement"]:checked'))
            .map(cb => parseInt(cb.value));
        
        if (placement.length === 0) {
            showToast('请至少选择一个应用位置', 'error');
            return;
        }
        
        const script = {
            scriptName,
            findRegex,
            replaceString,
            placement,
            trimStrings: [],
            markdownOnly: document.getElementById('markdown-only').checked,
            promptOnly: document.getElementById('prompt-only').checked,
            runOnEdit: document.getElementById('run-on-edit').checked,
            disabled: document.getElementById('disabled').checked,
            substituteRegex: 0
        };
        
        if (this.currentEditingScript) {
            // 更新现有脚本
            script.id = this.currentEditingScript.id;
            const success = await window.regexEngine.updateScript(
                script.id,
                script,
                this.currentEditingScript.isCharacter,
                this.currentEditingScript.characterId || window.currentCharacter?.name
            );
            
            if (success) {
                showToast('脚本已更新', 'success');
                this.switchTab(this.currentEditingScript.isCharacter ? 'character' : 'global');
                this.loadScriptsList();
                this.loadCharacterScripts();
            }
        } else {
            // 创建新脚本 - 检查是否是角色脚本
            if (this.isCreatingCharacterScript && window.currentCharacter) {
                const id = await window.regexEngine.addCharacterScript(window.currentCharacter.name, script);
                if (id) {
                    showToast('角色脚本已创建', 'success');
                    this.switchTab('character');
                    this.loadCharacterScripts();
                }
            } else {
                const id = await window.regexEngine.addGlobalScript(script);
                if (id) {
                    showToast('全局脚本已创建', 'success');
                    this.switchTab('global');
                    this.loadScriptsList();
                }
            }
            this.isCreatingCharacterScript = false; // 重置标志
        }
    }
    
    // 清空编辑器
    clearEditor() {
        document.getElementById('script-name').value = '';
        document.getElementById('find-regex').value = '';
        document.getElementById('replace-string').value = '';
        document.getElementById('test-input').value = '';
        document.getElementById('test-output').innerHTML = '';
        
        // 重置复选框为默认值
        document.querySelectorAll('input[name="placement"]').forEach((cb, index) => {
            cb.checked = index < 2; // 默认选中前两个
        });
        
        document.getElementById('markdown-only').checked = false;
        document.getElementById('prompt-only').checked = false;
        document.getElementById('run-on-edit').checked = true;
        document.getElementById('disabled').checked = false;
        
        this.currentEditingScript = null;
        // 不要在这里重置isCreatingCharacterScript，因为可能是刚刚设置的
    }
    
    // 测试脚本
    testScript() {
        const testInput = document.getElementById('test-input').value;
        const outputDiv = document.getElementById('test-output');
        
        if (!testInput) {
            outputDiv.innerHTML = '<div class="test-error">请输入测试文本</div>';
            return;
        }
        
        const script = {
            scriptName: document.getElementById('script-name').value || '测试脚本',
            findRegex: document.getElementById('find-regex').value,
            replaceString: document.getElementById('replace-string').value,
            trimStrings: []
        };
        
        if (!script.findRegex) {
            outputDiv.innerHTML = '<div class="test-error">请输入查找正则</div>';
            return;
        }
        
        try {
            const result = window.regexEngine.testScript(script, testInput);
            outputDiv.innerHTML = `
                <div class="test-success">
                    <div class="test-label">输出结果：</div>
                    <div class="test-result">${this.escapeHtml(result)}</div>
                </div>
            `;
        } catch (e) {
            outputDiv.innerHTML = `<div class="test-error">错误：${e.message}</div>`;
        }
    }
    
    // 切换脚本状态
    async toggleScript(scriptId, isCharacter) {
        const characterId = isCharacter ? (window.currentCharacter?.name || null) : null;
        let script = null;
        
        if (isCharacter && characterId) {
            const scripts = window.regexEngine.characterScripts[characterId] || [];
            script = scripts.find(s => s.id === scriptId);
        } else {
            script = window.regexEngine.globalScripts.find(s => s.id === scriptId);
        }
        
        if (script) {
            script.disabled = !script.disabled;
            await window.regexEngine.saveScripts();
            
            if (isCharacter) {
                this.loadCharacterScripts();
            } else {
                this.loadScriptsList();
            }
            
            showToast(`脚本已${script.disabled ? '禁用' : '启用'}`, 'success');
        }
    }
    
    // 复制脚本
    async duplicateScript(scriptId, isCharacter) {
        const characterId = isCharacter ? (window.currentCharacter?.name || null) : null;
        const exported = window.regexEngine.exportScript(scriptId, isCharacter, characterId);
        
        if (exported) {
            exported.scriptName = exported.scriptName + ' (副本)';
            
            if (isCharacter && characterId) {
                await window.regexEngine.addCharacterScript(characterId, exported);
                this.loadCharacterScripts();
            } else {
                await window.regexEngine.addGlobalScript(exported);
                this.loadScriptsList();
            }
            
            showToast('脚本已复制', 'success');
        }
    }
    
    // 导出脚本
    exportScript(scriptId, isCharacter) {
        const characterId = isCharacter ? (window.currentCharacter?.name || null) : null;
        const script = window.regexEngine.exportScript(scriptId, isCharacter, characterId);
        
        if (script) {
            const blob = new Blob([JSON.stringify(script, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${script.scriptName || 'regex_script'}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            showToast('脚本已导出', 'success');
        }
    }
    
    // 删除脚本
    async deleteScript(scriptId, isCharacter) {
        if (!confirm('确定要删除这个脚本吗？')) {
            return;
        }
        
        const characterId = isCharacter ? (window.currentCharacter?.name || null) : null;
        const success = await window.regexEngine.deleteScript(scriptId, isCharacter, characterId);
        
        if (success) {
            if (isCharacter) {
                this.loadCharacterScripts();
            } else {
                this.loadScriptsList();
            }
            showToast('脚本已删除', 'success');
        }
    }
    
    // 导入脚本
    async importScript(isCharacter = false) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const script = JSON.parse(text);
                
                if (isCharacter && window.currentCharacter) {
                    await window.regexEngine.importScript(script, true, window.currentCharacter.name);
                    this.loadCharacterScripts();
                } else {
                    await window.regexEngine.importScript(script, false);
                    this.loadScriptsList();
                }
                showToast('脚本已导入', 'success');
            } catch (e) {
                showToast('导入失败：' + e.message, 'error');
            }
        };
        
        input.click();
    }
    
    // 关闭面板
    closePanel() {
        const overlay = document.querySelector('.regex-panel-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
        }
        this.panelOpen = false;
    }
    
    // 绑定面板事件
    bindPanelEvents() {
        // 这里可以添加更多事件绑定
    }
    
    // HTML转义
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    // 截断文本
    truncateText(text, maxLength = 50) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}

// 创建全局实例
window.regexManager = new RegexManager();

// Toast提示函数
window.showToast = function(message, type = 'info') {
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
};