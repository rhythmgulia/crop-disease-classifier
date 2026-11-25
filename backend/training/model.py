"""
EfficientNet-B0 Model architecture for PlantVillage multi-class classification.
Leverages ImageNet pre-trained weights and replaces the classifier head.
"""

import torch
import torch.nn as nn
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights


class CropDiseaseClassifier(nn.Module):
    """
    EfficientNet-B0 Backbone with custom multi-class classification head.
    Supports both plant and fruit crop disease diagnosis.
    """

    def __init__(self, num_classes: int = 38, pretrained: bool = True, dropout_rate: float = 0.2):
        super().__init__()
        weights = EfficientNet_B0_Weights.DEFAULT if pretrained else None
        self.backbone = efficientnet_b0(weights=weights)
        
        # In EfficientNet-B0, backbone.classifier[1] has in_features = 1280
        in_features = self.backbone.classifier[1].in_features
        
        # Replace classifier with custom dropout + linear head
        self.backbone.classifier = nn.Sequential(
            nn.Dropout(p=dropout_rate, inplace=True),
            nn.Linear(in_features, num_classes)
        )
        self.num_classes = num_classes

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)

    def freeze_backbone(self):
        """Freezes all feature extractor layers for initial warm-up training."""
        for param in self.backbone.features.parameters():
            param.requires_grad = False
        for param in self.backbone.classifier.parameters():
            param.requires_grad = True

    def unfreeze_upper_layers(self, unfreeze_from_block: int = 5):
        """
        Unfreezes upper convolutional blocks for fine-tuning.
        backbone.features has 9 blocks (0 to 8).
        """
        for i, block in enumerate(self.backbone.features):
            requires_grad = (i >= unfreeze_from_block)
            for param in block.parameters():
                param.requires_grad = requires_grad
        for param in self.backbone.classifier.parameters():
            param.requires_grad = True

    def unfreeze_all(self):
        """Unfreezes all parameters for full model fine-tuning."""
        for param in self.parameters():
            param.requires_grad = True


def create_model(num_classes: int = 38, pretrained: bool = True) -> CropDiseaseClassifier:
    return CropDiseaseClassifier(num_classes=num_classes, pretrained=pretrained)
