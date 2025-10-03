// 正则表达式引擎模块 - 兼容SillyTavern格式
class RegexEngine {
    constructor() {
        // 正则脚本存储
        this.globalScripts = [];
        this.characterScripts = {};
        this.characterAllowedRegex = [];
        
        // 正则放置位置枚举（与SillyTavern兼容）
        this.PLACEMENT = {
            USER_INPUT: 1,
            AI_OUTPUT: 2,
            SLASH_COMMAND: 3,
            WORLD_INFO: 5
        };
        
        // 替换模式枚举
        this.SUBSTITUTE_MODE = {
            NONE: 0,
            RAW: 1,
            ESCAPED: 2
        };
        
        // 编译后的正则缓存
        this.regexCache = new Map();
        
        // 加载配置
        this.loadScripts();
    }
    
    // 加载正则脚本
    async loadScripts() {
        try {
            const response = await fetch('/api/regex/load');
            if (response.ok) {
                const data = await response.json();
                this.globalScripts = data.global || [];
                this.characterScripts = data.character || {};
                this.characterAllowedRegex = data.allowed || [];
                console.log('[正则引擎] 从服务器加载脚本:', {
                    global: this.globalScripts.length,
                    character: Object.keys(this.characterScripts).length
                });
            } else {
                console.log('[正则引擎] 服务器无响应，使用本地存储');
                this.loadFromLocalStorage();
            }
        } catch (e) {
            console.log('[正则引擎] 从本地存储加载:', e.message);
            this.loadFromLocalStorage();
        }
    }
    
    // 从本地存储加载
    loadFromLocalStorage() {
        const stored = localStorage.getItem('regex_scripts');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.globalScripts = data.global || [];
                this.characterScripts = data.character || {};
                this.characterAllowedRegex = data.allowed || [];
            } catch (e) {
                console.error('[正则引擎] 解析存储数据失败:', e);
            }
        }
    }
    
    // 保存脚本（同时保存到服务器和本地）
    async saveScripts() {
        const data = {
            global: this.globalScripts,
            character: this.characterScripts,
            allowed: this.characterAllowedRegex
        };
        
        // 保存到本地存储
        localStorage.setItem('regex_scripts', JSON.stringify(data));
        
        // 保存到服务器
        try {
            const response = await fetch('/api/regex/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                console.log('[正则引擎] 脚本已保存');
            } else {
                console.error('[正则引擎] 保存失败');
            }
        } catch (e) {
            console.error('[正则引擎] 保存错误:', e);
        }
    }
    
    // 保存到本地存储（兼容旧方法）
    saveToLocalStorage() {
        this.saveScripts();
    }
    
    // 获取当前激活的脚本列表
    getActiveScripts(characterId = null, placement = null) {
        let scripts = [...this.globalScripts];
        
        // 如果指定了角色且允许使用角色脚本
        if (characterId && this.characterAllowedRegex.includes(characterId)) {
            const charScripts = this.characterScripts[characterId] || [];
            scripts = [...scripts, ...charScripts];
        }
        
        // 过滤已禁用的脚本
        scripts = scripts.filter(s => !s.disabled);
        
        // 根据placement过滤
        if (placement !== null) {
            scripts = scripts.filter(s => s.placement && s.placement.includes(placement));
        }
        
        return scripts;
    }
    
    // 编译正则表达式（带缓存）
    compileRegex(pattern, flags = 'gi') {
        const cacheKey = `${pattern}_${flags}`;
        
        if (this.regexCache.has(cacheKey)) {
            return this.regexCache.get(cacheKey);
        }
        
        try {
            const regex = new RegExp(pattern, flags);
            this.regexCache.set(cacheKey, regex);
            return regex;
        } catch (e) {
            console.warn('[正则引擎] 编译失败，尝试转义:', pattern);
            // 如果编译失败，尝试将其作为纯文本
            try {
                const escapedPattern = this.escapeRegex(pattern);
                const regex = new RegExp(escapedPattern, flags);
                this.regexCache.set(cacheKey, regex);
                return regex;
            } catch (e2) {
                console.error('[正则引擎] 转义后仍失败:', e2);
                return null;
            }
        }
    }
    
    // 执行单个正则脚本
    runScript(script, text, context = {}) {
        if (!script || !script.findRegex || !text) {
            return text;
        }
        
        // 获取查找模式
        let findPattern = script.findRegex;
        
        // 处理变量替换模式
        if (script.substituteRegex) {
            findPattern = this.substituteVariables(findPattern, context, script.substituteRegex);
        }
        
        // 判断是否为正则表达式格式（以/开头和结尾）
        let regex;
        if (findPattern.startsWith('/') && findPattern.lastIndexOf('/') > 0) {
            // 用户明确使用正则表达式格式 /pattern/flags
            const lastSlash = findPattern.lastIndexOf('/');
            const pattern = findPattern.slice(1, lastSlash);
            const flags = findPattern.slice(lastSlash + 1) || 'gi';
            regex = this.compileRegex(pattern, flags);
        } else {
            // 普通文本，转义后作为字面量匹配
            const escapedPattern = this.escapeRegex(findPattern);
            regex = this.compileRegex(escapedPattern);
        }
        
        if (!regex) return text;
        
        // 执行替换
        let result = text.replace(regex, (match, ...args) => {
            // 处理替换字符串
            let replacement = script.replaceString || '';
            
            // 支持 {{match}} 占位符
            replacement = replacement.replace(/{{match}}/gi, match);
            
            // 支持捕获组 $1, $2 等
            replacement = replacement.replace(/\$(\d+)/g, (_, num) => {
                const groupIndex = parseInt(num) - 1;
                return args[groupIndex] || '';
            });
            
            // 处理trim字符串
            if (script.trimStrings && script.trimStrings.length > 0) {
                script.trimStrings.forEach(trimStr => {
                    replacement = replacement.replace(new RegExp(this.escapeRegex(trimStr), 'g'), '');
                });
            }
            
            // 变量替换
            replacement = this.substituteVariables(replacement, context);
            
            return replacement;
        });
        
        return result;
    }
    
    // 处理文本（主入口）
    processText(text, placement, context = {}) {
        if (!text) return text;

        // 获取适用的脚本
        const scripts = this.getActiveScripts(context.characterId, placement);

        // 按顺序执行脚本
        let result = text;
        scripts.forEach(script => {
            // 检查扫描深度限制
            if (script.scanDepth > 0 && context.messageIndex !== undefined && context.totalMessages !== undefined) {
                // scanDepth > 0表示只扫描最近N条消息
                // 计算当前消息是否在扫描范围内
                const fromEnd = context.totalMessages - context.messageIndex; // 从后往前数，1=最后一条
                if (fromEnd > script.scanDepth) {
                    return; // 不在扫描范围内，跳过此脚本
                }
            }

            // 检查其他条件
            if (script.markdownOnly && !context.isMarkdown) return;
            if (script.promptOnly && !context.isPrompt) return;
            if (!script.runOnEdit && context.isEdit) return;

            // 执行脚本
            result = this.runScript(script, result, context);
        });

        return result;
    }
    
    // 变量替换
    substituteVariables(text, context = {}, mode = 0) {
        let result = text;
        
        // 基础变量
        const variables = {
            user: context.userName || 'User',
            char: context.charName || 'Assistant',
            model: context.model || 'AI',
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toLocaleDateString('zh-CN'),
            random: Math.floor(Math.random() * 100),
            ...context.customVariables
        };
        
        // 根据模式处理
        if (mode === this.SUBSTITUTE_MODE.ESCAPED) {
            // 转义模式
            Object.entries(variables).forEach(([key, value]) => {
                const escaped = this.escapeRegex(String(value));
                result = result.replace(new RegExp(`{{${key}}}`, 'gi'), escaped);
            });
        } else {
            // 普通模式
            Object.entries(variables).forEach(([key, value]) => {
                result = result.replace(new RegExp(`{{${key}}}`, 'gi'), String(value));
            });
        }
        
        return result;
    }
    
    // 转义正则特殊字符
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // 添加全局脚本
    async addGlobalScript(script) {
        if (!script.id) {
            script.id = this.generateId();
        }
        this.globalScripts.push(script);
        await this.saveScripts();
        return script.id;
    }
    
    // 添加角色脚本
    async addCharacterScript(characterId, script) {
        if (!script.id) {
            script.id = this.generateId();
        }
        
        if (!this.characterScripts[characterId]) {
            this.characterScripts[characterId] = [];
        }
        
        this.characterScripts[characterId].push(script);
        
        // 自动添加到允许列表
        if (!this.characterAllowedRegex.includes(characterId)) {
            this.characterAllowedRegex.push(characterId);
        }
        
        await this.saveScripts();
        return script.id;
    }
    
    // 更新脚本
    async updateScript(scriptId, updates, isCharacter = false, characterId = null) {
        let scripts = isCharacter && characterId 
            ? (this.characterScripts[characterId] || [])
            : this.globalScripts;
        
        const index = scripts.findIndex(s => s.id === scriptId);
        if (index !== -1) {
            scripts[index] = { ...scripts[index], ...updates };
            await this.saveScripts();
            return true;
        }
        return false;
    }
    
    // 删除脚本
    async deleteScript(scriptId, isCharacter = false, characterId = null) {
        if (isCharacter && characterId) {
            const scripts = this.characterScripts[characterId] || [];
            const index = scripts.findIndex(s => s.id === scriptId);
            if (index !== -1) {
                scripts.splice(index, 1);
                await this.saveScripts();
                return true;
            }
        } else {
            const index = this.globalScripts.findIndex(s => s.id === scriptId);
            if (index !== -1) {
                this.globalScripts.splice(index, 1);
                this.saveToLocalStorage();
                return true;
            }
        }
        return false;
    }
    
    // 导入SillyTavern格式的脚本
    async importScript(scriptData, isCharacter = false, characterId = null) {
        // 验证格式
        if (!scriptData.scriptName || !scriptData.findRegex) {
            throw new Error('无效的脚本格式');
        }
        
        // 生成新ID（避免冲突）
        const script = {
            ...scriptData,
            id: this.generateId()
        };
        
        if (isCharacter && characterId) {
            return this.addCharacterScript(characterId, script);
        } else {
            return this.addGlobalScript(script);
        }
    }
    
    // 导出脚本
    exportScript(scriptId, isCharacter = false, characterId = null) {
        let script = null;
        
        if (isCharacter && characterId) {
            const scripts = this.characterScripts[characterId] || [];
            script = scripts.find(s => s.id === scriptId);
        } else {
            script = this.globalScripts.find(s => s.id === scriptId);
        }
        
        if (script) {
            // 移除内部ID，保持与SillyTavern兼容
            const exported = { ...script };
            delete exported.id;
            return exported;
        }
        
        return null;
    }
    
    // 生成唯一ID
    generateId() {
        return `regex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // 清除正则缓存
    clearCache() {
        this.regexCache.clear();
        console.log('[正则引擎] 缓存已清除');
    }
    
    // 测试正则脚本
    testScript(script, testText) {
        if (!script || !testText) return testText;
        
        // 创建临时脚本对象
        const tempScript = {
            ...script,
            disabled: false
        };
        
        return this.runScript(tempScript, testText);
    }
}

// 创建全局实例
window.regexEngine = new RegexEngine();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RegexEngine;
}