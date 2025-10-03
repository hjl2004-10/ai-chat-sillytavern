"""文档解析模块 - 使用多种策略解析上传文档"""

import contextlib
import hashlib
import io
import json
import os
import shutil
import tempfile
import zipfile
from pathlib import Path

try:
    from docx_extract import extract_from_docx
    DOCX_EXTRACT_AVAILABLE = True
except ImportError:
    DOCX_EXTRACT_AVAILABLE = False
    extract_from_docx = None  # type: ignore[assignment]
    print("提示: 未找到 docx_extract 模块，将使用默认 DOCX 解析流程")

try:
    from unstructured.partition.auto import partition
    UNSTRUCTURED_AVAILABLE = True
except ImportError:
    UNSTRUCTURED_AVAILABLE = False
    partition = None  # type: ignore[assignment]
    print("警告: 未安装 unstructured 库，将使用备用解析流程")

try:
    from PyPDF2 import PdfReader
    PYPDF2_AVAILABLE = True
except ImportError:
    try:
        import PyPDF2  # noqa: F401
        from PyPDF2 import PdfReader  # type: ignore
        PYPDF2_AVAILABLE = True
    except ImportError:
        PYPDF2_AVAILABLE = False
        print("提示: 安装 PyPDF2 可以改进 PDF 解析能力")


class FallbackParser:
    """备用解析器 - 覆盖基础文本格式"""

    @staticmethod
    def parse_text(file_path: str) -> str:
        """解析纯文本，尝试多种常见编码"""
        encodings = ['utf-8', 'utf-16', 'gbk', 'gb2312', 'iso-8859-1']
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as handle:
                    return handle.read()
            except UnicodeDecodeError:
                continue
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as handle:
            return handle.read()

    @staticmethod
    def parse_json(file_path: str) -> str:
        """格式化 JSON 为可读文本"""
        try:
            with open(file_path, 'r', encoding='utf-8') as handle:
                data = json.load(handle)
            return json.dumps(data, ensure_ascii=False, indent=2)
        except json.JSONDecodeError:
            return FallbackParser.parse_text(file_path)
        except Exception as exc:
            return f"JSON解析错误: {exc}"

    @staticmethod
    def _prepare_output_dir(file_path: Path) -> tuple[Path, Path]:
        output_dir = file_path.parent / f"{file_path.stem}_extracted"
        if output_dir.exists():
            shutil.rmtree(output_dir)
        media_dir = output_dir / 'media'
        media_dir.mkdir(parents=True, exist_ok=True)
        return output_dir, media_dir

    @staticmethod
    def _image_extension(filter_name) -> str:
        mapping = {
            '/DCTDecode': 'jpg',
            '/JPXDecode': 'jp2',
            '/FlateDecode': 'png',
            '/CCITTFaxDecode': 'tiff'
        }
        if isinstance(filter_name, list):
            filter_name = filter_name[0] if filter_name else ''
        filter_str = str(filter_name or '').split('[')[0]
        return mapping.get(filter_str, 'bin')

    @staticmethod
    def parse_pdf(file_path: str) -> dict:
        """使用 PyPDF2 提取 PDF 文本与嵌入图片"""
        if not PYPDF2_AVAILABLE:
            return {
                'text': "PDF\u89e3\u6790\u9700\u8981\u5b89\u88c5 PyPDF2: pip install PyPDF2",
                'media_files': [],
                'metadata': {'warning': 'pypdf2_missing'},
                'output_dir': None
            }
        pdf_path = Path(file_path)
        try:
            output_dir, media_dir = FallbackParser._prepare_output_dir(pdf_path)
            reader = PdfReader(file_path)
            media_files: list[str] = []
            page_fragments: list[str] = []
            image_index = 1

            for page_num, page in enumerate(reader.pages, 1):
                page_parts: list[str] = []
                text = page.extract_text() or ''
                if text.strip():
                    page_parts.append(text.strip())

                try:
                    resources = page.get('/Resources')
                    xobject = resources.get('/XObject') if resources else None
                    if xobject is not None:
                        xobject = xobject.get_object()
                except Exception:
                    xobject = None

                if xobject:
                    for name, obj in xobject.items():
                        try:
                            image_obj = obj.get_object()
                        except Exception:
                            image_obj = obj
                        subtype = str(image_obj.get('/Subtype', ''))
                        if subtype != '/Image':
                            continue
                        try:
                            data = image_obj.get_data()
                        except Exception:
                            continue
                        extension = FallbackParser._image_extension(image_obj.get('/Filter'))
                        image_name = f"page_{page_num}_image_{image_index}.{extension}"
                        image_index += 1
                        (media_dir / image_name).write_bytes(data)
                        media_files.append(image_name)
                        page_parts.append(f"[\u56fe\u7247:{image_name}]")

                if page_parts:
                    page_content = '\n'.join(page_parts).strip()
                    page_fragments.append(f"--- \u7b2c{page_num}\u9875 ---\n{page_content}")

            full_text = '\n\n'.join(page_fragments).strip()
            if not full_text:
                full_text = "PDF\u6587\u4ef6\u4e3a\u7a7a\u6216\u65e0\u6cd5\u63d0\u53d6\u6587\u672c"

            text_file = output_dir / 'document.txt'
            text_file.write_text(full_text, encoding='utf-8')

            metadata = {
                'extracted_dir': str(output_dir),
                'media_files': media_files,
                'pages': len(reader.pages)
            }
            return {
                'text': full_text,
                'media_files': media_files,
                'metadata': metadata,
                'output_dir': str(output_dir)
            }
        except Exception as exc:
            if 'output_dir' in locals() and output_dir.exists():
                shutil.rmtree(output_dir, ignore_errors=True)
            return {
                'text': f"PDF\u89e3\u6790\u9519\u8bef: {exc}",
                'media_files': [],
                'metadata': {'error': str(exc)},
                'output_dir': None
            }

    @staticmethod
    def parse_simple(file_path: str) -> dict:
        """根据扩展名选择解析方案"""
        ext = Path(file_path).suffix.lower()
        if ext == '.pdf':
            return FallbackParser.parse_pdf(file_path)
        if ext == '.json':
            return {
                'text': FallbackParser.parse_json(file_path),
                'media_files': [],
                'metadata': {},
                'output_dir': None
            }
        if ext in {'.txt', '.md', '.log', '.csv', '.xml', '.html', '.htm'}:
            return {
                'text': FallbackParser.parse_text(file_path),
                'media_files': [],
                'metadata': {},
                'output_dir': None
            }
        warning = f"\u4e0d\u652f\u6301\u7684\u6587\u4ef6\u683c\u5f0f: {ext}\u3002\u8bf7\u5b89\u88c5 unstructured \u5e93\u4ee5\u652f\u6301\u66f4\u591a\u683c\u5f0f"
        return {
            'text': warning,
            'media_files': [],
            'metadata': {'warning': 'unsupported_format'},
            'output_dir': None
        }


class UniversalDocumentParser:
    """统一文档解析器，优先使用 Unstructured"""

    SUPPORTED_FORMATS = {
        'documents': ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'],
        'text': ['.txt', '.md', '.rtf', '.odt'],
        'web': ['.html', '.htm', '.xml'],
        'images': ['.png', '.jpg', '.jpeg', '.tiff', '.bmp'],
        'email': ['.eml', '.msg'],
        'data': ['.csv', '.json']
    }

    def __init__(self, max_file_size: int = 10 * 1024 * 1024) -> None:
        self.max_file_size = max_file_size
        self.cache = {}

    def get_file_hash(self, file_path: str) -> str:
        """使用 MD5 作为缓存键"""
        with open(file_path, 'rb') as handle:
            return hashlib.md5(handle.read()).hexdigest()

    def is_supported(self, file_path: str) -> bool:
        """检测文件扩展名是否被支持"""
        ext = Path(file_path).suffix.lower()
        return any(ext in values for values in self.SUPPORTED_FORMATS.values())

    def parse(self, file_path: str, use_cache: bool = True) -> dict:
        """文档解析入口"""
        if not os.path.exists(file_path):
            return {"success": False, "error": "文件不存在"}

        file_size = os.path.getsize(file_path)
        if file_size > self.max_file_size:
            return {
                "success": False,
                "error": f"文件过大 ({file_size / 1024 / 1024:.1f}MB)，最大支持 {self.max_file_size / 1024 / 1024:.1f}MB"
            }

        cache_key = None
        if use_cache:
            cache_key = self.get_file_hash(file_path)
            if cache_key in self.cache:
                return self.cache[cache_key]

        result = self._parse_document(file_path)
        result['file_info'] = {
            'name': os.path.basename(file_path),
            'size': file_size,
            'extension': Path(file_path).suffix.lower()
        }

        if use_cache and result.get('success') and cache_key:
            self.cache[cache_key] = result

        return result

    def _parse_document(self, file_path: str) -> dict:
        """内部解析逻辑"""
        extension = Path(file_path).suffix.lower()
        looks_like_docx = extension == '.docx' or (extension == '' and self._looks_like_docx(file_path))

        if DOCX_EXTRACT_AVAILABLE and looks_like_docx:
            docx_result = self._parse_docx_with_tool(file_path)
            if docx_result.get('success'):
                return docx_result

        if UNSTRUCTURED_AVAILABLE:
            result = self._parse_with_unstructured(file_path)
            if result.get('success'):
                return result

        return self._parse_with_fallback(file_path)

    def _parse_with_unstructured(self, file_path: str) -> dict:
        """使用 Unstructured 解析文档"""
        if not UNSTRUCTURED_AVAILABLE or partition is None:
            return {"success": False, "error": "Unstructured 不可用", "parser": "unstructured"}

        try:
            elements = partition(
                filename=file_path,
                include_page_breaks=True,
                strategy="auto"
            )
            text_fragments = []
            tables = []
            metadata = {}

            for element in elements:
                category = getattr(element, 'category', 'Unknown')
                content = str(element)

                if category == 'Table':
                    table_info = {
                        'content': content,
                        'metadata': element.metadata.to_dict() if hasattr(element, 'metadata') and hasattr(element.metadata, 'to_dict') else {}
                    }
                    tables.append(table_info)
                    text_fragments.append(f"[表格]\n{content}")
                else:
                    text_fragments.append(content)

                if hasattr(element, 'metadata'):
                    elem_meta = element.metadata.to_dict() if hasattr(element.metadata, 'to_dict') else {}
                    for key, value in elem_meta.items():
                        metadata.setdefault(key, value)

            full_text = "\n\n".join(text_fragments)
            max_length = 50_000
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
        except Exception as exc:
            return {
                "success": False,
                "error": f"解析失败: {exc}",
                "parser": "unstructured"
            }

    def _parse_with_fallback(self, file_path: str) -> dict:
        """使用备用解析器"""
        try:
            result = FallbackParser.parse_simple(file_path)
            text = result.get('text', '')
            metadata = dict(result.get('metadata', {}))
            media_files = result.get('media_files', [])
            output_dir = result.get('output_dir')
            if output_dir:
                metadata.setdefault('extracted_dir', output_dir)
            if media_files:
                metadata.setdefault('media_files', media_files)
            elements_count = max(len([line for line in text.splitlines() if line.strip()]), 1)
            return {
                "success": True,
                "text": text,
                "tables": [],
                "elements_count": elements_count,
                "metadata": metadata,
                "parser": "fallback"
            }
        except Exception as exc:
            return {
                "success": False,
                "error": f"备用解析失败: {exc}",
                "parser": "fallback"
            }

    def _looks_like_docx(self, file_path: str) -> bool:
        """简单检测文件内容是否为 DOCX"""
        try:
            with zipfile.ZipFile(file_path) as archive:
                return 'word/document.xml' in archive.namelist()
        except zipfile.BadZipFile:
            return False
        except Exception:
            return False

    def _parse_docx_with_tool(self, file_path: str) -> dict:
        """使用 docx_extract 工具解析 DOCX"""
        if extract_from_docx is None:
            return {
                "success": False,
                "error": "docx_extract 模块不可用",
                "parser": "docx_extract"
            }

        docx_path = Path(file_path)
        output_dir = docx_path.parent / f"{docx_path.stem}_extracted"

        try:
            if output_dir.exists():
                shutil.rmtree(output_dir)

            buffer = io.StringIO()
            with contextlib.redirect_stdout(buffer):
                extract_from_docx(docx_path, output_dir, keep_temp=False)

            text_file = output_dir / 'document.txt'
            text_content = text_file.read_text(encoding='utf-8') if text_file.exists() else ''

            media_dir = output_dir / 'media'
            media_files = []
            if media_dir.exists() and media_dir.is_dir():
                for media_path in sorted(media_dir.iterdir()):
                    if media_path.is_file():
                        media_files.append(media_path.name)

            paragraph_count = len([line for line in text_content.splitlines() if line.strip()])
            metadata = {
                'docx_extracted_dir': str(output_dir),
                'extracted_dir': str(output_dir),
                'media_files': media_files
            }
            stdout = buffer.getvalue().strip()
            if stdout:
                metadata['docx_extract_stdout'] = stdout

            return {
                'success': True,
                'text': text_content,
                'tables': [],
                'elements_count': paragraph_count or 1,
                'metadata': metadata,
                'parser': 'docx_extract'
            }
        except Exception as exc:
            return {
                'success': False,
                'error': f'DOCX 解析失败: {exc}',
                'parser': 'docx_extract'
            }

    def parse_from_bytes(self, file_bytes: bytes, file_extension: str) -> dict:
        """保存字节流到临时文件后解析"""
        with tempfile.NamedTemporaryFile(suffix=file_extension, delete=False) as tmp_file:
            tmp_file.write(file_bytes)
            tmp_path = tmp_file.name

        try:
            return self.parse(tmp_path, use_cache=False)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def get_summary(self, text: str, max_length: int = 500) -> str:
        """生成简短摘要"""
        if len(text) <= max_length:
            return text
        truncated = text[:max_length]
        for separator in ['。', '！', '？', '.', '!', '?']:
            idx = truncated.rfind(separator)
            if idx >= int(max_length * 0.8):
                return truncated[:idx + 1] + '...'
        return truncated.rstrip() + '...'


parser = UniversalDocumentParser()


def parse_document(file_path: str) -> dict:
    """提供简单函数调用接口"""
    return parser.parse(file_path)


if __name__ == '__main__':
    sample = 'test.docx'
    if os.path.exists(sample):
        output = parse_document(sample)
        if output.get('success'):
            print('解析成功')
            print(f"文本长度: {len(output.get('text', ''))}")
            print(f"表格数量: {len(output.get('tables', []))}")
        else:
            print(f"解析失败: {output.get('error')}")
    else:
        print(f"请在当前目录放置测试文件: {sample}")
