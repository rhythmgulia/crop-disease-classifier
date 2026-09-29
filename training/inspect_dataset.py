"""
Step 2: Inspect PlantVillage dataset.
Analyzes classes, counts, formats, and generates visual samples and distribution report.
"""

import json
from pathlib import Path
from PIL import Image
import pandas as pd
import matplotlib.pyplot as plt

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DATASET_DIR = DATA_DIR / "raw" / "plantvillage"
REPORTS_DIR = DATA_DIR / "reports"


def classify_crop_and_category(class_name: str):
    """Parses PlantVillage class name into Crop, Condition, and Type (Fruit vs Plant/Leaf)."""
    # Common fruit crops in PlantVillage
    fruit_crops = {"Apple", "Cherry_(including_sour)", "Grape", "Orange", "Peach", "Pepper,_bell", "Strawberry", "Tomato"}
    
    parts = class_name.split("___")
    crop = parts[0]
    condition = parts[1] if len(parts) > 1 else "unknown"
    
    # Determine plant vs fruit category based on crop name
    category = "Fruit" if crop in fruit_crops else "Plant (Field/Cereal/Vegetable)"
    is_healthy = "healthy" in condition.lower()
    
    return crop, condition, category, is_healthy


def inspect():
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    
    if not DATASET_DIR.exists():
        print(f"Error: Dataset directory {DATASET_DIR} does not exist. Run download_dataset.py first.")
        return
        
    class_dirs = [d for d in DATASET_DIR.iterdir() if d.is_dir() and not d.name.startswith(".")]
    class_dirs.sort(key=lambda d: d.name)
    
    if not class_dirs:
        print(f"No class directories found in {DATASET_DIR}.")
        return

    print(f"Found {len(class_dirs)} classes in {DATASET_DIR}\n")
    
    records = []
    sample_images = {}
    total_images = 0
    corrupt_images = 0
    image_sizes = set()

    for cdir in class_dirs:
        class_name = cdir.name
        img_paths = [p for p in cdir.iterdir() if p.suffix.lower() in [".jpg", ".jpeg", ".png"]]
        count = len(img_paths)
        total_images += count
        
        crop, condition, category, is_healthy = classify_crop_and_category(class_name)
        
        # Check first 5 images for size and validity
        valid_sample = None
        for img_p in img_paths[:5]:
            try:
                with Image.open(img_p) as img:
                    image_sizes.add(img.size)
                    if valid_sample is None:
                        valid_sample = img_p
            except Exception:
                corrupt_images += 1
                
        if valid_sample:
            sample_images[class_name] = valid_sample
            
        records.append({
            "class_name": class_name,
            "crop": crop,
            "condition": condition,
            "category": category,
            "is_healthy": is_healthy,
            "count": count
        })

    df = pd.DataFrame(records)
    df.sort_values(by="count", ascending=False, inplace=True)
    
    # Save CSV
    csv_path = REPORTS_DIR / "class_distribution.csv"
    df.to_csv(csv_path, index=False)
    
    # Save JSON summary
    summary = {
        "total_classes": len(class_dirs),
        "total_images": total_images,
        "corrupt_images_checked": corrupt_images,
        "image_resolutions_observed": [list(s) for s in list(image_sizes)[:5]],
        "min_class_count": int(df["count"].min()),
        "max_class_count": int(df["count"].max()),
        "median_class_count": float(df["count"].median()),
        "fruit_classes_count": int((df["category"] == "Fruit").sum()),
        "plant_classes_count": int((df["category"] != "Fruit").sum()),
        "healthy_classes_count": int(df["is_healthy"].sum()),
        "disease_classes_count": int((~df["is_healthy"]).sum()),
    }
    
    json_path = REPORTS_DIR / "dataset_summary.json"
    with open(json_path, "w") as f:
        json.dump(summary, f, indent=2)

    print("=" * 60)
    print("DATASET INSPECTION SUMMARY")
    print("=" * 60)
    print(f"Total Classes: {summary['total_classes']}")
    print(f"Total Images: {summary['total_images']:,}")
    print(f"Fruit Classes: {summary['fruit_classes_count']} | Leaf/Field Classes: {summary['plant_classes_count']}")
    print(f"Disease Classes: {summary['disease_classes_count']} | Healthy Classes: {summary['healthy_classes_count']}")
    print(f"Min images in a class: {summary['min_class_count']} ({df.iloc[-1]['class_name']})")
    print(f"Max images in a class: {summary['max_class_count']} ({df.iloc[0]['class_name']})")
    print(f"Median class count: {summary['median_class_count']:.1f}")
    print(f"Common Resolutions: {summary['image_resolutions_observed']}")
    print(f"\nDetailed distribution written to: {csv_path}")
    print(f"Summary JSON written to: {json_path}")
    
    # Generate sample montage of 12 representative classes
    print("\nGenerating sample inspection grid (12 representative classes)...")
    selected_classes = df.head(6)["class_name"].tolist() + df.tail(6)["class_name"].tolist()
    
    fig, axes = plt.subplots(3, 4, figsize=(16, 12))
    axes = axes.flatten()
    
    for i, cname in enumerate(selected_classes):
        img_path = sample_images.get(cname)
        if img_path and img_path.exists():
            img = Image.open(img_path).convert("RGB")
            axes[i].imshow(img)
            # Shorten label for title
            label = cname.replace("___", "\n").replace("_", " ")
            axes[i].set_title(label, fontsize=9)
            axes[i].axis("off")
            
    plt.tight_layout()
    grid_path = REPORTS_DIR / "sample_images_grid.png"
    plt.savefig(grid_path, dpi=150)
    plt.close()
    print(f"Sample images grid saved to: {grid_path}")


if __name__ == "__main__":
    inspect()
