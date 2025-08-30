/**
 * 文档上传组件 - 支持拖拽和点击上传
 * 集成Unstructured解析器，支持多种文档格式
 */

class DocumentUploader {
    constructor() {
        this.parsedDocument = null;
        this.supportedFormats = [];
        this.maxSizeMB = 20;
        this.isUploading = false;
        
        // 初始化
        this.init();
    }
    
    async init() {
        // 获取支持的格式
        await this.fetchSupportedFormats();
        
        // 设置拖拽区域
        this.setupDragAndDrop();
        
        // 添加上传按钮功能
        this.setupUploadButton();
    }
    
    async fetchSupportedFormats() {
        try {
            const response = await fetch('/api/document/supported');
            const data = await response.json();
            this.supportedFormats = data.formats;
            this.maxSizeMB = data.max_size_mb;
        } catch (error) {
            console.error('获取支持格式失败:', error);
            // 使用默认值
            this.supportedFormats = {
                documents: ['.pdf', '.doc', '.docx'],
                text: ['.txt', '.md'],
                data: ['.csv', '.json']
            };
        }
    }
    
    setupDragAndDrop() {
        const chatArea = document.querySelector('.chat-messages');
        if (!chatArea) return;
        
        // 防止默认拖拽行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            chatArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        // 拖入时高亮
        ['dragenter', 'dragover'].forEach(eventName => {
            chatArea.addEventListener(eventName, () => {
                chatArea.classList.add('drag-over');
                this.showDropZone();
            });
        });
        
        // 拖出时取消高亮
        ['dragleave', 'drop'].forEach(eventName => {
            chatArea.addEventListener(eventName, () => {
                chatArea.classList.remove('drag-over');
                this.hideDropZone();
            });
        });
        
        // 处理文件放置
        chatArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });
    }
    
    setupUploadButton() {
        // 使用现有的文档上传按钮（原加号按钮已改造）
        const uploadBtn = document.getElementById('doc-upload-btn');
        
        // 绑定事件
        const fileInput = document.getElementById('doc-file-input');
        const uploadButton = document.getElementById('doc-upload-btn');
        
        if (uploadButton) {
            uploadButton.addEventListener('click', () => {
                if (!this.isUploading) {
                    fileInput?.click();
                }
            });
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFile(e.target.files[0]);
                    e.target.value = ''; // 清空选择，允许重复上传同一文件
                }
            });
        }
    }
    
    getAcceptString() {
        // 生成accept属性字符串
        const allFormats = [];
        Object.values(this.supportedFormats).forEach(formats => {
            allFormats.push(...formats);
        });
        return allFormats.join(',');
    }
    
    showDropZone() {
        // 显示拖放提示区域
        let dropZone = document.getElementById('doc-drop-zone');
        if (!dropZone) {
            dropZone = document.createElement('div');
            dropZone.id = 'doc-drop-zone';
            dropZone.className = 'document-drop-zone';
            dropZone.innerHTML = `
                <div class="drop-zone-content">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" opacity="0.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <p>拖放文档到这里</p>
                    <small>支持 PDF, Word, Excel, PPT, TXT 等格式</small>
                </div>
            `;
            document.body.appendChild(dropZone);
        }
        dropZone.style.display = 'flex';
    }
    
    hideDropZone() {
        const dropZone = document.getElementById('doc-drop-zone');
        if (dropZone) {
            dropZone.style.display = 'none';
        }
    }
    
    async handleFile(file) {
        // 验证文件
        if (!this.validateFile(file)) {
            return;
        }
        
        // 显示上传状态
        this.showUploadStatus(file);
        this.isUploading = true;
        
        // 创建FormData
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            // 上传并解析（添加超时控制）
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
            
            const response = await fetch('/api/document/parse', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const data = await response.json();
            
            if (data.success) {
                this.parsedDocument = data;
                this.showParseSuccess(data);
            } else {
                throw new Error(data.error || '解析失败');
            }
            
        } catch (error) {
            console.error('文档处理失败:', error);
            
            // 更友好的错误信息
            let errorMsg = '文档上传失败';
            if (error.name === 'AbortError') {
                errorMsg = '上传超时，请检查网络或减小文件大小';
            } else if (error.message.includes('Failed to fetch')) {
                errorMsg = '无法连接到服务器，请确保服务器正在运行';
            } else {
                errorMsg = error.message || '未知错误';
            }
            
            this.showError(errorMsg);
        } finally {
            this.isUploading = false;
            this.hideUploadStatus();
        }
    }
    
    validateFile(file) {
        // 检查文件大小
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > this.maxSizeMB) {
            this.showError(`文件太大！最大支持 ${this.maxSizeMB}MB，当前文件 ${sizeMB.toFixed(1)}MB`);
            return false;
        }
        
        // 检查文件格式
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        const allFormats = [];
        Object.values(this.supportedFormats).forEach(formats => {
            allFormats.push(...formats);
        });
        
        if (!allFormats.includes(ext)) {
            this.showError(`不支持的文件格式: ${ext}`);
            return false;
        }
        
        return true;
    }
    
    showUploadStatus(file) {
        // 显示上传进度
        const statusDiv = document.createElement('div');
        statusDiv.id = 'doc-upload-status';
        statusDiv.className = 'document-upload-status';
        statusDiv.innerHTML = `
            <div class="upload-status-content">
                <div class="spinner"></div>
                <span>正在解析: ${file.name}</span>
                <small>${(file.size / 1024).toFixed(1)}KB</small>
            </div>
        `;
        
        const inputWrapper = document.querySelector('.chat-input-wrapper');
        if (inputWrapper) {
            inputWrapper.insertBefore(statusDiv, inputWrapper.firstChild);
        }
    }
    
    hideUploadStatus() {
        const statusDiv = document.getElementById('doc-upload-status');
        if (statusDiv) {
            statusDiv.remove();
        }
    }
    
    showParseSuccess(data) {
        // 创建文档预览卡片
        const previewCard = document.createElement('div');
        previewCard.id = 'doc-preview-card';
        previewCard.className = 'document-preview-card';
        
        // 获取文档摘要
        const summary = data.text.substring(0, 200) + '...';
        
        previewCard.innerHTML = `
            <div class="doc-card-header">
                <div class="doc-info">
                    <span class="doc-icon">📄</span>
                    <span class="doc-name">${data.filename}</span>
                    <span class="doc-size">${(data.size / 1024).toFixed(1)}KB</span>
                </div>
                <button class="doc-remove" onclick="documentUploader.removeDocument()">✕</button>
            </div>
            <div class="doc-card-body">
                <div class="doc-preview-text">${this.escapeHtml(summary)}</div>
                <div class="doc-stats">
                    <span>📝 ${data.elements_count || 0} 元素</span>
                    ${data.tables_count > 0 ? `<span>📊 ${data.tables_count} 表格</span>` : ''}
                    <span>🔧 ${data.parser_used || 'unknown'}</span>
                </div>
            </div>
            <div class="doc-card-actions">
                <button class="doc-action-btn primary" onclick="documentUploader.attachToMessage()">
                    附加到消息
                </button>
                <button class="doc-action-btn" onclick="documentUploader.viewFullDocument()">
                    查看全文
                </button>
            </div>
        `;
        
        // 插入到输入框上方
        const inputWrapper = document.querySelector('.chat-input-wrapper');
        if (inputWrapper) {
            const existingCard = document.getElementById('doc-preview-card');
            if (existingCard) {
                existingCard.remove();
            }
            inputWrapper.insertBefore(previewCard, inputWrapper.firstChild);
        }
        
        // 显示成功提示
        showToast('文档解析成功！', 'success');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    attachToMessage() {
        if (!this.parsedDocument) return;
        
        const chatInput = document.querySelector('.chat-input');
        if (chatInput) {
            // 构建附加内容
            const prefix = `【文档内容 - ${this.parsedDocument.filename}】\n${this.parsedDocument.text}\n\n【用户问题】\n`;
            
            // 插入到输入框
            chatInput.value = prefix + chatInput.value;
            
            // 自动调整输入框高度
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 300) + 'px';
            
            // 移除预览卡片
            this.removeDocument();
            
            // 聚焦到输入框
            chatInput.focus();
            
            showToast('文档已附加到消息', 'info');
        }
    }
    
    viewFullDocument() {
        if (!this.parsedDocument) return;
        
        // 创建模态框显示全文
        const modal = document.createElement('div');
        modal.className = 'document-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📄 ${this.parsedDocument.filename}</h3>
                    <button class="modal-close" onclick="this.closest('.document-modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <pre>${this.escapeHtml(this.parsedDocument.text)}</pre>
                </div>
                <div class="modal-footer">
                    <button class="doc-action-btn primary" onclick="documentUploader.copyToClipboard()">
                        复制全文
                    </button>
                    <button class="doc-action-btn" onclick="this.closest('.document-modal').remove()">
                        关闭
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    copyToClipboard() {
        if (!this.parsedDocument) return;
        
        navigator.clipboard.writeText(this.parsedDocument.text).then(() => {
            showToast('已复制到剪贴板', 'success');
        }).catch(err => {
            showToast('复制失败', 'error');
        });
    }
    
    removeDocument() {
        // 清除已解析的文档
        this.parsedDocument = null;
        
        // 移除预览卡片
        const previewCard = document.getElementById('doc-preview-card');
        if (previewCard) {
            previewCard.remove();
        }
    }
    
    showError(message) {
        showToast(message, 'error');
    }
}

// 初始化文档上传器
let documentUploader = null;

// 页面加载完成后初始化
function initDocumentUploader() {
    documentUploader = new DocumentUploader();
    window.documentUploader = documentUploader;  // 导出到全局
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDocumentUploader);
} else {
    initDocumentUploader();
}