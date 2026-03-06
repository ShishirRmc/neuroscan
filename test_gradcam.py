import traceback
from backend.model_service import model_service
import torch
import numpy as np
import cv2

try:
    model_service.load_model()
    # Create dummy image bytes
    dummy_img = np.zeros((224, 224, 3), dtype=np.uint8)
    _, buffer = cv2.imencode('.jpg', dummy_img)
    image_bytes = buffer.tobytes()
    
    tensor = model_service.preprocess(image_bytes)
    
    with torch.no_grad():
        logits = model_service.model(tensor)
        probabilities = torch.nn.functional.softmax(logits, dim=1)
        predicted_idx = int(probabilities.argmax(dim=1).item())
        
    print("Trying Grad-CAM...")
    heatmap = model_service.generate_gradcam(tensor, image_bytes, predicted_idx)
    if heatmap is None:
        print("Heatmap is None. Did activations/gradients fail?")
    else:
        print("Heatmap generated successfully. Length:", len(heatmap))
except Exception as e:
    print("Exception occurred:")
    traceback.print_exc()
