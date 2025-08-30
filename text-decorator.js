// 文本修饰器模块 - 简化版（集成正则引擎）
class TextDecorator {
    constructor() {
        // 正则引擎集成
        this.regexEnabled = true;
        // 变量缓存
        this.variables = {
            user: 'User',
            char: 'Assistant',
            model: 'Claude',
            time: '',
            date: '',
            random: ''
        };
        
        // 更新动态变量
        this.updateDynamicVariables();
        
        // 每分钟更新时间
        setInterval(() => this.updateDynamicVariables(), 60000);
    }
    
    // 更新动态变量
    updateDynamicVariables() {
        const now = new Date();
        this.variables.time = now.toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        this.variables.date = now.toLocaleDateString('zh-CN');
        this.variables.random = Math.floor(Math.random() * 100);
    }
    
    // 设置变量值
    setVariable(name, value) {
        if (name in this.variables) {
            this.variables[name] = value;
        }
    }
    
    // 变量替换
    replaceVariables(text) {
        let processed = text;
        
        // 更新动态变量
        this.updateDynamicVariables();
        
        // 替换变量
        Object.entries(this.variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'gi');
            processed = processed.replace(regex, value);
        });
        
        return processed;
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
    
    // 处理引号修饰
    decorateQuotes(text) {
        let processed = text;
        
        // 处理所有类型的引号
        // 1. 英文双引号（HTML转义后）: &quot;
        // 2. 英文单引号（HTML转义后）: &#039;
        // 3. 中文双引号: “ ”
        // 4. 中文单引号: ‘ ’
        
        // 先处理中文双引号（成对出现）
        processed = processed.replace(/“([^”]*)”/g, '<span class="quote-text">“$1”</span>');
        
        // 处理中文单引号（成对出现）
        processed = processed.replace(/‘([^’]*)’/g, '<span class="quote-text">‘$1’</span>');
        
        // 处理英文双引号（HTML转义后）
        let result = '';
        let lastIndex = 0;
        let inQuote = false;
        let quoteStart = 0;
        
        const quotPattern = /&quot;/g;
        let match;
        
        while ((match = quotPattern.exec(processed)) !== null) {
            if (!inQuote) {
                // 开始引号
                result += processed.substring(lastIndex, match.index);
                result += '<span class="quote-text">"';
                quoteStart = match.index + 6;
                inQuote = true;
            } else {
                // 结束引号
                result += processed.substring(quoteStart, match.index);
                result += '"</span>';
                lastIndex = match.index + 6;
                inQuote = false;
            }
        }
        
        // 添加剩余内容
        if (inQuote) {
            // 如果有未闭合的引号，不添加修饰
            result = processed;
        } else {
            result += processed.substring(lastIndex);
        }
        
        // 处理英文单引号（HTML转义后）
        result = result.replace(/&#039;([^&#039;]*)&#039;/g, '<span class="quote-text">\$1\'</span>');
        
        return result;
    }
    
    // 处理星号修饰（动作/斜体）
    decorateAsterisks(text) {
        let processed = text;
        
        // 处理 *内容* 格式，但要避免处理 **粗体** 
        // 先临时替换掉连续的星号
        processed = processed.replace(/\*\*/g, '__DOUBLE_ASTERISK__');
        
        // 处理单个星号包围的内容
        let result = '';
        let lastIndex = 0;
        let inAsterisk = false;
        let asteriskStart = 0;
        
        for (let i = 0; i < processed.length; i++) {
            if (processed[i] === '*') {
                if (!inAsterisk) {
                    // 开始星号
                    result += processed.substring(lastIndex, i);
                    result += '<span class="action-text">*';
                    asteriskStart = i + 1;
                    inAsterisk = true;
                } else {
                    // 结束星号
                    result += processed.substring(asteriskStart, i);
                    result += '*</span>';
                    lastIndex = i + 1;
                    inAsterisk = false;
                }
            }
        }
        
        // 添加剩余内容
        if (inAsterisk) {
            // 如果有未闭合的星号，不添加修饰
            result = processed;
        } else {
            result += processed.substring(lastIndex);
        }
        
        // 恢复双星号
        result = result.replace(/__DOUBLE_ASTERISK__/g, '**');
        
        return result;
    }
    
    // 处理消息 - 正则处理 + 变量替换 + 引号修饰 + 星号修饰
    processMessage(text, role = 'assistant') {
        if (!text) return '';
        
        // 0. 先应用正则表达式处理（最早执行，避免影响后续修饰）
        let processed = text;
        if (this.regexEnabled && window.regexEngine) {
            const placement = role === 'user' ? 
                window.regexEngine.PLACEMENT.USER_INPUT : 
                window.regexEngine.PLACEMENT.AI_OUTPUT;
            
            const context = {
                userName: this.variables.user,
                charName: this.variables.char,
                model: this.variables.model,
                characterId: window.currentCharacter?.name || null,
                isMarkdown: false,
                isPrompt: false,
                isEdit: false
            };
            
            processed = window.regexEngine.processText(processed, placement, context);
        }
        
        // 1. 然后进行变量替换（在HTML转义前）
        processed = this.replaceVariables(processed);
        
        // 特殊处理：保护HTML代码块不被转义
        const htmlCodeBlocks = [];
        let blockIndex = 0;
        
        // 提取并保护```html代码块
        processed = processed.replace(/```html\s*([\s\S]*?)```/g, (match, code) => {
            const placeholder = `__HTML_CODE_BLOCK_${blockIndex}__`;
            htmlCodeBlocks[blockIndex] = {
                full: match,
                code: code.trim()
            };
            blockIndex++;
            return placeholder;
        });
        
        // 2. HTML转义（不会影响占位符）
        processed = this.escapeHtml(processed);
        
        // 3. 引号修饰（处理转义后的&quot;）
        processed = this.decorateQuotes(processed);
        
        // 4. 星号修饰
        processed = this.decorateAsterisks(processed);
        
        // 5. 保留换行
        processed = processed.replace(/\n/g, '<br>');
        
        // 6. 恢复HTML代码块为<pre><code>格式（供HTML渲染器处理）
        htmlCodeBlocks.forEach((block, index) => {
            const placeholder = `__HTML_CODE_BLOCK_${index}__`;
            // 关键：必须转义HTML内容，防止样式泄露
            const escapedCode = this.escapeHtml(block.code);
            // 创建代码块元素，使用转义后的内容
            const codeBlockHtml = `<pre class="html-code-block"><code class="language-html" data-has-html="true">${escapedCode}</code></pre>`;
            processed = processed.replace(placeholder, codeBlockHtml);
        });
        
        return processed;
    }
    
    // 启用/禁用正则处理
    toggleRegex(enabled) {
        this.regexEnabled = enabled;
        console.log(`[文本修饰器] 正则处理已${enabled ? '启用' : '禁用'}`);
    }
}

// 创建全局实例
window.textDecorator = new TextDecorator();

// 导出给其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextDecorator;
}