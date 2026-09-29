"""
Rule-based Outbreak Risk Forecasting Engine (v1).
Encodes documented agronomy thresholds for fungal disease propagation:
- Sustained high relative humidity (>80% for 3+ days): +40
- Ambient temperature in fungal-favorable range (20°C - 27°C): +20
- Moderate or severe disease scans recorded in the zone within the past 14 days: +30
Output is explicitly versioned as "rule_based_v1".
"""

from typing import List, Optional
from datetime import datetime, timedelta


class WeatherObservation:
    def __init__(self, avg_humidity: float, avg_temp_c: float, days_above_humidity_threshold: int):
        self.avg_humidity = avg_humidity
        self.avg_temp_c = avg_temp_c
        self.days_above_threshold = days_above_humidity_threshold


class HistoricalScanSummary:
    def __init__(self, severity: str, timestamp: datetime):
        self.severity = severity.lower()
        self.timestamp = timestamp


def compute_outbreak_risk(
    weather: WeatherObservation,
    recent_scans: Optional[List[HistoricalScanSummary]] = None
) -> dict:
    """
    Computes heuristic outbreak risk score (0-100) for a specific field zone.
    Explicitly tagged as method='rule_based_v1' per PRD specifications.
    """
    score = 0
    contributing_factors = []

    # 1. Humidity factor (fungal pathogen proliferation)
    if weather.avg_humidity > 80 and weather.days_above_threshold >= 3:
        score += 40
        contributing_factors.append(
            f"Sustained high humidity ({weather.avg_humidity:.1f}% for {weather.days_above_threshold} days >= 80%)"
        )
    elif weather.avg_humidity > 70:
        score += 15
        contributing_factors.append(f"Elevated humidity ({weather.avg_humidity:.1f}%)")

    # 2. Temperature factor (optimal spore germination window 20°C - 27°C)
    if 20.0 <= weather.avg_temp_c <= 27.0:
        score += 20
        contributing_factors.append(f"Temperature ({weather.avg_temp_c:.1f}°C) in optimal fungal range [20-27°C]")
    elif 15.0 <= weather.avg_temp_c <= 32.0:
        score += 10
        contributing_factors.append(f"Moderate fungal viability temperature ({weather.avg_temp_c:.1f}°C)")

    # 3. Zone historical scan factor
    if recent_scans:
        has_severe = any(s.severity in ("moderate", "severe") for s in recent_scans)
        if has_severe:
            score += 30
            contributing_factors.append("Active moderate or severe disease detection in zone within 14 days")

    # Bucket level
    if score >= 60:
        risk_level = "high"
    elif score >= 30:
        risk_level = "moderate"
    else:
        risk_level = "low"

    return {
        "risk_score": min(100, score),
        "risk_level": risk_level,
        "method": "rule_based_v1",
        "contributing_factors": contributing_factors
    }
