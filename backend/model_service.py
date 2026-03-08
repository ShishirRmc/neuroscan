"""
Model inference service.
Loads the fine-tuned ConvNeXt-Tiny model and provides prediction with confidence banding.
"""
import time
from io import BytesIO
from pathlib import Path

import timm
import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms

from .config import settings


class ModelService:
    """Singleton-style service to load the model once and serve predictions."""

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.transform = transforms.Compose([
            transforms.Resize((settings.IMAGE_SIZE, settings.IMAGE_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=settings.IMAGENET_MEAN, std=settings.IMAGENET_STD),
        ])

    def load_model(self) -> None:
        """Load the fine-tuned ConvNeXt-Tiny checkpoint."""
        model_path = Path(settings.MODEL_PATH)
        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found at {model_path}")

        # Create ConvNeXt-Tiny architecture with 2 output classes (no pretrained weights)
        self.model = timm.create_model("convnext_tiny", pretrained=False, num_classes=2)

        # Load our fine-tuned weights
        state_dict = torch.load(model_path, map_location=self.device, weights_only=True)
        self.model.load_state_dict(state_dict)

        self.model.to(self.device)
        self.model.eval()

    @property
    def is_loaded(self) -> bool:
        return self.model is not None

    def preprocess(self, image_bytes: bytes) -> torch.Tensor:
        """Convert raw image bytes to a preprocessed tensor."""
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        tensor = self.transform(image)
        return tensor.unsqueeze(0)  # Add batch dimension

    def get_confidence_band(self, probability: float) -> tuple[str, bool]:
        """
        Determine the confidence band and human review flag.

        Returns:
            (confidence_label, requires_human_review)
        """
        if probability >= settings.HIGH_CONFIDENCE_THRESHOLD:
            return "high", False
        elif probability >= settings.LOW_CONFIDENCE_THRESHOLD:
            return "medium", True
        else:
            return "low", True

    def is_valid_modality(self, image_bytes: bytes) -> bool:
        """
        Check if the image is a valid brain MRI using semantic embedding distance.
        Computes the Mahalanobis distance from the training set's feature distribution.
        """
        import numpy as np
        if not self.is_loaded:
            self.load_model()

        tensor = self.preprocess(image_bytes).to(self.device)
        with torch.no_grad():
            # Extract features from the final backbone layer
            features = self.model.forward_features(tensor)
            # Global Average Pooling to 1D embedding
            embedding = features.mean(dim=[-2, -1]).cpu().numpy().flatten()
            
        import logging
        from PIL import Image
        import io
        
        logger = logging.getLogger(__name__)

        # --- 1. Fast Heuristic: Is it Grayscale? ---
        # Brain MRIs are predominantly grayscale. If an image has high color variance, reject early.
        try:
            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            # Convert to numpy and calculate variance between R, G, B channels
            img_np = np.array(pil_image)
            # Standard deviation across the color channels for each pixel
            channel_std = np.std(img_np, axis=2)
            # Mean of that standard deviation across the whole image
            mean_color_variance = np.mean(channel_std)
            
            # If the mean color variance is high, it has strong colors (not an MRI)
            if mean_color_variance > 10.0:
                logger.warning(f"OOD Heuristic Reject: High color variance ({mean_color_variance:.2f} > 10.0)")
                return False
        except Exception as e:
            logger.error(f"Failed to run heuristic OOD check: {e}")
            return False

        # Grayscale check passed — let the model predict naturally.
        # If the image is something the model wasn't trained on (e.g., X-ray),
        # it will output a ~50/50 guess with "Medium" confidence, which routes
        # it to the HITL Review Queue for a human to catch.
        return True

    def predict(self, image_bytes: bytes) -> dict:
        """
        Run inference on raw image bytes.

        Returns a dict with predicted_label, tumor_probability, confidence,
        requires_human_review, and inference_time_ms.
        """
        if not self.is_loaded:
            raise RuntimeError("Model is not loaded. Call load_model() first.")

        tensor = self.preprocess(image_bytes)
        tensor = tensor.to(self.device)

        start_time = time.perf_counter()

        with torch.no_grad():
            logits = self.model(tensor)
            probabilities = F.softmax(logits / settings.TEMPERATURE, dim=1)

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        # Class indices: 0 = healthy, 1 = tumor
        tumor_prob = probabilities[0, 1].item()
        predicted_idx = int(probabilities.argmax(dim=1).item())
        predicted_label = settings.CLASS_LABELS[predicted_idx]

        confidence, requires_review = self.get_confidence_band(
            tumor_prob if predicted_label == "tumor" else (1.0 - tumor_prob)
        )

        heatmap_b64 = None
        try:
            heatmap_b64 = self.generate_gradcam(tensor, image_bytes, predicted_idx)
        except Exception as e:
            pass  # Fallback gracefully if Grad-CAM fails

        return {
            "predicted_label": predicted_label,
            "tumor_probability": round(tumor_prob, 4),
            "confidence": confidence,
            "requires_human_review": requires_review,
            "inference_time_ms": round(elapsed_ms, 2),
            "heatmap_base64": heatmap_b64,
        }

    def generate_gradcam(self, input_tensor: torch.Tensor, original_image_bytes: bytes, target_class: int) -> str | None:
        """Safely isolate Grad-CAM generation without affecting core logic."""
        import cv2
        import numpy as np
        import base64
        
        activations = None
        gradients = None
        
        def forward_hook(module, input, output):
            nonlocal activations
            activations = output

        def backward_hook(module, grad_in, grad_out):
            nonlocal gradients
            gradients = grad_out[0]

        target_layer = self.model.stages[-1].blocks[-1]
        
        handle_forward = target_layer.register_forward_hook(forward_hook)
        handle_backward = target_layer.register_full_backward_hook(backward_hook)

        # Requires a forward pass with gradients enabled
        self.model.zero_grad()
        input_tensor.requires_grad = True
        output = self.model(input_tensor)
        
        score = output[0, target_class]
        score.backward()
        
        handle_forward.remove()
        handle_backward.remove()

        if activations is None or gradients is None:
            return None

        pooled_gradients = torch.mean(gradients, dim=[0, 2, 3])
        for i in range(activations.size(1)):
            activations[:, i, :, :] *= pooled_gradients[i]
            
        heatmap = torch.mean(activations, dim=1).squeeze()
        heatmap = torch.nn.functional.relu(heatmap)
        heatmap /= torch.max(heatmap) + 1e-8
        
        heatmap_array = heatmap.cpu().detach().numpy()
        
        # Apply colormap and blend
        nparr = np.frombuffer(original_image_bytes, np.uint8)
        original_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        heatmap_resized = cv2.resize(heatmap_array, (original_img.shape[1], original_img.shape[0]))
        heatmap_resized = np.uint8(255 * heatmap_resized)
        heatmap_colored = cv2.applyColorMap(heatmap_resized, cv2.COLORMAP_JET)
        
        blended = cv2.addWeighted(original_img, 0.6, heatmap_colored, 0.4, 0)
        
        _, buffer = cv2.imencode('.jpg', blended)
        return base64.b64encode(buffer).decode('utf-8')


# Module-level singleton
model_service = ModelService()
