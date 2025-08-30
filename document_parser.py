"""
文档解析模块 - 使用Unstructured统一解析各种文档格式
支持: PDF, Word, PPT, Excel, HTML, TXT, Markdown, 图片等
"""

import os
import tempfile
import hashlib
import json
from pathlib import Path

try:
    from unstructured.partition.auto import partition
    UNSTRUCTURED_AVAILABLE = True
except ImportError:
    UNSTRUCTURED_AVAILABLE = False
    print("警告: Unstructured未安装，尝试使用备用解析器")

# 尝试导入PyPDF2作为PDF备用方案
try:
    from PyPDF2 import PdfReader
    PYPDF2_AVAILABLE = True
except ImportError:
    try:
        import PyPDF2
        from PyPDF2 import PdfReader
        PYPDF2_AVAILABLE = True
    except ImportError:
        PYPDF2_AVAILABLE = False
        print("提示: 安装 PyPDF2 可支持PDF解析: pip install PyPDF2")

# 备用解析器（当Unstructured不可用时）
class FallbackParser:
    """备用解析器 - 支持基础文本格式"""
    
    @staticmethod
    def parse_text(file_path):
        """解析纯文本文件"""
        encodings = ['utf-8', 'gbk', 'gb2312', 'iso-8859-1']
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    return f.read()
            except UnicodeDecodeError:
                continue
        return "无法解码文件"
    
    @staticmethod
    def parse_json(file_path):
        """解析JSON文件并格式化"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            # 格式化JSON为易读的文本
            return json.dumps(data, ensure_ascii=False, indent=2)
        except json.JSONDecodeError:
            # 如果不是有效JSON，作为文本处理
            return FallbackParser.parse_text(file_path)
        except Exception as e:
            return f"JSON解析错误: {str(e)}"
    
    @staticmethod
    def parse_pdf(file_path):
        """尝试解析PDF文件"""
        if PYPDF2_AVAILABLE:
            try:
                reader = PdfReader(file_path)
                text = ""
                for page_num, page in enumerate(reader.pages, 1):
                    page_text = page.extract_text()
                    if page_text:
                        text += f"\n--- 第 {page_num} 页 ---\n{page_text}"
                return text if text else "PDF文件为空或无法提取文字"
            except Exception as e:
                return f"PDF解析错误: {str(e)}"
        else:
            return "PDF解析需要安装 PyPDF2: pip install PyPDF2"
    
    @staticmethod
    def parse_simple(file_path):
        """简单解析"""
        ext = Path(file_path).suffix.lower()
        
        if ext == '.pdf':
            return FallbackParser.parse_pdf(file_path)
        elif ext == '.json':
            return FallbackParser.parse_json(file_path)
        elif ext in ['.txt', '.md', '.log', '.csv', '.xml', '.html', '.htm']:
            return FallbackParser.parse_text(file_path)
        else:
            return f"不支持的文件格式: {ext}。请安装 unstructured 库以支持更多格式。"


class UniversalDocumentParser:
    """
    统一文档解析器
    使用Unstructured库自动识别并解析各种文档格式
    """
    
    # 支持的文件格式
    SUPPORTED_FORMATS = {
        'documents': ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'],
        'text': ['.txt', '.md', '.rtf', '.odt'],
        'web': ['.html', '.htm', '.xml'],
        'images': ['.png', '.jpg', '.jpeg', '.tiff', '.bmp'],
        'email': ['.eml', '.msg'],
        'data': ['.csv', '.json']
    }
    
    def __init__(self, max_file_size=10*1024*1024):  # 默认10MB限制
        self.max_file_size = max_file_size
        self.cache = {}  # 简单缓存
    
    def get_file_hash(self, file_path):
        """计算文件哈希值用于缓存"""
        with open(file_path, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
    
    def is_supported(self, file_path):
        """检查文件格式是否支持"""
        ext = Path(file_path).suffix.lower()
        for category, extensions in self.SUPPORTED_FORMATS.items():
            if ext in extensions:
                return True
        return False
    
    def parse(self, file_path, use_cache=True):
        """
        解析文档主方法
        
        Args:
            file_path: 文件路径
            use_cache: 是否使用缓存
            
        Returns:
            dict: 包含解析结果的字典
        """
        # 检查文件是否存在
        if not os.path.exists(file_path):
            return {
                "success": False,
                "error": "文件不存在"
            }
        
        # 检查文件大小
        file_size = os.path.getsize(file_path)
        if file_size > self.max_file_size:
            return {
                "success": False,
                "error": f"文件过大 ({file_size/1024/1024:.1f}MB)，最大支持 {self.max_file_size/1024/1024:.1f}MB"
            }
        
        # 检查缓存
        if use_cache:
            file_hash = self.get_file_hash(file_path)
            if file_hash in self.cache:
                return self.cache[file_hash]
        
        # 解析文档
        result = self._parse_document(file_path)
        
        # 添加文件信息
        result['file_info'] = {
            'name': os.path.basename(file_path),
            'size': file_size,
            'extension': Path(file_path).suffix.lower()
        }
        
        # 缓存结果
        if use_cache and result.get('success'):
            self.cache[file_hash] = result
        
        return result
    
    def _parse_document(self, file_path):
        """内部解析方法"""
        if UNSTRUCTURED_AVAILABLE:
            return self._parse_with_unstructured(file_path)
        else:
            return self._parse_with_fallback(file_path)
    
    def _parse_with_unstructured(self, file_path):
        """使用Unstructured库解析"""
        try:
            # 自动识别文件类型并解析
            elements = partition(
                filename=file_path,
                include_page_breaks=True,  # 包含分页信息
                strategy="auto"  # 自动选择最佳策略
            )
            
            # 提取纯文本
            text_content = []
            tables = []
            metadata = {}
            
            for element in elements:
                # 获取元素类型
                category = getattr(element, 'category', 'Unknown')
                
                if category == "Table":
                    # 特殊处理表格
                    tables.append({
                        'content': str(element),
                        'metadata': element.metadata.to_dict() if hasattr(element, 'metadata') else {}
                    })
                    text_content.append(f"[表格]\n{str(element)}")
                else:
                    text_content.append(str(element))
                
                # 收集元数据
                if hasattr(element, 'metadata'):
                    elem_meta = element.metadata.to_dict() if hasattr(element.metadata, 'to_dict') else {}
                    for key, value in elem_meta.items():
                        if key not in metadata:
                            metadata[key] = value
            
            # 组合文本
            full_text = "\n\n".join(text_content)
            
            # 智能截断（保留关键信息）
            max_length = 50000  # 最大5万字符
            if len(full_text) > max_length:
                full_text = full_text[:max_length] + "\n\n[文档内容过长，已截断...]"
            
            return {
                "success": True,
                "text": full_text,
                "tables": tables,
                "elements_count": len(elements),
                "metadata": metadata,
                "parser": "unstructured"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"解析失败: {str(e)}",
                "parser": "unstructured"
            }
    
    def _parse_with_fallback(self, file_path):
        """使用备用解析器"""
        try:
            text = FallbackParser.parse_simple(file_path)
            return {
                "success": True,
                "text": text,
                "tables": [],
                "elements_count": 1,
                "metadata": {},
                "parser": "fallback"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"备用解析失败: {str(e)}",
                "parser": "fallback"
            }
    
    def parse_from_bytes(self, file_bytes, file_extension):
        """从字节流解析文档"""
        # 创建临时文件
        with tempfile.NamedTemporaryFile(suffix=file_extension, delete=False) as tmp_file:
            tmp_file.write(file_bytes)
            tmp_path = tmp_file.name
        
        try:
            # 解析临时文件
            result = self.parse(tmp_path, use_cache=False)
        finally:
            # 清理临时文件
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        
        return result
    
    def get_summary(self, text, max_length=500):
        """获取文本摘要"""
        if len(text) <= max_length:
            return text
        
        # 智能截断 - 尝试在句号处截断
        truncated = text[:max_length]
        last_period = truncated.rfind('。')
        if last_period > max_length * 0.8:  # 如果句号在80%之后
            truncated = truncated[:last_period + 1]
        
        return truncated + "..."


# 单例实例
parser = UniversalDocumentParser()


# 便捷函数
def parse_document(file_path):
    """便捷解析函数"""
    return parser.parse(file_path)


# 测试代码
if __name__ == "__main__":
    # 测试解析
    test_file = "test.pdf"  # 替换为实际文件
    if os.path.exists(test_file):
        result = parse_document(test_file)
        if result['success']:
            print(f"解析成功！")
            print(f"文本长度: {len(result['text'])}")
            print(f"表格数量: {len(result.get('tables', []))}")
            print(f"前500字符: {result['text'][:500]}")
        else:
            print(f"解析失败: {result['error']}")
    else:
        print(f"请创建测试文件: {test_file}")