"""
Step 3: Create stratified Train / Validation / Test split.
Splits PlantVillage into 70% Train, 15% Validation, 15% Test, preserving class distribution.
"""

import json
from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DATASET_DIR = DATA_DIR / "raw" / "plantvillage"
SPLITS_DIR = DATA_DIR / "splits"


def create_splits(test_size=0.15, val_size=0.15, random_state=42):
    SPLITS_DIR.mkdir(parents=True, exist_ok=True)
    
    if not DATASET_DIR.exists():
        raise FileNotFoundError(f"Dataset directory {DATASET_DIR} does not exist.")
        
    class_dirs = sorted([d for d in DATASET_DIR.iterdir() if d.is_dir() and not d.name.startswith(".")])
    if not class_dirs:
        raise ValueError(f"No class folders found in {DATASET_DIR}.")
        
    # Map class names to IDs
    class_to_idx = {cdir.name: idx for idx, cdir in enumerate(class_dirs)}
    idx_to_class = {idx: cdir.name for idx, cdir in enumerate(class_dirs)}
    
    # Save class mappings
    with open(SPLITS_DIR / "classes.json", "w") as f:
        json.dump({
            "class_to_idx": class_to_idx,
            "idx_to_class": idx_to_class,
            "num_classes": len(class_dirs)
        }, f, indent=2)
        
    print(f"Mapped {len(class_dirs)} classes. Gathering image paths...")
    
    fruit_crops = {"Apple", "Cherry_(including_sour)", "Grape", "Orange", "Peach", "Pepper,_bell", "Strawberry", "Tomato"}
    
    records = []
    for cdir in class_dirs:
        class_name = cdir.name
        class_idx = class_to_idx[class_name]
        crop = class_name.split("___")[0]
        category = "Fruit" if crop in fruit_crops else "Plant"
        is_healthy = "healthy" in class_name.lower()
        
        for img_path in cdir.iterdir():
            if img_path.suffix.lower() in [".jpg", ".jpeg", ".png"]:
                records.append({
                    "image_path": str(img_path.resolve()),
                    "relative_path": str(img_path.relative_to(DATA_DIR)),
                    "class_name": class_name,
                    "class_idx": class_idx,
                    "crop": crop,
                    "category": category,
                    "is_healthy": is_healthy
                })
                
    df = pd.DataFrame(records)
    print(f"Total valid images gathered: {len(df):,}")
    
    # Stratified split: Train (1 - test_size - val_size) vs Temp (test_size + val_size)
    temp_ratio = test_size + val_size
    train_df, temp_df = train_test_split(
        df,
        test_size=temp_ratio,
        stratify=df["class_idx"],
        random_state=random_state
    )
    
    # Split temp into Val and Test (each gets half of temp_ratio)
    val_share_of_temp = val_size / temp_ratio
    val_df, test_df = train_test_split(
        temp_df,
        test_size=(1.0 - val_share_of_temp),
        stratify=temp_df["class_idx"],
        random_state=random_state
    )
    
    # Persist CSVs
    train_csv = SPLITS_DIR / "train.csv"
    val_csv = SPLITS_DIR / "val.csv"
    test_csv = SPLITS_DIR / "test.csv"
    
    train_df.to_csv(train_csv, index=False)
    val_df.to_csv(val_csv, index=False)
    test_df.to_csv(test_csv, index=False)
    
    stats = {
        "total_samples": len(df),
        "train_samples": len(train_df),
        "val_samples": len(val_df),
        "test_samples": len(test_df),
        "train_pct": round(len(train_df) / len(df) * 100, 2),
        "val_pct": round(len(val_df) / len(df) * 100, 2),
        "test_pct": round(len(test_df) / len(df) * 100, 2),
        "num_classes": len(class_dirs)
    }
    
    with open(SPLITS_DIR / "split_statistics.json", "w") as f:
        json.dump(stats, f, indent=2)
        
    print("=" * 60)
    print("STRATIFIED SPLIT SUMMARY")
    print("=" * 60)
    print(f"Train samples: {stats['train_samples']:,} ({stats['train_pct']}%)")
    print(f"Val samples:   {stats['val_samples']:,} ({stats['val_pct']}%)")
    print(f"Test samples:  {stats['test_samples']:,} ({stats['test_pct']}%)")
    print(f"CSVs saved to: {SPLITS_DIR}")
    return stats


if __name__ == "__main__":
    create_splits()
