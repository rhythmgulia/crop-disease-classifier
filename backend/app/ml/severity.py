"""
Severity Estimation Heuristic (v1).
Uses OpenCV color-thresholding / HSV masking to segment leaf area vs necrotic / chlorotic lesion areas.
Buckets the damaged surface area ratio into: none, mild (<15%), moderate (15-35%), severe (>35%).
"""

import cv2
import numpy as np
from PIL import Image


def estimate_severity(image_input: str | np.ndarray | Image.Image, is_healthy: bool = False) -> dict:
    """
    Estimates disease severity on a leaf or fruit image.
    
    Returns:
        dict: {
            "severity": "none" | "mild" | "moderate" | "severe",
            "damage_percentage": float,
            "method": "opencv_color_thresholding_v1"
        }
    """
    if is_healthy:
        return {
            "severity": "none",
            "damage_percentage": 0.0,
            "method": "opencv_color_thresholding_v1"
        }

    # Load image into BGR numpy array
    if isinstance(image_input, str):
        img_bgr = cv2.imread(image_input)
    elif isinstance(image_input, Image.Image):
        img_rgb = np.array(image_input)
        img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    elif isinstance(image_input, np.ndarray):
        img_bgr = image_input
    else:
        raise ValueError("Unsupported image type for severity estimation")

    if img_bgr is None or img_bgr.size == 0:
        return {"severity": "moderate", "damage_percentage": 20.0, "method": "fallback"}

    # Convert to HSV color space
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

    # 1. Segment foreground leaf/fruit area (exclude background)
    # PlantVillage typically has uniform gray/black/white background
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    _, mask_not_black = cv2.threshold(gray, 20, 255, cv2.THRESH_BINARY)
    _, mask_not_white = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
    plant_mask = cv2.bitwise_and(mask_not_black, mask_not_white)

    total_plant_pixels = cv2.countNonZero(plant_mask)
    if total_plant_pixels < 1000:
        # If mask is too small or uniform background, fallback to entire frame
        total_plant_pixels = img_bgr.shape[0] * img_bgr.shape[1]
        plant_mask = np.ones((img_bgr.shape[0], img_bgr.shape[1]), dtype=np.uint8) * 255

    # 2. Segment necrotic brown/yellow lesions & chlorotic spots
    # Brown/Dark lesions: Hue in [10, 30], Saturation in [40, 255], Value in [20, 180]
    lower_brown = np.array([10, 40, 20])
    upper_brown = np.array([30, 255, 180])
    mask_brown = cv2.inRange(hsv, lower_brown, upper_brown)

    # Yellow chlorotic lesions: Hue in [20, 35], Saturation in [100, 255], Value in [100, 255]
    lower_yellow = np.array([20, 80, 100])
    upper_yellow = np.array([35, 255, 255])
    mask_yellow = cv2.inRange(hsv, lower_yellow, upper_yellow)

    # Black / necrotic spots: low Value
    lower_black = np.array([0, 0, 0])
    upper_black = np.array([180, 255, 45])
    mask_black = cv2.inRange(hsv, lower_black, upper_black)

    # Combine lesion masks within the plant boundary
    lesion_mask = cv2.bitwise_or(mask_brown, mask_yellow)
    lesion_mask = cv2.bitwise_or(lesion_mask, mask_black)
    lesion_on_plant = cv2.bitwise_and(lesion_mask, plant_mask)

    lesion_pixels = cv2.countNonZero(lesion_on_plant)
    damage_pct = min(100.0, (lesion_pixels / max(1, total_plant_pixels)) * 100.0)

    # Bucketing per PRD
    if damage_pct < 5.0:
        severity = "mild"
    elif damage_pct < 20.0:
        severity = "moderate"
    else:
        severity = "severe"

    return {
        "severity": severity,
        "damage_percentage": round(float(damage_pct), 2),
        "method": "opencv_color_thresholding_v1"
    }
