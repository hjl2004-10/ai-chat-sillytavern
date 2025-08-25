// 缓存管理工具

// 清除所有本地缓存
window.clearAllCache = function() {
    console.log('=== 开始清除所有本地缓存 ===');
    
    // 要清除的缓存键列表
    const cacheKeys = [
        // 世界书相关
        'worldBooks',
        'worldBookEntries',
        'activeWorldBooks',
        
        // 预设相关
        'promptPresets',
        'promptPreset',
        
        // 角色相关
        'characters',
        'currentCharacter',
        'selectedCharacter',
        
        // 用户角色相关
        'userPersonas',
        'selectedPersona',
        
        // 聊天相关
        'chatHistory',
        'contextMessages',
        'currentChatId',
        
        // AI设置相关
        'aiSettings',
        'config'
    ];
    
    let clearedCount = 0;
    
    // 清除指定的缓存键
    cacheKeys.forEach(key => {
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`✓ 已清除: ${key}`);
            clearedCount++;
        }
    });
    
    // 清除所有以特定前缀开头的键
    const prefixes = ['wb_', 'char_', 'preset_', 'chat_'];
    const allKeys = Object.keys(localStorage);
    
    allKeys.forEach(key => {
        if (prefixes.some(prefix => key.startsWith(prefix))) {
            localStorage.removeItem(key);
            console.log(`✓ 已清除: ${key}`);
            clearedCount++;
        }
    });
    
    console.log(`=== 清除完成，共清除 ${clearedCount} 个缓存项 ===`);
    
    // 显示提示
    if (typeof showToast === 'function') {
        showToast(`已清除 ${clearedCount} 个本地缓存项`, 'success');
    }
    
    return clearedCount;
};

// 获取缓存使用情况
window.getCacheInfo = function() {
    const info = {
        totalKeys: 0,
        totalSize: 0,
        details: {}
    };
    
    const keys = Object.keys(localStorage);
    info.totalKeys = keys.length;
    
    keys.forEach(key => {
        const value = localStorage.getItem(key);
        const size = new Blob([value]).size;
        info.totalSize += size;
        info.details[key] = {
            size: size,
            preview: value.substring(0, 100) + (value.length > 100 ? '...' : '')
        };
    });
    
    // 转换为可读格式
    info.totalSizeFormatted = formatBytes(info.totalSize);
    
    console.log('=== 缓存使用情况 ===');
    console.log(`总键数: ${info.totalKeys}`);
    console.log(`总大小: ${info.totalSizeFormatted}`);
    console.log('详细信息:', info.details);
    
    return info;
};

// 格式化字节数
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 选择性清除缓存
window.clearCacheByType = function(type) {
    let clearedCount = 0;
    
    switch(type) {
        case 'world':
            // 清除世界书相关
            ['worldBooks', 'worldBookEntries', 'activeWorldBooks'].forEach(key => {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    clearedCount++;
                }
            });
            // 清除世界书文件
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('wb_')) {
                    localStorage.removeItem(key);
                    clearedCount++;
                }
            });
            console.log(`已清除 ${clearedCount} 个世界书缓存项`);
            break;
            
        case 'preset':
            // 清除预设相关
            ['promptPresets', 'promptPreset'].forEach(key => {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    clearedCount++;
                }
            });
            console.log(`已清除 ${clearedCount} 个预设缓存项`);
            break;
            
        case 'character':
            // 清除角色相关
            ['characters', 'currentCharacter', 'selectedCharacter'].forEach(key => {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    clearedCount++;
                }
            });
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('char_')) {
                    localStorage.removeItem(key);
                    clearedCount++;
                }
            });
            console.log(`已清除 ${clearedCount} 个角色缓存项`);
            break;
            
        case 'chat':
            // 清除聊天相关
            ['chatHistory', 'contextMessages', 'currentChatId'].forEach(key => {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    clearedCount++;
                }
            });
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('chat_')) {
                    localStorage.removeItem(key);
                    clearedCount++;
                }
            });
            console.log(`已清除 ${clearedCount} 个聊天缓存项`);
            break;
            
        default:
            console.log('未知的缓存类型:', type);
    }
    
    if (typeof showToast === 'function') {
        showToast(`已清除 ${clearedCount} 个${type}缓存项`, 'success');
    }
    
    return clearedCount;
};

// 导出缓存数据（用于调试）
window.exportCache = function() {
    const data = {};
    Object.keys(localStorage).forEach(key => {
        data[key] = localStorage.getItem(key);
    });
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cache_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('缓存数据已导出');
};

// 在控制台中提供使用说明
console.log(`
=== 缓存管理工具已加载 ===
可用命令：
- clearAllCache()      : 清除所有本地缓存
- getCacheInfo()       : 查看缓存使用情况
- clearCacheByType(type) : 清除特定类型缓存
  类型: 'world', 'preset', 'character', 'chat'
- exportCache()        : 导出缓存数据到文件

示例：
clearAllCache()        // 清除所有缓存
clearCacheByType('world') // 只清除世界书缓存
getCacheInfo()         // 查看缓存详情
`);