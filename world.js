// 世界书管理模块
let worldBookEntries = [];  // 世界书条目列表（兼容旧版）
let worldBooks = [];  // 多世界书列表
let activeWorldBooks = [];  // 激活的世界书ID列表

function getWorldBookById(worldBookId) {
    return worldBooks.find(wb => wb.id === worldBookId);
}

// 从服务器加载世界书数据
async function loadWorldBooksFromServer() {
    try {
        // 加载世界书列表
        const response = await fetch('/api/world/list');
        if (response.ok) {
            const data = await response.json();
            if (data.worldBooks) {
                worldBooks = data.worldBooks;
            }
        }
        
        // 加载激活状态
        const activeResponse = await fetch('/api/world/get-active');
        if (activeResponse.ok) {
            const activeData = await activeResponse.json();
            if (activeData.activeWorldBooks) {
                activeWorldBooks = activeData.activeWorldBooks;
            }
        }
    } catch (error) {
        console.error('从服务器加载世界书失败:', error);
    }
}

// 初始化世界书系统
window.initWorldBookSystem = async function() {
    // 清除本地缓存（开发阶段）
    localStorage.removeItem('worldBooks');
    localStorage.removeItem('worldBookEntries');
    localStorage.removeItem('activeWorldBooks');
    
    // 从服务器加载世界书
    await loadWorldBooksFromServer();

    if (typeof initToolBookSystem === 'function') {
        await initToolBookSystem();
    } else {
        setTimeout(() => {
            if (typeof initToolBookSystem === 'function') {
                initToolBookSystem();
            }
        }, 0);
    }
};

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
            <!-- 世界书选择器 -->
            <div class="world-selector">
                <select id="worldBookSelector" onchange="switchWorldBook(this.value)" class="world-select">
                    <option value="">选择世界书...</option>
                </select>
                <button onclick="createNewWorldBook()" class="world-btn-small" title="新建世界书">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                </button>
            </div>
            
            <!-- 世界书列表 -->
            <div class="world-books-list" id="worldBooksList">
                <!-- 动态生成 -->
            </div>
            
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
                
                <button onclick="exportCurrentWorldBook()" class="world-btn">
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

            <hr class="world-divider" />

            <div class="toolbook-section">
                <div class="world-section-title">工具书</div>

                <!-- 全局图片推送开关 -->
                <div class="toolbook-global-settings" style="margin: 10px 0;">
                    <label class="checkbox-inline" style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" id="globalImagePushToggle" onchange="toggleGlobalImagePush(this.checked)" style="margin-right: 8px;">
                        <span>📸 启用工具书图片推送功能</span>
                    </label>
                    <p style="margin: 5px 0 0 24px; font-size: 12px; opacity: 0.6;">允许AI主动输出工具书中的图片资源（需在单个工具书中启用）</p>
                </div>

                <div class="world-toolbar">
                    <button onclick="showToolBookModal()" class="world-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        新建工具书
                    </button>
                    <button onclick="triggerToolBookImport()" class="world-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        导入工具书
                    </button>
                </div>
                <input type="file" id="toolBookImportFile" accept=".docx" style="display: none;">
                <div class="world-books-list" id="toolBooksList">
                    <!-- 动态生成 -->
                </div>
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
    updateWorldBooksDisplay();
    loadWorldBookList();

    if (typeof loadToolBooksFromServer === 'function') {
        loadToolBooksFromServer();
    } else if (typeof updateToolBooksDisplay === 'function') {
        updateToolBooksDisplay();
    }

    if (typeof setupToolBookImportInput === 'function') {
        setupToolBookImportInput();
    }
};

// 更新世界书列表显示
function updateWorldBooksDisplay() {
    const listContainer = document.getElementById('worldBooksList');
    const selector = document.getElementById('worldBookSelector');
    
    if (!listContainer) return;
    
    // 更新选择器
    if (selector) {
        selector.innerHTML = '<option value="">选择世界书...</option>';
        worldBooks.forEach(wb => {
            const option = document.createElement('option');
            option.value = wb.id;
            option.textContent = wb.name;
            selector.appendChild(option);
        });
    }
    
    // 更新列表
    if (worldBooks.length === 0) {
        listContainer.innerHTML = '<p class="no-entries">暂无世界书，点击+按钮创建</p>';
    } else {
        listContainer.innerHTML = worldBooks.map(wb => {
            const isActive = activeWorldBooks.includes(wb.id);
            const entryCount = wb.entries ? wb.entries.length : 0;
            return `
                <div class="world-book-item ${isActive ? 'active' : ''}" data-id="${wb.id}">
                    <div class="wb-header">
                        <input type="checkbox" 
                               class="wb-checkbox" 
                               ${isActive ? 'checked' : ''}
                               onchange="toggleWorldBook('${wb.id}', this.checked)">
                        <div class="wb-info" onclick="selectWorldBook('${wb.id}')">
                            <div class="wb-name">${escapeHtml(wb.name)}</div>
                            <div class="wb-meta">${entryCount} 条目</div>
                        </div>
                        <div class="wb-actions">
                            <button onclick="editWorldBook('${wb.id}')" title="编辑">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button onclick="deleteWorldBook('${wb.id}')" title="删除">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    ${wb.description ? `<div class="wb-description">${escapeHtml(wb.description)}</div>` : ''}
                </div>
            `;
        }).join('');
    }
}

// 创建新世界书
window.createNewWorldBook = function() {
    const modal = createModal('创建世界书', '');
    const form = document.createElement('div');
    form.className = 'world-form';
    form.innerHTML = `
        <div class="form-group">
            <label>世界书名称 *</label>
            <input type="text" id="new-wb-name" placeholder="例如：魔法世界设定">
        </div>
        <div class="form-group">
            <label>描述（可选）</label>
            <textarea id="new-wb-desc" rows="3" placeholder="简要描述这个世界书的内容"></textarea>
        </div>
        <div class="form-buttons">
            <button onclick="saveNewWorldBook()">创建</button>
            <button onclick="this.closest('.modal').remove()">取消</button>
        </div>
    `;
    modal.querySelector('.modal-body').appendChild(form);
};

// 保存新世界书
window.saveNewWorldBook = async function() {
    const name = document.getElementById('new-wb-name').value.trim();
    const desc = document.getElementById('new-wb-desc').value.trim();
    
    if (!name) {
        showToast('请输入世界书名称', 'warning');
        return;
    }
    
    const worldBook = {
        id: 'wb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: name,
        description: desc,
        entries: [],
        createDate: new Date().toISOString(),
        active: false
    };
    
    try {
        worldBooks.push(worldBook);
        await saveWorldBookToServer(worldBook);

        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }
        updateWorldBooksDisplay();
        showToast('世界书创建成功', 'success');
    } catch (error) {
        console.error('保存世界书失败:', error);
        showToast('世界书保存失败，请稍后重试', 'error');
    }
};

// 选择世界书
window.selectWorldBook = function(worldBookId) {
    const selector = document.getElementById('worldBookSelector');
    if (selector) {
        selector.value = worldBookId;
    }
    switchWorldBook(worldBookId);
};

// 切换当前编辑的世界书
window.switchWorldBook = function(worldBookId) {
    if (!worldBookId) {
        worldBookEntries = [];
        updateWorldBookDisplay();
        return;
    }
    
    const worldBook = worldBooks.find(wb => wb.id === worldBookId);
    if (worldBook) {
        worldBookEntries = worldBook.entries || [];
        updateWorldBookDisplay();
    }
};

// 激活/禁用世界书
window.toggleWorldBook = async function(worldBookId, active) {
    const worldBook = worldBooks.find(wb => wb.id === worldBookId);
    if (worldBook) {
        worldBook.active = active;
        
        if (active && !activeWorldBooks.includes(worldBookId)) {
            activeWorldBooks.push(worldBookId);
        } else if (!active) {
            activeWorldBooks = activeWorldBooks.filter(id => id !== worldBookId);
        }
        
        try {
            await saveActiveWorldBooks();
        } catch (error) {
            console.error('更新世界书激活状态失败:', error);
            showToast('保存世界书激活状态失败，请稍后重试', 'error');
            return;
        }
        updateWorldBooksDisplay();
        showToast(`世界书"${worldBook.name}"已${active ? '激活' : '禁用'}`, 'success');
    }
};

// 编辑世界书
window.editWorldBook = function(worldBookId) {
    const worldBook = worldBooks.find(wb => wb.id === worldBookId);
    if (!worldBook) return;
    
    const modal = createModal('编辑世界书', '');
    const form = document.createElement('div');
    form.className = 'world-form';
    form.innerHTML = `
        <div class="form-group">
            <label>世界书名称 *</label>
            <input type="text" id="edit-wb-name" value="${escapeHtml(worldBook.name)}" placeholder="例如：魔法世界设定">
        </div>
        <div class="form-group">
            <label>描述（可选）</label>
            <textarea id="edit-wb-desc" rows="3" placeholder="简要描述这个世界书的内容">${escapeHtml(worldBook.description || '')}</textarea>
        </div>
        <div class="form-buttons">
            <button onclick="saveEditedWorldBook('${worldBookId}')">保存</button>
            <button onclick="this.closest('.modal').remove()">取消</button>
        </div>
    `;
    modal.querySelector('.modal-body').appendChild(form);
};

// 保存编辑后的世界书
window.saveEditedWorldBook = async function(worldBookId) {
    const worldBook = worldBooks.find(wb => wb.id === worldBookId);
    if (!worldBook) return;
    
    const name = document.getElementById('edit-wb-name').value.trim();
    const desc = document.getElementById('edit-wb-desc').value.trim();
    
    if (!name) {
        showToast('请输入世界书名称', 'warning');
        return;
    }
    
    worldBook.name = name;
    worldBook.description = desc;

    try {
        await saveWorldBookToServer(worldBook);

        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }
        updateWorldBooksDisplay();

        const selector = document.getElementById('worldBookSelector');
        if (selector && selector.value === worldBookId) {
            const option = selector.querySelector(`option[value="${worldBookId}"]`);
            if (option) option.textContent = name;
        }

        showToast('世界书已更新', 'success');
    } catch (error) {
        console.error('更新世界书失败:', error);
        showToast('世界书保存失败，请稍后重试', 'error');
    }
};

// 删除世界书
window.deleteWorldBook = async function(worldBookId) {
    const worldBook = worldBooks.find(wb => wb.id === worldBookId);
    if (!worldBook) return;
    
    if (confirm(`确定要删除世界书"${worldBook.name}"吗？\n该操作将删除其中的所有条目。`)) {
        try {
            const response = await fetch(`/api/world/delete/${encodeURIComponent(worldBookId)}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error('删除接口返回异常');
            }
        } catch (error) {
            console.error('删除世界书失败:', error);
            showToast('删除世界书失败，请稍后重试', 'error');
            return;
        }

        const index = worldBooks.findIndex(wb => wb.id === worldBookId);
        if (index !== -1) {
            worldBooks.splice(index, 1);
        }
        activeWorldBooks = activeWorldBooks.filter(id => id !== worldBookId);

        try {
            await saveActiveWorldBooks();
        } catch (error) {
            console.error('更新激活状态失败:', error);
            showToast('更新激活状态失败，请稍后重试', 'error');
        }
        updateWorldBooksDisplay();
        
        // 如果当前选中的是这个世界书，清空条目列表
        const selector = document.getElementById('worldBookSelector');
        if (selector && selector.value === worldBookId) {
            selector.value = '';
            worldBookEntries = [];
            updateWorldBookDisplay();
        }
        
        showToast('世界书已删除', 'success');
    }
};

// 创建新的世界书条目
window.createNewWorldEntry = function() {
    const selector = document.getElementById('worldBookSelector');
    if (!selector || !selector.value) {
        showToast('请先选择或创建一个世界书', 'warning');
        return;
    }
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
                <label>触发概率 <span class="form-hint">(%)</span></label>
                <input type="number" id="world-probability" value="100" min="0" max="100">
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group half">
                <label>扫描深度 <span class="form-hint">（扫描最近N条消息）</span></label>
                <input type="number" id="world-depth" value="4" min="1" max="100">
            </div>
            
            <div class="form-group half">
                <label>
                    <input type="checkbox" id="world-use-probability" checked>
                    启用概率触发
                </label>
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
    
    const selector = document.getElementById('worldBookSelector');
    if (!selector || !selector.value) {
        showToast('请先选择或创建一个世界书', 'warning');
        return;
    }

    const entry = {
        id: 'world_' + Date.now(),
        keys: keys.split(',').map(k => k.trim()).filter(k => k),
        content: content,
        order: parseInt(document.getElementById('world-order').value) || 100,
        probability: parseInt(document.getElementById('world-probability').value) || 100,
        use_probability: document.getElementById('world-use-probability').checked,
        depth: parseInt(document.getElementById('world-depth').value) || 4,
        position: document.getElementById('world-position').value,
        enabled: document.getElementById('world-enabled').checked,
        title: document.getElementById('world-title').value || keys.split(',')[0],
        comment: document.getElementById('world-comment').value,
        create_date: new Date().toISOString()
    };
    
    // 添加到当前世界书
    let pushedToSharedList = false;
    if (selector && selector.value) {
        const worldBook = worldBooks.find(wb => wb.id === selector.value);
        if (worldBook) {
            if (!worldBook.entries) worldBook.entries = [];
            worldBook.entries.push(entry);
            if (worldBookEntries === worldBook.entries) {
                pushedToSharedList = true;
            }
        }
    }

    // 更新当前显示
    if (!pushedToSharedList) {
        worldBookEntries.push(entry);
    }

    try {
        await saveWorldBookToLocal();
    } catch (error) {
        console.error('保存世界书条目失败:', error);
        showToast('保存世界书条目失败，请稍后重试', 'error');
        return;
    }

    // 关闭创建窗口
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
    
    // 刷新显示
    updateWorldBookDisplay();
    
    showToast('世界书条目创建成功', 'success');
};

// 加载世界书列表
async function loadWorldBookList() {
    try {
        // 从服务器加载所有世界书
        const response = await fetch('/api/world/list');
        if (response.ok) {
            const data = await response.json();
            if (data.worldBooks) {
                worldBooks = data.worldBooks;
                
                // 激活状态已经从服务器加载
                // activeWorldBooks 在 loadActiveWorldBooks 中设置
                
                // 更新显示
                updateWorldBooksDisplay();
                
                // 如果有选中的世界书，加载它的条目
                const selector = document.getElementById('worldBookSelector');
                if (selector && selector.value) {
                    switchWorldBook(selector.value);
                }
            }
        }
    } catch (error) {
        console.error('加载世界书失败:', error);
        // 不再从本地加载，保持空列表
        showToast('加载世界书失败，请检查服务器连接', 'error');
    }
    
    // 更新当前选中世界书的条目显示
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
                            <span class="entry-name">${escapeHtml(entry.title || (entry.keys && entry.keys[0]) || '未命名')}</span>
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
                        ${entry.keys && entry.keys.length > 0 ? 
                            entry.keys.map(key => `<span class="key-tag">${escapeHtml(key)}</span>`).join('') :
                            '<span class="no-keys-tag">无关键词</span>'
                        }
                    </div>
                    <div class="entry-content">${entry.content ? escapeHtml(entry.content.substring(0, 100)) + (entry.content.length > 100 ? '...' : '') : '<span class="no-content">无内容</span>'}</div>
                    <div class="entry-meta">
                        <span>位置: ${entry.position === 'before' ? '前置' : '后置'}</span>
                        <span>深度: ${entry.depth}</span>
                        ${entry.probability !== undefined && entry.probability < 100 ? 
                            `<span class="probability-tag">概率: ${entry.probability}%</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
}

// 切换世界书条目启用状态
window.toggleWorldEntry = async function(index) {
    if (worldBookEntries[index]) {
        worldBookEntries[index].enabled = !worldBookEntries[index].enabled;
        try {
            await saveWorldBookToLocal();
        } catch (error) {
            console.error('保存世界书状态失败:', error);
            showToast('更新世界书条目状态失败，请稍后重试', 'error');
            return;
        }
        updateWorldBookDisplay();
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
                <label>触发概率 <span class="form-hint">(%)</span></label>
                <input type="number" id="edit-world-probability" value="${entry.probability || 100}" min="0" max="100">
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group half">
                <label>扫描深度 <span class="form-hint">（扫描最近N条消息）</span></label>
                <input type="number" id="edit-world-depth" value="${entry.depth}" min="1" max="100">
            </div>
            
            <div class="form-group half">
                <label>
                    <input type="checkbox" id="edit-world-use-probability" ${entry.use_probability !== false ? 'checked' : ''}>
                    启用概率触发
                </label>
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
    entry.probability = parseInt(document.getElementById('edit-world-probability').value) || 100;
    entry.use_probability = document.getElementById('edit-world-use-probability').checked;
    entry.depth = parseInt(document.getElementById('edit-world-depth').value) || 4;
    entry.position = document.getElementById('edit-world-position').value;
    entry.enabled = document.getElementById('edit-world-enabled').checked;
    entry.title = document.getElementById('edit-world-title').value || entry.keys[0];
    entry.comment = document.getElementById('edit-world-comment').value;
    entry.modified_date = new Date().toISOString();
    
    try {
        await saveWorldBookToLocal();
    } catch (error) {
        console.error('保存世界书条目失败:', error);
        showToast('保存世界书条目失败，请稍后重试', 'error');
        return;
    }

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
        try {
            await saveWorldBookToLocal();
        } catch (error) {
            console.error('保存世界书条目失败:', error);
            showToast('保存世界书条目失败，请稍后重试', 'error');
            return;
        }
        
        // 从服务器删除
        try {
            await fetch(`/api/world/delete/${entry.id}`, {
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
            
            // 获取世界书名称
            let worldBookName = data.name || data.title || file.name.replace('.json', '') || '导入的世界书';
            let worldBookDesc = data.description || '';
            
            // 支持多种格式
            let entries = [];
            
            if (Array.isArray(data)) {
                // 直接是条目数组
                entries = data;
            } else if (data.entries) {
                // SillyTavern 新格式 - entries是对象
                if (typeof data.entries === 'object' && !Array.isArray(data.entries)) {
                    // 将对象转换为数组
                    entries = Object.values(data.entries);
                } else if (Array.isArray(data.entries)) {
                    // entries是数组
                    entries = data.entries;
                }
            } else if (data.world_info && Array.isArray(data.world_info)) {
                // SillyTavern旧格式
                entries = data.world_info;
            } else {
                showToast('无效的世界书格式', 'error');
                return;
            }
            
            // 转换并添加条目
            for (const item of entries) {
                // 处理SillyTavern格式
                let keys = [];
                if (item.key && Array.isArray(item.key) && item.key.length > 0) {
                    keys = item.key;
                } else if (item.keys && Array.isArray(item.keys) && item.keys.length > 0) {
                    keys = item.keys;
                } else if (item.keysecondary && Array.isArray(item.keysecondary) && item.keysecondary.length > 0) {
                    // 备用关键词
                    keys = item.keysecondary;
                }
                
                // 获取位置（SillyTavern用0表示before，1表示after）
                let position = 'before';
                if (item.position === 1 || item.position === 'after') {
                    position = 'after';
                }
                
                // 条目名称使用comment字段，而不是把它当作关键词
                const title = item.comment || item.title || item.name || '未命名';
                
                const entry = {
                    id: item.uid !== undefined ? 'world_' + item.uid : (item.id || 'world_' + Date.now() + Math.random().toString(36).substr(2, 9)),
                    keys: keys, // 保持原始的keys数组，可能为空
                    content: item.content || item.entry || item.value || '',
                    order: item.order || item.insertion_order || item.priority || 100,
                    depth: item.depth || item.extensions?.depth || item.scan_depth || 4,
                    position: position,
                    enabled: item.disable !== true && item.enabled !== false,
                    title: title, // 使用comment作为标题，而不是关键词
                    comment: item.memo || item.note || '', // comment已经用作title了
                    create_date: item.create_date || new Date().toISOString()
                };
                
                // 确保keys是数组
                if (typeof entry.keys === 'string') {
                    entry.keys = entry.keys.split(',').map(k => k.trim()).filter(k => k);
                } else if (!Array.isArray(entry.keys)) {
                    entry.keys = [];
                }
                
                // 不要把标题当作关键词！保持keys为空数组
                // 世界书条目可以没有关键词，但有内容
                
                // 确保content有值
                if (!entry.content) {
                    console.warn('世界书条目缺少内容，跳过:', entry.title);
                    continue; // 跳过没有内容的条目
                }
                
                // 不要直接push到worldBookEntries！
            }
            
            // 创建新的世界书
            const processedEntries = [];
            for (const item of entries) {
                // 处理每个条目
                let keys = [];
                if (item.key && Array.isArray(item.key) && item.key.length > 0) {
                    keys = item.key;
                } else if (item.keys && Array.isArray(item.keys) && item.keys.length > 0) {
                    keys = item.keys;
                } else if (item.keysecondary && Array.isArray(item.keysecondary) && item.keysecondary.length > 0) {
                    keys = item.keysecondary;
                }
                
                let position = 'before';
                if (item.position === 1 || item.position === 'after') {
                    position = 'after';
                }
                
                const title = item.comment || item.title || item.name || '未命名';
                
                const entry = {
                    id: item.uid !== undefined ? 'world_' + item.uid : (item.id || 'world_' + Date.now() + Math.random().toString(36).substr(2, 9)),
                    keys: keys,
                    content: item.content || item.entry || item.value || '',
                    order: item.order || item.insertion_order || item.priority || 100,
                    probability: item.probability !== undefined ? item.probability : 100,
                    use_probability: item.useProbability !== false,
                    depth: item.depth || item.extensions?.depth || item.scan_depth || 4,
                    position: position,
                    enabled: item.disable !== true && item.enabled !== false,
                    title: title,
                    comment: item.memo || item.note || '',
                    create_date: item.create_date || new Date().toISOString()
                };
                
                if (typeof entry.keys === 'string') {
                    entry.keys = entry.keys.split(',').map(k => k.trim()).filter(k => k);
                } else if (!Array.isArray(entry.keys)) {
                    entry.keys = [];
                }
                
                if (entry.content) {
                    processedEntries.push(entry);
                }
            }
            
            // 创建新的世界书对象（内部格式）
            const newWorldBook = {
                id: 'wb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: worldBookName,
                description: worldBookDesc,
                entries: processedEntries,
                createDate: new Date().toISOString(),
                active: false,
                // 保存原始SillyTavern格式数据，方便后续导出
                originalFormat: data
            };
            
            // 添加到世界书列表
            worldBooks.push(newWorldBook);
            
            // 更新显示
            updateWorldBooksDisplay();
            
            // 自动选中并显示导入的世界书
            selectWorldBook(newWorldBook.id);
            
            try {
                await saveWorldBookToServer(newWorldBook);
            } catch (error) {
                console.error('导入世界书保存失败:', error);
                showToast(`世界书"${worldBookName}"导入后保存失败，请稍后重试`, 'error');
                return;
            }

            const importedCount = processedEntries.length;
            showToast(`成功导入世界书"${worldBookName}"，包含 ${importedCount} 个条目`, 'success');
            
            // 重置文件输入
            document.getElementById('worldImportFile').value = '';
        } catch (error) {
            showToast('导入失败：文件格式错误', 'error');
            console.error('导入错误:', error);
            
            // 重置文件输入
            document.getElementById('worldImportFile').value = '';
        }
    };
    reader.readAsText(file);
};

// 导出当前世界书
window.exportCurrentWorldBook = function() {
    const selector = document.getElementById('worldBookSelector');
    if (!selector || !selector.value) {
        showToast('请先选择要导出的世界书', 'warning');
        return;
    }
    
    const worldBook = worldBooks.find(wb => wb.id === selector.value);
    if (!worldBook || !worldBook.entries || worldBook.entries.length === 0) {
        showToast('该世界书没有条目', 'warning');
        return;
    }
    
    // 转换为SillyTavern完全兼容格式
    const exportData = {
        "entries": {}
    };
    
    // 将条目数组转换为对象格式
    worldBook.entries.forEach((entry, index) => {
        exportData.entries[index.toString()] = {
            "uid": index,
            "key": entry.keys || [],
            "keysecondary": entry.secondary_keys || [],
            "comment": entry.title || '',
            "content": entry.content || '',
            "constant": entry.constant || false,
            "vectorized": false,
            "selective": entry.selective !== false,
            "selectiveLogic": 0,
            "addMemo": true,
            "order": entry.order || 100,
            "position": entry.position === 'before' ? 0 : 1,
            "disable": !entry.enabled,
            "excludeRecursion": entry.exclude_recursion || false,
            "preventRecursion": entry.prevent_recursion || false,
            "delayUntilRecursion": entry.delay_until_recursion || false,
            "probability": entry.probability || 100,
            "useProbability": entry.use_probability !== false,
            "depth": entry.depth || 4,
            "group": entry.group || "",
            "groupOverride": false,
            "groupWeight": 100,
            "scanDepth": null,
            "caseSensitive": entry.case_sensitive || null,
            "matchWholeWords": entry.match_whole_words || null,
            "useGroupScoring": null,
            "automationId": entry.automation_id || "",
            "role": entry.role || null,
            "sticky": entry.sticky || 0,
            "cooldown": entry.cooldown || 0,
            "delay": entry.delay || 0,
            "displayIndex": index
        };
    });
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${worldBook.name.replace(/[^a-zA-Z0-9一-龥]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast(`世界书"${worldBook.name}"已导出`, 'success');
};

// 导出所有世界书
window.exportAllWorldBooks = function() {
    if (worldBooks.length === 0) {
        showToast('没有可导出的世界书', 'warning');
        return;
    }
    
    const exportData = {
        worldBooks: worldBooks,
        activeBooks: activeWorldBooks,
        exportDate: new Date().toISOString()
    };
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_worldbooks_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast(`已导出 ${worldBooks.length} 个世界书`, 'success');
};

// 保存世界书到本地存储
async function saveWorldBookToLocal() {
    const selector = document.getElementById('worldBookSelector');
    if (selector && selector.value) {
        const worldBook = worldBooks.find(wb => wb.id === selector.value);
        if (worldBook) {
            const updatedEntries = Array.isArray(worldBookEntries) ? [...worldBookEntries] : [];
            worldBook.entries = updatedEntries;
            worldBookEntries = updatedEntries;
            if (worldBook.originalFormat) {
                delete worldBook.originalFormat;
            }
            await saveWorldBookToServer(worldBook);
        }
    }
}

// 保存多世界书列表
async function saveWorldBooks() {
    await Promise.all(worldBooks.map(wb => saveWorldBookToServer(wb)));
}

// 保存激活状态到服务器
async function saveActiveWorldBooks() {
    try {
        const response = await fetch('/api/world/save-active', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                activeWorldBooks: activeWorldBooks,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || '保存激活状态失败');
        }
    } catch (error) {
        console.error('保存激活状态错误:', error);
        throw error;
    }
}

// 保存世界书到服务器
async function saveWorldBookToServer(worldBook) {
    try {
        let saveData = worldBook;

        if (!worldBook.originalFormat) {
            const sillyTavernFormat = {
                "entries": {}
            };

            if (worldBook.entries) {
                worldBook.entries.forEach((entry, index) => {
                    sillyTavernFormat.entries[index.toString()] = {
                        "uid": index,
                        "key": entry.keys || [],
                        "keysecondary": entry.secondary_keys || [],
                        "comment": entry.title || '',
                        "content": entry.content || '',
                        "constant": entry.constant || false,
                        "vectorized": false,
                        "selective": entry.selective !== false,
                        "selectiveLogic": 0,
                        "addMemo": true,
                        "order": entry.order || 100,
                        "position": entry.position === 'before' ? 0 : 1,
                        "disable": !entry.enabled,
                        "excludeRecursion": entry.exclude_recursion || false,
                        "preventRecursion": entry.prevent_recursion || false,
                        "delayUntilRecursion": entry.delay_until_recursion || false,
                        "probability": entry.probability || 100,
                        "useProbability": entry.use_probability !== false,
                        "depth": entry.depth || 4,
                        "group": entry.group || "",
                        "groupOverride": false,
                        "groupWeight": 100,
                        "scanDepth": null,
                        "caseSensitive": entry.case_sensitive || null,
                        "matchWholeWords": entry.match_whole_words || null,
                        "useGroupScoring": null,
                        "automationId": entry.automation_id || "",
                        "role": entry.role || null,
                        "sticky": entry.sticky || 0,
                        "cooldown": entry.cooldown || 0,
                        "delay": entry.delay || 0,
                        "displayIndex": index
                    };
                });
            }

            saveData = {
                ...sillyTavernFormat,
                _metadata: {
                    id: worldBook.id,
                    name: worldBook.name,
                    description: worldBook.description,
                    createDate: worldBook.createDate,
                    active: activeWorldBooks.includes(worldBook.id)
                }
            };
        } else {
            saveData = {
                ...worldBook.originalFormat,
                _metadata: {
                    id: worldBook.id,
                    name: worldBook.name,
                    description: worldBook.description,
                    createDate: worldBook.createDate,
                    active: activeWorldBooks.includes(worldBook.id)
                }
            };
        }

        const response = await fetch('/api/world/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(saveData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || '保存世界书到服务器失败');
        }

        return true;
    } catch (error) {
        console.error('保存到服务器失败:', error);
        throw error;
    }
}

// 检查消息中的关键词并返回匹配的世界书内容
window.checkWorldBookTriggers = function(messages) {
    const triggered = [];
    
    // 收集所有激活世界书的条目
    const allEntries = [];
    for (const bookId of activeWorldBooks) {
        const worldBook = worldBooks.find(wb => wb.id === bookId);
        if (worldBook && worldBook.entries) {
            worldBook.entries.forEach(entry => {
                allEntries.push({
                    ...entry,
                    worldBookName: worldBook.name
                });
            });
        }
    }
    
    if (allEntries.length === 0) return [];
    
    // 只检查启用的条目
    const enabledEntries = allEntries.filter(entry => entry.enabled);
    if (enabledEntries.length === 0) return [];
    
    // 按优先级排序
    const sortedEntries = [...enabledEntries].sort((a, b) => a.order - b.order);
    
    for (const entry of sortedEntries) {
        // 获取要扫描的消息
        const depth = entry.depth || 4;
        const recentMessages = messages.slice(-depth);
        const textToScan = recentMessages.map(msg => msg.content).join(' ').toLowerCase();
        
        // 检查概率
        if (entry.use_probability && entry.probability < 100) {
            const roll = Math.random() * 100;
            if (roll > entry.probability) {
                continue; // 概率检查未通过
            }
        }
        
        // 检查关键词
        // 如果keys为空数组，表示必定触发（constant entry）
        let hasMatch = false;
        
        if (!entry.keys || entry.keys.length === 0) {
            // 空关键字或未定义关键字 = 必定触发
            hasMatch = true;
        } else {
            // 有关键字时，检查是否匹配
            hasMatch = entry.keys.some(key => {
                const keyLower = key.toLowerCase();
                return textToScan.includes(keyLower);
            });
        }
        
        if (hasMatch) {
            triggered.push({
                content: entry.content,
                position: entry.position || 'before',
                order: entry.order,
                worldBookName: entry.worldBookName || '',
                title: entry.title
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
    // 不从本地加载
    worldBookEntries = [];
};
// 手动激活世界书（供调试使用）
window.activateWorldBook = async function(worldBookId) {
    const worldBook = worldBooks.find(wb => wb.id === worldBookId);
    if (!worldBook) {
        console.error('世界书不存在:', worldBookId);
        return false;
    }
    
    worldBook.active = true;
    if (!activeWorldBooks.includes(worldBookId)) {
        activeWorldBooks.push(worldBookId);
    }
    
    try {
        await saveActiveWorldBooks();
    } catch (error) {
        console.error('保存激活状态失败:', error);
        return false;
    }
    updateWorldBooksDisplay();
    console.log(`世界书"${worldBook.name}"(${worldBookId})已激活`);
    console.log('当前激活的世界书:', activeWorldBooks);
    return true;
};

// 初始化世界书系统
initWorldBookSystem();

// 暴露统一的世界书管理器，供提示词管理等模块调用
window.worldManager = {
    get activeBooks() {
        return (activeWorldBooks || []).map(id => getWorldBookById(id)).filter(Boolean);
    },
    get activeBookIds() {
        return Array.isArray(activeWorldBooks) ? [...activeWorldBooks] : [];
    },
    getActivatedEntries(messages) {
        try {
            return checkWorldBookTriggers(messages || []);
        } catch (error) {
            console.error('世界书触发失败:', error);
            return [];
        }
    },
    refresh() {
        return loadWorldBooksFromServer();
    }
};
