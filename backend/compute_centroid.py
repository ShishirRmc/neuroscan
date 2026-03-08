import os
import glob
import numpy as np
import torch
from pathlib import Path

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.model_service import model_service
from backend.config import settings

def compute_mri_centroid():
    print("Loading model...")
    model_service.load_model()
    
    # Paths to known valid MRI images
    dataset_dir = Path("dataset/Dataset/Brain Tumor MRI images")
    
    # Gather healthy and tumor images
    filepaths = []
    for cls in settings.CLASS_LABELS:
        cls_dir = dataset_dir / ("Healthy" if cls == "healthy" else "Brain Tumor")
        # Grab first 20 images from each class
        images = list(cls_dir.glob("*.png")) + list(cls_dir.glob("*.jpg"))
        filepaths.extend(images[:20])
    
    if not filepaths:
        print("No MRI images found to compute centroid.")
        return
        
    print(f"Computing centroid from {len(filepaths)} MRI scans...")
    embeddings = []
    
    for fp in filepaths:
        with open(fp, "rb") as f:
            image_bytes = f.read()
            
        tensor = model_service.preprocess(image_bytes).to(model_service.device)
        with torch.no_grad():
            features = model_service.model.forward_features(tensor)
            emb = features.mean(dim=[-2, -1]).cpu().numpy().flatten()
            embeddings.append(emb)
            
    embeddings = np.stack(embeddings)
    centroid = embeddings.mean(axis=0)
    
    # Save the centroid next to the model
    centroid_path = Path("models/centroid.npy")
    np.save(centroid_path, centroid)
    print(f"Saved True MRI Centroid to {centroid_path}")
    
    # Print max distance of these valid MRIs from the centroid to establish a baseline threshold
    distances = []
    for emb in embeddings:
        diff = emb - centroid
        # Using identity matrix for cov_inv as a simpler Euclidean distance baseline
        dist = np.sqrt(diff.dot(diff.transpose()))
        distances.append(dist)
        
    print(f"Validation Distances -> Min: {min(distances):.4f}, Max: {max(distances):.4f}, Mean: {np.mean(distances):.4f}")

if __name__ == "__main__":
    compute_mri_centroid()
