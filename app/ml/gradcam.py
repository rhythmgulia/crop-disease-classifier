"""
Grad-CAM (Gradient-weighted Class Activation Mapping) for EfficientNet-B0.
Hooks into the final convolutional feature maps (features[-1]), computes class-specific gradients,
and overlays a colormapped heatmap onto the original image.
"""

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image


class GradCAM:
    """
    Grad-CAM generator specifically hooked to EfficientNet-B0's final convolutional layer.
    """

    def __init__(self, model: nn.Module, target_layer: nn.Module = None):
        self.model = model
        # For torchvision efficientnet_b0, features[-1] is the last Conv2dNormActivation layer
        if target_layer is None:
            self.target_layer = self.model.backbone.features[-1]
        else:
            self.target_layer = target_layer

        self.gradients = None
        self.activations = None
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, input, output):
            self.activations = output.detach()

        def backward_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0].detach()

        self.target_layer.register_forward_hook(forward_hook)
        self.target_layer.register_full_backward_hook(backward_hook)

    def generate_heatmap(self, input_tensor: torch.Tensor, target_class_idx: int) -> np.ndarray:
        """
        Computes normalized Grad-CAM heatmap for a given input tensor and target class.
        input_tensor shape: (1, 3, H, W)
        """
        self.model.eval()
        self.model.zero_grad()

        # Forward pass
        output = self.model(input_tensor)
        if target_class_idx is None:
            target_class_idx = torch.argmax(output, dim=1).item()

        score = output[0, target_class_idx]
        score.backward(retain_graph=True)

        # Global average pooling of gradients
        # gradients shape: (1, C, H_feat, W_feat)
        weights = torch.mean(self.gradients, dim=[2, 3], keepdim=True)
        # Weighted combination of forward activation maps
        cam = torch.sum(weights * self.activations, dim=1).squeeze(0)
        cam = F.relu(cam)

        cam_np = cam.cpu().numpy()
        cam_min, cam_max = np.min(cam_np), np.max(cam_np)
        if cam_max > cam_min:
            cam_np = (cam_np - cam_min) / (cam_max - cam_min)
        else:
            cam_np = np.zeros_like(cam_np)

        return cam_np

    def overlay_on_image(
        self,
        original_img: Image.Image | np.ndarray,
        heatmap: np.ndarray,
        alpha: float = 0.5,
        colormap: int = cv2.COLORMAP_JET
    ) -> Image.Image:
        """
        Resizes heatmap to original image dimensions and blends with colormap.
        """
        if isinstance(original_img, Image.Image):
            rgb_np = np.array(original_img)
        else:
            rgb_np = original_img

        h, w = rgb_np.shape[:2]
        heatmap_resized = cv2.resize(heatmap, (w, h))
        heatmap_uint8 = np.uint8(255 * heatmap_resized)
        heatmap_color = cv2.applyColorMap(heatmap_uint8, colormap)
        heatmap_color_rgb = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)

        blended = np.uint8(alpha * heatmap_color_rgb + (1 - alpha) * rgb_np)
        return Image.fromarray(blended)
