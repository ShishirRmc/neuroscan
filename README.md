# NeuroScan AI: Brain Tumor Classification Prototype

NeuroScan AI is a high-performance medical vision prototype designed for automated brain tumor classification from MRI scans. It features a robust FastAPI backend and a premium Next.js frontend, integrating advanced AI engineering practices.

## 🚀 Key Features

### 1. **Explainable AI (Grad-CAM)**
The system doesn't just predict; it explains. For every scan, it generates a heat map highlighting the specific regions of the input image that the model focused on to make its decision.

### 2. **Human-in-the-Loop (HITL) Gating**
To ensure safety, predictions with **Low** or **Medium** confidence are automatically flagged and routed to a dedicated **Admin Review Queue**. A clinical professional can then manually verify or correct the AI's assessment.

### 3. **Asynchronous Inference & Polling**
The application handles heavy model lifting asynchronously. When you upload a scan, the backend immediately queues a background task, keeping the UI responsive via a real-time polling mechanism.

### 4. **Out-of-Distribution (OOD) Protection**
The model includes a modality check that automatically rejects non-MRI images (e.g., photos, landscapes), ensuring the system is only used for its intended purpose.

### 5. **Confidence Calibration**
Probability scores are calibrated using **Temperature Scaling (T=1.5)** to ensure the confidence metrics are statistically reliable and not over-exaggerated.

---

## 🛠 Tech Stack

*   **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion.
*   **Backend:** FastAPI, Pydantic, SQLAlchemy (Asynchronous), PostgreSQL.
*   **AI/ML:** PyTorch, ConvNeXt-Tiny, Timm, Grad-CAM (TorchCam).
*   **Database:** PostgreSQL with full audit logging.

---

## 📖 How to Use

### Basic Analysis
1.  **Upload:** Drag and drop a brain MRI scan (JPG/PNG) onto the home page.
2.  **Wait:** Observe the "Analyzing..." state as the async worker processes the scan.
3.  **Result:** View the tumor probability, confidence level, and calibrated score.
4.  **Heatmap:** Click **"View AI Focus"** to see the Grad-CAM visualization.

### Admin Review (Flagged Cases)
1.  Navigate to the **Admin** page.
2.  Review low-confidence cases in the queue.
3.  Click **"Verify as Tumor"** or **"Verify as Healthy"** to finalize the report.
4.  Track all changes in the **History** audit log.

---

## 📊 Model Evaluation Summary

The model was evaluated on a held-out test set of **389 images** (axial T1-weighted MRI).

| Class | Precision | Recall | F1-Score | Support |
|---|---|---|---|---|
| **Healthy** | 1.00 | 0.98 | 0.99 | 120 |
| **Tumor** | 0.99 | 1.00 | 1.00 | 269 |
| **Overall (Macro Avg)** | **1.00** | **0.99** | **0.99** | **389** |

*   **Split Strategy:** 80/10/10 (Train/Validation/Test).
*   **Leakage Mitigation:** Perceptual Hashing (pHash) used to deduplicate scans before splitting.
*   **Metrics:** Precision and recall were prioritized over raw accuracy to ensure reliability in detection.

---

### 🗄️ Database Strategy
This prototype uses a dual-database approach for flexibility:
*   **Local (Default):** A PostgreSQL instance is provided within the `docker-compose` stack. No manual installation is required if using Docker.
*   **Production:** The system is configured to integrate with **Supabase** (PostgreSQL) for cloud persistence and remote audit logs.

#### How to Switch:
1.  Open `backend/.env` (or use the `.env.example` as a template).
2.  Set `ENVIRONMENT=dev` to use the local Docker DB.
3.  Set `ENVIRONMENT=prod` and provide a `PROD_DATABASE_URL` to use Supabase.

---

## 🏗 Setup & Installation
The easiest way to run the entire stack (Frontend, Backend, and Database) is using **Docker Compose**.

### Quick Start (Docker - Recommended)
1.  **Ensure Docker is running.**
2.  **Start the stack (forces a clean build):**
    ```bash
    docker-compose up --build
    ```
    *Note: To run in the background, use `docker-compose up --build -d`.*
3.  **Access the App:**
    - Frontend: [http://localhost:3000](http://localhost:3000)
    - API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

### Manual Setup (Local Development)

#### Backend Setup
1.  `cd backend`
2.  `pip install -r requirements.txt`
3.  `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`

#### Frontend Setup
1.  `cd frontend`
2.  `npm install`
3.  `npm run dev`

---

## 🔬 Technical Rationale & Tradeoffs

### 1. Data Leakage Mitigation (pHash)
To prevent "memorization" of training data, we implemented a **Perceptual Hash (pHash)** deduplication step in the training pipeline. Traditional MD5 hashing fails to detect resized or slightly altered near-duplicates often found in medical datasets. By using pHash, we ensured that the **80/10/10 split** is strictly discrete, preserving the integrity of our test metrics.

### 2. Confidence Policy (0.85 Threshold)
We established a conservative **0.85 (High Confidence)** threshold for automated processing. Any prediction below this score—even if the model is "leaning" towards a result—is automatically gated for **Human-in-the-Loop (HITL)** review. This prioritizes safety over automation, a requirement for high-stakes medical AI prototypes.

### 3. Temperature Scaling (T=1.5)
NN classifiers are often "overconfident". We apply **Temperature Scaling** to the output logits to soften the probability distribution, making the resulting confidence scores statistically more reliable and representative of true model uncertainty.

---

## 📋 Assumptions & Limitations
- **Prototype Nature:** This is **not a medical device** and has not been clinically validated.
- **Dataset Diversity:** The training data (MRI) is aggregated from multiple sources; while deduplicated, it may still carry biases inherent to those sources.
- **Single Modality:** This specific model is fine-tuned for MRI only. While an OOD check is implemented, results on other modalities (CT, X-ray) will be invalid.
- **Hardware:** Inference is optimized for CPU-bound environments typical of office workstations, but supports GPU acceleration if available.
