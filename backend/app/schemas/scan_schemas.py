"""
Pydantic schemas matching PRD API specifications.
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, validator


class TreatmentResponse(BaseModel):
    disease_class: str
    severity: str
    recommendation_text: str
    spray_action: str
    causal_microbe: Optional[str] = None
    pathogen_type: Optional[str] = None
    cibrc_approved_pesticides: Optional[List[str]] = None
    recommended_dosage: Optional[str] = None
    phi_waiting_period_days: Optional[int] = None
    bio_alternative: Optional[str] = None


class DifferentialPrediction(BaseModel):
    disease_class: str
    confidence: float
    crop: str
    condition: str


class PredictResponse(BaseModel):
    scan_id: str
    predicted_class: str
    crop: str
    category: str
    is_healthy: bool
    confidence: float
    is_uncertain: bool
    severity: str
    damage_percentage: float
    treatment: Optional[TreatmentResponse] = None
    gradcam_url: Optional[str] = None
    top_predictions: Optional[List[DifferentialPrediction]] = None
    was_leaf_cropped: Optional[bool] = False
    review_status: Optional[str] = "pending"
    approved_class: Optional[str] = None
    image_url: Optional[str] = None


class SignupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=20)
    role: str = "farmer"
    invite_code: Optional[str] = None

    @validator("password")
    def validate_password_strength(cls, value: str) -> str:
        requirements = (
            any(char.isupper() for char in value),
            any(char.isdigit() for char in value),
            any(not char.isalnum() and not char.isspace() for char in value),
        )
        if not all(requirements):
            raise ValueError("Password must include an uppercase letter, a number, and a symbol.")
        return value


class LoginRequest(BaseModel):
    email: str
    password: str


class ReviewRequest(BaseModel):
    action: str = "approve"


class BatchScanItem(BaseModel):
    image_base64: str
    lat: float
    long: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class BatchPredictResponse(BaseModel):
    zone_results: List[dict]


class ZoneRiskResponse(BaseModel):
    zone_id: str
    risk_score: float
    risk_level: str
    method: str = "rule_based_v1"
    contributing_factors: List[str]


class ScanQuestionRequest(BaseModel):
    question: str
    language_code: Optional[str] = "en-IN"
    scan_id: Optional[str] = None
    crop_disease_context: Optional[str] = None
    synthesize_audio: Optional[bool] = False


class ScanQuestionResponse(BaseModel):
    question: str
    answer: str
    language_code: Optional[str] = "en-IN"
    translated_question_en: Optional[str] = None
    kb_entry_used: Optional[str] = None
    audio_base64: Optional[str] = None
    detected_disease_class: Optional[str] = None


class LanguageItem(BaseModel):
    code: str
    name: str
    native: str


class LanguagesResponse(BaseModel):
    languages: List[LanguageItem]
    default: str = "en-IN"


class TranscribeResponse(BaseModel):
    transcript: str
    language_code: str
    request_id: Optional[str] = None


class SynthesizeRequest(BaseModel):
    text: str
    language_code: Optional[str] = "en-IN"
    speaker: Optional[str] = None


class SynthesizeResponse(BaseModel):
    audio_base64: Optional[str] = None
    format: str = "wav"
    request_id: Optional[str] = None


class MetricsReportResponse(BaseModel):
    macro_f1: float
    accuracy: float
    fruit_macro_f1: float
    plant_macro_f1: float
    total_test_samples: int
    target_met_macro_f1_gte_0_85: bool
    roc_auc_macro: Optional[float] = None
    roc_auc_weighted: Optional[float] = None
    pr_auc_macro: Optional[float] = None
    mean_confidence_correct: Optional[float] = None
    mean_confidence_incorrect: Optional[float] = None
    top5_accuracy: Optional[float] = None
    train_accuracy: Optional[float] = None
    val_accuracy: Optional[float] = None
    test_accuracy: Optional[float] = None
    per_class: Optional[List[dict]] = None
