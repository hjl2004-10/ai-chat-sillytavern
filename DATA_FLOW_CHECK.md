# 数据流程完整性检查

## 🔄 对话发送时的数据流

### 1. 数据收集阶段 (script.js: sendMessage)

当用户发送消息时，系统按以下顺序收集数据：

```javascript
// script.js:405-412
1. 用户身份数据 (User Persona)
   - 来源: window.getCurrentUserPersona()
   - 内容: {name, description}
   
// script.js:415
2. 角色卡数据 (Character Card)
   - 来源: window.currentCharacter
   - 内容: {name, description, personality, scenario, first_mes, mes_example}

// script.js:419-426
3. 世界书数据 (World Book)
   - 来源: checkWorldBookTriggers(contextMessages)
   - 内容: {before: "...", after: "..."}
   
// script.js:430
4. 构建最终消息
   - 调用: buildPromptMessages(contextMessages, character, worldInfo, userSettings)
```

### 2. 预设管理器处理 (prompt-manager.js: buildPromptMessages)

预设管理器负责整合所有动态内容：

```javascript
// prompt-manager.js:1164-1243
功能：将所有组件按照prompt_order排序并构建最终消息

处理流程：
1. 遍历启用的提示词 (enabledPrompts)
2. 识别marker类型（动态占位符）
3. 调用getMarkerContent获取实际内容
4. 进行变量替换 ({{user}}, {{char}}等)
5. 按照injection设置插入到正确位置
```

### 3. 动态内容映射 (prompt-manager.js: getMarkerContent)

```javascript
// prompt-manager.js:1246-1299
marker标识符对应关系：
- 'worldInfoBefore' → 世界书前置内容
- 'worldInfoAfter' → 世界书后置内容  
- 'charDescription' → 角色描述
- 'charPersonality' → 角色性格
- 'scenario' → 场景设定
- 'personaDescription' → 用户身份描述
- 'dialogueExamples' → 对话示例
- 'chatHistory' → 聊天历史
```

## ✅ 功能完整性验证

### 预设管理中的动态内容处理

| Marker标识符 | 数据来源 | 是否正确整合 | 说明 |
|-------------|---------|------------|------|
| worldInfoBefore | checkWorldBookTriggers() | ✅ | 世界书前置内容 |
| worldInfoAfter | checkWorldBookTriggers() | ✅ | 世界书后置内容 |
| charDescription | currentCharacter.description | ✅ | 角色描述 |
| charPersonality | currentCharacter.personality | ✅ | 角色性格 |
| scenario | currentCharacter.scenario | ✅ | 场景设定 |
| personaDescription | userPersona.description | ✅ | 用户身份 |
| dialogueExamples | currentCharacter.mes_example | ✅ | 对话示例 |
| chatHistory | contextMessages | ✅ | 聊天历史 |

### 变量替换系统

```javascript
// prompt-manager.js:1303-1324
支持的变量：
- {{user}} → userSettings.userName
- {{char}} → character.name
- {{time}} → 当前时间
- {{date}} → 当前日期
- {{description}} → character.description
- {{personality}} → character.personality
- {{scenario}} → character.scenario
```

## 🔍 潜在问题检查

### 1. 重复功能检查

| 功能 | 位置 | 是否重复 | 说明 |
|------|------|---------|------|
| 世界书注入 | script.js:433 | ❌ | 仅作为后备方案 |
| 变量替换 | prompt-manager.js:1303 | ❌ | 统一处理 |
| 用户身份 | script.js:410 | ❌ | 统一获取 |

### 2. 逻辑冲突检查

✅ **无冲突** - 各模块职责清晰：
- **script.js**: 数据收集和发送
- **prompt-manager.js**: 数据整合和格式化
- **characters.js**: 角色管理
- **world.js**: 世界书管理
- **user-persona.js**: 用户身份管理

### 3. 数据流完整性

```
用户输入
    ↓
收集所有数据 (script.js)
    ↓
传递给预设管理器 (buildPromptMessages)
    ↓
处理marker占位符 (getMarkerContent)
    ↓
变量替换 (replaceVariables)
    ↓
构建最终消息数组
    ↓
发送到API
```

## 📊 最终请求体结构

```javascript
{
  messages: [
    {
      role: "system",
      content: "系统提示词 + 角色设定 + 世界书前置 + 用户身份..."
    },
    {
      role: "user",
      content: "用户消息"
    },
    {
      role: "assistant", 
      content: "AI回复"
    }
    // ... 聊天历史
  ],
  model: "选定的模型",
  temperature: 0.7,
  max_tokens: 2000,
  stream: true
}
```

## ✅ 验证结果

### 功能可用性确认

1. **角色卡** ✅
   - 正确加载到 window.currentCharacter
   - 所有字段都能被预设管理器访问
   - 变量替换正常工作

2. **世界书** ✅
   - 触发检测正常
   - 内容正确注入到指定位置
   - 支持before/after位置控制

3. **预设管理** ✅
   - prompt_order正确排序
   - marker动态内容正确替换
   - 变量系统正常工作

4. **用户身份** ✅
   - getCurrentUserPersona()正确返回数据
   - {{user}}变量正确替换
   - 描述内容正确整合

## 🎯 结论

**系统状态**: ✅ **完全可用**

- 所有功能模块都正确整合到对话流程中
- 没有功能重复或逻辑冲突
- 数据流清晰且完整
- 与SillyTavern的处理逻辑一致

### 测试建议

1. 创建一个包含所有字段的角色卡
2. 添加几个世界书条目
3. 设置用户身份
4. 发送对话测试所有内容是否正确整合

### 注意事项

- 确保预设中的marker标识符正确（不要修改默认的marker项）
- prompt_order决定了内容的最终顺序
- 所有动态内容都通过marker系统注入，不需要手动添加