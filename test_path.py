import os

# 获取程序所在目录的绝对路径
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')

print("=" * 50)
print("路径测试结果：")
print("=" * 50)
print(f"当前工作目录: {os.getcwd()}")
print(f"程序文件路径: {os.path.abspath(__file__)}")
print(f"程序所在目录: {BASE_DIR}")
print(f"数据目录路径: {DATA_DIR}")
print("=" * 50)

# 检查data目录是否存在
if os.path.exists(DATA_DIR):
    print(f"✓ data目录存在: {DATA_DIR}")
    # 列出data目录下的内容
    print("\ndata目录内容：")
    for item in os.listdir(DATA_DIR):
        item_path = os.path.join(DATA_DIR, item)
        if os.path.isdir(item_path):
            print(f"  [目录] {item}")
        else:
            print(f"  [文件] {item}")
else:
    print(f"✗ data目录不存在: {DATA_DIR}")
    print("将创建data目录...")
    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"✓ 已创建data目录: {DATA_DIR}")