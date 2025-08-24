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

@app.route('/api/chat/save', methods=['POST'])
def save_chat():
    """保存聊天记录（SillyTavern格式）"""
    data = request.json
    chat_id = data.get('chat_id', str(uuid.uuid4()))
    
    # SillyTavern格式的聊天记录
    chat_data = []
    for msg in context_window:
        chat_entry = {
            "name": "You" if msg['role'] == 'user' else "Assistant",
            "is_user": msg['role'] == 'user',
            "is_system": msg['role'] == 'system',
            "send_date": datetime.now().isoformat(),
            "mes": msg['content'],
            "swipes": [msg['content']],
            "swipe_id": 0,
            "gen_started": datetime.now().isoformat(),
            "gen_finished": datetime.now().isoformat()
        }
        chat_data.append(chat_entry)
    
    # 保存为JSONL格式（SillyTavern使用的格式）
    filename = f"data/chats/chat_{chat_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl"
    with open(filename, 'w', encoding='utf-8') as f:
        for entry in chat_data:
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')
    
    return jsonify({
        "status": "success",
        "chat_id": chat_id,
        "filename": filename
    })

@app.route('/api/chat/load', methods=['POST'])
def load_chat():
    """加载聊天记录"""
    global context_window
    data = request.json
    filename = data.get('filename')
    
    if not filename or not os.path.exists(filename):
        return jsonify({"error": "文件不存在"}), 404
    
    try:
        chat_data = []
        with open(filename, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    entry = json.loads(line)
                    # 转换回标准消息格式
                    message = {
                        "role": "user" if entry.get('is_user') else "assistant",
                        "content": entry.get('mes', '')
                    }
                    chat_data.append(message)
        
        context_window = chat_data
        return jsonify({
            "status": "success",
            "messages": context_window
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat/list', methods=['GET'])
def list_chats():
    """列出所有聊天记录"""
    try:
        files = []
        if os.path.exists('data/chats'):
            for filename in os.listdir('data/chats'):
                if filename.endswith('.jsonl'):
                    filepath = os.path.join('data/chats', filename)
                    files.append({
                        "filename": filepath,
                        "name": filename,
                        "modified": os.path.getmtime(filepath),
                        "size": os.path.getsize(filepath)
                    })
        
        # 按修改时间排序
        files.sort(key=lambda x: x['modified'], reverse=True)
        return jsonify({"chats": files})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 加载已保存的配置
if os.path.exists('data/config.json'):
    with open('data/config.json', 'r', encoding='utf-8') as f:
        config.update(json.load(f))

if __name__ == '__main__':
    print("服务器启动在 http://localhost:5000")
    app.run(debug=True, port=5000)