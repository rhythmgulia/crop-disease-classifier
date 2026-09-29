"""
Script to download and setup the PlantVillage dataset.
Supports downloading directly from the official spMohanty/PlantVillage-Dataset repository.
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
RAW_DIR = DATA_DIR / "raw"
TARGET_DIR = RAW_DIR / "plantvillage"


def download_via_git(target_dir: Path):
    """Shallow clones with sparse checkout for raw/color from official PlantVillage repo."""
    repo_url = "https://github.com/spMohanty/PlantVillage-Dataset.git"
    temp_repo = RAW_DIR / "temp_plantvillage_git"
    
    print(f"Cloning PlantVillage (sparse checkout raw/color) from {repo_url}...")
    if temp_repo.exists():
        shutil.rmtree(temp_repo)
        
    try:
        # Clone repo skeleton with blobless filter
        subprocess.run(
            ["git", "clone", "--depth", "1", "--filter=blob:none", "--sparse", repo_url, str(temp_repo)],
            check=True
        )
        
        # Checkout only raw/color
        print("Downloading raw/color images...")
        subprocess.run(
            ["git", "-C", str(temp_repo), "sparse-checkout", "set", "raw/color"],
            check=True
        )
        
        source_color = temp_repo / "raw" / "color"
        if not source_color.exists():
            raise FileNotFoundError(f"Expected directory {source_color} not found in repo.")
        
        if target_dir.exists():
            shutil.rmtree(target_dir)
            
        print(f"Moving {source_color} to {target_dir}...")
        shutil.move(str(source_color), str(target_dir))
        
        # Clean up temp clone
        print("Cleaning up temporary git clone...")
        shutil.rmtree(temp_repo)
        print(f"Successfully installed PlantVillage dataset at {target_dir}")
        return True
    except Exception as e:
        print(f"Git clone/checkout failed: {e}")
        if temp_repo.exists():
            shutil.rmtree(temp_repo, ignore_errors=True)
        return False


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    
    if TARGET_DIR.exists() and any(TARGET_DIR.iterdir()):
        num_classes = len([d for d in TARGET_DIR.iterdir() if d.is_dir()])
        print(f"PlantVillage dataset already exists at {TARGET_DIR} with {num_classes} classes.")
        return
        
    print("Downloading PlantVillage dataset...")
    success = download_via_git(TARGET_DIR)
    if not success:
        print("Failed to download PlantVillage dataset via git.")
        sys.exit(1)
        
    num_classes = len([d for d in TARGET_DIR.iterdir() if d.is_dir()])
    print(f"Done! Extracted {num_classes} classes to {TARGET_DIR}.")


if __name__ == "__main__":
    main()
