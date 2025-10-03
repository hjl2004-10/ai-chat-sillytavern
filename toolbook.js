let toolBooks = [];
let activeToolBooks = [];
let currentToolBookKeyword = null;
let globalImagePushEnabled = false; // 全局图片推送开关

function syncToolBookGlobals() {
    window.toolBooks = toolBooks;
    window.activeToolBooks = activeToolBooks;
    window.globalImagePushEnabled = globalImagePushEnabled;
}

syncToolBookGlobals();

function normalizeToolBookKeyword(keyword) {
    if (!keyword) return '';
    let value = String(keyword).trim();
    // 只替换不安全的文件名字符，保留中文、英文、数字、下划线、横杠
    const unsafeChars = /[\/\\:\*\?"<>\|\n\r\t]+/g;
    value = value.replace(unsafeChars, '_');
    value = value.replace(/^[_\-]+|[_\-]+$/g, '');
    return value;
}

window.toolBookManager = {
    get activeBooks() {
        return (activeToolBooks || [])
            .map(normalizeToolBookKeyword)
            .map(key => getToolBookByKeyword(key))
            .filter(Boolean);
    },
    get activeKeywords() {
        return Array.isArray(activeToolBooks) ? [...activeToolBooks] : [];
    },
    getActivatedEntries(messages) {
        try {
            return toolBookTriggeredEntries(messages || []);
        } catch (error) {
            console.error('工具书触发失败:', error);
            return [];
        }
    },
    refresh() {
        return loadToolBooksFromServer();
    }
};


async function loadToolBooksFromServer(showToastMessage = false) {
    try {
        const response = await fetch('/api/toolbook/list');
        if (response.ok) {
            const data = await response.json();
            toolBooks = Array.isArray(data.toolBooks) ? data.toolBooks : [];
        } else if (showToastMessage) {
            showToast('加载工具书列表失败', 'error');
        }

        try {
            const activeResponse = await fetch('/api/toolbook/get-active');
            if (activeResponse.ok) {
                const activeData = await activeResponse.json();
                activeToolBooks = Array.isArray(activeData.activeToolBooks) ? activeData.activeToolBooks : [];
                // 加载全局图片推送开关状态
                globalImagePushEnabled = activeData.globalImagePushEnabled || false;
                // 更新UI
                updateGlobalImagePushToggle();
            }
        } catch (error) {
            console.error('获取工具书激活状态失败:', error);
        }

    } catch (error) {
        console.error('加载工具书失败:', error);
        if (showToastMessage) {
            showToast('加载工具书失败，请稍后重试', 'error');
        }
    } finally {
        syncToolBookGlobals();
        if (typeof updateToolBooksDisplay === 'function') {
            updateToolBooksDisplay();
        }
    }
}

function getToolBookByKeyword(keyword) {
    const safeKeyword = normalizeToolBookKeyword(keyword);
    return toolBooks.find(tb => normalizeToolBookKeyword(tb.keyword) === safeKeyword);
}

function updateToolBooksDisplay() {
    const listContainer = document.getElementById('toolBooksList');
    if (!listContainer) {
        return;
    }

    const activeSet = new Set((activeToolBooks || []).map(normalizeToolBookKeyword))
    const escape = typeof escapeHtml === 'function' ? escapeHtml : (value => value);

    if (!toolBooks || toolBooks.length === 0) {
        listContainer.innerHTML = '<p class="no-entries">暂无工具书，点击下方按钮创建</p>';
        return;
    }

    listContainer.innerHTML = toolBooks
        .map(toolBook => {
            const keyword = toolBook.keyword || '';
            const normalizedKeyword = normalizeToolBookKeyword(keyword);
            const isActive = activeSet.has(normalizedKeyword);
            const displayName = toolBook.displayName || keyword;
            const description = toolBook.description || '';
            const resourceCount = Array.isArray(toolBook.resources) ? toolBook.resources.length : 0;
            return `
                <div class="world-book-item ${isActive ? 'active' : ''}" data-keyword="${keyword}">
                    <div class="wb-header">
                        <input type="checkbox"
                               class="wb-checkbox"
                               ${isActive ? 'checked' : ''}
                               onchange="toggleToolBookActive('${keyword}', this.checked)">
                        <div class="wb-info" onclick="showToolBookModal('${keyword}')">
                            <div class="wb-name">
                                ${escape(displayName)}
                                ${toolBook.probability !== undefined && toolBook.probability < 100 ?
                                    `<span class="probability-tag">概率: ${toolBook.probability}%</span>` : ''}
                            </div>
                            <div class="wb-meta">资源 ${resourceCount} 个${toolBook.scan_depth ? ` · 深度 ${toolBook.scan_depth}` : ''}</div>
                        </div>
                        <div class="wb-actions">
                            <button onclick="openToolBookResources('${keyword}')" title="管理资源">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M4 6h16"></path>
                                    <path d="M4 12h16"></path>
                                    <path d="M4 18h16"></path>
                                </svg>
                            </button>
                            <button onclick="showToolBookModal('${keyword}')" title="编辑工具书">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button onclick="deleteToolBook('${keyword}')" title="删除工具书">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    ${description ? `<div class="wb-description">${escape(description)}</div>` : ''}
                </div>
            `;
        })
        .join('');
}

window.showToolBookModal = function(keyword = null) {
    const existingToolBook = keyword ? getToolBookByKeyword(keyword) : null;

    console.log('[工具书编辑] 打开弹窗，keyword:', keyword);
    console.log('[工具书编辑] existingToolBook:', existingToolBook);
    console.log('[工具书编辑] enableImagePush值:', existingToolBook?.enableImagePush);

    const modal = createModal(existingToolBook ? '编辑工具书' : '新建工具书', '');
    const form = document.createElement('div');
    form.className = 'world-form';
    form.dataset.originalKeyword = existingToolBook ? existingToolBook.keyword : '';

    const escape = typeof escapeHtml === 'function' ? escapeHtml : (value => value);
    const contentValue = existingToolBook ? existingToolBook.content || '' : '';

    form.innerHTML = `
        <div class="form-group">
            <label>关键词 *</label>
            <input type="text" id="toolbook-keyword" value="${existingToolBook ? escape(existingToolBook.keyword) : ''}" placeholder="请输入关键词（用于匹配消息内容）">
        </div>
        <div class="form-group">
            <label>显示名称</label>
            <input type="text" id="toolbook-display" value="${existingToolBook ? escape(existingToolBook.displayName || existingToolBook.keyword) : ''}" placeholder="用于界面展示">
        </div>
        <div class="form-group">
            <label>描述</label>
            <textarea id="toolbook-description" rows="2" placeholder="工具书用途说明">${existingToolBook ? escape(existingToolBook.description || '') : ''}</textarea>
        </div>
        <div class="form-row">
            <div class="form-group half">
                <label>插入位置</label>
                <select id="toolbook-position">
                    <option value="before" ${!existingToolBook || (existingToolBook.position || 'before') === 'before' ? 'selected' : ''}>前置（对话前加入）</option>
                    <option value="after" ${(existingToolBook && existingToolBook.position === 'after') ? 'selected' : ''}>后置（对话后加入）</option>
                </select>
            </div>
            <div class="form-group half">
                <label>优先级</label>
                <input type="number" id="toolbook-order" value="${existingToolBook ? parseInt(existingToolBook.order || 100, 10) : 100}" min="0" max="9999">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group half">
                <label>触发概率 <span class="form-hint">(%)</span></label>
                <input type="number" id="toolbook-probability" value="${existingToolBook ? (existingToolBook.probability || 100) : 100}" min="0" max="100">
            </div>
            <div class="form-group half">
                <label>扫描深度 <span class="form-hint">（最近N条消息）</span></label>
                <input type="number" id="toolbook-scan-depth" value="${existingToolBook ? (existingToolBook.scan_depth || 4) : 4}" min="1" max="20">
            </div>
        </div>
        <div class="form-group">
            <label class="checkbox-inline">
                <input type="checkbox" id="toolbook-use-probability" ${!existingToolBook || existingToolBook.use_probability !== false ? 'checked' : ''}>
                启用概率触发
            </label>
        </div>
        <div class="form-group">
            <label>内容 *</label>
            <textarea id="toolbook-content" rows="8" placeholder="请输入正文，可使用 [[文件名.ext]] 引用附件">${escape(contentValue)}</textarea>
        </div>
        <div class="form-group">
            <label class="checkbox-inline">
                <input type="checkbox" id="toolbook-active" ${existingToolBook && existingToolBook.active ? 'checked' : ''}>
                保存后立即激活
            </label>
        </div>
        <div class="form-group">
            <label class="checkbox-inline">
                <input type="checkbox" id="toolbook-enable-image-push" ${existingToolBook && existingToolBook.enableImagePush ? 'checked' : ''}>
                启用AI图片推送功能（允许AI主动输出本工具书的图片）
            </label>
        </div>
        <div class="form-buttons">
            <button type="button" class="toolbook-save-btn">保存</button>
            <button type="button" onclick="this.closest('.modal').remove()">取消</button>
        </div>
    `;

    modal.querySelector('.modal-body').appendChild(form);

    form.querySelector('.toolbook-save-btn').onclick = async () => {
        await saveToolBookFromModal(form, modal);
    };
};

async function saveToolBookFromModal(form, modal) {
    const keywordInput = form.querySelector('#toolbook-keyword');
    const displayInput = form.querySelector('#toolbook-display');
    const descriptionInput = form.querySelector('#toolbook-description');
    const positionInput = form.querySelector('#toolbook-position');
    const orderInput = form.querySelector('#toolbook-order');
    const contentInput = form.querySelector('#toolbook-content');
    const activeInput = form.querySelector('#toolbook-active');

    const keyword = (keywordInput.value || '').trim();
    if (!keyword) {
        showToast('请输入关键词', 'warning');
        keywordInput.focus();
        return;
    }

    const payload = {
        keyword,
        displayName: (displayInput.value || '').trim(),
        description: (descriptionInput.value || '').trim(),
        position: positionInput.value === 'after' ? 'after' : 'before',
        order: parseInt(orderInput.value, 10) || 100,
        content: contentInput.value || '',
        active: !!activeInput.checked,
        probability: parseInt(form.querySelector('#toolbook-probability').value, 10) || 100,
        scan_depth: parseInt(form.querySelector('#toolbook-scan-depth').value, 10) || 4,
        use_probability: !!form.querySelector('#toolbook-use-probability').checked,
        enableImagePush: !!form.querySelector('#toolbook-enable-image-push').checked
    };

    console.log('[工具书保存] payload:', payload);
    console.log('[工具书保存] enableImagePush checkbox checked:', form.querySelector('#toolbook-enable-image-push')?.checked);

    const originalKeyword = (form.dataset.originalKeyword || '').trim();
    if (originalKeyword && originalKeyword !== keyword) {
        payload.originalKeyword = originalKeyword;
    }

    try {
        const response = await fetch('/api/toolbook/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) {
            showToast(result.error || '保存工具书失败', 'error');
            return;
        }

        showToast('工具书已保存', 'success');
        if (modal) {
            modal.remove();
        }
        await loadToolBooksFromServer();
    } catch (error) {
        console.error('保存工具书失败:', error);
        showToast('保存工具书失败，请稍后重试', 'error');
    }
}

window.deleteToolBook = async function(keyword) {
    if (!keyword) {
        return;
    }
    if (!confirm('确定要删除该工具书吗？此操作不可撤销。')) {
        return;
    }

    try {
        const response = await fetch(`/api/toolbook/delete/${encodeURIComponent(keyword)}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (!response.ok) {
            showToast(result.error || '删除工具书失败', 'error');
            return;
        }
        showToast('工具书已删除', 'success');
        await loadToolBooksFromServer();
    } catch (error) {
        console.error('删除工具书失败:', error);
        showToast('删除工具书失败，请稍后重试', 'error');
    }
};

window.toggleToolBookActive = async function(keyword, isActive) {
    const safeKeyword = normalizeToolBookKeyword(keyword);
    if (!safeKeyword) {
        showToast('无效的工具书关键词', 'warning');
        return;
    }

    const activeSet = new Set((activeToolBooks || []).map(normalizeToolBookKeyword));
    if (isActive) {
        activeSet.add(safeKeyword);
    } else {
        activeSet.delete(safeKeyword);
    }

    const newActiveList = Array.from(activeSet.values());

    try {
        const response = await fetch('/api/toolbook/save-active', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ activeToolBooks: newActiveList })
        });
        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.error || '服务器返回异常');
        }
        activeToolBooks = newActiveList;
        syncToolBookGlobals();
        updateToolBooksDisplay();
    } catch (error) {
        console.error('更新工具书激活状态失败:', error);
        showToast('更新工具书激活状态失败，请稍后重试', 'error');
        await loadToolBooksFromServer();
    }
};

window.openToolBookResources = function(keyword) {
    const toolBook = getToolBookByKeyword(keyword);
    if (!toolBook) {
        showToast('未找到指定的工具书', 'error');
        return;
    }

    currentToolBookKeyword = toolBook.keyword;
    const modal = createModal(`资源管理 - ${toolBook.displayName || toolBook.keyword}`, '');
    const container = document.createElement('div');
    container.className = 'world-form';
    container.dataset.keyword = toolBook.keyword;

    container.innerHTML = `
        <div class="form-group">
            <button class="world-btn" type="button" onclick="uploadToolBookResource('${toolBook.keyword}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"></path>
                </svg>
                上传附件
            </button>
        </div>
        <div class="toolbook-resource-list"></div>
        <p class="form-hint">在正文中使用形如 [[文件名.ext]] 的占位符引用附件。</p>
    `;

    modal.querySelector('.modal-body').appendChild(container);
    renderToolBookResourceList(container, toolBook);
};

function renderToolBookResourceList(container, toolBook) {
    const listWrapper = container.querySelector('.toolbook-resource-list');
    const escape = typeof escapeHtml === 'function' ? escapeHtml : (value => value);
    const resources = Array.isArray(toolBook.resources) ? toolBook.resources : [];

    if (!resources.length) {
        listWrapper.innerHTML = '<p class="no-entries">暂无附件</p>';
        return;
    }

    listWrapper.innerHTML = `
        <ul class="resource-list">
            ${resources.map(item => `
                <li>
                    <span class="resource-name">${escape(item.name)}</span>
                    <span class="resource-meta">${(item.size / 1024).toFixed(1)} KB</span>
                    <button type="button" onclick="deleteToolBookResourceItem('${toolBook.keyword}', '${item.name}', this)" class="link-btn">删除</button>
                    <code class="resource-placeholder">[[${escape(item.name)}]]</code>
                </li>
            `).join('')}
        </ul>
    `;
}

window.uploadToolBookResource = function(keyword) {
    const resourceInput = document.createElement('input');
    resourceInput.type = 'file';
    resourceInput.onchange = async event => {
        const file = event.target.files && event.target.files[0];
        if (!file) {
            return;
        }
        await handleToolBookResourceUpload(keyword, file);
    };
    resourceInput.click();
};

async function handleToolBookResourceUpload(keyword, file) {
    try {
        const formData = new FormData();
        formData.append('keyword', keyword);
        formData.append('file', file);
        const response = await fetch('/api/toolbook/upload-resource', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (!response.ok) {
            showToast(result.error || '上传资源失败', 'error');
            return;
        }
        showToast('资源上传成功', 'success');
        await loadToolBooksFromServer();

        const toolBook = getToolBookByKeyword(keyword);
        const modalBody = document.querySelector('.modal .toolbook-resource-list');
        if (toolBook && modalBody) {
            const container = modalBody.closest('.world-form');
            renderToolBookResourceList(container, toolBook);
        }
    } catch (error) {
        console.error('上传资源失败:', error);
        showToast('上传资源失败，请稍后重试', 'error');
    }
}

window.deleteToolBookResourceItem = async function(keyword, filename, triggerButton) {
    if (!confirm(`确认删除附件 ${filename} 吗？`)) {
        return;
    }
    try {
        const response = await fetch('/api/toolbook/delete-resource', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ keyword, filename })
        });
        const result = await response.json();
        if (!response.ok) {
            showToast(result.error || '删除附件失败', 'error');
            return;
        }
        showToast('附件已删除', 'success');
        await loadToolBooksFromServer();

        const toolBook = getToolBookByKeyword(keyword);
        const container = triggerButton ? triggerButton.closest('.world-form') : null;
        if (toolBook && container) {
            renderToolBookResourceList(container, toolBook);
        }
    } catch (error) {
        console.error('删除附件失败:', error);
        showToast('删除附件失败，请稍后重试', 'error');
    }
};

function setupToolBookImportInput() {
    const input = document.getElementById('toolBookImportFile');
    if (!input) {
        return;
    }
    input.value = '';
    input.onchange = handleToolBookImportFileChange;
}

window.triggerToolBookImport = function() {
    const input = document.getElementById('toolBookImportFile');
    if (!input) {
        showToast('导入组件未初始化', 'error');
        return;
    }
    setupToolBookImportInput();
    input.click();
};

async function handleToolBookImportFileChange(event) {
    const input = event.target;
    const file = input.files && input.files[0];
    if (!file) {
        return;
    }

    const defaultKeyword = (file.name || '').replace(/\.[^.]+$/, '');

    // 进度UI更新函数
    function updateProgressUI(container, progressData) {
        const statusDiv = container.querySelector('.progress-status');
        const progressBar = container.querySelector('.progress-bar');
        const detailDiv = container.querySelector('.progress-detail');

        if (!statusDiv || !progressBar || !detailDiv) return;

        if (progressData.status === 'processing') {
            const percent = progressData.total > 0 ? (progressData.current / progressData.total * 100).toFixed(0) : 0;
            progressBar.style.width = `${percent}%`;
            statusDiv.textContent = `正在识别图片 ${progressData.current}/${progressData.total}`;
            detailDiv.textContent = `当前: ${progressData.image_name || '...'} - ${progressData.message || '识别中'}`;
        } else if (progressData.status === 'extracting') {
            statusDiv.textContent = '正在提取文档';
            detailDiv.textContent = progressData.message || '提取中...';
            progressBar.style.width = '10%';
        } else if (progressData.status === 'starting') {
            statusDiv.textContent = '开始导入';
            detailDiv.textContent = progressData.message || '准备中...';
            progressBar.style.width = '5%';
        }
    }

    // 创建导入配置对话框
    const modal = createModal('导入工具书配置', '');
    const form = document.createElement('div');
    form.className = 'world-form';

    const escape = typeof escapeHtml === 'function' ? escapeHtml : (value => value);

    form.innerHTML = `
        <div class="form-group">
            <label>关键词 *</label>
            <input type="text" id="import-keyword" value="${escape(defaultKeyword)}" placeholder="用于匹配消息内容">
        </div>
        <div class="form-group">
            <label>描述</label>
            <textarea id="import-description" rows="2" placeholder="工具书用途说明"></textarea>
        </div>
        <div class="form-group">
            <label class="checkbox-inline">
                <input type="checkbox" id="import-activate">
                导入后立即激活
            </label>
        </div>

        <div class="form-group" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #444;">
            <label class="checkbox-inline">
                <input type="checkbox" id="import-enable-vision">
                启用图片识别
            </label>
        </div>

        <div id="vision-settings" style="display: none; margin-left: 20px; padding: 10px; border-radius: 4px;">
            <div class="setting-hint" style="margin-bottom: 10px; color: #888;">
                将使用AI模型来识别DOCX中的图片，并在文末添加图片说明
            </div>
            <div class="form-group">
                <label class="checkbox-inline">
                    <input type="checkbox" id="import-use-system-api" checked>
                    沿用系统对话API配置（使用对话模型和密钥）
                </label>
            </div>
            <div class="form-group">
                <label class="checkbox-inline">
                    <input type="checkbox" id="import-use-custom-vision">
                    使用独立的识图API配置
                </label>
            </div>
            <div id="custom-vision-config" style="display: none; margin-top: 10px;">
                <div class="form-group">
                    <label style="font-size: 12px;">API地址</label>
                    <input type="text" id="import-vision-api-base" value="${config.vision_api_base || 'https://api.yuegle.com'}" placeholder="https://api.yuegle.com">
                </div>
                <div class="form-group">
                    <label style="font-size: 12px;">API路径</label>
                    <input type="text" id="import-vision-api-path" value="${config.vision_api_path || '/v1/chat/completions'}" placeholder="/v1/chat/completions">
                </div>
                <div class="form-group">
                    <label style="font-size: 12px;">API密钥</label>
                    <input type="password" id="import-vision-api-key" value="${config.vision_api_key || config.api_key || ''}" placeholder="sk-...">
                </div>
                <div class="form-group">
                    <label style="font-size: 12px;">模型</label>
                    <input type="text" id="import-vision-model" value="${config.vision_model || 'claude-sonnet-4-5-20250929'}" placeholder="claude-sonnet-4-5-20250929">
                </div>
                <div class="form-group">
                    <label style="font-size: 12px;">提示词</label>
                    <textarea id="import-vision-prompt" rows="2" placeholder="请简要描述这张图片的主要内容和显著细节">${config.vision_prompt || '请简要描述这张图片的主要内容和显著细节，并用中文回答，尽量一句话说完。'}</textarea>
                </div>
            </div>
        </div>

        <div class="form-buttons">
            <button type="button" class="toolbook-save-btn">开始导入</button>
            <button type="button" onclick="this.closest('.modal').remove()">取消</button>
        </div>
    `;

    modal.querySelector('.modal-body').appendChild(form);
    document.body.appendChild(modal);

    // 绑定识图复选框事件
    const enableVisionCheckbox = form.querySelector('#import-enable-vision');
    const visionSettings = form.querySelector('#vision-settings');
    const useSystemCheckbox = form.querySelector('#import-use-system-api');
    const useCustomCheckbox = form.querySelector('#import-use-custom-vision');
    const customConfig = form.querySelector('#custom-vision-config');

    enableVisionCheckbox.onchange = function() {
        visionSettings.style.display = this.checked ? 'block' : 'none';
    };

    useSystemCheckbox.onchange = function() {
        if (this.checked) {
            useCustomCheckbox.checked = false;
            customConfig.style.display = 'none';
        }
    };

    useCustomCheckbox.onchange = function() {
        if (this.checked) {
            useSystemCheckbox.checked = false;
        }
        customConfig.style.display = this.checked ? 'block' : 'none';
    };

    // 绑定导入按钮
    form.querySelector('.toolbook-save-btn').onclick = async () => {
        const keyword = form.querySelector('#import-keyword').value.trim();
        if (!keyword) {
            showToast('请输入关键词', 'warning');
            return;
        }

        const description = form.querySelector('#import-description').value.trim();
        const activate = form.querySelector('#import-activate').checked;
        const enableVision = form.querySelector('#import-enable-vision').checked;
        const useSystemApi = form.querySelector('#import-use-system-api').checked;
        const useCustomVision = form.querySelector('#import-use-custom-vision').checked;

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('keyword', keyword);
            if (description) {
                formData.append('description', description);
            }
            if (activate) {
                formData.append('activate', 'true');
            }

            // 添加识图配置
            if (enableVision) {
                formData.append('enableVision', 'true');

                if (useSystemApi) {
                    // 沿用系统对话API配置
                    formData.append('visionApiBase', config.api_url || '');
                    formData.append('visionApiPath', '/chat/completions');
                    formData.append('visionApiKey', config.api_key || '');
                    formData.append('visionModel', config.model || '');
                    formData.append('visionPrompt', '请简要描述这张图片的主要内容和显著细节，并用中文回答，尽量一句话说完。');
                } else if (useCustomVision) {
                    formData.append('visionApiBase', form.querySelector('#import-vision-api-base').value.trim());
                    formData.append('visionApiPath', form.querySelector('#import-vision-api-path').value.trim());
                    formData.append('visionApiKey', form.querySelector('#import-vision-api-key').value.trim());
                    formData.append('visionModel', form.querySelector('#import-vision-model').value.trim());
                    formData.append('visionPrompt', form.querySelector('#import-vision-prompt').value.trim());
                } else {
                    // 使用AI设置中的识图配置
                    formData.append('visionApiBase', config.vision_api_base || 'https://api.yuegle.com');
                    formData.append('visionApiPath', config.vision_api_path || '/v1/chat/completions');
                    formData.append('visionApiKey', config.vision_api_key || config.api_key || '');
                    formData.append('visionModel', config.vision_model || 'claude-sonnet-4-5-20250929');
                    formData.append('visionPrompt', config.vision_prompt || '请简要描述这张图片的主要内容和显著细节，并用中文回答，尽量一句话说完。');
                }
            }

            modal.remove();

            // 创建进度提示框
            const progressModal = createModal('导入进度', '');
            progressModal.classList.add('progress-modal');
            const progressContainer = document.createElement('div');
            progressContainer.className = 'import-progress-container';
            progressContainer.innerHTML = `
                <div class="progress-status">正在导入工具书...</div>
                <div class="progress-bar-wrapper">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
                <div class="progress-detail">准备中...</div>
            `;
            progressModal.querySelector('.modal-body').appendChild(progressContainer);
            document.body.appendChild(progressModal);

            // 立即开始请求
            const fetchPromise = fetch('/api/toolbook/import', {
                method: 'POST',
                body: formData
            });

            // 如果启用识图，立即开始轮询进度
            let pollInterval = null;
            let importId = null;

            if (enableVision) {
                // 延迟200ms后开始轮询（等待后端创建import_id）
                setTimeout(() => {
                    pollInterval = setInterval(async () => {
                        try {
                            // 尝试从所有可能的import任务中找到最新的
                            const progressResponse = await fetch(`/api/toolbook/import-progress/latest`);
                            if (progressResponse.ok) {
                                const progressData = await progressResponse.json();
                                updateProgressUI(progressContainer, progressData);
                            }
                        } catch (error) {
                            console.error('获取进度失败:', error);
                        }
                    }, 500);
                }, 200);
            }

            // 等待导入完成
            const response = await fetchPromise;
            const result = await response.json();

            if (pollInterval) {
                clearInterval(pollInterval);
            }

            importId = result.import_id;

            // 最后检查一次状态，确保显示完成或错误
            if (importId && enableVision) {
                try {
                    const finalResponse = await fetch(`/api/toolbook/import-progress/${importId}`);
                    const finalData = await finalResponse.json();
                    updateProgressUI(progressContainer, finalData);
                } catch (e) {
                    console.error('获取最终状态失败:', e);
                }
            }

            // 延迟一下再关闭进度框
            setTimeout(() => {
                progressModal.remove();
                if (!response.ok) {
                    showToast(result.error || '导入工具书失败', 'error');
                } else {
                    showToast('工具书导入成功', 'success');
                    loadToolBooksFromServer();
                }
            }, enableVision ? 1500 : 500);

        } catch (error) {
            console.error('导入工具书失败:', error);
            showToast('导入工具书失败，请稍后重试', 'error');
        } finally {
            input.value = '';
        }
    };
}

window.initToolBookSystem = async function() {
    await loadToolBooksFromServer(false);
};

// 更新全局图片推送开关UI
function updateGlobalImagePushToggle() {
    const toggle = document.getElementById('globalImagePushToggle');
    if (toggle) {
        toggle.checked = globalImagePushEnabled;
    }
}

// 切换全局图片推送开关
window.toggleGlobalImagePush = async function(enabled) {
    globalImagePushEnabled = enabled;
    syncToolBookGlobals();

    try {
        const response = await fetch('/api/toolbook/save-active', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                activeToolBooks: activeToolBooks || [],
                globalImagePushEnabled: enabled
            })
        });

        if (response.ok) {
            console.log('[工具书] 全局图片推送开关已', enabled ? '启用' : '禁用');
            showToast(enabled ? '已启用工具书图片推送功能' : '已禁用工具书图片推送功能', 'success');
        } else {
            throw new Error('保存失败');
        }
    } catch (error) {
        console.error('保存全局图片推送开关失败:', error);
        showToast('保存设置失败，请稍后重试', 'error');
        // 恢复状态
        globalImagePushEnabled = !enabled;
        updateGlobalImagePushToggle();
    }
};

function toolBookTriggeredEntries(messages) {
    const triggered = [];
    if (!Array.isArray(messages) || !Array.isArray(toolBooks) || toolBooks.length === 0) {
        return triggered;
    }
    const activeSet = new Set((activeToolBooks || []).map(normalizeToolBookKeyword));
    if (!activeSet.size) {
        return triggered;
    }

    toolBooks.forEach(book => {
        const keyword = normalizeToolBookKeyword(book.keyword);
        if (!keyword || !activeSet.has(keyword) || !book.content) {
            return;
        }

        // 使用工具书自己的扫描深度，如果没有则使用全局配置
        const scanDepth = book.scan_depth || (window.config && window.config.toolbook_scan_depth) || 4;
        const recentMessages = messages.slice(-scanDepth).map(msg => (msg && msg.content) ? String(msg.content) : '');
        const textToScan = recentMessages.join(' ');

        // 调试日志
        console.log(`[工具书深度检查] 关键词: ${book.keyword}`);
        console.log(`[工具书深度检查] 扫描深度: ${scanDepth}`);
        console.log(`[工具书深度检查] 总消息数: ${messages.length}`);
        console.log(`[工具书深度检查] 扫描的消息索引: ${Math.max(0, messages.length - scanDepth)} 到 ${messages.length - 1}`);
        console.log(`[工具书深度检查] 扫描的消息内容:`, recentMessages);
        console.log(`[工具书深度检查] 拼接后的文本:`, textToScan);

        const matchKeywords = [book.keyword]; // 使用原始keyword（包含中文）
        const additionalName = (book.displayName || '').trim();
        if (additionalName && additionalName !== book.keyword) {
            matchKeywords.push(additionalName);
        }
        // 不区分大小写的匹配
        const textToScanLower = textToScan.toLowerCase();
        const hasMatch = matchKeywords.some(k => k && textToScanLower.includes(k.toLowerCase()));
        if (!hasMatch) {
            return;
        }

        // 检查概率触发
        if (book.use_probability !== false && book.probability !== undefined && book.probability < 100) {
            const roll = Math.random() * 100;
            if (roll > book.probability) {
                console.log(`[工具书] ${book.keyword} 概率检查未通过 (${roll.toFixed(1)}% > ${book.probability}%)`);
                return; // 概率检查未通过
            }
            console.log(`[工具书] ${book.keyword} 概率检查通过 (${roll.toFixed(1)}% <= ${book.probability}%)`);
        }

        triggered.push({
            keyword: book.keyword,
            displayName: book.displayName || book.keyword,
            position: book.position === 'after' ? 'after' : 'before',
            order: typeof book.order === 'number' ? book.order : _parse_int_fallback(book.order, 100),
            content: book.content,
            enableImagePush: book.enableImagePush || false,
            resources: book.resources || []
        });
    });

    triggered.sort((a, b) => a.order - b.order);
    return triggered;
}

function _parse_int_fallback(value, defaultValue) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : defaultValue;
}

window.checkToolBookTriggers = function(messages) {
    return toolBookTriggeredEntries(messages || []);
};

window.injectToolBookContent = function(messages) {
    const triggered = toolBookTriggeredEntries(messages || []);
    if (!triggered.length) {
        return messages;
    }

    const beforeSegments = [];
    const afterSegments = [];
    triggered.forEach(entry => {
        const header = entry.displayName ? `【工具书：${entry.displayName}】` : '【工具书】';
        const segment = `${header}\n${entry.content || ''}`.trim();
        if ((entry.position || 'before') === 'after') {
            afterSegments.push(segment);
        } else {
            beforeSegments.push(segment);
        }
    });

    const outputMessages = Array.isArray(messages) ? [...messages] : [];
    if (beforeSegments.length) {
        outputMessages.unshift({
            role: 'system',
            content: `[ToolBook]\n${beforeSegments.join('\n\n')}`
        });
    }
    if (afterSegments.length) {
        outputMessages.push({
            role: 'system',
            content: `[ToolBook]\n${afterSegments.join('\n\n')}`
        });
    }
    return outputMessages;
};

// 初始化工具书系统
initToolBookSystem();
