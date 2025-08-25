// 用户身份管理模块 - SillyTavern兼容格式
const userPersona = {
    // 当前用户信息
    current: {
        name: 'User',
        avatar: 'default_avatar.png',
        description: '',
        // 兼容SillyTavern的字段
        position: 'after_scenario',  // 描述插入位置
        depth: 2,                     // 插入深度
        role: 0                       // 角色类型
    },
    
    // 用户列表（本地存储）
    personas: {},
    
    // 初始化
    init: function() {
        this.loadFromLocal();
        this.loadFromServer();
    }
};

// 显示用户管理面板
window.showUserPersonaPanel = function() {
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
            closeUserPersonaPanel();
        }
    };
    
    // 创建侧边面板
    const panel = document.createElement('div');
    panel.className = 'side-panel user-persona-panel';
    panel.innerHTML = `
        <div class="side-panel-header">
            <h2>用户身份管理</h2>
            <button class="side-panel-close" onclick="closeUserPersonaPanel()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        
        <div class="side-panel-content">
            <!-- 当前用户身份 -->
            <div class="current-persona-section">
                <h3>当前身份</h3>
                <div class="current-persona-card">
                    <div class="persona-avatar-container">
                        <img id="current-persona-avatar" src="${getUserAvatarUrl(userPersona.current.avatar)}" alt="用户头像" />
                        <button onclick="changeUserAvatar()" class="change-avatar-btn" title="更换头像">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="persona-info">
                        <input type="text" id="persona-name" class="persona-name-input" 
                               value="${userPersona.current.name}" 
                               placeholder="输入你的名字"
                               onchange="updatePersonaName(this.value)">
                        <textarea id="persona-description" class="persona-description-input" 
                                  placeholder="描述你的身份（可选）\n这将作为{{user}}变量的内容"
                                  rows="4"
                                  onchange="updatePersonaDescription(this.value)">${userPersona.current.description}</textarea>
                        <div class="token-count">
                            <span id="persona-token-count">0</span> tokens
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 预设身份列表 -->
            <div class="persona-presets-section">
                <div class="section-header">
                    <h3>预设身份</h3>
                    <button onclick="createNewPersona()" class="add-persona-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        新建身份
                    </button>
                </div>
                
                <div class="persona-list" id="personaList">
                    <!-- 动态加载身份列表 -->
                </div>
            </div>
            
            <!-- 高级设置 -->
            <details class="advanced-settings">
                <summary>高级设置</summary>
                <div class="settings-content">
                    <div class="setting-item">
                        <label>描述插入位置</label>
                        <select id="persona-position" onchange="updatePersonaPosition(this.value)">
                            <option value="before_scenario">场景之前</option>
                            <option value="after_scenario" selected>场景之后</option>
                            <option value="before_char">角色描述之前</option>
                            <option value="after_char">角色描述之后</option>
                            <option value="before_examples">示例对话之前</option>
                            <option value="after_examples">示例对话之后</option>
                        </select>
                    </div>
                    
                    <div class="setting-item">
                        <label>插入深度</label>
                        <input type="number" id="persona-depth" min="0" max="10" 
                               value="${userPersona.current.depth}"
                               onchange="updatePersonaDepth(this.value)">
                        <div class="setting-hint">控制在上下文中的位置深度</div>
                    </div>
                    
                    <div class="setting-item">
                        <label>消息角色</label>
                        <select id="persona-role" onchange="updatePersonaRole(this.value)">
                            <option value="0" selected>系统 (System)</option>
                            <option value="1">用户 (User)</option>
                            <option value="2">助手 (Assistant)</option>
                        </select>
                    </div>
                </div>
            </details>
            
            <!-- 导入导出 -->
            <div class="import-export-section">
                <button onclick="importPersona()" class="import-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    导入身份
                </button>
                <button onclick="exportPersona()" class="export-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    导出身份
                </button>
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
    
    // 加载身份列表
    loadPersonaList();
    updateTokenCount();
};

// 关闭用户管理面板
window.closeUserPersonaPanel = function() {
    const overlay = document.querySelector('.side-panel-overlay');
    const panel = document.querySelector('.user-persona-panel');
    
    if (overlay && panel) {
        overlay.classList.remove('show');
        panel.classList.remove('show');
        
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
};

// 获取用户头像URL
function getUserAvatarUrl(avatarFile) {
    if (!avatarFile || avatarFile === 'default_avatar.png') {
        // 返回默认头像的data URL
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjNDQ0Ii8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjODg4Ii8+CjxwYXRoIGQ9Ik0yNSA3NUMyNSA2MCAzNSA1MCA1MCA1MEM2NSA1MCA3NSA2MCA3NSA3NVYxMDBIMjVWNzVaIiBmaWxsPSIjODg4Ii8+Cjwvc3ZnPg==';
    }
    return `/api/personas/avatar/${avatarFile}`;
}

// 更新用户名称
window.updatePersonaName = function(name) {
    userPersona.current.name = name;
    savePersonaToLocal();
    
    // 更新聊天界面的用户名
    if (window.updateChatUserName) {
        window.updateChatUserName(name);
    }
};

// 更新用户描述
window.updatePersonaDescription = function(description) {
    userPersona.current.description = description;
    savePersonaToLocal();
    updateTokenCount();
};

// 更新插入位置
window.updatePersonaPosition = function(position) {
    userPersona.current.position = position;
    savePersonaToLocal();
};

// 更新插入深度
window.updatePersonaDepth = function(depth) {
    userPersona.current.depth = parseInt(depth);
    savePersonaToLocal();
};

// 更新消息角色
window.updatePersonaRole = function(role) {
    userPersona.current.role = parseInt(role);
    savePersonaToLocal();
};

// 更新token计数
async function updateTokenCount() {
    const description = document.getElementById('persona-description')?.value || '';
    // 这里应该调用实际的token计数API
    const count = description.length; // 简单估算
    const element = document.getElementById('persona-token-count');
    if (element) {
        element.textContent = count;
    }
}

// 更换头像
window.changeUserAvatar = async function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('avatar', file);
            
            try {
                const response = await fetch('/api/personas/upload-avatar', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const data = await response.json();
                    userPersona.current.avatar = data.filename;
                    document.getElementById('current-persona-avatar').src = getUserAvatarUrl(data.filename);
                    savePersonaToLocal();
                    showToast('头像已更新', 'success');
                }
            } catch (error) {
                console.error('上传头像失败:', error);
                showToast('上传失败', 'error');
            }
        }
    };
    input.click();
};

// 创建新身份
window.createNewPersona = async function() {
    const name = prompt('请输入身份名称:');
    if (!name) return;
    
    const id = 'persona_' + Date.now();
    const newPersona = {
        id: id,
        name: name,
        avatar: 'default_avatar.png',
        description: '',
        position: 'after_scenario',
        depth: 2,
        role: 0
    };
    
    userPersona.personas[id] = newPersona;
    savePersonaToLocal();
    loadPersonaList();
    showToast(`身份 "${name}" 已创建`, 'success');
};

// 加载身份列表
function loadPersonaList() {
    const container = document.getElementById('personaList');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 添加默认身份
    const defaultCard = createPersonaCard({
        id: 'default',
        name: 'Default User',
        avatar: 'default_avatar.png',
        description: '默认用户身份'
    });
    container.appendChild(defaultCard);
    
    // 添加自定义身份
    for (const [id, persona] of Object.entries(userPersona.personas)) {
        const card = createPersonaCard(persona);
        container.appendChild(card);
    }
}

// 创建身份卡片
function createPersonaCard(persona) {
    const card = document.createElement('div');
    card.className = 'persona-card';
    card.innerHTML = `
        <img src="${getUserAvatarUrl(persona.avatar)}" alt="${persona.name}" class="persona-card-avatar">
        <div class="persona-card-info">
            <div class="persona-card-name">${persona.name}</div>
            <div class="persona-card-desc">${persona.description || '无描述'}</div>
        </div>
        <div class="persona-card-actions">
            <button onclick="switchPersona('${persona.id}')" class="switch-btn" title="切换到此身份">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </button>
            ${persona.id !== 'default' ? `
                <button onclick="deletePersona('${persona.id}')" class="delete-btn" title="删除">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                    </svg>
                </button>
            ` : ''}
        </div>
    `;
    return card;
}

// 切换身份
window.switchPersona = function(personaId) {
    if (personaId === 'default') {
        userPersona.current = {
            name: 'User',
            avatar: 'default_avatar.png',
            description: '',
            position: 'after_scenario',
            depth: 2,
            role: 0
        };
    } else if (userPersona.personas[personaId]) {
        userPersona.current = {...userPersona.personas[personaId]};
    }
    
    // 更新界面
    document.getElementById('persona-name').value = userPersona.current.name;
    document.getElementById('persona-description').value = userPersona.current.description;
    document.getElementById('current-persona-avatar').src = getUserAvatarUrl(userPersona.current.avatar);
    document.getElementById('persona-position').value = userPersona.current.position;
    document.getElementById('persona-depth').value = userPersona.current.depth;
    document.getElementById('persona-role').value = userPersona.current.role;
    
    savePersonaToLocal();
    updateTokenCount();
    showToast(`已切换到 "${userPersona.current.name}"`, 'success');
};

// 删除身份
window.deletePersona = function(personaId) {
    if (confirm('确定要删除这个身份吗？')) {
        delete userPersona.personas[personaId];
        savePersonaToLocal();
        loadPersonaList();
        showToast('身份已删除', 'success');
    }
};

// 导入身份
window.importPersona = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.name && data.description !== undefined) {
                        const id = 'persona_' + Date.now();
                        userPersona.personas[id] = {
                            id: id,
                            name: data.name,
                            avatar: data.avatar || 'default_avatar.png',
                            description: data.description || '',
                            position: data.position || 'after_scenario',
                            depth: data.depth || 2,
                            role: data.role || 0
                        };
                        savePersonaToLocal();
                        loadPersonaList();
                        showToast(`身份 "${data.name}" 已导入`, 'success');
                    }
                } catch (error) {
                    showToast('导入失败：文件格式错误', 'error');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
};

// 导出身份
window.exportPersona = function() {
    const data = {
        name: userPersona.current.name,
        avatar: userPersona.current.avatar,
        description: userPersona.current.description,
        position: userPersona.current.position,
        depth: userPersona.current.depth,
        role: userPersona.current.role
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${userPersona.current.name}_persona.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('身份已导出', 'success');
};

// 保存到本地存储
function savePersonaToLocal() {
    // 不使用localStorage，直接保存到服务器
    savePersonaToServer();
}

// 保存到服务器
async function savePersonaToServer() {
    try {
        await fetch('/api/personas/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userPersona)
        });
    } catch (error) {
        console.error('保存身份到服务器失败:', error);
    }
}

// 从本地存储加载
userPersona.loadFromLocal = function() {
    // 不使用localStorage
    const saved = null;
    if (false) {
        try {
            const data = JSON.parse(saved);
            Object.assign(this, data);
        } catch (e) {
            console.error('加载用户身份失败:', e);
        }
    }
};

// 从服务器加载
userPersona.loadFromServer = async function() {
    try {
        const response = await fetch('/api/personas/get');
        if (response.ok) {
            const data = await response.json();
            if (data.personas) {
                this.personas = data.personas;
            }
            if (data.current) {
                this.current = data.current;
            }
        }
    } catch (error) {
        console.error('从服务器加载身份失败:', error);
    }
};

// 获取当前用户信息（供其他模块调用）
window.getCurrentUserPersona = function() {
    return userPersona.current;
};

// 初始化
userPersona.init();