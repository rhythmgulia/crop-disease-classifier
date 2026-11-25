"""
Sarvam AI Integration Service
Provides Speech-to-Text (Saaras v4), Text-to-Speech (Bulbul v4-flash),
and Text Translation (Mayura v1) using Sarvam AI APIs.
"""

import os
import ssl
import json
import uuid
import logging
import urllib.reques
import urllib.error
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("sarvam_service")

# Ensure macOS system root CA bundle is loaded if Python doesn't have it linked
for _ca_path in ["/etc/ssl/cert.pem", "/private/etc/ssl/cert.pem"]:
    if os.path.isfile(_ca_path) and not os.environ.get("SSL_CERT_FILE"):
        os.environ["SSL_CERT_FILE"] = _ca_path
        break

# Auto-load .env file if presen
def _load_dotenv_if_exists():
    potential_paths = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent.parent.parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env"
    ]
    for p in potential_paths:
        if p.is_file():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip('"').strip("'")
                            if k:
                                os.environ[k] = v
                break
            except Exception as e:
                logger.warning(f"Error reading {p}: {e}")

_load_dotenv_if_exists()

# Supported Indic languages verified for both Saaras v4 STT & Bulbul v4-flash TTS
SUPPORTED_LANGUAGES = {
    "en-IN": {"name": "English", "native": "English"},
    "hi-IN": {"name": "Hindi", "native": "हिन्दी"},
    "ta-IN": {"name": "Tamil", "native": "தமிழ்"},
    "te-IN": {"name": "Telugu", "native": "తెలుగు"},
    "kn-IN": {"name": "Kannada", "native": "ಕನ್ನಡ"},
    "bn-IN": {"name": "Bengali", "native": "বাংলা"},
    "mr-IN": {"name": "Marathi", "native": "मराठी"},
    "gu-IN": {"name": "Gujarati", "native": "ગુજરાતી"},
    "pa-IN": {"name": "Punjabi", "native": "ਪੰਜਾਬੀ"}
}

SARVAM_BASE_URL = "https://api.sarvam.ai"
SARVAM_TRANSLATE_URL = f"{SARVAM_BASE_URL}/translate"
SARVAM_STT_URL = f"{SARVAM_BASE_URL}/speech-to-text"
SARVAM_TTS_URL = f"{SARVAM_BASE_URL}/text-to-speech"


def get_sarvam_api_key() -> str:
    key = os.getenv("SARVAM_API_KEY", "").strip()
    if not key:
        _load_dotenv_if_exists()
        key = os.getenv("SARVAM_API_KEY", "").strip()
    return key


def is_sarvam_configured() -> bool:
    return bool(get_sarvam_api_key())


SARVAM_ALLOWED_AUDIO_TYPES = {
    'audio/mpeg', 'audio/mp3', 'audio/mpeg3', 'audio/x-mpeg-3', 'audio/x-mp3',
    'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/pcm_s16le', 'audio/l16',
    'audio/raw', 'application/octet-stream', 'audio/aac', 'audio/x-aac',
    'audio/aiff', 'audio/x-aiff', 'audio/ogg', 'audio/opus', 'audio/flac',
    'audio/x-flac', 'audio/mp4', 'audio/x-m4a', 'audio/amr', 'audio/x-ms-wma',
    'audio/webm', 'video/webm'
}


def clean_audio_mime_type(mime_type: str, filename: str = "audio.webm") -> str:
    """
    Cleans and standardizes MIME type to match Sarvam AI STT whitelist.
    Strips parameters like ';codecs=opus' from browser MediaRecorder output.
    """
    if not mime_type:
        mime_type = "audio/webm"
    base_type = mime_type.split(";")[0].strip().lower()
    if base_type in SARVAM_ALLOWED_AUDIO_TYPES:
        return base_type

    ext = os.path.splitext(filename)[1].lower().lstrip(".")
    ext_map = {
        "webm": "audio/webm",
        "wav": "audio/wav",
        "mp3": "audio/mp3",
        "mp4": "audio/mp4",
        "m4a": "audio/x-m4a",
        "ogg": "audio/ogg",
        "opus": "audio/opus",
        "flac": "audio/flac",
        "aac": "audio/aac"
    }
    return ext_map.get(ext, "audio/webm")


def encode_multipart_formdata(fields: Dict[str, Any], files: Dict[str, tuple]) -> tuple[bytes, str]:
    """
    Standard RFC 2046 multipart/form-data encoder using Python standard library.
    files format: {field_name: (filename, bytes_content, content_type)}
    """
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    lines = []

    for key, val in fields.items():
        if val is None:
            continue
        lines.append(f"--{boundary}".encode("utf-8"))
        lines.append(f'Content-Disposition: form-data; name="{key}"'.encode("utf-8"))
        lines.append(b"")
        lines.append(str(val).encode("utf-8"))

    for key, (filename, file_bytes, content_type) in files.items():
        lines.append(f"--{boundary}".encode("utf-8"))
        lines.append(f'Content-Disposition: form-data; name="{key}"; filename="{filename}"'.encode("utf-8"))
        lines.append(f"Content-Type: {content_type}".encode("utf-8"))
        lines.append(b"")
        lines.append(file_bytes)

    lines.append(f"--{boundary}--".encode("utf-8"))
    lines.append(b"")
    body = b"\r\n".join(lines)
    content_type_header = f"multipart/form-data; boundary={boundary}"
    return body, content_type_header


def get_ssl_context() -> ssl.SSLContext:
    """
    Creates an SSL context that reliably finds CA certificates across macOS, Linux, and Windows.
    Falls back gracefully if system CA bundles are unlinked in the Python environment.
    """
    ca_candidates = [
        os.environ.get("SSL_CERT_FILE"),
        "/etc/ssl/cert.pem",
        "/private/etc/ssl/cert.pem",
        "/etc/ssl/certs/ca-certificates.crt",
        "/etc/pki/tls/certs/ca-bundle.crt"
    ]
    for ca_path in ca_candidates:
        if ca_path and os.path.isfile(ca_path):
            try:
                return ssl.create_default_context(cafile=ca_path)
            except Exception as e:
                logger.debug(f"Failed to initialize SSL context with {ca_path}: {e}")
                continue

    try:
        return ssl.create_default_context()
    except Exception:
        return ssl._create_unverified_context()


def safe_urlopen(req: urllib.request.Request, timeout: int = 30):
    """
    Safely executes an HTTPS request using the verified system SSL context.
    If local certificate chain verification fails due to unlinked macOS certificates,
    automatically retries with an unverified context to ensure uninterrupted service.
    """
    ctx = get_ssl_context()
    try:
        return urllib.request.urlopen(req, timeout=timeout, context=ctx)
    except urllib.error.URLError as e:
        err_str = str(e)
        if "CERTIFICATE_VERIFY_FAILED" in err_str or "certificate verify failed" in err_str:
            logger.warning("Local SSL certificate verification failed; retrying with unverified context.")
            unverified_ctx = ssl._create_unverified_context()
            return urllib.request.urlopen(req, timeout=timeout, context=unverified_ctx)
        raise


def translate_chunk(text: str, source_language_code: str, target_language_code: str, mode: str = "formal") -> str:
    """Translates a single text segment (<= 1000 characters) via Sarvam Mayura v1."""
    api_key = get_sarvam_api_key()
    if not api_key:
        logger.warning("SARVAM_API_KEY not configured; returning untranslated text.")
        return tex

    payload = {
        "input": text,
        "source_language_code": source_language_code,
        "target_language_code": target_language_code,
        "model": "mayura:v1",
        "mode": mode
    }

    req = urllib.request.Request(
        SARVAM_TRANSLATE_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-subscription-key": api_key,
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with safe_urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("translated_text", text)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        logger.error(f"Sarvam translation HTTP error {e.code}: {err_body}")
        return tex
    except Exception as e:
        logger.error(f"Sarvam translation network exception: {e}")
        return tex


def translate_text(text: str, source_language_code: str, target_language_code: str, mode: str = "formal") -> str:
    """
    Translates text between supported Indian languages / English.
    Handles chunking if text length exceeds 900 characters for Mayura v1.
    """
    if not text or not text.strip():
        return tex

    if source_language_code == target_language_code:
        return tex

    # Mayura limit is 1,000 characters per request; split by sentences or paragraphs if needed
    if len(text) <= 900:
        return translate_chunk(text, source_language_code, target_language_code, mode=mode)

    # Chunking by periods / newlines
    paragraphs = text.split("\n")
    translated_paras = []
    for p in paragraphs:
        if not p.strip():
            translated_paras.append("")
            continue
        if len(p) <= 900:
            translated_paras.append(translate_chunk(p, source_language_code, target_language_code, mode=mode))
        else:
            # Further split long paragraph by sentences
            sentences = p.split(". ")
            current_chunk = []
            chunk_len = 0
            trans_chunk_list = []
            for s in sentences:
                s_full = s if s.endswith(".") else s + "."
                if chunk_len + len(s_full) > 850 and current_chunk:
                    chunk_text = " ".join(current_chunk)
                    trans_chunk_list.append(translate_chunk(chunk_text, source_language_code, target_language_code, mode=mode))
                    current_chunk = [s_full]
                    chunk_len = len(s_full)
                else:
                    current_chunk.append(s_full)
                    chunk_len += len(s_full)
            if current_chunk:
                chunk_text = " ".join(current_chunk)
                trans_chunk_list.append(translate_chunk(chunk_text, source_language_code, target_language_code, mode=mode))
            translated_paras.append(" ".join(trans_chunk_list))

    return "\n".join(translated_paras)


def transcribe_audio(
    audio_bytes: bytes,
    filename: str = "audio.webm",
    mime_type: str = "audio/webm",
    language_code: str = "unknown"
) -> Dict[str, Any]:
    """
    Transcribes spoken audio into text using Sarvam Saaras v4.
    Supports code-mixed speech, automatic language detection ('unknown'), or explicit language code.
    """
    api_key = get_sarvam_api_key()
    if not api_key:
        raise ValueError("SARVAM_API_KEY is not configured on the backend.")

    fields = {
        "model": "saaras:v4",
        "language_code": language_code if language_code else "unknown",
        "mode": "transcribe"
    }
    clean_mime = clean_audio_mime_type(mime_type, filename)
    files = {
        "file": (filename, audio_bytes, clean_mime)
    }

    body, content_type = encode_multipart_formdata(fields, files)

    req = urllib.request.Request(
        SARVAM_STT_URL,
        data=body,
        headers={
            "api-subscription-key": api_key,
            "Content-Type": content_type
        },
        method="POST"
    )

    try:
        with safe_urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {
                "transcript": data.get("transcript", ""),
                "language_code": data.get("language_code", language_code),
                "request_id": data.get("request_id")
            }
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        logger.error(f"Sarvam STT HTTP error {e.code}: {err_body}")
        raise RuntimeError(f"Sarvam STT Error ({e.code}): {err_body}")
    except Exception as e:
        logger.error(f"Sarvam STT network exception: {e}")
        raise RuntimeError(f"Sarvam STT Failed: {str(e)}")


def synthesize_speech(
    text: str,
    language_code: str = "en-IN",
    speaker: Optional[str] = None
) -> Dict[str, Any]:
    """
    Converts text to speech using Sarvam Bulbul v4-flash.
    Returns base64 encoded audio string.
    """
    api_key = get_sarvam_api_key()
    if not api_key:
        raise ValueError("SARVAM_API_KEY is not configured on the backend.")

    # Bulbul max length is 2,500 characters
    truncated_text = text.strip()[:2400]

    payload: Dict[str, Any] = {
        "text": truncated_text,
        "language_code": language_code if language_code in SUPPORTED_LANGUAGES else "en-IN",
        "model": "bulbul:v4-flash"
    }

    if speaker:
        payload["speaker"] = speaker

    req = urllib.request.Request(
        SARVAM_TTS_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-subscription-key": api_key,
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with safe_urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            audios = data.get("audios", [])
            audio_b64 = audios[0] if audios else None
            return {
                "audio_base64": audio_b64,
                "format": "wav",
                "request_id": data.get("request_id")
            }
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        logger.error(f"Sarvam TTS HTTP error {e.code}: {err_body}")
        raise RuntimeError(f"Sarvam TTS Error ({e.code}): {err_body}")
    except Exception as e:
        logger.error(f"Sarvam TTS network exception: {e}")
        raise RuntimeError(f"Sarvam TTS Failed: {str(e)}")
