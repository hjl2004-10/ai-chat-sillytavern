from flask import Flask, request, jsonify, Response, stream_with_context, send_from_directory, render_template_string
from flask_cors import CORS
import json
import requests
import time
from datetime import datetime
import os
import uuid

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# 配置存储
config = {
    "api_url": "",
    "api_key": "",
    "model": "",
    "streaming": True,
    "temperature": 0.7,
    "max_tokens": 2048,
    "top_p": 1.0
}

# 聊天历史存储
chats = {}
current_chat_id = None

# 上下文窗口
context_window = []

# 确保数据目录存在
os.makedirs("data/chats", exist_ok=True)
os.makedirs("data/characters", exist_ok=True)
os.makedirs("data/worlds", exist_ok=True)
os.makedirs("data/presets", exist_ok=True)

@app.route('/')
def home():
    """返回主页面"""
    return send_from_directory('.', 'final.html')

@app.route('/<path:path>')
def serve_static(path):
    """提供静态文件服务"""
    # 忽略一些特殊路径
    if path == 'none' or path.startswith('.well-known/'):
        return '', 204  # No Content
    if os.path.exists(path):
        return send_from_directory('.', path)
    return "File not found", 404

@app.route('/api')
def api_info():
    """API信息"""
    return jsonify({
        "status": "running",
        "message": "AI Chat Server is running",
        "endpoints": [
            "/api/config - 配置管理",
            "/api/models - 获取模型列表",
            "/api/chat/completions - 聊天接口",
            "/api/context - 上下文管理",
            "/api/chat/save - 保存聊天",
            "/api/chat/list - 聊天列表"
        ]
    })

@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    """处理配置的获取和更新"""
    global config
    if request.method == 'POST':
        data = request.json
        config.update(data)
        # 保存配置到文件
        with open('data/config.json', 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        return jsonify({"status": "success", "config": config})
    else:
        return jsonify(config)

@app.route('/api/models', methods=['GET'])
def get_models():
    """获取可用的模型列表"""
    if not config.get('api_url') or not config.get('api_key'):
        return jsonify({"error": "API未配置"}), 400
    
    try:
        # OpenAI兼容格式
        headers = {
            "Authorization": f"Bearer {config['api_key']}",
            "Content-Type": "application/json"
        }
        
        # 尝试获取模型列表
        response = requests.get(
            f"{config['api_url']}/models",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 提取模型列表
            if 'data' in data:
                models = [model['id'] for model in data['data']]
            else:
                models = []
            return jsonify({"models": models})
        else:
            return jsonify({"models": [], "error": "无法获取模型列表"})
    except Exception as e:
        return jsonify({"models": [], "error": str(e)})

@app.route('/api/chat/completions', methods=['POST'])
def chat_completions():
    """处理聊天完成请求（OpenAI兼容格式）"""
    data = request.json
    messages = data.get('messages', [])
    
    # 添加到上下文窗口
    if messages:
        context_window.extend(messages)
    
    # 构建请求
    request_data = {
        "model": config.get('model', 'gpt-3.5-turbo'),
        "messages": messages,
        "temperature": data.get('temperature', config.get('temperature', 0.7)),
        "max_tokens": data.get('max_tokens', config.get('max_tokens', 2048)),
        "top_p": data.get('top_p', config.get('top_p', 1.0)),
        "stream": data.get('stream', config.get('streaming', True))
    }
    
    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json"
    }
    
    try:
        if request_data['stream']:
            # 流式响应
            def generate():
                response = requests.post(
                    f"{config['api_url']}/chat/completions",
                    headers=headers,
                    json=request_data,
                    stream=True,
                    timeout=60
                )
                
                for line in response.iter_lines():
                    if line:
                        line_str = line.decode('utf-8')
                        if line_str.startswith('data: '):
                            yield line_str + '\n\n'
                            
                            # 解析并保存到上下文
                            if line_str != 'data: [DONE]':
                                try:
                                    chunk_data = json.loads(line_str[6:])
                                    if 'choices' in chunk_data and chunk_data['choices']:
                                        delta = chunk_data['choices'][0].get('delta', {})
                                        if 'content' in delta:
                                            # 这里可以累积完整的响应
                                            pass
                                except:
                                    pass
            
            return Response(
                stream_with_context(generate()),
                content_type='text/event-stream'
            )
        else:
            # 非流式响应
            response = requests.post(
                f"{config['api_url']}/chat/completions",
                headers=headers,
                json=request_data,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # 添加响应到上下文窗口
                if 'choices' in result and result['choices']:
                    assistant_message = {
                        "role": "assistant",
                        "content": result['choices'][0]['message']['content']
                    }
                    context_window.append(assistant_message)
                
                return jsonify(result)
            else:
                return jsonify({"error": response.text}), response.status_code
                
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/context', methods=['GET'])
def get_context():
    """获取当前上下文窗口"""
    return jsonify({
        "messages": context_window,
        "total_messages": len(context_window)
    })

@app.route('/api/context', methods=['POST'])
def update_context():
    """更新上下文窗口"""
    global context_window
    data = request.json
    
    if 'messages' in data:
        context_window = data['messages']
    elif 'message' in data:
        context_window.append(data['message'])
    
    return jsonify({
        "status": "success",
        "messages": context_window
    })

@app.route('/api/context/clear', methods=['POST'])
def clear_context():
    """清空上下文窗口"""
    global context_window
    context_window = []
    return jsonify({"status": "success"})

# 旧的 /api/chat/save 已删除，使用新的 /api/chats/save

# 旧的 /api/chat/load 已删除，使用新的 /api/chats/get

# 旧的 /api/chat/list 已删除，使用新的 /api/chats/list

# ==================== 世界书相关API ====================

@app.route('/api/world/save', methods=['POST'])
def save_world_entry():
    """保存世界书条目"""
    try:
        entry = request.json
        
        # 生成条目ID
        if not entry.get('id'):
            entry['id'] = f"world_{uuid.uuid4().hex[:8]}"
        
        # 使用安全的文件名（去除特殊字符）
        safe_id = entry['id'].replace('/', '_').replace('\\', '_').replace(':', '_')
        filename = f"{safe_id}.json"
        filepath = os.path.join('data/worlds', filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(entry, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            "status": "success",
            "entry_id": entry['id'],
            "message": "世界书条目已保存"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/world/list', methods=['GET'])
def get_world_list():
    """获取世界书条目列表"""
    try:
        entries = []
        if os.path.exists('data/worlds'):
            for filename in os.listdir('data/worlds'):
                if filename.endswith('.json'):
                    filepath = os.path.join('data/worlds', filename)
                    with open(filepath, 'r', encoding='utf-8') as f:
                        entry = json.load(f)
                        entries.append(entry)
        
        return jsonify({"entries": entries})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/world/delete/<path:entry_id>', methods=['DELETE'])
def delete_world_entry(entry_id):
    """删除世界书条目"""
    try:
        # 使用安全的文件名
        safe_id = entry_id.replace('/', '_').replace('\\', '_').replace(':', '_')
        
        # 尝试直接使用ID作为文件名
        filepath = os.path.join('data/worlds', f"{safe_id}.json")
        
        # 如果文件不存在，尝试查找所有文件并匹配ID
        if not os.path.exists(filepath):
            found = False
            if os.path.exists('data/worlds'):
                for filename in os.listdir('data/worlds'):
                    if filename.endswith('.json'):
                        file_path = os.path.join('data/worlds', filename)
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                data = json.load(f)
                                # 检查多种ID格式
                                data_id = str(data.get('id', ''))
                                data_uid = str(data.get('uid', ''))
                                
                                if (data_id == entry_id or 
                                    data_uid == entry_id or 
                                    f"world_{data_uid}" == entry_id or
                                    data_id == safe_id):
                                    os.remove(file_path)
                                    found = True
                                    break
                        except:
                            continue
            
            if not found:
                # 如果还是找不到，返回成功（可能已被删除）
                return jsonify({
                    "status": "success",
                    "message": "世界书条目已删除（或不存在）"
                })
        else:
            os.remove(filepath)
        
        return jsonify({
            "status": "success",
            "message": "世界书条目已删除"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== 角色卡相关API ====================

@app.route('/api/character/save', methods=['POST'])
def save_character():
    """保存角色卡"""
    try:
        character = request.json
        
        # 生成角色ID
        if not character.get('id'):
            character['id'] = f"char_{uuid.uuid4().hex[:8]}"
        
        # 保存到文件
        filename = f"{character['id']}.json"
        filepath = os.path.join('data/characters', filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(character, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            "status": "success",
            "character_id": character['id'],
            "message": "角色卡已保存"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/character/list', methods=['GET'])
def get_character_list():
    """获取角色卡列表"""
    try:
        characters = []
        if os.path.exists('data/characters'):
            for filename in os.listdir('data/characters'):
                if filename.endswith('.json'):
                    filepath = os.path.join('data/characters', filename)
                    with open(filepath, 'r', encoding='utf-8') as f:
                        character = json.load(f)
                        characters.append(character)
        
        return jsonify({"characters": characters})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/character/get/<character_id>', methods=['GET'])
def get_character(character_id):
    """获取单个角色卡"""
    try:
        filepath = os.path.join('data/characters', f"{character_id}.json")
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                character = json.load(f)
            return jsonify(character)
        else:
            return jsonify({"error": "角色不存在"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/character/delete/<character_id>', methods=['DELETE'])
def delete_character(character_id):
    """删除角色卡"""
    try:
        filepath = os.path.join('data/characters', f"{character_id}.json")
        if os.path.exists(filepath):
            os.remove(filepath)
            return jsonify({
                "status": "success",
                "message": "角色已删除"
            })
        else:
            return jsonify({"error": "角色不存在"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ========== 用户身份管理接口 ==========
@app.route('/api/personas/save', methods=['POST'])
def save_persona():
    """保存用户身份信息"""
    try:
        persona_data = request.json
        
        # 保存到文件
        filepath = os.path.join('data', 'user_persona.json')
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(persona_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            "status": "success",
            "message": "用户身份已保存"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/personas/get', methods=['GET'])
def get_persona():
    """获取用户身份信息"""
    try:
        filepath = os.path.join('data', 'user_persona.json')
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                persona_data = json.load(f)
            return jsonify(persona_data)
        else:
            # 返回默认身份
            return jsonify({
                "current": {
                    "name": "User",
                    "avatar": "default_avatar.png",
                    "description": "",
                    "position": "after_scenario",
                    "depth": 2,
                    "role": 0
                },
                "personas": {}
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/personas/upload-avatar', methods=['POST'])
def upload_persona_avatar():
    """上传用户头像"""
    try:
        if 'avatar' not in request.files:
            return jsonify({"error": "没有文件"}), 400
        
        file = request.files['avatar']
        if file.filename == '':
            return jsonify({"error": "文件名为空"}), 400
        
        # 生成唯一文件名
        ext = os.path.splitext(file.filename)[1]
        filename = f"avatar_{int(time.time())}{ext}"
        
        # 确保头像目录存在
        avatar_dir = os.path.join('data', 'avatars')
        os.makedirs(avatar_dir, exist_ok=True)
        
        # 保存文件
        filepath = os.path.join(avatar_dir, filename)
        file.save(filepath)
        
        return jsonify({
            "status": "success",
            "filename": filename
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/personas/avatar/<filename>', methods=['GET'])
def get_persona_avatar(filename):
    """获取用户头像"""
    try:
        avatar_dir = os.path.join('data', 'avatars')
        return send_from_directory(avatar_dir, filename)
    except:
        # 如果文件不存在，返回默认头像
        return '', 404

# ========== 预设管理接口 ==========
@app.route('/api/preset/save', methods=['POST'])
def save_preset():
    """保存预设到文件"""
    try:
        preset = request.json
        preset_name = preset.get('name', 'unnamed')
        
        # 生成文件名（使用预设名称，替换特殊字符）
        safe_name = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in preset_name)
        filename = f"{safe_name}.json"
        filepath = os.path.join('data/presets', filename)
        
        # 保存预设
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(preset, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            "status": "success",
            "filename": filename,
            "message": f"预设 '{preset_name}' 已保存"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/preset/list', methods=['GET'])
def get_preset_list():
    """获取预设列表"""
    try:
        presets = []
        if os.path.exists('data/presets'):
            for filename in os.listdir('data/presets'):
                if filename.endswith('.json'):
                    filepath = os.path.join('data/presets', filename)
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            preset = json.load(f)
                            preset['filename'] = filename
                            presets.append(preset)
                    except json.JSONDecodeError:
                        print(f"无法解析预设文件: {filename}")
                        continue
        
        return jsonify({"presets": presets})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/preset/get/<preset_name>', methods=['GET'])
def get_preset(preset_name):
    """获取单个预设"""
    try:
        # 添加.json扩展名如果没有
        if not preset_name.endswith('.json'):
            preset_name += '.json'
            
        filepath = os.path.join('data/presets', preset_name)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                preset = json.load(f)
            return jsonify(preset)
        else:
            return jsonify({"error": "预设不存在"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ========== 对话管理API ==========

@app.route('/api/chats/save', methods=['POST'])
def save_chat_to_file():
    """保存对话到服务器文件系统"""
    try:
        data = request.json
        character_name = data.get('character_name', 'default')
        chat_name = data.get('chat_name', f'chat_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        messages = data.get('messages', [])
        metadata = data.get('metadata', {})
        
        # 创建角色目录
        char_dir = os.path.join('data/chats', character_name.replace('/', '_'))
        os.makedirs(char_dir, exist_ok=True)
        
        # 保存为JSONL格式（SillyTavern兼容）
        filepath = os.path.join(char_dir, f'{chat_name}.jsonl')
        
        with open(filepath, 'w', encoding='utf-8') as f:
            # 第一行：元数据
            meta_line = {
                'user_name': metadata.get('user_name', 'User'),
                'character_name': character_name,
                'create_date': metadata.get('create_date', datetime.now().isoformat()),
                'chat_metadata': {
                    'note': metadata.get('note', ''),
                    'title': metadata.get('title', chat_name)
                }
            }
            f.write(json.dumps(meta_line, ensure_ascii=False) + '\n')
            
            # 后续行：消息
            for msg in messages:
                if msg.get('role') != 'system':  # 过滤系统消息
                    entry = {
                        'name': msg.get('name', 'User' if msg['role'] == 'user' else character_name),
                        'is_user': msg['role'] == 'user',
                        'is_system': False,
                        'send_date': msg.get('send_date', datetime.now().isoformat()),
                        'mes': msg['content'],
                        'swipes': [msg['content']],
                        'swipe_id': 0
                    }
                    f.write(json.dumps(entry, ensure_ascii=False) + '\n')
        
        return jsonify({
            'status': 'success',
            'chat_name': chat_name,
            'filepath': filepath
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chats/list', methods=['GET'])
def list_chats_from_file():
    """从文件系统获取对话列表"""
    try:
        character_name = request.args.get('character', None)
        all_chats = []
        
        chats_dir = 'data/chats'
        if not os.path.exists(chats_dir):
            return jsonify({'chats': []})
        
        # 如果指定角色，只返回该角色的对话
        if character_name:
            char_dir = os.path.join(chats_dir, character_name.replace('/', '_'))
            if os.path.exists(char_dir):
                for filename in os.listdir(char_dir):
                    if filename.endswith('.jsonl'):
                        filepath = os.path.join(char_dir, filename)
                        # 读取文件获取元数据和消息数量
                        with open(filepath, 'r', encoding='utf-8') as f:
                            lines = f.readlines()
                            if lines:
                                metadata = json.loads(lines[0])
                                # 计算消息数量（排除第一行元数据）
                                message_count = len(lines) - 1
                                all_chats.append({
                                    'name': filename[:-6],  # 去掉.jsonl
                                    'character': character_name,
                                    'create_date': metadata.get('create_date'),
                                    'title': metadata.get('chat_metadata', {}).get('title'),
                                    'filepath': filepath,
                                    'message_count': message_count
                                })
        else:
            # 返回所有角色的对话
            for char_name in os.listdir(chats_dir):
                char_dir = os.path.join(chats_dir, char_name)
                if os.path.isdir(char_dir):
                    for filename in os.listdir(char_dir):
                        if filename.endswith('.jsonl'):
                            filepath = os.path.join(char_dir, filename)
                            with open(filepath, 'r', encoding='utf-8') as f:
                                lines = f.readlines()
                                if lines:
                                    metadata = json.loads(lines[0])
                                    # 计算消息数量（排除第一行元数据）
                                    message_count = len(lines) - 1
                                    all_chats.append({
                                        'name': filename[:-6],
                                        'character': char_name,
                                        'create_date': metadata.get('create_date'),
                                        'title': metadata.get('chat_metadata', {}).get('title'),
                                        'filepath': filepath,
                                        'message_count': message_count
                                    })
        
        # 按创建时间排序
        all_chats.sort(key=lambda x: x.get('create_date', ''), reverse=True)
        return jsonify({'chats': all_chats})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chats/get', methods=['GET'])
def get_chat_from_file():
    """从文件系统获取指定对话内容"""
    try:
        character_name = request.args.get('character')
        chat_name = request.args.get('chat_name')
        
        if not character_name or not chat_name:
            return jsonify({'error': '缺少参数'}), 400
        
        filepath = os.path.join('data/chats', character_name.replace('/', '_'), f'{chat_name}.jsonl')
        
        if not os.path.exists(filepath):
            return jsonify({'error': '对话不存在'}), 404
        
        messages = []
        metadata = {}
        
        with open(filepath, 'r', encoding='utf-8') as f:
            for i, line in enumerate(f):
                data = json.loads(line)
                if i == 0 and 'user_name' in data:
                    # 第一行是元数据
                    metadata = data
                else:
                    # 消息行
                    messages.append({
                        'role': 'user' if data.get('is_user') else 'assistant',
                        'content': data.get('mes', ''),
                        'name': data.get('name'),
                        'send_date': data.get('send_date')
                    })
        
        return jsonify({
            'metadata': metadata,
            'messages': messages
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chats/delete', methods=['DELETE'])
def delete_chat_file():
    """从文件系统删除对话"""
    try:
        character_name = request.args.get('character')
        chat_name = request.args.get('chat_name')
        
        if not character_name or not chat_name:
            return jsonify({'error': '缺少参数'}), 400
        
        filepath = os.path.join('data/chats', character_name.replace('/', '_'), f'{chat_name}.jsonl')
        
        if os.path.exists(filepath):
            os.remove(filepath)
            return jsonify({'status': 'success', 'message': '对话已删除'})
        else:
            return jsonify({'error': '对话不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chats/rename', methods=['POST'])
def rename_chat_file():
    """重命名文件系统中的对话"""
    try:
        data = request.json
        character_name = data.get('character')
        old_name = data.get('old_name')
        new_name = data.get('new_name')
        
        if not all([character_name, old_name, new_name]):
            return jsonify({'error': '缺少参数'}), 400
        
        char_dir = os.path.join('data/chats', character_name.replace('/', '_'))
        old_path = os.path.join(char_dir, f'{old_name}.jsonl')
        new_path = os.path.join(char_dir, f'{new_name}.jsonl')
        
        if not os.path.exists(old_path):
            return jsonify({'error': '原对话不存在'}), 404
        
        if os.path.exists(new_path):
            return jsonify({'error': '新名称已存在'}), 400
        
        os.rename(old_path, new_path)
        return jsonify({'status': 'success', 'message': '对话已重命名'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/preset/delete/<preset_name>', methods=['DELETE'])
def delete_preset(preset_name):
    """删除预设"""
    try:
        # 添加.json扩展名如果没有
        if not preset_name.endswith('.json'):
            preset_name += '.json'
            
        filepath = os.path.join('data/presets', preset_name)
        if os.path.exists(filepath):
            os.remove(filepath)
            return jsonify({
                "status": "success",
                "message": "预设已删除"
            })
        else:
            return jsonify({"error": "预设不存在"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 加载已保存的配置
if os.path.exists('data/config.json'):
    with open('data/config.json', 'r', encoding='utf-8') as f:
        config.update(json.load(f))

if __name__ == '__main__':
    print("服务器启动在 http://localhost:5000")
    app.run(debug=True, port=5000)