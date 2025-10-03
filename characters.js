// 角色卡管理模块
window.currentCharacter = null;  // 当前选中的角色（全局变量）
window.characterList = [];  // 角色列表（全局变量）
let characterList = window.characterList;  // 本地引用

// 显示角色卡面板
window.showCharacterPanel = function() {
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
    panel.className = 'side-panel character-side-panel';
    panel.innerHTML = `
        <div class="side-panel-header">
            <h2>角色卡管理</h2>
            <button class="side-panel-close" onclick="closeSidePanel()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        
        <div class="side-panel-content">
            <div class="character-toolbar">
                <button onclick="document.getElementById('characterImportFile').click()" class="character-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    导入角色卡
                </button>
                <input type="file" id="characterImportFile" accept=".json,.png" style="display: none;" onchange="importCharacter(this.files[0])" />
                
                <button onclick="createNewCharacter()" class="character-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    创建角色
                </button>
            </div>
            
            <div class="character-list" id="characterListContainer">
                ${characterList.length === 0 ? '<p class="no-characters">暂无角色卡</p>' : ''}
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
    
    // 加载角色列表
    loadCharacterList();
};

// 关闭侧边面板
window.closeSidePanel = function() {
    const overlay = document.querySelector('.side-panel-overlay');
    const panel = document.querySelector('.side-panel');
    
    if (overlay && panel) {
        overlay.classList.remove('show');
        panel.classList.remove('show');
        
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
};

// 创建新角色
window.createNewCharacter = function() {
    const modal = createModal('创建角色', '');
    const characterForm = document.createElement('div');
    characterForm.className = 'character-form';
    characterForm.innerHTML = `
        <div class="form-group">
            <label>角色名称 *</label>
            <input type="text" id="char-name" placeholder="输入角色名称">
        </div>
        
        <div class="form-group">
            <label>角色描述</label>
            <textarea id="char-description" class="auto-resize" placeholder="描述角色的基本信息"></textarea>
        </div>
        
        <div class="form-group">
            <label>开场白</label>
            <textarea id="char-first-mes" class="auto-resize" placeholder="角色的第一条消息"></textarea>
        </div>

        <div class="form-group">
            <label>备用开场白
                <button type="button" class="add-alt-greeting-btn" onclick="addAlternateGreeting()">+ 添加</button>
            </label>
            <div id="alternate-greetings-container"></div>
        </div>

        <details class="advanced-settings">
            <summary>附加设置</summary>
            <div class="advanced-content">
                <div class="form-group">
                    <label>性格特征</label>
                    <textarea id="char-personality" class="auto-resize" placeholder="描述角色的性格特点"></textarea>
                </div>
                
                <div class="form-group">
                    <label>场景设定</label>
                    <textarea id="char-scenario" class="auto-resize" placeholder="设定对话场景"></textarea>
                </div>
                
                <div class="form-group">
                    <label>对话示例</label>
                    <textarea id="char-mes-example" class="auto-resize" placeholder="示例对话格式：\n{{user}}: 你好\n{{char}}: 你好！很高兴见到你。"></textarea>
                </div>
            </div>
        </details>
        
        <div class="form-buttons">
            <button onclick="saveNewCharacter()">保存角色</button>
            <button onclick="this.closest('.modal').remove()">取消</button>
        </div>
    `;
    
    modal.querySelector('.modal-body').appendChild(characterForm);
    
    // 初始化自动调整高度
    initAutoResize(modal);
};

// 保存新角色
window.saveNewCharacter = async function() {
    const name = document.getElementById('char-name').value.trim();
    if (!name) {
        showToast('请输入角色名称', 'warning');
        return;
    }
    
    const character = {
        name: name,
        description: document.getElementById('char-description').value,
        personality: document.getElementById('char-personality').value,
        scenario: document.getElementById('char-scenario').value,
        first_mes: document.getElementById('char-first-mes').value,
        alternate_greetings: collectAlternateGreetings(),  // 收集备用开场白
        mes_example: document.getElementById('char-mes-example').value,
        creator: 'user',
        create_date: new Date().toISOString(),
        avatar: null  // 可以后续添加头像上传功能
    };
    
    try {
        // 保存到服务器
        const response = await fetch('/api/character/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(character)
        });
        
        if (response.ok) {
            const data = await response.json();
            character.id = data.character_id;
            
            // 添加到本地列表
            characterList.push(character);
            // 不使用localStorage
            
            // 关闭创建窗口
            document.querySelector('.modal').remove();
            
            showToast('角色创建成功', 'success');
        }
    } catch (error) {
        console.error('保存角色失败:', error);
        showToast('保存角色失败', 'error');
    }
};

// 导入角色卡
window.importCharacter = async function(file) {
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.json')) {
        // 导入JSON格式
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                let rawData = JSON.parse(e.target.result);
                let character;

                // 处理SillyTavern格式
                if ((rawData.spec === 'chara_card_v2' || rawData.spec === 'chara_card_v3') && rawData.data) {
                    // spec_v2/v3格式，从 data 字段提取
                    character = rawData.data;
                    character.spec = rawData.spec;
                    character.spec_version = rawData.spec_version;

                    // 确保alternate_greetings字段存在
                    if (!character.alternate_greetings) {
                        character.alternate_greetings = [];
                    }
                } else if (rawData.name) {
                    // 直接格式（兼容旧版）
                    character = rawData;
                    // 确保alternate_greetings字段存在
                    if (!character.alternate_greetings) {
                        character.alternate_greetings = [];
                    }
                } else {
                    showToast('无效的角色卡格式', 'error');
                    return;
                }

                // 保存角色
                const response = await fetch('/api/character/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(character)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    character.id = data.character_id;
                    
                    // 添加到本地列表
                    characterList.push(character);
                    // 不使用localStorage
                    
                    // 刷新显示
                    loadCharacterList();
                    
                    showToast('角色导入成功', 'success');
                }
            } catch (error) {
                showToast('导入失败：文件格式错误', 'error');
                console.error('导入错误:', error);
            }
        };
        reader.readAsText(file);
        
    } else if (fileName.endsWith('.png')) {
        // 导入PNG格式（SillyTavern支持在PNG图片的metadata中存储角色数据）
        // 这需要读取PNG的tEXt chunk来提取JSON数据
        showToast('PNG格式导入功能开发中', 'info');
    } else {
        showToast('不支持的文件格式', 'error');
    }
};

// 加载角色列表
async function loadCharacterList() {
    try {
        // 从服务器加载
        const response = await fetch('/api/character/list');
        if (response.ok) {
            const data = await response.json();
            characterList = data.characters || [];

            // 更新全局变量
            window.characterList = characterList;

            // 不使用localStorage，数据已在服务器
        }
    } catch (error) {
        // 不从本地加载
        console.error('加载角色列表失败:', error);
    }
    
    // 更新显示
    const container = document.getElementById('characterListContainer');
    if (container) {
        if (characterList.length === 0) {
            container.innerHTML = '<p class="no-characters">暂无角色卡</p>';
        } else {
            container.innerHTML = characterList.map((char, index) => `
                <div class="character-item" data-index="${index}">
                    <div class="character-avatar">
                        ${char.avatar && char.avatar !== 'none' ? `<img src="${char.avatar}" alt="${char.name}">` : char.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="character-info">
                        <div class="character-name">${char.name}</div>
                    </div>
                    <div class="character-actions">
                        <button onclick="selectCharacter(${index})" title="选择角色">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                        <button onclick="editCharacter(${index})" title="编辑角色">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button onclick="exportCharacter(${index})" title="导出角色">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </button>
                        <button onclick="deleteCharacter(${index})" title="删除角色">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }
}

// 通过名称选择角色（不触发新对话）
window.selectCharacterByName = async function(characterName) {
    if (!characterName) return false;
    
    // 确保角色列表已加载 - 始终从服务器加载最新数据
    try {
        const response = await fetch('/api/character/list');  // 注意：character没有s
        if (response.ok) {
            const data = await response.json();
            characterList = data.characters || [];
            window.characterList = characterList;
            // 保存到本地作为缓存备份
            // 不使用localStorage
        } else {
            throw new Error('服务器响应错误');
        }
    } catch (error) {
        console.error('从服务器加载角色列表失败:', error);
        // 只有在服务器失败时才使用本地缓存
        if (!characterList || characterList.length === 0) {
            const saved = localStorage.getItem('characterList');
            if (saved) {
                characterList = JSON.parse(saved);
                window.characterList = characterList;
                console.log('使用本地缓存的角色列表');
            }
        }
    }
    
    // 查找角色
    const index = characterList.findIndex(char => char.name === characterName);
    if (index === -1) {
        console.warn(`角色 ${characterName} 未找到`);
        return false;
    }
    
    // 直接设置当前角色，不触发新对话
    window.currentCharacter = characterList[index];
    
    // 更新界面显示（如果有的话）
    if (typeof updateCharacterDisplay === 'function') {
        updateCharacterDisplay();
    }
    
    return true;
};

// 选择角色
window.selectCharacter = function(index) {
    const newCharacter = characterList[index];

    // 如果切换了不同的角色，保存当前对话
    if (window.currentCharacter && window.currentCharacter.name !== newCharacter.name) {
        // 保存当前角色的对话
        if (contextMessages.length > 0) {
            saveChatToHistory();
        }
    }

    // 设置当前角色（必须在startNewChat之前）
    const oldCharacter = window.currentCharacter;
    window.currentCharacter = newCharacter;
    
    // 如果是新角色或第一次选择，开始新对话
    if (!oldCharacter || oldCharacter.name !== newCharacter.name) {
        // 开始新对话（startNewChat会自动处理first_mes）
        startNewChat();
        
        // 设置对话标题
        if (window.currentCharacter.first_mes) {
            currentChatTitle = `与 ${window.currentCharacter.name} 的对话`;
            updateHistoryDisplay();
        }
    }
    
    // 关闭侧边面板
    closeSidePanel();
    
    // 更新角色标题栏
    if (typeof updateChatHeader === 'function') {
        updateChatHeader();
    }
    
    showToast(`已选择角色: ${window.currentCharacter.name}`, 'success');
};

// 构建角色提示词
function buildCharacterPrompt(character) {
    let prompt = `You are roleplaying as ${character.name}.`;
    
    if (character.description) {
        prompt += `\n\nDescription: ${character.description}`;
    }
    
    if (character.personality) {
        prompt += `\n\nPersonality: ${character.personality}`;
    }
    
    if (character.scenario) {
        prompt += `\n\nScenario: ${character.scenario}`;
    }
    
    if (character.mes_example) {
        prompt += `\n\nExample dialogue:\n${character.mes_example}`;
    }
    
    prompt += `\n\nStay in character and respond as ${character.name} would.`;
    
    return prompt;
}

// 编辑角色
window.editCharacter = function(index) {
    const character = characterList[index];
    if (!character) return;

    // 兼容spec_v3格式 - 从正确的位置读取字段
    const name = character.name || character.data?.name || '';
    const description = character.description || character.data?.description || '';
    const first_mes = character.first_mes || character.data?.first_mes || '';
    const personality = character.personality || character.data?.personality || '';
    const scenario = character.scenario || character.data?.scenario || '';
    const mes_example = character.mes_example || character.data?.mes_example || '';

    const modal = createModal('编辑角色', '');
    const characterForm = document.createElement('div');
    characterForm.className = 'character-form';
    characterForm.innerHTML = `
        <div class="form-group">
            <label>角色名称 *</label>
            <input type="text" id="edit-char-name" value="${escapeHtml(name)}" placeholder="输入角色名称">
        </div>

        <div class="form-group">
            <label>角色描述</label>
            <textarea id="edit-char-description" class="auto-resize" placeholder="描述角色的基本信息">${escapeHtml(description)}</textarea>
        </div>

        <div class="form-group">
            <label>开场白</label>
            <textarea id="edit-char-first-mes" class="auto-resize" placeholder="角色的第一条消息">${escapeHtml(first_mes)}</textarea>
        </div>

        <div class="form-group">
            <label>备用开场白
                <button type="button" class="add-alt-greeting-btn" onclick="addAlternateGreeting()">+ 添加</button>
            </label>
            <div id="alternate-greetings-container"></div>
        </div>

        <details class="advanced-settings" ${(personality || scenario || mes_example) ? 'open' : ''}>
            <summary>附加设置</summary>
            <div class="advanced-content">
                <div class="form-group">
                    <label>性格特征</label>
                    <textarea id="edit-char-personality" class="auto-resize" placeholder="描述角色的性格特点">${escapeHtml(personality)}</textarea>
                </div>

                <div class="form-group">
                    <label>场景设定</label>
                    <textarea id="edit-char-scenario" class="auto-resize" placeholder="设定对话场景">${escapeHtml(scenario)}</textarea>
                </div>

                <div class="form-group">
                    <label>对话示例</label>
                    <textarea id="edit-char-mes-example" class="auto-resize" placeholder="示例对话格式：\n{{user}}: 你好\n{{char}}: 你好！很高兴见到你。">${escapeHtml(mes_example)}</textarea>
                </div>
            </div>
        </details>

        <div class="form-buttons">
            <button onclick="saveEditedCharacter(${index})">保存修改</button>
            <button onclick="this.closest('.modal').remove()">取消</button>
        </div>
    `;

    modal.querySelector('.modal-body').appendChild(characterForm);

    // 初始化备用开场白显示(兼容spec_v3格式)
    const alternate_greetings = character.alternate_greetings || character.data?.alternate_greetings || [];
    if (alternate_greetings.length > 0) {
        alternate_greetings.forEach((greeting) => {
            addAlternateGreeting(greeting);
        });
    }

    // 初始化自动调整高度
    initAutoResize(modal);
};

// 保存编辑后的角色
window.saveEditedCharacter = async function(index) {
    const character = characterList[index];
    if (!character) return;
    
    const name = document.getElementById('edit-char-name').value.trim();
    if (!name) {
        showToast('请输入角色名称', 'warning');
        return;
    }
    
    // 更新角色信息
    character.name = name;
    character.description = document.getElementById('edit-char-description').value;
    character.personality = document.getElementById('edit-char-personality').value;
    character.scenario = document.getElementById('edit-char-scenario').value;
    character.first_mes = document.getElementById('edit-char-first-mes').value;
    character.mes_example = document.getElementById('edit-char-mes-example').value;
    character.modified_date = new Date().toISOString();

    // 收集备用开场白
    character.alternate_greetings = collectAlternateGreetings();
    
    try {
        // 保存到服务器
        const response = await fetch('/api/character/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(character)
        });
        
        if (response.ok) {
            // 更新本地列表
            characterList[index] = character;
            // 不使用localStorage
            
            // 关闭编辑窗口
            document.querySelector('.modal').remove();
            
            // 刷新角色面板（如果还开着的话）
            const characterPanel = document.querySelector('.character-panel');
            if (characterPanel) {
                loadCharacterList();
            }
            
            showToast('角色修改成功', 'success');
        }
    } catch (error) {
        console.error('保存角色失败:', error);
        showToast('保存失败', 'error');
    }
};

// 导出角色
window.exportCharacter = function(index) {
    const character = characterList[index];
    if (!character) return;
    
    // 构建SillyTavern spec_v2兼容格式
    const exportData = {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
            name: character.name,
            description: character.description || '',
            personality: character.personality || '',
            scenario: character.scenario || '',
            first_mes: character.first_mes || '',
            mes_example: character.mes_example || '',
            creator_notes: character.creator_notes || '',
            system_prompt: character.system_prompt || '',
            post_history_instructions: character.post_history_instructions || '',
            alternate_greetings: character.alternate_greetings || [],
            character_book: character.character_book || null,
            tags: character.tags || [],
            creator: character.creator || 'user',
            character_version: character.character_version || '1.0',
            extensions: character.extensions || {}
        },
        create_date: character.create_date || new Date().toISOString()
    };
    
    // 转换为JSON并下载
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${character.name.replace(/[^a-zA-Z0-9]/g, '_')}_character.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('角色卡已导出', 'success');
};

// 删除角色
window.deleteCharacter = async function(index) {
    const character = characterList[index];
    if (!character) return;
    
    if (confirm(`确定要删除角色 "${character.name}" 吗？`)) {
        try {
            // 从服务器删除
            if (character.id) {
                await fetch(`/api/character/delete/${character.id}`, {
                    method: 'DELETE'
                });
            }
            
            // 从本地列表移除
            characterList.splice(index, 1);
            // 不使用localStorage
            
            // 刷新显示
            loadCharacterList();
            
            showToast('角色已删除', 'success');
        } catch (error) {
            console.error('删除角色失败:', error);
            showToast('删除失败', 'error');
        }
    }
};

// 获取当前角色
window.getCurrentCharacter = function() {
    return currentCharacter;
};

// 设置当前角色
window.setCurrentCharacter = function(character) {
    currentCharacter = character;
};

// 初始化自动调整高度
function initAutoResize(container) {
    const textareas = container.querySelectorAll('.auto-resize');
    textareas.forEach(textarea => {
        // 设置初始高度
        autoResize(textarea);
        
        // 监听输入事件
        textarea.addEventListener('input', function() {
            autoResize(this);
        });
    });
}

// 自动调整文本框高度
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// ==================== 备用开场白管理 ====================

// 添加备用开场白输入框
window.addAlternateGreeting = function(text = '') {
    const container = document.getElementById('alternate-greetings-container');
    if (!container) return;

    const greetingDiv = document.createElement('div');
    greetingDiv.className = 'alternate-greeting-item';
    greetingDiv.innerHTML = `
        <textarea class="auto-resize alternate-greeting-input" placeholder="输入备用开场白...">${escapeHtml(text)}</textarea>
        <button type="button" class="remove-greeting-btn" onclick="removeAlternateGreeting(this)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;

    container.appendChild(greetingDiv);

    // 自动调整新增的textarea高度
    const textarea = greetingDiv.querySelector('textarea');
    autoResize(textarea);
    textarea.addEventListener('input', function() {
        autoResize(this);
    });
};

// 移除备用开场白
window.removeAlternateGreeting = function(button) {
    const item = button.closest('.alternate-greeting-item');
    if (item) {
        item.remove();
    }
};

// 收集所有备用开场白
window.collectAlternateGreetings = function() {
    const container = document.getElementById('alternate-greetings-container');
    if (!container) return [];

    const textareas = container.querySelectorAll('.alternate-greeting-input');
    const greetings = [];
    textareas.forEach(textarea => {
        const text = textarea.value.trim();
        if (text) {
            greetings.push(text);
        }
    });
    return greetings;
};