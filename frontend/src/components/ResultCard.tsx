"use client";

import { useState } from "react";
import Image from "next/image";
import { ShieldAlert, Clock, Tag, Eye } from "lucide-react";
import ConfidenceBadge from "./ConfidenceBadge";
import type { PredictionResult } from "@/lib/api";

interface ResultCardProps {
    result: PredictionResult;
    imageUrl: string;
    onReset: () => void;
}

export default function ResultCard({ result, imageUrl, onReset }: ResultCardProps) {
    const probabilityPercent = Math.round(result.tumor_probability * 100);

    const barColor =
        result.confidence === "high"
            ? "var(--confidence-high)"
            : result.confidence === "medium"
                ? "var(--confidence-medium)"
                : "var(--confidence-low)";

    const labelDisplay =
        result.predicted_label === "tumor" ? "Tumor Detected" : "No Tumor Detected";

    const [showHeatmap, setShowHeatmap] = useState(false);

    // Safely fallback if heatmap is completely missing or null
    const hasHeatmap = !!result.heatmap_base64;
    const displayUrl = (hasHeatmap && showHeatmap)
        ? `data:image/jpeg;base64,${result.heatmap_base64}`
        : imageUrl;

    return (
        <div
            className="fade-in overflow-hidden rounded-xl border"
            style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
            }}
        >
            {/* Image preview */}
            <div
                className="flex flex-col items-center justify-center border-b p-4 sm:p-6 relative group"
                style={{
                    backgroundColor: "var(--surface-elevated)",
                    borderColor: "var(--border)",
                }}
            >
                <div className="relative h-48 w-48 sm:h-64 sm:w-64 overflow-hidden rounded-xl shadow-inner border border-black/5">
                    <Image
                        src={displayUrl}
                        alt="Uploaded MRI scan"
                        fill
                        className="object-cover transition-transform duration-500 hover:scale-105"
                        unoptimized={hasHeatmap && showHeatmap}
                    />
                </div>

                {/* Safe Toggle Button */}
                {hasHeatmap && (
                    <button
                        onClick={() => setShowHeatmap(!showHeatmap)}
                        className="mt-4 sm:absolute sm:bottom-6 sm:right-6 flex items-center justify-center gap-2 rounded-full px-5 py-2 text-[13px] font-bold shadow-lg transition-all active:scale-95 border-2"
                        style={{
                            backgroundColor: showHeatmap ? "var(--accent)" : "var(--surface)",
                            color: showHeatmap ? "#fff" : "var(--text-primary)",
                            borderColor: showHeatmap ? "transparent" : "var(--accent)",
                            zIndex: 10
                        }}
                    >
                        <Eye size={16} />
                        {showHeatmap ? "Hide AI Focus" : "View AI Focus"}
                    </button>
                )}
            </div>

            {/* Results */}
            <div className="space-y-4 p-5">
                {/* Label */}
                <div>
                    <p
                        className="text-[12px] font-medium uppercase tracking-wider"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        AI Assessment
                    </p>
                    <p
                        className="mt-1 text-xl font-semibold"
                        style={{ color: "var(--text-primary)" }}
                    >
                        {labelDisplay}
                    </p>
                </div>

                {/* Probability bar */}
                <div>
                    <div className="mb-1.5 flex items-center justify-between">
                        <span
                            className="text-[13px] font-medium"
                            style={{ color: "var(--text-secondary)" }}
                        >
                            Tumor probability
                        </span>
                        <span
                            className="text-[13px] font-semibold"
                            style={{ color: "var(--text-primary)" }}
                        >
                            {probabilityPercent}%
                        </span>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-bar-fill"
                            style={{
                                width: `${probabilityPercent}%`,
                                backgroundColor: barColor,
                            }}
                        />
                    </div>
                </div>

                {/* Confidence badge */}
                <div className="flex items-center justify-between">
                    <ConfidenceBadge confidence={result.confidence} />
                    <span className="text-[11px] text-slate-500 italic">
                        Calibrated (T=1.5)
                    </span>
                </div>

                {/* Human review flag */}
                {result.requires_human_review && (
                    <div
                        className="flex items-start gap-2 rounded-lg border px-3.5 py-2.5"
                        style={{
                            borderColor:
                                result.confidence === "low"
                                    ? "var(--confidence-low)"
                                    : "var(--confidence-medium)",
                            backgroundColor:
                                result.confidence === "low"
                                    ? "rgba(220, 38, 38, 0.05)"
                                    : "rgba(217, 119, 6, 0.05)",
                        }}
                    >
                        <ShieldAlert
                            size={16}
                            className="mt-0.5 shrink-0"
                            style={{
                                color:
                                    result.confidence === "low"
                                        ? "var(--confidence-low)"
                                        : "var(--confidence-medium)",
                            }}
                        />
                        <p
                            className="text-[13px] font-medium"
                            style={{
                                color:
                                    result.confidence === "low"
                                        ? "var(--confidence-low)"
                                        : "var(--confidence-medium)",
                            }}
                        >
                            {result.confidence === "low"
                                ? "Low confidence — human review is strongly recommended"
                                : "Review recommended by a qualified professional"}
                        </p>
                    </div>
                )}

                {/* Metadata */}
                <div
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3"
                    style={{ borderColor: "var(--border)" }}
                >
                    <span
                        className="inline-flex items-center gap-1 text-[12px]"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        <Tag size={12} strokeWidth={1.8} />
                        {result.model_version}
                    </span>
                    <span
                        className="inline-flex items-center gap-1 text-[12px]"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        <Clock size={12} strokeWidth={1.8} />
                        {result.inference_time_ms.toFixed(0)}ms
                    </span>
                </div>

                {/* Reset button */}
                <button
                    onClick={onReset}
                    className="w-full cursor-pointer rounded-lg py-2.5 text-[13px] font-medium transition-colors"
                    style={{
                        backgroundColor: "var(--surface-elevated)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border)",
                    }}
                    onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "var(--border)")
                    }
                    onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor =
                        "var(--surface-elevated)")
                    }
                >
                    Analyze another scan
                </button>
            </div>
        </div>
    );
}
