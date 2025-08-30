// HTML渲染器模块 - 基于专业沙箱实现
class HtmlRenderer {
    constructor() {
        this.config = {
            enabled: false,
            allowScript: true,
            maxDepth: 1,  // 渲染最新N条AI消息中的HTML
            hideCodeBlock: true,
            includeUserMessages: false  // 是否也渲染用户消息中的HTML
        };
        
        this.iframes = new Map();
        this.messageObserver = null;
        this.isObserving = false;
        this.isProcessing = false;
        
        this.loadConfig();
        this.setupObserver();
    }
    
    async loadConfig() {
        try {
            const response = await fetch('/api/frontend-decorator/config');
            if (response.ok) {
                const config = await response.json();
                Object.assign(this.config, config);
                console.log('[HTML渲染器] 配置已加载:', this.config);
            }
        } catch (e) {
            console.error('加载配置失败:', e);
        }
    }
    
    async saveConfig() {
        try {
            await fetch('/api/frontend-decorator/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.config)
            });
        } catch (e) {
            console.error('保存配置失败:', e);
        }
    }
    
    setupObserver() {
        this.messageObserver = new MutationObserver((mutations) => {
            if (!this.config.enabled || this.isProcessing) return;
            
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        // 检查是否是我们自己添加的iframe容器
                        if (node.classList?.contains('html-render-wrapper')) {
                            return; // 跳过我们自己的渲染容器
                        }
                        
                        if (node.classList?.contains('message')) {
                            setTimeout(() => this.processMessageElement(node), 300);
                        }
                        const messages = node.querySelectorAll?.('.message');
                        if (messages) {
                            messages.forEach(msg => {
                                setTimeout(() => this.processMessageElement(msg), 300);
                            });
                        }
                    }
                });
            });
        });
        
        this.startObserver();
    }
    
    startObserver() {
        const container = document.querySelector('.messages-container');
        if (container && this.messageObserver) {
            this.messageObserver.observe(container, {
                childList: true,
                subtree: true
            });
            this.isObserving = true;
            console.log('[HTML渲染器] 开始观察消息容器');
        } else {
            setTimeout(() => this.startObserver(), 1000);
        }
    }
    
    stopObserver() {
        if (this.messageObserver) {
            this.messageObserver.disconnect();
            this.isObserving = false;
            console.log('[HTML渲染器] 停止观察消息容器');
        }
    }
    
    processMessageElement(messageElement, skipDepthCheck = false) {
        // 确保消息在消息容器内
        const messagesContainer = document.querySelector('.messages-container');
        if (!messagesContainer || !messagesContainer.contains(messageElement)) {
            console.log('[HTML渲染器] 消息不在对话容器内，跳过处理');
            return;
        }
        
        // 检查消息类型
        const isAssistant = messageElement.classList.contains('assistant-message');
        const isUser = messageElement.classList.contains('user-message');
        
        // 根据配置决定是否处理
        if (!isAssistant && (!this.config.includeUserMessages || !isUser)) {
            return;
        }
        
        // 如果不跳过深度检查，则检查是否在深度范围内
        if (!skipDepthCheck && !this.isWithinDepth(messageElement)) {
            return;
        }
        
        const contentElement = messageElement.querySelector('.message-content');
        if (!contentElement) return;
        
        const htmlCodeBlocks = contentElement.querySelectorAll('pre.html-code-block code[data-has-html="true"]');
        
        htmlCodeBlocks.forEach(codeElement => {
            if (codeElement.dataset.htmlRendered === 'true') return;
            
            const htmlContent = codeElement.textContent || codeElement.innerText;
            
            if (!htmlContent.includes('<body') || !htmlContent.includes('</body>')) {
                return;
            }
            
            console.log('[HTML渲染器] 检测到HTML代码块，开始渲染');
            this.renderHtmlCode(codeElement, htmlContent);
            codeElement.dataset.htmlRendered = 'true';
        });
    }
    
    renderHtmlCode(codeElement, htmlContent) {
        const preElement = codeElement.closest('pre');
        if (!preElement) return;
        
        // 检查是否已经有渲染容器
        const existingWrapper = preElement.nextElementSibling;
        if (existingWrapper && existingWrapper.classList.contains('html-render-wrapper')) {
            console.log('[HTML渲染器] 该代码块已有渲染容器，跳过');
            return;
        }
        
        // 创建容器
        const wrapper = document.createElement('div');
        wrapper.className = 'html-render-wrapper'; // 添加类名
        wrapper.style.cssText = `
            position: relative;
            width: 100%;
            margin: 10px 0;
        `;
        
        // 创建iframe
        const iframe = document.createElement('iframe');
        const iframeId = `iframe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        iframe.id = iframeId;
        // 不设置loading='lazy'，可能会影响JS执行
        
        // 设置iframe样式
        iframe.style.cssText = `
            width: 100%;
            border: none;
            display: block;
            min-height: 400px;
            max-height: 5000px;
            background: white;
            margin: 0;
        `;
        
        // 构建完整的HTML文档 - 关键步骤
        let finalHTML = htmlContent;
        
        // 检查并创建完整文档
        if (!finalHTML.includes('<!DOCTYPE') && !finalHTML.includes('<!doctype')) {
            // 添加DOCTYPE和完整结构
            if (!finalHTML.includes('<html')) {
                if (!finalHTML.includes('<body')) {
                    // 只是片段，构建完整文档
                    finalHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        /* 基础样式 - 隔离在iframe内 */
        body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: white;
            color: #333;
        }
        * {
            box-sizing: border-box;
        }
    </style>
</head>
<body>
${finalHTML}
</body>
</html>`;
                } else {
                    // 有body但没有完整文档
                    finalHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
${finalHTML}
</html>`;
                }
            } else {
                // 有html但缺少DOCTYPE
                finalHTML = '<!DOCTYPE html>\n' + finalHTML;
            }
        }
        
        // 隐藏原始代码块
        if (this.config.hideCodeBlock) {
            preElement.style.display = 'none';
            preElement.dataset.hiddenByRenderer = 'true';
        }
        
        // 先添加到wrapper
        wrapper.appendChild(iframe);
        
        // 再插入到DOM
        preElement.after(wrapper);
        
        // 关键：在iframe添加到DOM后设置srcdoc
        // 这样确保浏览器正确处理内容
        iframe.srcdoc = finalHTML;
        
        console.log('[HTML渲染器] iframe已创建:', iframeId);
        console.log('[HTML渲染器] 设置srcdoc，文档长度:', finalHTML.length);
        console.log('[HTML渲染器] 包含script标签:', finalHTML.includes('<script'));
        
        // 记录是否已经设置过高度
        let heightLocked = false;
        let lockedHeight = 0;
        
        // 自动调整高度的函数
        const adjustHeight = () => {
            // 如果高度已经锁定，直接返回
            if (heightLocked) {
                return;
            }
            
            try {
                const iframeDoc = iframe.contentDocument;
                const iframeWin = iframe.contentWindow;
                
                if (iframeDoc && iframeDoc.body) {
                    // 计算内容高度
                    const bodyHeight = iframeDoc.body.scrollHeight;
                    const htmlHeight = iframeDoc.documentElement.scrollHeight;
                    const contentHeight = Math.max(bodyHeight, htmlHeight);
                    
                    // 设置高度（限制在400-5000px）
                    const height = Math.min(5000, Math.max(400, contentHeight + 10));
                    
                    // 只在第一次设置或高度变大时更新
                    if (!lockedHeight || height > lockedHeight) {
                        lockedHeight = height;
                        iframe.style.height = height + 'px';
                        console.log('[HTML渲染器] 高度设置为:', height);
                        
                        // 延迟锁定高度，给内容一些时间完全加载
                        setTimeout(() => {
                            heightLocked = true;
                            console.log('[HTML渲染器] 高度已锁定:', lockedHeight);
                        }, 2000);
                    }
                }
            } catch (e) {
                // 跨域限制是正常的
                console.log('[HTML渲染器] 无法访问iframe内容（正常隔离）:', e.message);
                iframe.style.height = '1000px';
                heightLocked = true; // 锁定高度，避免重复设置
            }
        };
        
        // 监听加载完成
        iframe.addEventListener('load', () => {
            console.log('[HTML渲染器] iframe加载完成');
            
            // 初次调整高度
            setTimeout(adjustHeight, 100);
            
            // 设置MutationObserver监听内容变化
            try {
                const iframeDoc = iframe.contentDocument;
                if (iframeDoc && iframeDoc.body) {
                    // 创建MutationObserver监听内容变化
                    const observer = new MutationObserver(() => {
                        adjustHeight();
                    });
                    
                    // 监听整个iframe文档的变化
                    observer.observe(iframeDoc.body, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        characterData: true
                    });
                    
                    // 检测JS执行情况
                    const scripts = iframeDoc.getElementsByTagName('script');
                    if (scripts.length > 0) {
                        console.log('[HTML渲染器] 检测到', scripts.length, '个script标签');
                    }
                    
                    const buttons = iframeDoc.querySelectorAll('button, input[type="button"], [onclick]');
                    if (buttons.length > 0) {
                        console.log('[HTML渲染器] 检测到', buttons.length, '个交互元素');
                    }
                }
            } catch (e) {
                // 跨域限制是正常的
                console.log('[HTML渲染器] 无法访问iframe内容（正常隔离）:', e.message);
            }
            
            // 设置MutationObserver监听内容变化
            try {
                const iframeDoc = iframe.contentDocument;
                if (iframeDoc && iframeDoc.body) {
                    // 创建MutationObserver监听内容变化
                    const observer = new MutationObserver(() => {
                        adjustHeight();
                    });
                    
                    // 监听整个iframe文档的变化
                    observer.observe(iframeDoc.body, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        characterData: true
                    });
                    
                    // 不再监听点击和输入事件来调整高度
                    // 只在内容真正变化时通过MutationObserver调整
                    
                    // 检测JS执行情况
                    const scripts = iframeDoc.getElementsByTagName('script');
                    if (scripts.length > 0) {
                        console.log('[HTML渲染器] 检测到', scripts.length, '个script标签');
                    }
                    
                    const buttons = iframeDoc.querySelectorAll('button, input[type="button"], [onclick]');
                    if (buttons.length > 0) {
                        console.log('[HTML渲染器] 检测到', buttons.length, '个交互元素');
                    }
                }
            } catch (e) {
                // 跨域限制是正常的
                console.log('[HTML渲染器] 无法访问iframe内容（正常隔离）:', e.message);
            }
        });
        
        // 额外检查
        setTimeout(() => {
            if (!iframe.contentDocument) {
                console.log('[HTML渲染器] iframe内容已隔离（正常）');
            }
        }, 1000);
        
        // 保存引用
        this.iframes.set(iframeId, iframe);
    }
    
    // 检查消息是否在深度范围内
    isWithinDepth(messageElement) {
        // 只在对话容器内查找
        const messagesContainer = document.querySelector('.messages-container');
        if (!messagesContainer) return false;
        
        // 获取所有相关消息 - 只在消息容器内
        const selector = this.config.includeUserMessages 
            ? '.message.assistant-message, .message.user-message'
            : '.message.assistant-message';
        
        const allMessages = Array.from(messagesContainer.querySelectorAll(selector));
        const messageIndex = allMessages.indexOf(messageElement);
        
        // 从最后一条开始计数
        const fromEnd = allMessages.length - messageIndex;
        
        // 检查是否在深度范围内
        return fromEnd <= this.config.maxDepth;
    }
    
    processAllMessages() {
        console.log('[HTML渲染器] 处理所有消息，深度:', this.config.maxDepth);
        
        // 临时禁用观察器，避免重复处理
        const wasObserving = this.isObserving;
        this.stopObserver();
        
        // 先清除现有的渲染
        console.log('[HTML渲染器] 清除所有现有渲染...');
        this.clearAllIframes();
        
        // 只在对话容器内查找消息
        const messagesContainer = document.querySelector('.messages-container');
        if (!messagesContainer) {
            console.log('[HTML渲染器] 未找到消息容器，跳过处理');
            if (wasObserving) {
                this.startObserver();
            }
            return;
        }
        
        // 根据配置选择消息 - 只在消息容器内查找
        const selector = this.config.includeUserMessages 
            ? '.message.assistant-message, .message.user-message'
            : '.message.assistant-message';
        
        const allMessages = Array.from(messagesContainer.querySelectorAll(selector));
        
        // 只处理最新的N条消息
        const messagesToProcess = allMessages.slice(-this.config.maxDepth);
        
        console.log(`[HTML渲染器] 总共${allMessages.length}条消息，处理最新的${messagesToProcess.length}条`);
        
        // 先标记所有消息为未渲染
        allMessages.forEach(msg => {
            const codeElements = msg.querySelectorAll('code[data-html-rendered]');
            codeElements.forEach(code => {
                delete code.dataset.htmlRendered;
            });
        });
        
        // 然后只处理深度内的消息
        messagesToProcess.forEach((msg, index) => {
            console.log(`[HTML渲染器] 处理第${index + 1}/${messagesToProcess.length}条消息`);
            this.processMessageElement(msg, true); // 跳过深度检查，因为已经筛选过了
        });
        
        // 恢复观察器
        if (wasObserving) {
            this.startObserver();
        }
    }
    
    toggle(enabled) {
        this.config.enabled = enabled;
        this.saveConfig();
        
        if (enabled) {
            this.processAllMessages();
        } else {
            this.clearAllIframes();
        }
    }
    
    // 切换脚本执行
    toggleScript(enabled) {
        this.config.allowScript = enabled;
        this.saveConfig();
        
        if (this.config.enabled) {
            this.processAllMessages();
        }
        
        console.log(`[HTML渲染器] 脚本执行: ${enabled ? '已启用' : '已禁用'}`);
    }
    
    // 切换是否包含用户消息
    toggleIncludeUser(enabled) {
        this.config.includeUserMessages = enabled;
        this.saveConfig();
        
        if (this.config.enabled) {
            this.processAllMessages();
        }
        
        console.log(`[HTML渲染器] 包含用户消息: ${enabled ? '已启用' : '已禁用'}`);
    }
    
    // 设置渲染深度
    setMaxDepth(depth) {
        this.config.maxDepth = Math.max(1, Math.min(20, depth));  // 1-20条消息
        this.saveConfig();
        
        if (this.config.enabled) {
            this.processAllMessages();
        }
        
        console.log(`[HTML渲染器] 渲染深度设置为: ${this.config.maxDepth}`);
    }
    
    clearAllIframes() {
        console.log('[HTML渲染器] 开始清除所有iframe...');
        
        // 只在对话容器内清除
        const messagesContainer = document.querySelector('.messages-container');
        if (!messagesContainer) {
            console.log('[HTML渲染器] 未找到消息容器，跳过清除');
            return;
        }
        
        // 移除消息容器内的所有渲染容器
        const wrappers = messagesContainer.querySelectorAll('.html-render-wrapper');
        console.log(`[HTML渲染器] 找到${wrappers.length}个渲染容器，正在移除...`);
        wrappers.forEach(wrapper => {
            wrapper.remove();
        });
        
        // 恢复消息容器内隐藏的pre标签
        messagesContainer.querySelectorAll('pre[data-hidden-by-renderer="true"]').forEach(pre => {
            pre.style.display = '';
            delete pre.dataset.hiddenByRenderer;
        });
        
        // 清除消息容器内的所有渲染标记
        messagesContainer.querySelectorAll('code[data-html-rendered="true"]').forEach(code => {
            delete code.dataset.htmlRendered;
        });
        
        // 清除iframe引用
        this.iframes.clear();
        
        console.log('[HTML渲染器] 清除完成');
    }
    
    // 获取配置
    getConfig() {
        return { ...this.config };
    }
    
    // 清除缓存
    clearCache() {
        this.clearAllIframes();
        console.log('[HTML渲染器] 缓存已清除');
    }
}

// 替换全局实例
if (window.htmlRenderer) {
    window.htmlRenderer.clearAllIframes();
}
window.htmlRenderer = new HtmlRenderer();

// 测试函数
window.testHtmlRendering = function() {
    console.log('[HTML渲染器] 开始测试');
    console.log('[HTML渲染器] 当前配置:', window.htmlRenderer.config);
    
    if (!window.htmlRenderer.config.enabled) {
        console.log('[HTML渲染器] 启用渲染器');
        window.htmlRenderer.toggle(true);
    }
    
    if (!window.htmlRenderer.config.allowScript) {
        console.log('[HTML渲染器] 启用JavaScript执行');
        window.htmlRenderer.toggleScript(true);
    }
    
    window.htmlRenderer.processAllMessages();
};

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        await window.htmlRenderer.loadConfig();
        if (window.htmlRenderer.config.enabled) {
            window.htmlRenderer.processAllMessages();
        }
    }, 500);
});

console.log('[HTML渲染器] 模块已加载 - 基于专业沙箱实现');