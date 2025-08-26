#!/usr/bin/env python3
"""
数据调试脚本 - 检查服务器上的数据加载问题
"""

import os
import json
import sys

def debug_data():
    print("="*60)
    print("数据加载调试工具")
    print("="*60)
    
    # 1. 检查Python版本和当前目录
    print(f"\nPython版本: {sys.version}")
    print(f"当前工作目录: {os.getcwd()}")
    print(f"脚本位置: {os.path.abspath(__file__)}")
    
    # 2. 检查data目录
    data_path = os.path.join(os.getcwd(), 'data')
    print(f"\n检查data目录: {data_path}")
    
    if not os.path.exists(data_path):
        print("❌ data目录不存在！")
        
        # 尝试查找data目录
        print("\n正在搜索可能的data目录...")
        for root, dirs, files in os.walk(os.getcwd()):
            if 'data' in dirs:
                possible_path = os.path.join(root, 'data')
                print(f"  找到: {possible_path}")
                
                # 检查这个data目录是否包含预期的子目录
                expected_dirs = ['characters', 'worlds', 'chats', 'presets']
                has_expected = any(os.path.exists(os.path.join(possible_path, d)) for d in expected_dirs)
                if has_expected:
                    print(f"    ✓ 这可能是正确的data目录")
                    
        return
    
    print("✓ data目录存在")
    
    # 3. 检查目录权限
    print(f"\n检查权限:")
    print(f"  可读: {os.access(data_path, os.R_OK)}")
    print(f"  可写: {os.access(data_path, os.W_OK)}")
    print(f"  可执行: {os.access(data_path, os.X_OK)}")
    
    # 4. 检查子目录和文件
    print(f"\n检查子目录内容:")
    subdirs = {
        'characters': '角色卡',
        'worlds': '世界书',
        'chats': '对话历史',
        'presets': '预设'
    }
    
    total_files = 0
    for subdir, name in subdirs.items():
        subdir_path = os.path.join(data_path, subdir)
        if os.path.exists(subdir_path):
            try:
                files = os.listdir(subdir_path)
                json_files = [f for f in files if f.endswith(('.json', '.jsonl'))]
                total_files += len(json_files)
                
                print(f"\n  {name} ({subdir}/):")
                print(f"    目录存在: ✓")
                print(f"    文件数量: {len(json_files)}")
                
                # 显示前3个文件
                for f in json_files[:3]:
                    file_path = os.path.join(subdir_path, f)
                    size = os.path.getsize(file_path) / 1024  # KB
                    print(f"      - {f} ({size:.1f} KB)")
                    
                    # 尝试读取文件验证
                    try:
                        with open(file_path, 'r', encoding='utf-8') as fp:
                            if f.endswith('.json'):
                                json.load(fp)
                                print(f"        ✓ JSON格式正确")
                            else:
                                fp.readline()
                                print(f"        ✓ 文件可读")
                    except Exception as e:
                        print(f"        ❌ 读取错误: {e}")
                        
                if len(json_files) > 3:
                    print(f"      ... 还有 {len(json_files) - 3} 个文件")
                    
            except Exception as e:
                print(f"\n  {name} ({subdir}/):")
                print(f"    ❌ 错误: {e}")
        else:
            print(f"\n  {name} ({subdir}/):")
            print(f"    ❌ 目录不存在")
    
    # 5. 检查config.json
    print(f"\n\n检查配置文件:")
    config_path = os.path.join(data_path, 'config.json')
    if os.path.exists(config_path):
        print(f"  config.json: ✓ 存在")
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                print(f"    API Base: {config.get('api_base', '未设置')}")
                print(f"    Model: {config.get('model', '未设置')}")
                print(f"    Streaming: {config.get('streaming', '未设置')}")
        except Exception as e:
            print(f"    ❌ 读取错误: {e}")
    else:
        print(f"  config.json: ❌ 不存在")
    
    # 6. 测试创建文件
    print(f"\n\n测试文件写入:")
    test_file = os.path.join(data_path, 'test_write.tmp')
    try:
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write("测试写入")
        print(f"  ✓ 可以创建和写入文件")
        os.remove(test_file)
        print(f"  ✓ 可以删除文件")
    except Exception as e:
        print(f"  ❌ 写入测试失败: {e}")
    
    # 7. 总结
    print(f"\n" + "="*60)
    print(f"总结:")
    print(f"  找到 {total_files} 个数据文件")
    
    if total_files == 0:
        print(f"\n⚠️ 没有找到任何数据文件！")
        print(f"可能的原因：")
        print(f"  1. data文件夹复制时内容丢失")
        print(f"  2. 文件权限问题")
        print(f"  3. 路径配置错误")
        print(f"\n解决方案：")
        print(f"  1. 重新复制整个data文件夹")
        print(f"  2. 确保在正确的目录运行server.py")
        print(f"  3. 检查文件权限（Linux/Mac需要chmod -R 755 data）")
    else:
        print(f"\n✓ 数据文件存在，如果仍无法加载，可能是：")
        print(f"  1. 前端请求的API路径不正确")
        print(f"  2. 服务器端口或地址配置问题")
        print(f"  3. 跨域请求被阻止")
    
    print("="*60)

if __name__ == "__main__":
    debug_data()