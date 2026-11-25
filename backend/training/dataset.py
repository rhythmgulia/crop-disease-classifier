"""
Step 4 & 5: PyTorch Dataset, DataLoaders, Preprocessing, and Augmentations.
Implements ImageNet normalization, data augmentation for training, and deterministic transforms for validation/test.
"""

from pathlib import Path
from PIL import Image
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
SPLITS_DIR = DATA_DIR / "splits"

# Standard ImageNet normalization coefficients required by torchvision EfficientNet
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def get_transforms(image_size: int = 224):
    """Returns training and validation/test torchvision transform pipelines."""
    train_transform = transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.2),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15, hue=0.05),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
    ])

    eval_transform = transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
    ])

    return train_transform, eval_transform


class PlantVillageDataset(Dataset):
    """PyTorch Dataset reading from generated split CSV files."""

    def __init__(self, split_csv: str | Path, transform=None):
        self.csv_path = Path(split_csv)
        if not self.csv_path.exists():
            raise FileNotFoundError(f"Split file not found: {self.csv_path}")

        self.df = pd.read_csv(self.csv_path)
        self.transform = transform

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx: int):
        row = self.df.iloc[idx]
        image_path = row["image_path"]

        try:
            image = Image.open(image_path).convert("RGB")
        except Exception as e:
            # Fallback for any corrupted image: return blank RGB tensor
            print(f"Warning: Failed reading {image_path}: {e}")
            image = Image.new("RGB", (224, 224), color=(0, 0, 0))

        if self.transform is not None:
            image = self.transform(image)

        label = int(row["class_idx"])
        metadata = {
            "class_name": row["class_name"],
            "crop": row["crop"],
            "category": row["category"],
            "is_healthy": bool(row["is_healthy"]),
            "image_path": image_path
        }

        return image, label, metadata


def get_dataloaders(
    batch_size: int = 32,
    num_workers: int = 2,
    image_size: int = 224
):
    """Creates train, val, and test DataLoaders."""
    train_transform, eval_transform = get_transforms(image_size)

    train_ds = PlantVillageDataset(SPLITS_DIR / "train.csv", transform=train_transform)
    val_ds = PlantVillageDataset(SPLITS_DIR / "val.csv", transform=eval_transform)
    test_ds = PlantVillageDataset(SPLITS_DIR / "test.csv", transform=eval_transform)

    # Pin memory for fast GPU transfer (CUDA only, MPS does not support pin_memory)
    pin_memory = torch.cuda.is_available()

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=pin_memory,
        drop_last=True
    )

    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin_memory
    )

    test_loader = DataLoader(
        test_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin_memory
    )

    return train_loader, val_loader, test_loader
