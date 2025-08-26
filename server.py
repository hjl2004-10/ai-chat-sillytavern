from flask import Flask, request, jsonify, Response, stream_with_context, send_from_directory, render_template_string
from flask_cors import CORS
import json
import requests
import time
from datetime import datetime
import os
import uuid
import logging
from logging.handlers import RotatingFileHandler

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# 获取程序所在目录的绝对路径
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
LOGS_DIR = os.path.join(BASE_DIR, 'logs')

# ========== 日志配置 ==========
# 确保日志目录存在
os.makedirs(LOGS_DIR, exist_ok=True)

# 设置日志格式
log_formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# 创建文件处理器（按大小轮转）
file_handler = RotatingFileHandler(
    os.path.join(LOGS_DIR, 'ai_chat.log'),
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5,
    encoding='utf-8'
)
file_handler.setFormatter(log_formatter)
file_handler.setLevel(logging.INFO)

# 创建控制台处理器
console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)
console_handler.setLevel(logging.INFO)

# 配置应用日志
app.logger.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.addHandler(console_handler)

# 创建专门的AI请求日志器
ai_logger = logging.getLogger('AI_REQUESTS')
ai_logger.setLevel(logging.INFO)
ai_logger.addHandler(file_handler)
ai_logger.addHandler(console_handler)

def log_ai_request(endpoint, request_data, response_data=None, error=None):
    """记录AI请求和响应的完整信息（最新的在最上面）"""
    log_entry = {
        'timestamp': datetime.now().isoformat(),
        'endpoint': endpoint,
        'request': request_data,
        'response': response_data,
        'error': str(error) if error else None
    }
    
    # 构建日志内容
    log_lines = []
    log_lines.append("\n" + "="*80)
    log_lines.append(f"AI请求 - 端点: {endpoint}")
    log_lines.append(f"时间: {log_entry['timestamp']}")
    log_lines.append("-"*40)
    log_lines.append("请求体:")
    log_lines.append(json.dumps(request_data, ensure_ascii=False, indent=2))
    
    if response_data:
        log_lines.append("-"*40)
        log_lines.append("响应体:")
        # 如果响应太长，可以截断
        response_str = json.dumps(response_data, ensure_ascii=False, indent=2)
        if len(response_str) > 5000:  # 如果响应超过5000字符
            log_lines.append(response_str[:5000] + "\n... [响应已截断]")
        else:
            log_lines.append(response_str)
    
    if error:
        log_lines.append("-"*40)
        log_lines.append(f"错误: {error}")
    
    log_lines.append("="*80)
    
    # 将新日志内容写入到文件开头
    log_file_path = 'logs/ai_chat.log'
    new_content = "\n".join(log_lines) + "\n\n"
    
    # 读取现有内容
    existing_content = ""
    if os.path.exists(log_file_path):
        try:
            with open(log_file_path, 'r', encoding='utf-8') as f:
                existing_content = f.read()
        except:
            existing_content = ""
    
    # 将新内容写在最前面
    try:
        with open(log_file_path, 'w', encoding='utf-8') as f:
            f.write(new_content + existing_content)
            
        # 限制文件大小，如果超过10MB，只保留最近的5MB
        if len(new_content + existing_content) > 10 * 1024 * 1024:
            with open(log_file_path, 'r', encoding='utf-8') as f:
                content = f.read(5 * 1024 * 1024)  # 只保留前5MB
            with open(log_file_path, 'w', encoding='utf-8') as f:
                f.write(content)
    except Exception as e:
        print(f"写入日志文件失败: {e}")
    
    # 同时输出到控制台（保持原有功能）
    for line in log_lines:
        if error and "错误" in line:
            ai_logger.error(line)
        else:
            ai_logger.info(line)

# 动态配置管理
def load_config():
    """从文件加载配置"""
    config_file = os.path.join(DATA_DIR, 'config.json')
    if os.path.exists(config_file):
        with open(config_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        # 如果配置文件不存在，返回空配置让前端管理
        return {}

def save_config(new_config):
    """保存配置到文件"""
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(os.path.join(DATA_DIR, 'config.json'), 'w', encoding='utf-8') as f:
        json.dump(new_config, f, ensure_ascii=False, indent=2)
    return new_config

# 初始加载配置
config = load_config()

# 聊天历史存储
chats = {}
current_chat_id = None

# 上下文窗口
context_window = []

# 确保数据目录存在
os.makedirs(os.path.join(DATA_DIR, 'chats'), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, 'characters'), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, 'worlds'), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, 'presets'), exist_ok=True)

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
        # 前端发来完整的配置，直接替换
        config = request.json
        print(f"[服务器] 收到前端配置更新:")
        print(f"  API URL: {config.get('api_url')}")
        print(f"  Model: {config.get('model')}")
        print(f"  Temperature: {config.get('temperature')}")
        print(f"  frontend_max_history: {config.get('frontend_max_history')}")
        print(f"  frontend_max_response: {config.get('frontend_max_response')}")
        
        # 保存配置到文件
        save_config(config)
        print(f"[服务器] 配置已保存到 {os.path.join(DATA_DIR, 'config.json')}")
        return jsonify({"status": "success", "config": config})
    else:
        return jsonify(config)

@app.route('/api/models', methods=['GET'])
def get_models():
    """获取可用的模型列表"""
    if not config.get('api_url') or not config.get('api_key'):
        return jsonify({"error": "API未配置"}), 400
    
    endpoint = f"{config['api_url']}/models"
    request_info = {"endpoint": endpoint, "method": "GET"}
    
    try:
        # OpenAI兼容格式
        headers = {
            "Authorization": f"Bearer {config['api_key']}",
            "Content-Type": "application/json"
        }
        
        # 尝试获取模型列表
        response = requests.get(
            endpoint,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 记录成功响应
            log_ai_request(endpoint, request_info, data)
            
            # 提取模型列表
            if 'data' in data:
                models = [model['id'] for model in data['data']]
            else:
                models = []
            return jsonify({"models": models})
        else:
            error_msg = f"Status: {response.status_code}, Body: {response.text}"
            log_ai_request(endpoint, request_info, error=error_msg)
            return jsonify({"models": [], "error": "无法获取模型列表"})
    except Exception as e:
        log_ai_request(endpoint, request_info, error=e)
        return jsonify({"models": [], "error": str(e)})

@app.route('/api/chat/completions', methods=['POST'])
def chat_completions():
    """处理聊天完成请求（OpenAI兼容格式）"""
    data = request.json
    original_request = data.copy()  # 保存原始请求用于日志记录
    messages = data.get('messages', [])
    
    # 添加到上下文窗口
    if messages:
        context_window.extend(messages)
    
    # 构建请求（不发送max_tokens，让服务商自己决定）
    request_data = {
        "model": config.get('model', 'gpt-3.5-turbo'),
        "messages": messages,
        "temperature": data.get('temperature', config.get('temperature', 1.0)),
        "top_p": data.get('top_p', config.get('top_p', 1.0)),
        "stream": data.get('stream', config.get('streaming', True))
    }
    
    # 只有前端明确传入max_tokens时才添加（为了兼容性）
    if 'max_tokens' in data:
        request_data['max_tokens'] = data['max_tokens']
    
    # 不在这里记录请求，改为在实际响应时记录，避免重复
    
    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json"
    }
    
    try:
        if request_data['stream']:
            # 流式响应
            accumulated_content = []  # 累积响应内容用于日志
            
            def generate():
                try:
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
                                
                                # 解析并累积响应内容
                                if line_str != 'data: [DONE]':
                                    try:
                                        chunk_data = json.loads(line_str[6:])
                                        if 'choices' in chunk_data and chunk_data['choices']:
                                            delta = chunk_data['choices'][0].get('delta', {})
                                            if 'content' in delta:
                                                accumulated_content.append(delta['content'])
                                    except:
                                        pass
                    
                    # 流式响应完成后记录
                    complete_response = {
                        "choices": [{
                            "message": {
                                "content": "".join(accumulated_content)
                            }
                        }],
                        "stream": True
                    }
                    log_ai_request(f"{config['api_url']}/chat/completions", original_request, complete_response)
                    
                except Exception as e:
                    log_ai_request(f"{config['api_url']}/chat/completions", original_request, error=e)
                    raise
            
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
                
                # 记录成功的响应
                log_ai_request(f"{config['api_url']}/chat/completions", original_request, result)
                
                # 添加响应到上下文窗口
                if 'choices' in result and result['choices']:
                    assistant_message = {
                        "role": "assistant",
                        "content": result['choices'][0]['message']['content']
                    }
                    context_window.append(assistant_message)
                
                return jsonify(result)
            else:
                # 记录错误响应
                error_msg = f"Status: {response.status_code}, Body: {response.text}"
                log_ai_request(f"{config['api_url']}/chat/completions", original_request, error=error_msg)
                return jsonify({"error": response.text}), response.status_code
                
    except Exception as e:
        # 记录异常
        log_ai_request(f"{config['api_url']}/chat/completions", original_request, error=e)
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
def save_world_book():
    """保存整个世界书（SillyTavern格式）"""
    try:
        data = request.json
        
        # 获取元数据
        metadata = data.get('_metadata', {})
        book_id = metadata.get('id') or f"wb_{uuid.uuid4().hex[:8]}"
        
        # 使用安全的文件名
        safe_id = book_id.replace('/', '_').replace('\\', '_').replace(':', '_')
        filename = f"{safe_id}.json"
        filepath = os.path.join(DATA_DIR, 'worlds', filename)
        
        # 直接保存SillyTavern格式
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            "status": "success",
            "id": book_id,
            "message": "世界书已保存"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/world/save-active', methods=['POST'])
def save_active_world_books():
    """保存激活的世界书状态"""
    try:
        data = request.json
        active_books = data.get('activeWorldBooks', [])
        
        # 保存到配置文件
        active_file = os.path.join(DATA_DIR, 'active_world_books.json')
        with open(active_file, 'w', encoding='utf-8') as f:
            json.dump({
                'activeWorldBooks': active_books,
                'timestamp': data.get('timestamp', '')
            }, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            "status": "success",
            "message": "激活状态已保存"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/world/get-active', methods=['GET'])
def get_active_world_books():
    """获取激活的世界书状态"""
    try:
        active_file = os.path.join(DATA_DIR, 'active_world_books.json')
        if os.path.exists(active_file):
            with open(active_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return jsonify(data)
        else:
            return jsonify({'activeWorldBooks': []})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/world/list', methods=['GET'])
def get_world_list():
    """获取所有世界书"""
    try:
        world_books = []
        worlds_dir = os.path.join(DATA_DIR, 'worlds')
        if os.path.exists(worlds_dir):
            for filename in os.listdir(worlds_dir):
                if filename.endswith('.json'):
                    filepath = os.path.join(DATA_DIR, 'worlds', filename)
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            
                            # 处理SillyTavern格式
                            if 'entries' in data:
                                # 转换为内部格式
                                world_book = {
                                    'id': filename.replace('.json', ''),
                                    'name': data.get('_metadata', {}).get('name', filename.replace('.json', '')),
                                    'description': data.get('_metadata', {}).get('description', ''),
                                    'createDate': data.get('_metadata', {}).get('createDate', ''),
                                    'active': data.get('_metadata', {}).get('active', False),
                                    'entries': [],
                                    'originalFormat': data  # 保存原始格式
                                }
                                
                                # 转换entries
                                if isinstance(data['entries'], dict):
                                    for key, entry in data['entries'].items():
                                        world_book['entries'].append({
                                            'id': f"entry_{entry.get('uid', key)}",
                                            'keys': entry.get('key', []),
                                            'secondary_keys': entry.get('keysecondary', []),
                                            'content': entry.get('content', ''),
                                            'title': entry.get('comment', ''),
                                            'order': entry.get('order', 100),
                                            'position': 'before' if entry.get('position', 0) == 0 else 'after',
                                            'enabled': not entry.get('disable', False),
                                            'probability': entry.get('probability', 100),
                                            'use_probability': entry.get('useProbability', True),
                                            'depth': entry.get('depth', 4),
                                            'constant': entry.get('constant', False),
                                            'selective': entry.get('selective', True),
                                            'case_sensitive': entry.get('caseSensitive'),
                                            'match_whole_words': entry.get('matchWholeWords'),
                                            'exclude_recursion': entry.get('excludeRecursion', False),
                                            'prevent_recursion': entry.get('preventRecursion', False),
                                            'delay_until_recursion': entry.get('delayUntilRecursion', False),
                                            'group': entry.get('group', ''),
                                            'automation_id': entry.get('automationId', ''),
                                            'role': entry.get('role'),
                                            'sticky': entry.get('sticky', 0),
                                            'cooldown': entry.get('cooldown', 0),
                                            'delay': entry.get('delay', 0)
                                        })
                                
                                world_books.append(world_book)
                    except Exception as e:
                        print(f"Error loading {filename}: {e}")
                        continue
        
        return jsonify({"worldBooks": world_books})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/world/import', methods=['POST'])
def import_world_book():
    """导入世界书"""
    try:
        world_book = request.json
        
        # 保存整个世界书为一个文件
        book_id = world_book.get('id', f"wb_{uuid.uuid4().hex[:8]}")
        safe_id = book_id.replace('/', '_').replace('\\', '_').replace(':', '_')
        
        # 保存完整的世界书数据
        world_file = os.path.join(DATA_DIR, 'worlds', f"{safe_id}.json")
        with open(world_file, 'w', encoding='utf-8') as f:
            json.dump(world_book, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            "status": "success",
            "id": book_id,
            "message": f"世界书已导入，包含 {len(world_book.get('entries', []))} 个条目"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/world/delete/<path:world_book_id>', methods=['DELETE'])
def delete_world_book(world_book_id):
    """删除世界书"""
    try:
        # 使用安全的文件名
        safe_id = world_book_id.replace('/', '_').replace('\\', '_').replace(':', '_')
        
        # 直接删除世界书文件
        filepath = os.path.join('data/worlds', f"{safe_id}.json")
        
        if os.path.exists(filepath):
            os.remove(filepath)
            return jsonify({
                "status": "success",
                "message": "世界书已删除"
            })
        else:
            # 文件不存在，可能已被删除
            return jsonify({
                "status": "success",
                "message": "世界书已删除（或不存在）"
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
        filepath = os.path.join(DATA_DIR, 'characters', filename)
        
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
        chars_dir = os.path.join(DATA_DIR, 'characters')
        if os.path.exists(chars_dir):
            for filename in os.listdir(chars_dir):
                if filename.endswith('.json'):
                    filepath = os.path.join(DATA_DIR, 'characters', filename)
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
        filepath = os.path.join(DATA_DIR, 'characters', f"{character_id}.json")
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
        filepath = os.path.join(DATA_DIR, 'characters', f"{character_id}.json")
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
        filepath = os.path.join(DATA_DIR, 'user_persona.json')
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
        filepath = os.path.join(DATA_DIR, 'user_persona.json')
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
        avatar_dir = os.path.join(DATA_DIR, 'avatars')
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
        avatar_dir = os.path.join(DATA_DIR, 'avatars')
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
        filepath = os.path.join(DATA_DIR, 'presets', filename)
        
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
        presets_dir = os.path.join(DATA_DIR, 'presets')
        if os.path.exists(presets_dir):
            for filename in os.listdir(presets_dir):
                if filename.endswith('.json'):
                    filepath = os.path.join(DATA_DIR, 'presets', filename)
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
            
        filepath = os.path.join(DATA_DIR, 'presets', preset_name)
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
        char_dir = os.path.join(DATA_DIR, 'chats', character_name.replace('/', '_'))
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
        
        chats_dir = os.path.join(DATA_DIR, 'chats')
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
        
        filepath = os.path.join(DATA_DIR, 'chats', character_name.replace('/', '_'), f'{chat_name}.jsonl')
        
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
        
        filepath = os.path.join(DATA_DIR, 'chats', character_name.replace('/', '_'), f'{chat_name}.jsonl')
        
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
        
        char_dir = os.path.join(DATA_DIR, 'chats', character_name.replace('/', '_'))
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
            
        filepath = os.path.join(DATA_DIR, 'presets', preset_name)
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
config_path = os.path.join(DATA_DIR, 'config.json')
if os.path.exists(config_path):
    with open(config_path, 'r', encoding='utf-8') as f:
        config.update(json.load(f))

if __name__ == '__main__':
    print("服务器启动在 http://0.0.0.0:5000")
    print("可以通过以下地址访问：")
    print("- http://localhost:5000")
    print("- http://你的IP地址:5000")
    print("日志文件位置: logs/ai_chat.log")
    # host='0.0.0.0' 允许外部访问
    app.run(host='0.0.0.0', debug=True, port=5000)

# ========== 重要提醒 ==========
# 添加新的AI相关接口时，请务必使用 log_ai_request() 函数记录请求和响应
# 示例：
# log_ai_request(endpoint_url, request_data, response_data, error)
# 
# 这将帮助调试和监控AI服务的使用情况
# 日志文件位置：logs/ai_chat.log
# ============================