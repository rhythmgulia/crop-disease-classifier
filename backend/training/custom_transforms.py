import torchvision.transforms as transforms

def get_train_transform():
    """Return an enriched augmentation pipeline for training.
    Includes aspect‑ratio preserving random resized crop, flips, rotations,
    affine & perspective distortions, stronger colour jitter, random erasing,
    and finally normalization matching ImageNet pretrained models.
    """
    return transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.7, 1.0), ratio=(0.85, 1.15)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.2),
        transforms.RandomRotation(degrees=20),
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1), scale=(0.9, 1.1), shear=10),
        transforms.RandomPerspective(distortion_scale=0.2, p=0.5),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.1),
        transforms.ToTensor(),
        transforms.RandomErasing(p=0.2, scale=(0.02, 0.2), value="random"),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

def get_eval_transform():
    """Return a deterministic evaluation pipeline matching training's output size.
    Uses resize + center crop + normalization.
    """
    return transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
