/**
 * API client for the Brain Tumor Classification backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface PredictionResult {
  predicted_label: string;
  tumor_probability: number;
  confidence: "high" | "medium" | "low";
  requires_human_review: boolean;
  model_version: string;
  inference_time_ms: number;
  timestamp: string;
  disclaimer: string;
  heatmap_base64?: string | null;
}

export interface HistoryItem {
  id: number;
  status: string;
  timestamp: string;
  original_filename: string | null;
  predicted_label: string;
  tumor_probability: number;
  confidence: "high" | "medium" | "low";
  requires_human_review: boolean;
  model_version: string;
  inference_time_ms: number;
  reviewed_label?: string | null;
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  model_version: string;
  database_connected: boolean;
}

export interface PredictionJobSubmission {
  job_id: number;
  status: "processing";
}

export async function predictImage(file: File): Promise<PredictionJobSubmission> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/predict`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Inference failed" }));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }

  return res.json();
}

export async function getPredictionStatus(id: number): Promise<PredictionResult & { status: string, id: number }> {
  const res = await fetch(`${API_URL}/predict/${id}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch prediction status: ${res.status}`);
  }

  return res.json();
}

export async function getHistory(
  page: number = 1,
  pageSize: number = 20,
  requiresReviewOnly: boolean = false
): Promise<HistoryResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString()
  });
  if (requiresReviewOnly) {
    params.append('requires_review_only', 'true');
  }

  const res = await fetch(`${API_URL}/history?${params.toString()}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch history: ${res.status}`);
  }

  return res.json();
}

export async function submitReview(
  id: number,
  reviewedLabel: string
): Promise<{ status: string }> {
  const res = await fetch(`${API_URL}/history/${id}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reviewed_label: reviewedLabel }),
  });

  if (!res.ok) {
    throw new Error(`Failed to submit review: ${res.status}`);
  }

  return res.json();
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/health`);

  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }

  return res.json();
}
