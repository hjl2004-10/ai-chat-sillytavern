// 世界书管理模块
let worldBookEntries = [];  // 世界书条目列表
let activeWorldBook = null;  // 当前激活的世界书

// 显示世界书面板
window.showWorldBookPanel = function() {
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
    panel.className = 'side-panel world-side-panel';
    panel.innerHTML = `
        <div class="side-panel-header">
            <h2>世界书管理</h2>
            <button class="side-panel-close" onclick="closeSidePanel()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        
        <div class="side-panel-content">
            <div class="world-toolbar">
                <button onclick="createNewWorldEntry()" class="world-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    新建条目
                </button>
                
                <button onclick="document.getElementById('worldImportFile').click()" class="world-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    导入世界书
                </button>
                <input type="file" id="worldImportFile" accept=".json" style="display: none;" onchange="importWorldBook(this.files[0])" />
                
                <button onclick="exportWorldBook()" class="world-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    导出世界书
                </button>
            </div>
            
            <div class="world-list" id="worldListContainer">
                ${worldBookEntries.length === 0 ? '<p class="no-entries">暂无世界书条目</p>' : ''}
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
    
    // 加载世界书列表
    loadWorldBookList();
};

// 创建新的世界书条目
window.createNewWorldEntry = function() {
    const modal = createModal('创建世界书条目', '');
    const entryForm = document.createElement('div');
    entryForm.className = 'world-form';
    entryForm.innerHTML = `
        <div class="form-group">
            <label>关键词 * <span class="form-hint">（多个关键词用逗号分隔）</span></label>
            <input type="text" id="world-keys" placeholder="例如：魔法塔,法师学院,奥术">
        </div>
        
        <div class="form-group">
            <label>条目内容 *</label>
            <textarea id="world-content" rows="6" placeholder="当关键词被触发时，这些信息会被添加到上下文中"></textarea>
        </div>
        
        <div class="form-row">
            <div class="form-group half">
                <label>优先级 <span class="form-hint">（数字越小优先级越高）</span></label>
                <input type="number" id="world-order" value="100" min="0" max="9999">
            </div>
            
            <div class="form-group half">
                <label>扫描深度 <span class="form-hint">（扫描最近N条消息）</span></label>
                <input type="number" id="world-depth" value="4" min="1" max="100">
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group half">
                <label>插入位置</label>
                <select id="world-position">
                    <option value="before">在聊天记录之前</option>
                    <option value="after">在聊天记录之后</option>
                </select>
            </div>
            
            <div class="form-group half">
                <label>
                    <input type="checkbox" id="world-enabled" checked>
                    启用此条目
                </label>
            </div>
        </div>
        
        <div class="form-group">
            <label>条目标题（可选）</label>
            <input type="text" id="world-title" placeholder="给条目起个名字，方便管理">
        </div>
        
        <div class="form-group">
            <label>备注（可选）</label>
            <textarea id="world-comment" rows="2" placeholder="添加备注信息"></textarea>
        </div>
        
        <div class="form-buttons">
            <button onclick="saveNewWorldEntry()">保存条目</button>
            <button onclick="this.closest('.modal').remove()">取消</button>
        </div>
    `;
    
    modal.querySelector('.modal-body').appendChild(entryForm);
};

// 保存新的世界书条目
window.saveNewWorldEntry = async function() {
    const keys = document.getElementById('world-keys').value.trim();
    const content = document.getElementById('world-content').value.trim();
    
    if (!keys || !content) {
        showToast('请填写关键词和内容', 'warning');
        return;
    }
    
    const entry = {
        id: 'world_' + Date.now(),
        keys: keys.split(',').map(k => k.trim()).filter(k => k),
        content: content,
        order: parseInt(document.getElementById('world-order').value) || 100,
        depth: parseInt(document.getElementById('world-depth').value) || 4,
        position: document.getElementById('world-position').value,
        enabled: document.getElementById('world-enabled').checked,
        title: document.getElementById('world-title').value || keys.split(',')[0],
        comment: document.getElementById('world-comment').value,
        create_date: new Date().toISOString()
    };
    
    try {
        // 保存到服务器
        const response = await fetch(`${config.api_base}/world/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(entry)
        });
        
        if (response.ok) {
            // 添加到本地列表
            worldBookEntries.push(entry);
            saveWorldBookToLocal();
            
            // 关闭创建窗口
            document.querySelector('.modal').remove();
            
            // 刷新世界书面板
            showWorldBookPanel();
            
            showToast('世界书条目创建成功', 'success');
        }
    } catch (error) {
        console.error('保存世界书条目失败:', error);
        // 即使服务器保存失败，也保存到本地
        worldBookEntries.push(entry);
        saveWorldBookToLocal();
        document.querySelector('.modal').remove();
        showWorldBookPanel();
        showToast('条目已保存到本地', 'info');
    }
};

// 加载世界书列表
async function loadWorldBookList() {
    try {
        // 从服务器加载
        const response = await fetch(`${config.api_base}/world/list`);
        if (response.ok) {
            const data = await response.json();
            worldBookEntries = data.entries || [];
            saveWorldBookToLocal();
        }
    } catch (error) {
        // 从本地加载
        const saved = localStorage.getItem('worldBookEntries');
        if (saved) {
            worldBookEntries = JSON.parse(saved);
        }
    }
    
    // 更新显示
    updateWorldBookDisplay();
}

// 更新世界书显示
function updateWorldBookDisplay() {
    const container = document.getElementById('worldListContainer');
    if (!container) return;
    
    if (worldBookEntries.length === 0) {
        container.innerHTML = '<p class="no-entries">暂无世界书条目</p>';
    } else {
        // 按优先级排序
        const sortedEntries = [...worldBookEntries].sort((a, b) => a.order - b.order);
        
        container.innerHTML = sortedEntries.map((entry, index) => {
            const originalIndex = worldBookEntries.indexOf(entry);
            return `
                <div class="world-entry ${!entry.enabled ? 'disabled' : ''}" data-index="${originalIndex}">
                    <div class="entry-header">
                        <div class="entry-title">
                            <span class="entry-order">#${entry.order}</span>
                            <span class="entry-name">${escapeHtml(entry.title || entry.keys[0])}</span>
                            ${!entry.enabled ? '<span class="entry-disabled-badge">已禁用</span>' : ''}
                        </div>
                        <div class="entry-actions">
                            <button onclick="toggleWorldEntry(${originalIndex})" title="${entry.enabled ? '禁用' : '启用'}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    ${entry.enabled ? 
                                        '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>' :
                                        '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>'}
                                </svg>
                            </button>
                            <button onclick="editWorldEntry(${originalIndex})" title="编辑">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button onclick="deleteWorldEntry(${originalIndex})" title="删除">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="entry-keys">
                        ${entry.keys.map(key => `<span class="key-tag">${escapeHtml(key)}</span>`).join('')}
                    </div>
                    <div class="entry-content">${escapeHtml(entry.content.substring(0, 100))}${entry.content.length > 100 ? '...' : ''}</div>
                    <div class="entry-meta">
                        <span>位置: ${entry.position === 'before' ? '前置' : '后置'}</span>
                        <span>深度: ${entry.depth}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// 切换世界书条目启用状态
window.toggleWorldEntry = function(index) {
    if (worldBookEntries[index]) {
        worldBookEntries[index].enabled = !worldBookEntries[index].enabled;
        saveWorldBookToLocal();
        updateWorldBookDisplay();
        
        // 同步到服务器
        saveWorldEntryToServer(worldBookEntries[index]);
    }
};

// 编辑世界书条目
window.editWorldEntry = function(index) {
    const entry = worldBookEntries[index];
    if (!entry) return;
    
    const modal = createModal('编辑世界书条目', '');
    const entryForm = document.createElement('div');
    entryForm.className = 'world-form';
    entryForm.innerHTML = `
        <div class="form-group">
            <label>关键词 * <span class="form-hint">（多个关键词用逗号分隔）</span></label>
            <input type="text" id="edit-world-keys" value="${escapeHtml(entry.keys.join(', '))}" placeholder="例如：魔法塔,法师学院,奥术">
        </div>
        
        <div class="form-group">
            <label>条目内容 *</label>
            <textarea id="edit-world-content" rows="6" placeholder="当关键词被触发时，这些信息会被添加到上下文中">${escapeHtml(entry.content)}</textarea>
        </div>
        
        <div class="form-row">
            <div class="form-group half">
                <label>优先级 <span class="form-hint">（数字越小优先级越高）</span></label>
                <input type="number" id="edit-world-order" value="${entry.order}" min="0" max="9999">
            </div>
            
            <div class="form-group half">
                <label>扫描深度 <span class="form-hint">（扫描最近N条消息）</span></label>
                <input type="number" id="edit-world-depth" value="${entry.depth}" min="1" max="100">
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group half">
                <label>插入位置</label>
                <select id="edit-world-position">
                    <option value="before" ${entry.position === 'before' ? 'selected' : ''}>在聊天记录之前</option>
                    <option value="after" ${entry.position === 'after' ? 'selected' : ''}>在聊天记录之后</option>
                </select>
            </div>
            
            <div class="form-group half">
                <label>
                    <input type="checkbox" id="edit-world-enabled" ${entry.enabled ? 'checked' : ''}>
                    启用此条目
                </label>
            </div>
        </div>
        
        <div class="form-group">
            <label>条目标题（可选）</label>
            <input type="text" id="edit-world-title" value="${escapeHtml(entry.title || '')}" placeholder="给条目起个名字，方便管理">
        </div>
        
        <div class="form-group">
            <label>备注（可选）</label>
            <textarea id="edit-world-comment" rows="2" placeholder="添加备注信息">${escapeHtml(entry.comment || '')}</textarea>
        </div>
        
        <div class="form-buttons">
            <button onclick="saveEditedWorldEntry(${index})">保存修改</button>
            <button onclick="this.closest('.modal').remove()">取消</button>
        </div>
    `;
    
    modal.querySelector('.modal-body').appendChild(entryForm);
};

// 保存编辑后的世界书条目
window.saveEditedWorldEntry = async function(index) {
    const entry = worldBookEntries[index];
    if (!entry) return;
    
    const keys = document.getElementById('edit-world-keys').value.trim();
    const content = document.getElementById('edit-world-content').value.trim();
    
    if (!keys || !content) {
        showToast('请填写关键词和内容', 'warning');
        return;
    }
    
    // 更新条目
    entry.keys = keys.split(',').map(k => k.trim()).filter(k => k);
    entry.content = content;
    entry.order = parseInt(document.getElementById('edit-world-order').value) || 100;
    entry.depth = parseInt(document.getElementById('edit-world-depth').value) || 4;
    entry.position = document.getElementById('edit-world-position').value;
    entry.enabled = document.getElementById('edit-world-enabled').checked;
    entry.title = document.getElementById('edit-world-title').value || entry.keys[0];
    entry.comment = document.getElementById('edit-world-comment').value;
    entry.modified_date = new Date().toISOString();
    
    // 保存到本地
    saveWorldBookToLocal();
    
    // 同步到服务器
    await saveWorldEntryToServer(entry);
    
    // 关闭编辑窗口
    document.querySelector('.modal').remove();
    
    // 刷新显示
    updateWorldBookDisplay();
    
    showToast('世界书条目已更新', 'success');
};

// 删除世界书条目
window.deleteWorldEntry = async function(index) {
    const entry = worldBookEntries[index];
    if (!entry) return;
    
    if (confirm(`确定要删除条目 "${entry.title || entry.keys[0]}" 吗？`)) {
        // 从列表中移除
        worldBookEntries.splice(index, 1);
        saveWorldBookToLocal();
        
        // 从服务器删除
        try {
            await fetch(`${config.api_base}/world/delete/${entry.id}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('删除世界书条目失败:', error);
        }
        
        // 更新显示
        updateWorldBookDisplay();
        
        showToast('条目已删除', 'success');
    }
};

// 导入世界书
window.importWorldBook = async function(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // 支持多种格式
            let entries = [];
            
            if (Array.isArray(data)) {
                // 直接是条目数组
                entries = data;
            } else if (data.entries && Array.isArray(data.entries)) {
                // 包含entries字段
                entries = data.entries;
            } else if (data.world_info && Array.isArray(data.world_info)) {
                // SillyTavern格式
                entries = data.world_info;
            } else {
                showToast('无效的世界书格式', 'error');
                return;
            }
            
            // 转换并添加条目
            for (const item of entries) {
                const entry = {
                    id: item.id || 'world_' + Date.now() + Math.random().toString(36).substr(2, 9),
                    keys: item.keys || item.key || [],
                    content: item.content || item.entry || '',
                    order: item.order || item.insertion_order || 100,
                    depth: item.depth || item.extensions?.depth || 4,
                    position: item.position || item.extensions?.position || 'before',
                    enabled: item.enabled !== false,
                    title: item.title || item.comment || (item.keys && item.keys[0]) || '未命名',
                    comment: item.comment || '',
                    create_date: item.create_date || new Date().toISOString()
                };
                
                // 确保keys是数组
                if (typeof entry.keys === 'string') {
                    entry.keys = entry.keys.split(',').map(k => k.trim());
                }
                
                worldBookEntries.push(entry);
            }
            
            // 保存到本地
            saveWorldBookToLocal();
            
            // 更新显示
            updateWorldBookDisplay();
            
            showToast(`成功导入 ${entries.length} 个世界书条目`, 'success');
        } catch (error) {
            showToast('导入失败：文件格式错误', 'error');
            console.error('导入错误:', error);
        }
    };
    reader.readAsText(file);
};

// 导出世界书
window.exportWorldBook = function() {
    if (worldBookEntries.length === 0) {
        showToast('没有可导出的世界书条目', 'warning');
        return;
    }
    
    // 转换为兼容格式
    const exportData = {
        entries: worldBookEntries,
        // 添加SillyTavern兼容字段
        world_info: worldBookEntries.map(entry => ({
            key: entry.keys,
            entry: entry.content,
            insertion_order: entry.order,
            enabled: entry.enabled,
            comment: entry.title,
            extensions: {
                position: entry.position,
                depth: entry.depth
            }
        }))
    };
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worldbook_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('世界书已导出', 'success');
};

// 保存世界书到本地存储
function saveWorldBookToLocal() {
    localStorage.setItem('worldBookEntries', JSON.stringify(worldBookEntries));
}

// 保存条目到服务器
async function saveWorldEntryToServer(entry) {
    try {
        await fetch(`${config.api_base}/world/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(entry)
        });
    } catch (error) {
        console.error('保存到服务器失败:', error);
    }
}

// 检查消息中的关键词并返回匹配的世界书内容
window.checkWorldBookTriggers = function(messages) {
    if (!worldBookEntries || worldBookEntries.length === 0) return [];
    
    // 只检查启用的条目
    const enabledEntries = worldBookEntries.filter(entry => entry.enabled);
    if (enabledEntries.length === 0) return [];
    
    const triggered = [];
    
    // 按优先级排序
    const sortedEntries = [...enabledEntries].sort((a, b) => a.order - b.order);
    
    for (const entry of sortedEntries) {
        // 获取要扫描的消息
        const depth = entry.depth || 4;
        const recentMessages = messages.slice(-depth);
        const textToScan = recentMessages.map(msg => msg.content).join(' ').toLowerCase();
        
        // 检查关键词
        const hasMatch = entry.keys.some(key => {
            const keyLower = key.toLowerCase();
            return textToScan.includes(keyLower);
        });
        
        if (hasMatch) {
            triggered.push({
                content: entry.content,
                position: entry.position || 'before',
                order: entry.order
            });
        }
    }
    
    return triggered;
};

// 将世界书内容注入到上下文
window.injectWorldBookContent = function(messages) {
    const triggered = checkWorldBookTriggers(messages);
    
    if (triggered.length === 0) return messages;
    
    // 分组：前置和后置
    const before = triggered.filter(t => t.position === 'before').map(t => t.content).join('\n\n');
    const after = triggered.filter(t => t.position === 'after').map(t => t.content).join('\n\n');
    
    const result = [...messages];
    
    // 添加前置内容
    if (before) {
        result.unshift({
            role: 'system',
            content: `[World Info]\n${before}`
        });
    }
    
    // 添加后置内容
    if (after) {
        result.push({
            role: 'system',
            content: `[Additional Context]\n${after}`
        });
    }
    
    return result;
};

// 初始化世界书
window.initWorldBook = function() {
    // 从本地加载世界书
    const saved = localStorage.getItem('worldBookEntries');
    if (saved) {
        try {
            worldBookEntries = JSON.parse(saved);
        } catch (e) {
            worldBookEntries = [];
        }
    }
};