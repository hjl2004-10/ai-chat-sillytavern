// 世界书调试工具函数

// 手动激活世界书（修复版 - 同步到服务器）
window.activateWorldBook = async function(worldBookId) {
    const worldBook = worldBooks.find(wb => wb.id === worldBookId);
    if (!worldBook) {
        console.error('世界书不存在:', worldBookId);
        console.log('可用的世界书:', worldBooks.map(wb => ({id: wb.id, name: wb.name})));
        return false;
    }
    
    // 更新本地状态
    worldBook.active = true;
    if (!activeWorldBooks.includes(worldBookId)) {
        activeWorldBooks.push(worldBookId);
    }
    
    // 更新原始格式中的active状态
    if (worldBook.originalFormat) {
        if (!worldBook.originalFormat._metadata) {
            worldBook.originalFormat._metadata = {};
        }
        worldBook.originalFormat._metadata.active = true;
    }
    
    // 保存到本地
    saveActiveWorldBooks();
    saveWorldBooks();
    
    // 同步到服务器
    try {
        const saveData = worldBook.originalFormat || {
            entries: {},
            _metadata: {
                id: worldBook.id,
                name: worldBook.name,
                description: worldBook.description,
                createDate: worldBook.createDate,
                active: true
            }
        };
        
        // 确保metadata中的active是true
        if (saveData._metadata) {
            saveData._metadata.active = true;
        }
        
        const response = await fetch('/api/world/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(saveData)
        });
        
        if (response.ok) {
            console.log(`世界书"${worldBook.name}"已同步到服务器`);
        }
    } catch (error) {
        console.error('同步到服务器失败:', error);
    }
    
    if (typeof updateWorldBooksDisplay === 'function') {
        updateWorldBooksDisplay();
    }
    
    console.log(`世界书"${worldBook.name}"(${worldBookId})已激活`);
    console.log('当前激活的世界书:', activeWorldBooks);
    console.log('世界书条目:', worldBook.entries);
    return true;
};

// 获取当前激活的世界书列表
window.getActiveWorldBooks = function() {
    console.log('activeWorldBooks数组:', activeWorldBooks);
    const result = activeWorldBooks.map(id => {
        const wb = worldBooks.find(w => w.id === id);
        return wb ? {id: wb.id, name: wb.name, active: wb.active} : null;
    }).filter(Boolean);
    
    if (result.length === 0) {
        console.log('没有激活的世界书');
    }
    return result;
};

// 查看所有世界书
window.getAllWorldBooks = function() {
    const books = worldBooks.map(wb => ({
        id: wb.id,
        name: wb.name,
        active: wb.active,
        isInActiveList: activeWorldBooks.includes(wb.id),
        entryCount: wb.entries ? wb.entries.length : 0
    }));
    
    console.table(books);
    return books;
};

// 手动触发世界书检查
window.testWorldBookTriggers = function(testMessages = null) {
    const messages = testMessages || [
        {role: 'user', content: '测试消息'}
    ];
    
    console.log('测试消息:', messages);
    console.log('激活的世界书ID:', activeWorldBooks);
    
    const triggered = checkWorldBookTriggers(messages);
    console.log('触发的条目:', triggered);
    
    return triggered;
};

// 重新初始化世界书系统
window.reinitWorldBooks = function() {
    // 重新加载世界书
    initWorldBookSystem();
    
    // 从服务器加载
    fetch('/api/world/list')
        .then(res => res.json())
        .then(data => {
            if (data.worldBooks) {
                worldBooks = data.worldBooks;
                console.log('从服务器加载的世界书:', worldBooks);
                
                // 检查每个世界书的激活状态
                worldBooks.forEach(wb => {
                    if (wb.originalFormat && wb.originalFormat._metadata) {
                        wb.active = wb.originalFormat._metadata.active || false;
                        if (wb.active && !activeWorldBooks.includes(wb.id)) {
                            activeWorldBooks.push(wb.id);
                        }
                    }
                });
                
                saveWorldBooks();
                saveActiveWorldBooks();
                console.log('更新后的激活列表:', activeWorldBooks);
            }
        })
        .catch(err => {
            console.error('加载世界书失败:', err);
        });
};

console.log('世界书调试函数已加载');
console.log('可用命令:');
console.log('- activateWorldBook(id) - 激活指定世界书');
console.log('- getActiveWorldBooks() - 查看激活的世界书');
console.log('- getAllWorldBooks() - 查看所有世界书');
console.log('- testWorldBookTriggers() - 测试世界书触发');
console.log('- reinitWorldBooks() - 重新初始化世界书系统');