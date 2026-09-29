"""
Pydantic schemas matching PRD API specifications.
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class TreatmentResponse(BaseModel):
    disease_class: str
    severity: str
    recommendation_text: str
    spray_action: str


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


class ScanQuestionResponse(BaseModel):
    question: str
    answer: str
    kb_entry_used: Optional[str] = None


class MetricsReportResponse(BaseModel):
    macro_f1: float
    accuracy: float
    fruit_macro_f1: float
    plant_macro_f1: float
    total_test_samples: int
    target_met_macro_f1_gte_0_85: bool
    per_class: List[dict]
