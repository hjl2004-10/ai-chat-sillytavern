# HTML渲染器问题解决方案

## 问题症状
1. CSS样式泄露到全局，影响主页面
2. JavaScript无法在iframe中执行

## 根本原因
### CSS泄露问题
- `text-decorator.js`在创建代码块时没有转义HTML内容
- 导致`<style>`标签被浏览器直接解析，影响全局样式

### JS不执行问题  
- iframe设置了`loading="lazy"`属性，可能阻止或延迟JS执行
- DOM操作顺序问题

## 解决方案

### 1. 修复text-decorator.js（第206行）
```javascript
// 原来：直接输出未转义的HTML
const codeBlockHtml = `<pre><code>${block.code}</code></pre>`;

// 修复：转义HTML内容
const escapedCode = this.escapeHtml(block.code);
const codeBlockHtml = `<pre><code>${escapedCode}</code></pre>`;
```

### 2. 修复html-renderer.js
- 移除`iframe.loading = 'lazy'`
- 确保iframe先添加到DOM再设置srcdoc
- 使用`textContent`读取内容（自动解码HTML实体）

## 关键原理
1. **HTML转义防止样式泄露**：将`<`转为`&lt;`，防止浏览器解析
2. **iframe的srcdoc创建独立文档**：about:srcdoc是独立上下文
3. **不设置sandbox属性**：让JavaScript完全执行

## 结果
- ✅ CSS完全隔离在iframe内
- ✅ JavaScript正常执行
- ✅ 实现了类似SillyTavern的"小电视"效果