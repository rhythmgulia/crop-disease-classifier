"""
Evaluation script for Crop Disease Classifier.
Calculates Macro F1, per-class Precision/Recall, and confusion matrix broken out by Plant vs Fruit.
"""

import json
from pathlib import Path
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.metrics import (
    f1_score, precision_recall_fscore_support, confusion_matrix,
    roc_auc_score, average_precision_score, accuracy_score
)
import matplotlib.pyplot as plt

import sys
sys.path.append(str(Path(__file__).resolve().parent))
from model import create_model
from dataset import get_dataloaders

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
REPORTS_DIR = DATA_DIR / "reports"
SPLITS_DIR = DATA_DIR / "splits"


def get_device():
    if torch.backends.mps.is_available():
        return torch.device("mps")
    elif torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def evaluate(checkpoint_path: str | Path = None, batch_size: int = 64):
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    device = get_device()
    print(f"Running evaluation on device: {device}")

    # Load classes
    classes_file = SPLITS_DIR / "classes.json"
    with open(classes_file) as f:
        class_meta = json.load(f)
    idx_to_class = {int(k): v for k, v in class_meta["idx_to_class"].items()}
    num_classes = class_meta["num_classes"]

    # Build model
    model = create_model(num_classes=num_classes, pretrained=False)
    if checkpoint_path is None:
        checkpoint_path = DATA_DIR / "checkpoints" / "best_model.pth"
    
    checkpoint_path = Path(checkpoint_path)
    if not checkpoint_path.exists():
        raise FileNotFoundError(f"Checkpoint not found at {checkpoint_path}")

    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    _, _, test_loader = get_dataloaders(batch_size=batch_size, num_workers=0)

    all_preds = []
    all_targets = []
    all_confidences = []
    all_probs = []

    print(f"Evaluating {len(test_loader.dataset)} test samples...")
    with torch.no_grad():
        for images, targets, _ in test_loader:
            images = images.to(device)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1)
            confidences, preds = torch.max(probs, dim=1)

            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(targets.numpy())
            all_confidences.extend(confidences.cpu().numpy())
            all_probs.append(probs.cpu().numpy())

    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)
    all_confidences = np.array(all_confidences)
    all_probs = np.vstack(all_probs)

    # Compute Macro F1 (headline metric)
    macro_f1 = f1_score(all_targets, all_preds, average="macro", zero_division=0)
    weighted_f1 = f1_score(all_targets, all_preds, average="weighted", zero_division=0)
    accuracy = (all_preds == all_targets).mean()

    # Multi-class ROC-AUC (Area Under the ROC Curve)
    y_true_onehot = np.eye(num_classes)[all_targets]
    roc_auc_macro = roc_auc_score(y_true_onehot, all_probs, multi_class="ovr", average="macro")
    roc_auc_weighted = roc_auc_score(y_true_onehot, all_probs, multi_class="ovr", average="weighted")
    pr_auc_macro = average_precision_score(y_true_onehot, all_probs, average="macro")

    # Confidence calibration
    is_correct = (all_preds == all_targets)
    mean_conf_correct = float(np.mean(all_confidences[is_correct])) if np.any(is_correct) else 0.0
    mean_conf_incorrect = float(np.mean(all_confidences[~is_correct])) if np.any(~is_correct) else 0.0

    # Per-class metrics
    precision, recall, f1, support = precision_recall_fscore_support(
        all_targets, all_preds, zero_division=0
    )

    per_class_results = []
    fruit_crops = {"Apple", "Cherry_(including_sour)", "Grape", "Orange", "Peach", "Pepper,_bell", "Strawberry", "Tomato"}
    
    plant_f1s = []
    fruit_f1s = []

    for i in range(num_classes):
        cname = idx_to_class[i]
        crop = cname.split("___")[0]
        cat = "Fruit" if crop in fruit_crops else "Plant"
        
        c_f1 = float(f1[i])
        if cat == "Fruit":
            fruit_f1s.append(c_f1)
        else:
            plant_f1s.append(c_f1)

        per_class_results.append({
            "class_idx": i,
            "class_name": cname,
            "category": cat,
            "precision": round(float(precision[i]), 4),
            "recall": round(float(recall[i]), 4),
            "f1": round(c_f1, 4),
            "support": int(support[i])
        })

    report = {
        "macro_f1": round(float(macro_f1), 4),
        "weighted_f1": round(float(weighted_f1), 4),
        "accuracy": round(float(accuracy), 4),
        "roc_auc_macro": round(float(roc_auc_macro), 4),
        "roc_auc_weighted": round(float(roc_auc_weighted), 4),
        "pr_auc_macro": round(float(pr_auc_macro), 4),
        "mean_confidence_correct": round(mean_conf_correct, 4),
        "mean_confidence_incorrect": round(mean_conf_incorrect, 4),
        "fruit_macro_f1": round(float(np.mean(fruit_f1s)), 4) if fruit_f1s else 0.0,
        "plant_macro_f1": round(float(np.mean(plant_f1s)), 4) if plant_f1s else 0.0,
        "total_test_samples": int(len(all_targets)),
        "target_met_macro_f1_gte_0_85": bool(macro_f1 >= 0.85),
        "per_class": per_class_results
    }

    report_path = REPORTS_DIR / "evaluation_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    # Confusion matrix
    cm = confusion_matrix(all_targets, all_preds)
    plt.figure(figsize=(14, 12))
    plt.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    plt.title(f"Test Confusion Matrix (Macro F1: {macro_f1:.4f})")
    plt.colorbar()
    plt.tight_layout()
    cm_path = REPORTS_DIR / "confusion_matrix.png"
    plt.savefig(cm_path, dpi=150)
    plt.close()

    print("=" * 60)
    print("MODEL EVALUATION RESULTS")
    print("=" * 60)
    print(f"Macro F1 (PRD Target >= 0.85): {report['macro_f1']} {'[PASSED]' if report['target_met_macro_f1_gte_0_85'] else '[BELOW TARGET]'}")
    print(f"Overall Accuracy:            {report['accuracy'] * 100:.2f}%")
    print(f"Macro ROC-AUC (Area Under):  {report['roc_auc_macro']:.4f}")
    print(f"Weighted ROC-AUC:            {report['roc_auc_weighted']:.4f}")
    print(f"Macro PR-AUC:                {report['pr_auc_macro']:.4f}")
    print(f"Confidence (Correct):        {report['mean_confidence_correct'] * 100:.2f}%")
    print(f"Confidence (Incorrect):      {report['mean_confidence_incorrect'] * 100:.2f}%")
    print(f"Fruit Classes Macro F1:      {report['fruit_macro_f1']}")
    print(f"Plant Classes Macro F1:      {report['plant_macro_f1']}")
    print(f"Evaluation report saved to:  {report_path}")
    print(f"Confusion matrix plot saved: {cm_path}")

    return report


if __name__ == "__main__":
    evaluate()
