# AI Vision Classification Prototype — Implementation Plan

## 1. Challenge Overview

**Goal:** Build an end-to-end AI-native product — fine-tune an open-source vision model on brain scan images and ship a trustworthy inference web app.

**Time Budget:** ~12–16 hours over 2 days.

**What the interviewer is evaluating (from the brief, verbatim):**

| Category                         | Weight | What they look for                                                                     |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| End-to-end product execution     | 25%    | Working upload → inference → result → history flow; overall usability                  |
| Model fine-tuning and evaluation | 20%    | Reasonable transfer learning setup, metrics, split quality, leakage awareness          |
| AI trust and safety UX           | 20%    | Disclaimers, confidence/uncertainty handling, human review gating, language choices     |
| Backend/API and reliability      | 20%    | Validation, error handling, audit logs, structured responses, versioning               |
| Communication and tradeoffs      | 15%    | README quality, architecture rationale, limitations, next steps                        |

> [!IMPORTANT]
> They care MORE about **trustworthiness and engineering quality** than benchmark accuracy. This is a product engineering challenge, not a Kaggle competition.

---

## 2. Dataset

**Source:** Kaggle — *Brain Tumor Multimodal Image (CT and MRI)*

The dataset is pre-downloaded and lives at:
```
dataset/Dataset/
├── Brain Tumor CT scan Images/   (4618 images)
│   ├── Healthy/                  (2300 images)
│   └── Tumor/                    (2318 images)
└── Brain Tumor MRI images/       (5000 images)
    ├── Healthy/                  (2000 images)
    └── Tumor/                    (3000 images)
```

**Key observations:**
- **Binary classification**: `Healthy` vs `Tumor`.
- **MRI subset is imbalanced** (60% Tumor, 40% Healthy). This is important for metric selection and training strategy.
- CT subset is nearly balanced.
- The challenge says "either CT or MRI" — **we will use MRI** (larger dataset, more interesting imbalance to discuss).
- Images are aggregated from **multiple Kaggle/Roboflow sources** (documented in `MRI image source.txt`). This means **duplicate/near-duplicate images are highly likely** — we must address this in our leakage mitigation strategy.

**Data sources for MRI (from `MRI image source.txt`):**
1. Brain Tumor (MRI Scans) — Kaggle
2. Brain Tumor MRIs — Kaggle
3. Siardataset — Kaggle
4. Brain tumors 256x256 — Kaggle
5. Brain Tumor MRI Image Classification Dataset — Kaggle
6. Brain Tumor MRI (yes or no) — Kaggle
7. BRAIN TUMOR CLASS CLASS — Roboflow
8. Brain Tumor Detection — Roboflow
9. Tumor Detection — Roboflow

> [!WARNING]
> Since images come from 9 different sources, there is a **high probability of duplicate and near-duplicate images** across the dataset. Our data pipeline MUST include a deduplication step before splitting.

---

## 3. Resource Requirements

### Hardware
- **GPU:** Strongly recommended for model training. Since local GPU is unavailable, we will use a **Google Colab T4 GPU (free)**. We'll use `convnext_tiny` (a modern, highly efficient backbone) to ensure fast training and high accuracy.
- **RAM:** 8 GB minimum; 16 GB recommended.
- **Disk:** ~1 GB for dataset, ~500 MB for model artifacts and dependencies.

### Software / Dependencies
| Component         | Technology                                 | Why                                                                                       |
| ----------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Model Training    | **PyTorch + timm** (ConvNeXt-Tiny)         | Industry standard. `timm` provides `convnext_tiny`, an extremely modern and powerful backbone.   |
| Backend API       | **FastAPI** (Python)                       | Explicitly recommended by the brief. Async, fast, auto-generates OpenAPI docs.           |
| Frontend          | **Next.js** (React, App Router)            | Explicitly recommended by the brief. Modern, SSR-capable. We'll use Tailwind CSS.        |
| Database          | **PostgreSQL** (via SQLAlchemy + asyncpg)  | The brief says "PostgreSQL preferred". Production-grade. Dockerized for easy setup.      |
| Packaging         | **Docker + docker-compose** (bonus)        | Lets the evaluator run `docker compose up` and get the full stack instantly.              |
| Explainability    | **Grad-CAM** (stretch goal)                | Optional bonus. We'll attempt if time allows.                                             |
| Python version    | **3.10+**                                  | For modern type hints and `match` statement support.                                      |

---

## 4. Existing Sample Analysis

The Kaggle notebook in `samples/brain-tumor-image-classification-mri.ipynb` provides a reference implementation. Here's what it does **and what we must do differently**:

| Aspect                  | Sample Notebook (What it does)                             | Our Approach (What we'll do differently)                                                                  |
| ----------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Model                   | Custom CNN from scratch (Conv2d layers)                    | **Fine-tune a pretrained `convnext_tiny`** via `timm` (transfer learning, as required by the brief)   |
| Data Split              | Simple 80/20 train/test random split                       | **80/10/10 train/val/test** with deduplication before split                                              |
| Leakage Mitigation      | None                                                       | **Image hashing** (perceptual hash) to detect and remove duplicates/near-duplicates before splitting     |
| Validation Set           | None (no separate validation set)                          | Explicit validation set for hyperparameter tuning and early stopping                                     |
| Evaluation Metrics       | Only accuracy                                              | **ROC-AUC, Precision, Recall, F1, Confusion Matrix, Sensitivity, Specificity** (as required)            |
| Confidence Policy        | None                                                       | **Three-band policy**: High (≥85%), Medium (50–85%), Low (<50%) with automatic human review flag        |
| Augmentation             | None (only Resize + ToTensor)                              | **RandomHorizontalFlip, RandomRotation, ColorJitter, RandomAffine**                                     |
| Normalization            | None                                                       | **ImageNet normalization** (required for pretrained models)                                              |
| Versioned Artifact       | No                                                         | Model saved as `model_v0.1.0.pt` with metadata                                                          |

---

## 5. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          User / Browser                             │
│                       (Next.js Frontend)                            │
│  ┌────────────┐  ┌────────────────┐  ┌───────────────────────────┐ │
│  │ Upload UI  │  │ Results View   │  │ Audit History Dashboard   │ │
│  │ + Preview  │  │ + Confidence   │  │ (Table of past inferences)│ │
│  │ + DnD      │  │ + Disclaimer   │  │                           │ │
│  └─────┬──────┘  └───────▲────────┘  └──────────▲────────────────┘ │
│        │                 │                       │                  │
│        │    POST /predict│        GET /history   │                  │
└────────┼─────────────────┼───────────────────────┼──────────────────┘
         │                 │                       │
         ▼                 │                       │
┌────────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                                │
│  ┌──────────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ POST /predict    │  │ GET /health │  │ GET /history         │  │
│  │ - Validate file  │  │             │  │ - Return audit logs  │  │
│  │ - Run inference  │  │             │  │ - Pagination support │  │
│  │ - Log to DB      │  │             │  │                      │  │
│  │ - Return JSON    │  │             │  │                      │  │
│  └────────┬─────────┘  └─────────────┘  └──────────┬───────────┘  │
│           │                                         │              │
│           ▼                                         ▼              │
│  ┌────────────────┐                      ┌──────────────────────┐  │
│  │ Model Service  │                      │ PostgreSQL Database  │  │
│  │ (ConvNeXt)     │                      │ (inference_log table)│  │
│  │ - Load v0.1.0  │                      │                      │  │
│  │ - Preprocess   │                      │                      │  │
│  │ - Softmax      │                      │                      │  │
│  │ - Confidence   │                      │                      │  │
│  │   banding      │                      │                      │  │
│  └────────────────┘                      └──────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

---

## 6. Detailed Implementation Plan

### Phase 1: Project Scaffolding & Data Preparation [~2 hours]

#### 1.1 Repository Structure
```
assignment-cantordust/
├── README.md                    # Setup, architecture, tradeoffs, limitations
├── docker-compose.yml           # One-command local setup (bonus)
├── plan/                        # This plan
├── dataset/                     # Raw data (gitignored)
├── model_training/              # Training pipeline for Google Colab
│   └── colab_training.ipynb     # All-in-one Jupyter Notebook for Colab (data prep, training, eval, and model export)
├── backend/                     # FastAPI service
│   ├── main.py                  # FastAPI app entrypoint
│   ├── model_service.py         # Model loading and inference
│   ├── schemas.py               # Pydantic response models
│   ├── database.py              # SQLAlchemy setup + models
│   ├── config.py                # Settings (model path, version, thresholds)
│   ├── Dockerfile               # Backend container
│   └── requirements.txt
├── frontend/                    # Next.js app
│   ├── src/
│   │   ├── app/                 # App Router pages
│   │   │   ├── page.tsx         # Home / Upload page
│   │   │   ├── history/
│   │   │   │   └── page.tsx     # Audit history page
│   │   │   └── layout.tsx       # Root layout with disclaimer
│   │   ├── components/          # UI components
│   │   │   ├── UploadZone.tsx
│   │   │   ├── ResultCard.tsx
│   │   │   ├── ConfidenceBadge.tsx
│   │   │   ├── Disclaimer.tsx
│   │   │   └── HistoryTable.tsx
│   │   └── lib/
│   │       └── api.ts           # API client
│   ├── Dockerfile               # Frontend container
│   ├── package.json
│   └── tailwind.config.ts
├── models/                      # Saved model artifacts (downloaded from Colab)
│   └── model_v0.1.0.pt
├── evaluation/                  # Generated evaluation reports (downloaded from Colab)
│   ├── classification_report.txt
│   ├── confusion_matrix.png
│   └── roc_curve.png
└── samples/                     # Reference Kaggle notebook (existing)
```

#### 1.2 Data Preparation Pipeline (inside `colab_training.ipynb`)
1. **Upload Dataset to Colab** or download directly via Kaggle API.
2. **Load all MRI images** using `torchvision.datasets.ImageFolder`.
3. **Deduplication**: Compute perceptual hash (pHash) for every image. Remove exact and near-duplicate images. Log the count of duplicates removed.
4. **Stratified split**: Use `sklearn.model_selection.train_test_split` with `stratify=labels` to create:
   - **Train**: 80%
   - **Validation**: 10%
   - **Test**: 10%
5. **Document** the final split sizes and class distributions in the evaluation report.

#### 1.3 Augmentation Strategy (inside `colab_training.ipynb`)
```python
# Training transforms
train_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomRotation(degrees=15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.RandomAffine(degrees=0, translate=(0.1, 0.1)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),  # ImageNet stats
])

# Validation/Test transforms (no augmentation)
eval_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])
```

---

### Phase 2: Model Fine-Tuning & Evaluation [~4 hours]

> [!IMPORTANT]
> The assignment **requires** fine-tuning a **pretrained** open-source vision model. The sample Kaggle notebook uses a custom CNN from scratch — that does NOT meet the requirement. We use transfer learning with `timm` and a modern ConvNeXt architecture.

#### 2.1 Model Architecture (Pretrained Fine-Tuning)
- **Backbone**: `convnext_tiny` from `timm`, **pretrained on ImageNet** (1000-class weights). *Why ConvNeXt?* It's a modernized pure-CNN architecture from 2022 that rivals Vision Transformers (ViT) in accuracy but maintains the incredible throughput and simplicity of CNNs. It is superior to older models like ResNet and EfficientNet.
- **Head**: Replace the classifier head with `nn.Linear(768, 2)` (2 classes: Healthy, Tumor).
- **Freeze strategy (2-stage fine-tuning)**:
  1. **Stage 1** (5 epochs): Freeze all backbone layers. Train only the new classifier head with lr=`1e-3`.
  2. **Stage 2** (10–15 epochs): Unfreeze all layers. Fine-tune the entire model with lr=`1e-5` (backbone) and lr=`1e-4` (head).
- **Loss**: `CrossEntropyLoss` with class weights to handle the 40/60 imbalance.
- **Optimizer**: `AdamW` with differential learning rates.
- **Scheduler**: `CosineAnnealingLR` for smooth decay.

#### 2.2 Training Environment (Google Colab)
- **Where to train**: **Google Colab (T4 GPU)**. Since no local GPU is available, this guarantees fast training (~15-30 mins).
- The entire data prep, training, and evaluation pipeline will be contained in a single, well-documented Jupyter Notebook (`colab_training.ipynb`).
- After training, the model artifact (`model_v0.1.0.pt`) and evaluation plots will be downloaded from Colab and placed into the local `models/` and `evaluation/` directories respectively.

#### 2.3 Training Script (`model_training/train.py`)
- Train/val loop with early stopping (patience=5 based on val loss).
- Log metrics per epoch (loss, accuracy, F1).
- Save best model checkpoint as `models/model_v0.1.0.pt`.

#### 2.4 Evaluation (`model_training/evaluate.py`)
Run on the held-out **test set** and generate:
- **Classification Report**: Precision, Recall, F1-Score per class.
- **ROC-AUC Score** + **ROC Curve plot**.
- **Confusion Matrix** (heatmap).
- **Sensitivity** (True Positive Rate) and **Specificity** (True Negative Rate).
- Save all artifacts to `evaluation/`.

#### 2.5 Confidence Policy
| Band     | Probability Range | `requires_human_review` | UI Treatment                              |
| -------- | ----------------- | ----------------------- | ----------------------------------------- |
| **High** | ≥ 0.85            | `false`                 | Green indicator, standard result display  |
| **Medium** | 0.50 – 0.84    | `true`                  | Amber indicator, "Review recommended"     |
| **Low**  | < 0.50            | `true`                  | Red indicator, "Low confidence — requires human review" |

> [!NOTE]
> The 0.85 threshold is intentionally conservative. In a real medical setting, even 0.95 might be too low. We will document this tradeoff explicitly in the README.

---

### Phase 3: Backend API [~3 hours]

#### 3.1 Endpoints

| Method | Path        | Description                                  |
| ------ | ----------- | -------------------------------------------- |
| POST   | `/predict`  | Upload image → run inference → return result |
| GET    | `/history`  | Paginated audit log of past inferences       |
| GET    | `/health`   | Health check (model loaded, DB accessible)   |

#### 3.2 `POST /predict` — Detailed Behavior
1. **Validate** uploaded file:
   - Must be an image (MIME type: `image/jpeg`, `image/png`).
   - Max file size: 10 MB.
   - Must be decodable as an image (catch corrupt files).
   - Return clear `400` error with human-readable message on failure.
2. **Preprocess** image: Resize to 224×224, normalize with ImageNet stats.
3. **Run inference**: Forward pass through the model, apply softmax.
4. **Compute** confidence band based on tumor probability.
5. **Log** to database: timestamp, filename hash (SHA-256), predicted label, probability, confidence band, model version, inference time.
6. **Return** structured JSON response:

```json
{
  "predicted_label": "tumor",
  "tumor_probability": 0.87,
  "confidence": "medium",
  "requires_human_review": true,
  "model_version": "v0.1.0",
  "inference_time_ms": 142,
  "timestamp": "2026-03-06T12:00:00Z"
}
```

#### 3.3 Database Schema (PostgreSQL)
```sql
CREATE TABLE inference_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    image_hash VARCHAR(64) NOT NULL,       -- SHA-256 of uploaded file
    original_filename VARCHAR(255),
    predicted_label VARCHAR(20) NOT NULL,
    tumor_probability DOUBLE PRECISION NOT NULL,
    confidence VARCHAR(10) NOT NULL,        -- 'high', 'medium', 'low'
    requires_human_review BOOLEAN NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    inference_time_ms DOUBLE PRECISION NOT NULL
);
```

---

### Phase 4: Frontend Web App [~4 hours]

#### 4.1 Pages
1. **Home / Upload Page** (`/`)
   - Drag-and-drop upload zone with image preview.
   - Client-side file type/size validation before upload.
   - After upload, display the inference result:
     - Predicted label (non-diagnostic language: "AI Assessment").
     - Tumor probability as a percentage with progress bar.
     - Confidence badge (color-coded: green/amber/red).
     - `requires_human_review` flag prominently displayed.
     - Inference metadata: model version, inference time, timestamp.
   - **Prominent disclaimer banner** at the top of every page.

2. **History / Audit Page** (`/history`)
   - Table of all past inference requests.
   - Columns: Timestamp, Filename, Prediction, Probability, Confidence, Human Review Flag.
   - Pagination support.

#### 4.2 Trust & Safety UX Rules
- **Disclaimer** (always visible): *"⚠️ This tool is a research prototype and does NOT provide clinical diagnoses. All outputs are AI-generated assessments and must be reviewed by a qualified medical professional."*
- **Language rules**: Never use the words "diagnosed", "diagnosis", "confirmed", or "certain". Always use "assessment", "prediction", "estimated probability".
- **Low confidence**: Display a large amber/red warning banner: *"⚠️ Low confidence prediction — human review is strongly recommended."*
- **High confidence**: Still show the disclaimer.

#### 4.3 Design System
- **Dark theme** (medical/clinical feel).
- **Font**: Inter (Google Fonts).
- **Colors**: Dark navy background, with green/amber/red for confidence bands.
- **Micro-animations**: Fade-in for results, pulse for confidence badge, smooth progress bar for probability.

---

### Phase 5: Packaging, README & Demo [~2 hours]

#### 5.1 Docker Compose
```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: brain_tumor_app
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: app_password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./models:/app/models
    environment:
      - DATABASE_URL=postgresql://app_user:app_password@db:5432/brain_tumor_app
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend

volumes:
  pgdata:
```

#### 5.2 README.md Structure
1. **Quick Start** (docker compose up OR manual setup).
2. **Architecture Overview** (the diagram above).
3. **Dataset & Preprocessing** (which dataset, dedup strategy, split).
4. **Model Training** (backbone choice, freeze strategy, augmentation rationale).
5. **Evaluation Summary** (metrics table, ROC curve, confusion matrix).
6. **Confidence Policy** (threshold rationale, safety design).
7. **Assumptions & Limitations** (not a diagnostic tool, dataset bias, single modality, no calibration).
8. **Tradeoffs** (why ConvNeXt-Tiny vs larger models, why PostgreSQL, etc.).
9. **Next Steps** (what we'd build next if this were a real product: calibration, RBAC, monitoring, CI/CD).

#### 5.3 Demo Video (5–10 minutes)
- Walk through the architecture.
- Show the training pipeline running.
- Show the evaluation metrics.
- Demo the web app: upload an image, see results, check history.
- Explain tradeoffs and what we'd do differently with more time.

---

## 7. Risk Mitigation & Tradeoffs

| Decision                        | Rationale                                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| ConvNeXt-Tiny (not ResNet/EfficientNet) | ConvNeXt is a modernized CNN (2022) that offers better speed/accuracy tradeoff than EfficientNet and better raw accuracy than ResNet. It fits perfectly on a Colab T4. |
| MRI only (not CT)               | Larger dataset, more interesting imbalance story to tell. Keeps scope manageable.                        |
| PostgreSQL (not SQLite)          | The brief says "PostgreSQL preferred". Production-grade. Dockerized so zero-config for the evaluator.  |
| 85% threshold for high confidence | Conservative by design. In real medical AI, thresholds would be clinically validated.                 |
| No multi-class (just binary)    | The dataset is structured as binary. Matches the brief's "tumor probability" framing.                   |
| Perceptual hash (not MD5)       | Catches near-duplicates (resized/re-encoded copies), not just exact duplicates.                         |
| Class-weighted loss             | Addresses the 40/60 imbalance in MRI data without oversampling.                                         |

---

## 8. What to Avoid (from the brief)
- ❌ Overclaiming medical usefulness or presenting outputs as diagnoses.
- ❌ Focusing only on model accuracy while neglecting product trust and reliability.
- ❌ Ignoring validation/error handling on uploads.
- ❌ Hard-coding behavior without documenting assumptions.
- ❌ Excessive scope that prevents a working end-to-end demo.

---

## 9. Stretch Goals (if time permits)
- [ ] **Grad-CAM heatmap overlay** in the UI (shows which image regions the model focused on).
- [ ] **Confidence calibration** (temperature scaling) + calibration plot.
- [ ] **Docker compose** for one-command setup.
- [ ] **Basic monitoring** page (latency, error rate, class distribution).
