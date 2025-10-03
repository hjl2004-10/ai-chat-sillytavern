"""Extract text and media from DOCX files with AI vision support."""

from __future__ import annotations

import re
import base64
import mimetypes
import os
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import requests
import xml.etree.ElementTree as ET

WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
VML_NS = "urn:schemas-microsoft-com:vml"
NS_MAP = {"w": WORD_NS, "v": VML_NS}

IMAGE_PLACEHOLDER_TEMPLATE = "【{name}】"
IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".bmp", ".gif", ".webp")


def natural_sort_key(path: Path):
    """自然排序：image1 < image2 < image10"""
    parts = re.split(r'(\d+)', path.stem)
    key = []
    for part in parts:
        if part.isdigit():
            key.append(int(part))
        else:
            key.append(part)
    key.append(path.suffix.lower())
    return key


def make_placeholder(name: Optional[str]) -> str:
    """生成图片占位符"""
    safe_name = name or "image"
    return IMAGE_PLACEHOLDER_TEMPLATE.format(name=safe_name)


def load_relationships(rels_path: Path):
    """加载文档关系映射"""
    relationships = {}
    if not rels_path.exists():
        return relationships
    tree = ET.parse(rels_path)
    root = tree.getroot()
    for rel in root.findall("*"):
        rel_id = rel.attrib.get("Id")
        target = rel.attrib.get("Target")
        if rel_id and target:
            relationships[rel_id] = target
    return relationships


def resolve_image_name(drawing_element, relationships):
    """从drawing元素解析图片文件名（支持多种格式）"""
    # 尝试新版格式 (w:drawing)
    blip = drawing_element.find(f".//{{{DRAWING_NS}}}blip")
    if blip is not None:
        embed_id = blip.attrib.get(f"{{{REL_NS}}}embed")
        if embed_id:
            target = relationships.get(embed_id)
            if target:
                return Path(target).stem

    # 尝试旧版格式 (w:pict / v:imagedata)
    imagedata = drawing_element.find(f".//{{{VML_NS}}}imagedata")
    if imagedata is not None:
        rel_id = imagedata.attrib.get(f"{{{REL_NS}}}id")
        if rel_id:
            target = relationships.get(rel_id)
            if target:
                return Path(target).stem

    # 尝试嵌入对象格式 (w:object / v:shape / v:imagedata)
    shape = drawing_element.find(f".//{{{VML_NS}}}shape")
    if shape is not None:
        imagedata = shape.find(f".//{{{VML_NS}}}imagedata")
        if imagedata is not None:
            rel_id = imagedata.attrib.get(f"{{{REL_NS}}}id")
            if rel_id:
                target = relationships.get(rel_id)
                if target:
                    return Path(target).stem

    return None


def extract_paragraph_text(paragraph, relationships):
    """提取段落文本，图片位置用占位符替换"""
    parts: List[str] = []
    for element in paragraph.iter():
        tag = element.tag
        if tag == f"{{{WORD_NS}}}t" or tag == f"{{{WORD_NS}}}instrText":
            if element.text:
                parts.append(element.text)
        elif tag == f"{{{WORD_NS}}}tab":
            parts.append("\t")
        elif tag == f"{{{WORD_NS}}}br":
            parts.append("\n")
        elif tag == f"{{{WORD_NS}}}drawing" or tag == f"{{{WORD_NS}}}pict" or tag == f"{{{WORD_NS}}}object":
            # 支持多种图片格式：drawing(新版), pict(旧版), object(嵌入对象)
            image_name = resolve_image_name(element, relationships)
            if image_name:
                parts.append(make_placeholder(image_name))
            else:
                parts.append(make_placeholder("image"))
    text = ''.join(parts).replace('\u00A0', ' ').replace('\u2028', '\n')
    return text


def extract_text(doc_xml_path: Path, relationships) -> str:
    """从document.xml提取所有文本"""
    root = ET.parse(doc_xml_path).getroot()
    paragraphs: List[str] = []
    for para in root.findall('.//w:p', NS_MAP):
        text = extract_paragraph_text(para, relationships).strip('\u0000')
        if text.strip():
            paragraphs.append(text)
    return '\n'.join(paragraphs)


def copy_media(media_dir: Path, output_media_dir: Path) -> List[Path]:
    """复制所有媒体文件到输出目录"""
    if not media_dir.exists():
        return []
    output_media_dir.mkdir(parents=True, exist_ok=True)
    copied: List[Path] = []
    for item in sorted(media_dir.iterdir()):
        if item.is_file():
            target = output_media_dir / item.name
            shutil.copy2(item, target)
            copied.append(target)
    return copied


def encode_image_to_data_url(image_path: Path) -> str:
    """将图片编码为base64 data URL"""
    mime_type, _ = mimetypes.guess_type(image_path.name)
    if not mime_type or not mime_type.startswith("image/"):
        raise ValueError(f"Unsupported image type for file: {image_path}")
    b64 = base64.b64encode(image_path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{b64}"


def build_payload(model: str, prompt: str, image_data_url: str) -> Dict[str, object]:
    """构建视觉API请求payload"""
    full_prompt = prompt.strip()
    if "中文" not in full_prompt and "Chinese" not in full_prompt:
        full_prompt = f"{full_prompt}\n\n请用中文回答。"
    return {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": full_prompt},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            }
        ],
        "max_tokens": 512,
        "temperature": 0.2,
    }


def extract_text_from_content(content: Iterable) -> str:
    """从API响应的content中提取文本"""
    texts: List[str] = []
    for part in content:
        if isinstance(part, dict):
            if "text" in part:
                texts.append(str(part["text"]))
            elif part.get("type") == "output_text" and "content" in part:
                texts.append(str(part["content"]))
    return "\n".join(texts).strip()


def parse_response(data: Dict[str, object]) -> str:
    """解析视觉API响应，提取文本描述"""
    if "choices" in data:
        choices = data.get("choices") or []
        if choices:
            message = choices[0].get("message", {})
            content = message.get("content")
            if isinstance(content, str):
                return content
            if isinstance(content, Iterable):
                return extract_text_from_content(content)
    if "output" in data:
        outputs = data.get("output") or []
        texts: List[str] = []
        for item in outputs:
            if isinstance(item, dict) and item.get("type") == "message":
                content = item.get("content")
                if isinstance(content, str):
                    texts.append(content)
                elif isinstance(content, Iterable):
                    texts.append(extract_text_from_content(content))
        return "\n".join(filter(None, texts)).strip()
    raise ValueError("Unable to find text content in response")


def call_vision_api(api_base: str, api_path: str, payload: Dict[str, object], api_key: str) -> Dict[str, object]:
    """调用视觉识图API"""
    url = api_base.rstrip("/") + (api_path if api_path.startswith("/") else f"/{api_path}")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    response = requests.post(url, headers=headers, json=payload, timeout=(10, 60))
    response.raise_for_status()
    return response.json()


def describe_image(
    image_path: Path,
    model: str,
    prompt: str,
    api_base: str,
    api_path: str,
    api_key: str,
) -> str:
    """识别单张图片并返回描述"""
    image_data_url = encode_image_to_data_url(image_path)
    payload = build_payload(model, prompt, image_data_url)
    data = call_vision_api(api_base, api_path, payload, api_key)
    return parse_response(data)


def describe_images(
    image_paths: Sequence[Path],
    vision_config: Optional[Dict[str, str]] = None,
    progress_callback=None
) -> List[Tuple[str, str]]:
    """
    批量识别图片，返回 [(占位符, 描述), ...]

    Args:
        image_paths: 图片路径列表
        vision_config: 识图配置
        progress_callback: 进度回调函数 callback(current, total, image_name, status, message)

    Raises:
        Exception: 识图失败时立即抛出异常
    """
    if not vision_config or not image_paths:
        return []

    total = len(image_paths)

    # 初始化进度
    if progress_callback:
        progress_callback(0, total, "", "starting", f"准备识别 {total} 张图片")

    # 获取配置，提示词可以为空，使用默认值
    api_key = vision_config.get("api_key", "")
    if not api_key:
        error_msg = "未配置识图API密钥"
        print(error_msg)
        if progress_callback:
            progress_callback(0, total, "", "error", error_msg)
        raise ValueError(error_msg)

    model = vision_config.get("model", "")
    if not model:
        error_msg = "未配置识图模型"
        print(error_msg)
        if progress_callback:
            progress_callback(0, total, "", "error", error_msg)
        raise ValueError(error_msg)

    api_base = vision_config.get("api_base", "")
    if not api_base:
        error_msg = "未配置识图API地址"
        print(error_msg)
        if progress_callback:
            progress_callback(0, total, "", "error", error_msg)
        raise ValueError(error_msg)

    # 提示词使用默认值
    prompt = vision_config.get("prompt", "") or "请简要描述这张图片的主要内容和显著细节，并用中文回答，尽量一句话说完。"
    api_path = vision_config.get("api_path", "/v1/chat/completions")

    descriptions: List[Tuple[str, str]] = []

    for index, image_path in enumerate(image_paths, start=1):
        placeholder = make_placeholder(image_path.stem)

        try:
            if progress_callback:
                progress_callback(index, total, image_path.name, "processing", f"正在识别第 {index}/{total} 张图片")

            print(f"正在识别第 {index}/{total} 张图片 ({image_path.name})...")
            description = describe_image(image_path, model, prompt, api_base, api_path, api_key)
            descriptions.append((placeholder, description))

            if progress_callback:
                progress_callback(index, total, image_path.name, "success", "识别成功")

        except Exception as exc:
            error_msg = f"识别 {image_path.name} 失败: {exc}"
            print(error_msg)
            if progress_callback:
                progress_callback(index, total, image_path.name, "error", error_msg)
            # 立即抛出异常，停止后续识别
            raise Exception(error_msg) from exc

    return descriptions


def append_image_descriptions(text_file: Path, descriptions: Sequence[Tuple[str, str]]):
    """将图片描述追加到文本文件末尾"""
    if not descriptions:
        return
    with text_file.open("a", encoding="utf-8") as handle:
        handle.write("\n\n图片说明：\n")
        for placeholder, description in descriptions:
            handle.write(f"{placeholder}: {description}\n")


def extract_from_docx(
    docx_path: Path,
    output_dir: Path,
    keep_temp: bool = False,
    vision_config: Optional[Dict[str, str]] = None,
    enable_vision: bool = False,
    progress_callback=None
):
    """
    从DOCX提取文本和媒体文件

    Args:
        docx_path: DOCX文件路径
        output_dir: 输出目录
        keep_temp: 是否保留临时文件
        vision_config: 识图API配置 {model, prompt, api_base, api_path, api_key}
        enable_vision: 是否启用图片识别
        progress_callback: 进度回调函数 callback(current, total, image_name, status, message)
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    temp_dir = Path(tempfile.mkdtemp(prefix="docx_extract_"))
    temp_docx = temp_dir / "input.docx"
    shutil.copy2(docx_path, temp_docx)

    unzip_dir = temp_dir / "unzipped"
    with zipfile.ZipFile(temp_docx, 'r') as zf:
        zf.extractall(unzip_dir)

    document_xml = unzip_dir / "word" / "document.xml"
    if not document_xml.exists():
        raise FileNotFoundError("word/document.xml not found in DOCX archive")

    relationships = load_relationships(unzip_dir / "word" / "_rels" / "document.xml.rels")
    text_output = extract_text(document_xml, relationships)
    text_file = output_dir / "document.txt"
    text_file.write_text(text_output, encoding="utf-8")

    media_dir = unzip_dir / "word" / "media"
    copied_media = copy_media(media_dir, output_dir / "media")

    # 图片识别（如果启用）
    descriptions: List[Tuple[str, str]] = []
    if enable_vision and copied_media:
        image_files = sorted(
            [path for path in copied_media if path.suffix.lower() in IMAGE_EXTENSIONS],
            key=natural_sort_key
        )
        if image_files:
            descriptions = describe_images(image_files, vision_config, progress_callback)
            append_image_descriptions(text_file, descriptions)

    print(f"Extracted text to: {text_file}")
    if copied_media:
        print(f"Copied {len(copied_media)} media files to: {output_dir / 'media'}")
    else:
        print("No media files found.")

    if descriptions:
        print(f"已附加 {len(descriptions)} 条图片说明到文末。")

    if keep_temp:
        print(f"Temporary workspace kept at: {temp_dir}")
    else:
        shutil.rmtree(temp_dir, ignore_errors=True)
