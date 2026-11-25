"""
Leaf Isolation, Aspect-Preserving Letterboxing, and In-Field Robustness Pipeline.
Bridges the domain gap between controlled laboratory datasets (PlantVillage)
and in-the-wild agricultural field photography.
"""

import cv2
import numpy as np
from PIL import Image


def letterbox_image(
    image: Image.Image,
    target_size: tuple[int, int] = (224, 224),
    fill_color: tuple[int, int, int] = (148, 148, 152)
) -> Image.Image:
    """
    Resizes an image while strictly preserving its original aspect ratio.
    Pads the remaining margins with a neutral gray tone (RGB 148, 148, 152)
    that precisely matches the PlantVillage laboratory background baseline,
    preventing circular lesion distortion (e.g. concentric rings of Alternaria solani).
    """
    iw, ih = image.size
    tw, th = target_size
    scale = min(tw / iw, th / ih)
    nw = int(iw * scale)
    nh = int(ih * scale)

    resized = image.resize((nw, nh), Image.Resampling.BILINEAR)
    new_image = Image.new("RGB", target_size, fill_color)
    new_image.paste(resized, ((tw - nw) // 2, (th - nh) // 2))
    return new_image


def detect_leaf_roi(image: Image.Image, margin_pct: float = 0.12) -> tuple[Image.Image, bool]:
    """
    Detects the dominant foliage / leaf region using HSV chrominance thresholding
    and contour geometry.

    If the image has substantial outdoor background (bokeh foliage, sky, or soil)
    where the leaf occupies a small portion of the frame, this crops a generous bounding
    region around the leaf with margin_pct padding, scaling it up to match the ~85-90%
    leaf-to-frame ratio seen in PlantVillage.

    Returns:
        (cropped_image, was_cropped): Tuple containing the focused leaf image and a boolean flag.
    """
    np_img = np.array(image.convert("RGB"))
    h, w, _ = np_img.shape
    total_area = h * w

    # Convert to HSV color space
    hsv = cv2.cvtColor(np_img, cv2.COLOR_RGB2HSV)

    # Broad foliage range: green healthy tissue, yellow chlorosis, and brown/orange necrosis
    # Hue: 15-95 (covers brown, yellow, yellow-green, green)
    # Saturation: 20-255 (excludes pure gray/white backgrounds)
    # Value: 20-255 (excludes pure black)
    mask = cv2.inRange(hsv, np.array([12, 20, 20]), np.array([100, 255, 255]))

    # Morphological closure to bridge leaf veins and lesions
    kernel_size = max(5, int(min(w, h) * 0.02))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return image, False

    # Find largest contour
    largest_c = max(contours, key=cv2.contourArea)
    c_area = cv2.contourArea(largest_c)
    area_ratio = c_area / total_area

    # If the leaf is between 10% and 75% of the frame (indicating substantial outdoor background),
    # crop tightly around the leaf with margin to zoom into the leaf pathology
    if 0.10 <= area_ratio <= 0.78:
        bx, by, bw, bh = cv2.boundingRect(largest_c)
        mx = int(bw * margin_pct)
        my = int(bh * margin_pct)

        x0 = max(0, bx - mx)
        y0 = max(0, by - my)
        x1 = min(w, bx + bw + mx)
        y1 = min(h, by + bh + my)

        cropped = image.crop((x0, y0, x1, y1))
        return cropped, True

    return image, False
