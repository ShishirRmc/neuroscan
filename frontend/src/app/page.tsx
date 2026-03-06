"use client";

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import UploadZone from "@/components/UploadZone";
import ResultCard from "@/components/ResultCard";
import { predictImage } from "@/lib/api";
import type { PredictionResult } from "@/lib/api";

export default function HomePage() {
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);

    // Create a local preview URL
    const previewUrl = URL.createObjectURL(file);
    setImageUrl(previewUrl);

    try {
      const submission = await predictImage(file);

      // Polling for results
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max

      while (attempts < maxAttempts) {
        const prediction = await import("@/lib/api").then(api => api.getPredictionStatus(submission.job_id));
        if (prediction.status === "completed") {
          setResult(prediction);
          break;
        } else if (prediction.status === "failed") {
          throw new Error("Inference task failed on the server.");
        }

        // Wait 1 second before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error("Prediction timed out. Please check History later.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred");
      setImageUrl(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setResult(null);
    setImageUrl(null);
    setError(null);
  }, [imageUrl]);

  return (
    <div className="space-y-6">
      {/* Upload zone — hidden after result */}
      {!result && !loading && (
        <>
          <UploadZone onFileSelected={handleFileSelected} isLoading={loading} />
          <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-slate-500 fade-in">
            <span className="flex h-2 w-2 rounded-full bg-blue-500/50 animate-pulse" />
            Looking for test cases? check the
            <span className="font-bold text-slate-400">"Explore Features"</span>
            guide in the bottom corner.
          </div>
        </>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2
            size={28}
            className="spin"
            style={{ color: "var(--accent)" }}
          />
          <p
            className="mt-3 text-[13px]"
            style={{ color: "var(--text-secondary)" }}
          >
            Analyzing scan...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="fade-in text-center">
          <p
            className="text-[13px] font-medium"
            style={{ color: "var(--confidence-low)" }}
          >
            {error}
          </p>
          <button
            onClick={handleReset}
            className="mt-3 cursor-pointer text-[13px] font-medium underline"
            style={{ color: "var(--accent)" }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Result card */}
      {result && imageUrl && (
        <ResultCard result={result} imageUrl={imageUrl} onReset={handleReset} />
      )}
    </div>
  );
}
