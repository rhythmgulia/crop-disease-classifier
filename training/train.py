"""
Step 6: Training script for EfficientNet-B0 on PlantVillage.
Supports two-phase training (classifier head warmup + upper blocks fine-tuning).
Tracks Macro F1 on validation split to save the best model weights.
"""

import os
import sys
import json
import argparse
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from sklearn.metrics import f1_score
from tqdm import tqdm

sys.path.append(str(Path(__file__).resolve().parent))
from model import create_model
from dataset import get_dataloaders

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
CHECKPOINTS_DIR = DATA_DIR / "checkpoints"
SPLITS_DIR = DATA_DIR / "splits"


def get_device():
    if torch.backends.mps.is_available():
        return torch.device("mps")
    elif torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def train_epoch(model, loader, criterion, optimizer, device):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    pbar = tqdm(loader, desc="Training", leave=False)
    for images, targets, _ in pbar:
        images = images.to(device)
        targets = targets.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        _, preds = torch.max(outputs, 1)
        correct += (preds == targets).sum().item()
        total += targets.size(0)
        
        pbar.set_postfix({"loss": f"{loss.item():.4f}"})

    epoch_loss = running_loss / total
    epoch_acc = correct / total
    return epoch_loss, epoch_acc


def validate(model, loader, criterion, device):
    model.eval()
    running_loss = 0.0
    all_preds = []
    all_targets = []

    with torch.no_grad():
        for images, targets, _ in tqdm(loader, desc="Validation", leave=False):
            images = images.to(device)
            targets = targets.to(device)

            outputs = model(images)
            loss = criterion(outputs, targets)

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)

            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(targets.cpu().numpy())

    total = len(all_targets)
    epoch_loss = running_loss / total
    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)
    epoch_acc = (all_preds == all_targets).mean()
    macro_f1 = f1_score(all_targets, all_preds, average="macro", zero_division=0)

    return epoch_loss, epoch_acc, macro_f1


def train(args):
    CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)
    device = get_device()
    print(f"Using device: {device}")

    classes_file = SPLITS_DIR / "classes.json"
    if not classes_file.exists():
        raise FileNotFoundError(f"Missing {classes_file}. Run split_stratified.py first.")

    with open(classes_file) as f:
        class_meta = json.load(f)
    num_classes = class_meta["num_classes"]
    print(f"Training for {num_classes} classes.")

    # Data loaders
    train_loader, val_loader, _ = get_dataloaders(
        batch_size=args.batch_size,
        num_workers=args.num_workers
    )

    # Initialize model
    model = create_model(num_classes=num_classes, pretrained=True)
    model.to(device)
    criterion = nn.CrossEntropyLoss()

    best_macro_f1 = 0.0
    best_checkpoint_path = CHECKPOINTS_DIR / "best_model.pth"

    # Phase 1: Classifier head warm-up
    print("\n" + "=" * 60)
    print(f"PHASE 1: Warmup ({args.warmup_epochs} epochs) - Backbone frozen")
    print("=" * 60)
    model.freeze_backbone()
    optimizer = AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=args.warmup_lr)

    for epoch in range(1, args.warmup_epochs + 1):
        tr_loss, tr_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc, val_f1 = validate(model, val_loader, criterion, device)
        print(f"Warmup Epoch [{epoch}/{args.warmup_epochs}] | "
              f"Train Loss: {tr_loss:.4f} Acc: {tr_acc * 100:.2f}% | "
              f"Val Loss: {val_loss:.4f} Acc: {val_acc * 100:.2f}% Macro F1: {val_f1:.4f}")

        if val_f1 > best_macro_f1:
            best_macro_f1 = val_f1
            torch.save({
                "epoch": epoch,
                "phase": "warmup",
                "model_state_dict": model.state_dict(),
                "macro_f1": best_macro_f1,
                "val_acc": val_acc
            }, best_checkpoint_path)
            print(f"  -> Saved new best model checkpoint (Macro F1: {best_macro_f1:.4f})")

    # Phase 2: Fine-tuning upper conv layers
    total_ft_epochs = args.epochs - args.warmup_epochs
    if total_ft_epochs > 0:
        print("\n" + "=" * 60)
        print(f"PHASE 2: Fine-tuning ({total_ft_epochs} epochs) - Unfreezing upper blocks")
        print("=" * 60)
        model.unfreeze_upper_layers(unfreeze_from_block=5)
        
        optimizer = AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=args.ft_lr, weight_decay=1e-4)
        scheduler = CosineAnnealingLR(optimizer, T_max=total_ft_epochs, eta_min=1e-6)

        for epoch in range(1, total_ft_epochs + 1):
            tr_loss, tr_acc = train_epoch(model, train_loader, criterion, optimizer, device)
            val_loss, val_acc, val_f1 = validate(model, val_loader, criterion, device)
            scheduler.step()

            current_lr = optimizer.param_groups[0]['lr']
            print(f"Fine-tune Epoch [{epoch}/{total_ft_epochs}] (lr: {current_lr:.6f}) | "
                  f"Train Loss: {tr_loss:.4f} Acc: {tr_acc * 100:.2f}% | "
                  f"Val Loss: {val_loss:.4f} Acc: {val_acc * 100:.2f}% Macro F1: {val_f1:.4f}")

            if val_f1 > best_macro_f1:
                best_macro_f1 = val_f1
                torch.save({
                    "epoch": epoch,
                    "phase": "fine_tune",
                    "model_state_dict": model.state_dict(),
                    "macro_f1": best_macro_f1,
                    "val_acc": val_acc
                }, best_checkpoint_path)
                print(f"  -> Saved new best model checkpoint (Macro F1: {best_macro_f1:.4f})")

    print("\n" + "=" * 60)
    print(f"Training Complete! Best Validation Macro F1: {best_macro_f1:.4f}")
    print(f"Best checkpoint saved at: {best_checkpoint_path}")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train EfficientNet-B0 on PlantVillage")
    parser.add_argument("--epochs", type=int, default=10, help="Total training epochs")
    parser.add_argument("--warmup-epochs", type=int, default=2, help="Warmup epochs with frozen backbone")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--warmup-lr", type=float, default=1e-3, help="Initial learning rate for classification head")
    parser.add_argument("--ft-lr", type=float, default=1e-4, help="Fine-tuning learning rate")
    parser.add_argument("--num-workers", type=int, default=2, help="DataLoader num workers")
    args = parser.parse_args()

    train(args)
