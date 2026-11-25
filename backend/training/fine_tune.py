import os
import json
import subprocess
from pathlib import Path
import random
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
import torchvision.transforms as transforms
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score, accuracy_score, classification_report
from collections import Counter
from PIL import Image

# Paths
BASE_DIR = Path(__file__).resolve().parents[2]  # project root
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
SPLITS_DIR = DATA_DIR / "splits"
CHECKPOINT_PATH = DATA_DIR / "checkpoints" / "best_model.pth"
CLASSES_PATH = SPLITS_DIR / "classes.json"

# Load existing class mapping (PlantVillage 38 classes)
with open(CLASSES_PATH) as f:
    classes_info = json.load(f)
IDX_TO_CLASS = {int(k): v for k, v in classes_info["idx_to_class"].items()}
CLASS_TO_IDX = {v: int(k) for k, v in classes_info["idx_to_class"].items()}
NUM_CLASSES = classes_info["num_classes"]

# ------------------------------------------------------------
# Helper: download external datasets (requires network)
# ------------------------------------------------------------
def git_clone(repo_url: str, dest: Path, depth: int = 1):
    dest.mkdir(parents=True, exist_ok=True)
    subprocess.run(["git", "clone", "--depth", str(depth), repo_url, str(dest)], check=True)

def download_plantdoc():
    dest = RAW_DIR / "plantdoc"
    if dest.exists():
        print(f"PlantDoc already cloned at {dest}")
        return dest
    repo = "https://github.com/pratikkayal/PlantDoc-Object-Detection-Dataset.git"
    git_clone(repo, dest)
    # Images are under "PlantDoc/images"
    return dest

def download_plantwild():
    dest = RAW_DIR / "plantwild"
    if dest.exists():
        print(f"PlantWild already present at {dest}")
        return dest
    url = "https://huggingface.co/datasets/uqtwei2/PlantWild/resolve/main/PlantWild.zip"
    zip_path = RAW_DIR / "PlantWild.zip"
    subprocess.run(["wget", "-O", str(zip_path), url], check=True)
    subprocess.run(["unzip", "-q", str(zip_path), "-d", str(dest)], check=True)
    os.remove(zip_path)
    return dest

# ------------------------------------------------------------
# Build a unified dataset respecting class compatibility
# ------------------------------------------------------------
def build_records_from_dir(root_dir: Path, source_name: str):
    """Traverse image folders and produce a list of dict records.
    Only include images whose class folder exactly matches one of our 38 classes.
    """
    records = []
    for class_dir in root_dir.iterdir():
        if not class_dir.is_dir():
            continue
        class_name = class_dir.name
        if class_name not in CLASS_TO_IDX:
            # Unmatched class – skip (or could be logged for unknown detection)
            continue
        class_idx = CLASS_TO_IDX[class_name]
        for img_path in class_dir.rglob("*.jpg"):
            if img_path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
                continue
            records.append({
                "image_path": str(img_path.resolve()),
                "class_name": class_name,
                "class_idx": int(class_idx),
                "source": source_name,
            })
    return records

def assemble_dataset():
    # Download external datasets
    plantdoc_dir = download_plantdoc() / "PlantDoc" / "images"
    plantwild_dir = download_plantwild() / "PlantWild" / "images"
    external_records = []
    external_records.extend(build_records_from_dir(plantdoc_dir, "PlantDoc"))
    external_records.extend(build_records_from_dir(plantwild_dir, "PlantWild"))
    print(f"Collected {len(external_records)} matched external images.")
    # Load original training split
    train_df = pd.read_csv(SPLITS_DIR / "train.csv")
    # Append external records
    ext_df = pd.DataFrame(external_records)
    combined_train = pd.concat([train_df, ext_df], ignore_index=True)
    combined_train = combined_train.sample(frac=1, random_state=42).reset_index(drop=True)
    fine_tune_train_path = SPLITS_DIR / "fine_tune_train.csv"
    combined_train.to_csv(fine_tune_train_path, index=False)
    print(f"Fine‑tune training split written to {fine_tune_train_path}")
    return fine_tune_train_path

# ------------------------------------------------------------
# Dataset class for fine‑tuning
# ------------------------------------------------------------
class FineTuneDataset(Dataset):
    def __init__(self, csv_path: Path, transform=None):
        self.df = pd.read_csv(csv_path)
        self.transform = transform
    def __len__(self):
        return len(self.df)
    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        try:
            img = Image.open(row["image_path"]).convert("RGB")
        except Exception:
            img = Image.new("RGB", (224, 224), color=(0, 0, 0))
        if self.transform:
            img = self.transform(img)
        return img, int(row["class_idx"])

# ------------------------------------------------------------
# Augmentation helpers (reuse from custom_transforms if present)
# ------------------------------------------------------------
def get_train_transform():
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
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

def get_eval_transform():
    return transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

# ------------------------------------------------------------
# Fine‑tuning routine
# ------------------------------------------------------------
def fine_tune(epochs: int = 5, batch_size: int = 64, lr: float = 1e-4):
    train_csv = assemble_dataset()
    train_dataset = FineTuneDataset(train_csv, transform=get_train_transform())
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=2,
        pin_memory=True,
    )
    # Load model from existing checkpoint (preserves learned weights)
    model = efficientnet_b0(weights=EfficientNet_B0_Weights.DEFAULT)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, NUM_CLASSES)
    ckpt = torch.load(CHECKPOINT_PATH, map_location="cpu")
    model.load_state_dict(ckpt["model_state_dict"])
    model = model.to("cpu")  # adjust if GPU is available
    # Unfreeze all layers for fine‑tuning
    for param in model.parameters():
        param.requires_grad = True
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-2)
    criterion = nn.CrossEntropyLoss()
    model.train()
    for epoch in range(1, epochs + 1):
        epoch_loss, correct, total = 0.0, 0, 0
        for imgs, lbls in train_loader:
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, lbls)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item() * imgs.size(0)
            correct += (outputs.argmax(1) == lbls).sum().item()
            total += lbls.size(0)
        print(f"Epoch {epoch} – Loss: {epoch_loss/total:.4f} – Acc: {100*correct/total:.2f}%")
    fine_tuned_path = DATA_DIR / "checkpoints" / "fine_tuned_model.pth"
    torch.save({"model_state_dict": model.state_dict()}, fine_tuned_path)
    print(f"Fine‑tuned model saved to {fine_tuned_path}")

if __name__ == "__main__":
    fine_tune()
