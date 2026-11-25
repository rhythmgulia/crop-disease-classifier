"""
Comprehensive test script for:
1. Supported languages and Sarvam voice service definitions
2. Multilingual RAG question answering pipeline
3. EfficientNet-B0 plant disease inference integration
4. Audio & image validation rules
"""

import sys
import os
import io
import asyncio
from pathlib import Path
from PIL import Image

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.paren
sys.path.insert(0, str(BASE_DIR))

from backend.app.core.sarvam import (
    SUPPORTED_LANGUAGES,
    is_sarvam_configured,
    translate_text,
    synthesize_speech,
    encode_multipart_formdata,
    clean_audio_mime_type
)
from backend.app.schemas.scan_schemas import ScanQuestionReques
from backend.app.main import (
    get_supported_languages,
    voice_status,
    ask_scan_question,
    predict_crop_disease,
    SCANS_CACHE,
    model,
    NUM_CLASSES
)
from starlette.datastructures import UploadFile


def test_supported_languages():
    print("--- 1. Testing Supported Languages ---")
    expected_langs = ["en-IN", "hi-IN", "ta-IN", "te-IN", "kn-IN", "bn-IN", "mr-IN", "gu-IN", "pa-IN"]
    resp = get_supported_languages()
    lang_codes = [l.code for l in resp.languages]
    for exp in expected_langs:
        assert exp in lang_codes, f"Expected language {exp} missing!"
    print(f"✓ All {len(expected_langs)} Indic languages present & validated.")


def test_voice_status():
    print("\n--- 2. Testing Voice Service Status ---")
    status = voice_status()
    assert status["models"]["stt"] == "saaras:v4"
    assert status["models"]["tts"] == "bulbul:v4-flash"
    assert status["models"]["translation"] == "mayura:v1"
    assert len(status["supported_languages"]) == 9
    print(f"✓ Models verified: Saaras v4 (STT), Bulbul v4-flash (TTS), Mayura v1 (Translate).")


def test_multipart_encoder():
    print("\n--- 3. Testing Multipart Form-Data Encoder & MIME Sanitizer ---")
    # Test browser codecs parameter stripping
    assert clean_audio_mime_type("audio/webm;codecs=opus") == "audio/webm"
    assert clean_audio_mime_type("audio/webm; codecs=\"opus\"") == "audio/webm"
    assert clean_audio_mime_type("audio/mp4; codecs=mp4a.40.2") == "audio/mp4"
    print("✓ Audio MIME types successfully normalized from browser formats to Sarvam whitelist.")

    fields = {"model": "saaras:v4", "mode": "transcribe"}
    files = {"file": ("test.webm", b"dummy_audio_bytes", clean_audio_mime_type("audio/webm;codecs=opus"))}
    body, ctype = encode_multipart_formdata(fields, files)
    assert b"dummy_audio_bytes" in body
    assert b"saaras:v4" in body
    assert b"Content-Type: audio/webm\r\n" in body
    assert "multipart/form-data; boundary=" in ctype
    print("✓ Multipart form-data encoder successfully generated standard RFC 2046 payload.")


async def test_grounded_rag_english():
    print("\n--- 4. Testing Grounded CIB&RC RAG Pipeline (English) ---")
    # Query about pesticides
    req = ScanQuestionRequest(
        question="Which CIB&RC approved pesticide is recommended and what is the dosage?",
        language_code="en-IN",
        crop_disease_context="Tomato___Late_blight"
    )
    res = await ask_scan_question("test-scan-1", req)
    assert "Metalaxyl" in res.answer or "CIB&RC" in res.answer or "Mancozeb" in res.answer
    assert "PHI" in res.answer or "waiting period" in res.answer
    assert "CIB&RC Master Registry" in res.kb_entry_used
    print(f"✓ Grounded CIB&RC response generated successfully:")
    print(f"  Q: {req.question}")
    print(f"  A: {res.answer[:120]}...")

    # Query about causal microbe
    req_microbe = ScanQuestionRequest(
        question="What is the causal pathogen and microbe organism?",
        language_code="en-IN",
        crop_disease_context="Tomato___Late_blight"
    )
    res_microbe = await ask_scan_question("test-scan-1", req_microbe)
    assert "Phytophthora infestans" in res_microbe.answer
    print(f"✓ Causal microbe lookup verified: {res_microbe.answer[:90]}...")

    # Dynamic Disease Entity Switch Test (User asked about Early Blight when context was Late Blight)
    req_switch = ScanQuestionRequest(
        question="Tell me about tomato early blight.",
        language_code="en-IN",
        crop_disease_context="Tomato___Late_blight"  # Intentionally pass Late Blight contex
    )
    res_switch = await ask_scan_question("test-scan-1", req_switch)
    assert res_switch.detected_disease_class == "Tomato___Early_blight", f"Expected Tomato___Early_blight, got {res_switch.detected_disease_class}"
    assert "Alternaria solani" in res_switch.answer or "Early Blight" in res_switch.answer
    assert "Late Blight" not in res_switch.answer
    print(f"✓ Dynamic entity detection verified: user query about 'tomato early blight' successfully overrode default late blight context!")
    print(f"  A: {res_switch.answer[:120]}...")


async def test_multilingual_query_handling():
    print("\n--- 5. Testing Multilingual Query Handling ---")
    # Test with Hindi language code
    req_hindi = ScanQuestionRequest(
        question="टमाटर की इस बीमारी की दवा क्या है?",
        language_code="hi-IN",
        crop_disease_context="Tomato___Late_blight"
    )
    res_hindi = await ask_scan_question("test-scan-2", req_hindi)
    assert res_hindi.language_code == "hi-IN"
    print(f"✓ Multilingual request processed with language_code='hi-IN'")
    print(f"  Original: {req_hindi.question}")
    print(f"  Answer: {res_hindi.answer[:100]}...")


async def test_efficientnet_inference():
    print("\n--- 6. Testing EfficientNet-B0 Disease Inference ---")
    assert NUM_CLASSES == 38, f"Expected 38 classes, found {NUM_CLASSES}"

    # Generate a dummy RGB plant leaf image (224x224)
    img = Image.new("RGB", (224, 224), color=(34, 139, 34))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    upload_file = UploadFile(
        file=buf,
        size=len(buf.getvalue()),
        filename="test_leaf.jpg",
        headers={"content-type": "image/jpeg"}
    )

    prediction = await predict_crop_disease(upload_file)
    assert prediction.scan_id.startswith("scan-")
    assert prediction.crop is not None
    assert prediction.confidence >= 0.0 and prediction.confidence <= 1.0
    assert prediction.treatment is not None
    assert prediction.severity in ["none", "mild", "moderate", "severe"]
    print(f"✓ Model successfully predicted: {prediction.predicted_class} (Confidence: {prediction.confidence:.2%})")
    print(f"  Severity: {prediction.severity}, Damage: {prediction.damage_percentage}%")
    print(f"  Treatment recommendation: {prediction.treatment.recommendation_text[:90]}...")


def main():
    test_supported_languages()
    test_voice_status()
    test_multipart_encoder()
    asyncio.run(test_grounded_rag_english())
    asyncio.run(test_multilingual_query_handling())
    asyncio.run(test_efficientnet_inference())
    print("\n==========================================")
    print("🎉 ALL ASSISTANT INTEGRATION TESTS PASSED!")
    print("==========================================")


if __name__ == "__main__":
    main()
