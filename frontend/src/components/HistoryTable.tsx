"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import ConfidenceBadge from "./ConfidenceBadge";
import { getHistory, submitReview } from "@/lib/api";
import type { HistoryItem as HistoryItemType, HistoryResponse } from "@/lib/api";

export default function HistoryTable() {
    const [data, setData] = useState<HistoryResponse | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pageSize = 15;

    const loadHistory = () => {
        setLoading(true);
        setError(null);
        getHistory(page, pageSize)
            .then(setData)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const handleReview = async (id: number, correctLabel: string) => {
        try {
            await submitReview(id, correctLabel);
            loadHistory(); // Refresh to show completed review
        } catch (err) {
            console.error(err);
            alert("Failed to submit manual review.");
        }
    };

    const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2
                    size={24}
                    className="spin"
                    style={{ color: "var(--text-secondary)" }}
                />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-20">
                <AlertTriangle size={24} style={{ color: "var(--confidence-low)" }} />
                <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                    {error}
                </p>
            </div>
        );
    }

    if (!data || data.items.length === 0) {
        return (
            <div className="py-20 text-center">
                <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
                    No inference history yet.
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Desktop table */}
            <div className="hidden sm:block">
                <div
                    className="overflow-hidden rounded-xl border"
                    style={{ borderColor: "var(--border)" }}
                >
                    <table className="w-full text-[13px]">
                        <thead>
                            <tr
                                style={{
                                    backgroundColor: "var(--surface-elevated)",
                                    color: "var(--text-secondary)",
                                }}
                            >
                                <th className="px-4 py-3 text-left font-medium">Time</th>
                                <th className="px-4 py-3 text-left font-medium">File</th>
                                <th className="px-4 py-3 text-left font-medium">Result</th>
                                <th className="px-4 py-3 text-left font-medium">Probability</th>
                                <th className="px-4 py-3 text-left font-medium">Confidence</th>
                                <th className="px-4 py-3 text-left font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((item) => (
                                <tr
                                    key={item.id}
                                    className="border-t transition-colors"
                                    style={{
                                        borderColor: "var(--border)",
                                        backgroundColor: "var(--surface)",
                                    }}
                                    onMouseEnter={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "var(--surface-elevated)")
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.backgroundColor = "var(--surface)")
                                    }
                                >
                                    <td
                                        className="whitespace-nowrap px-4 py-3"
                                        style={{ color: "var(--text-secondary)" }}
                                    >
                                        {formatTime(item.timestamp)}
                                    </td>
                                    <td
                                        className="max-w-[140px] truncate px-4 py-3"
                                        style={{ color: "var(--text-primary)" }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-700">
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/history/${item.id}/image`}
                                                    alt="thumb"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        // Fallback to text if image fails to load
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                            <span className="truncate">{item.original_filename || "—"}</span>
                                        </div>
                                    </td>
                                    <td
                                        className="px-4 py-3 font-medium capitalize"
                                        style={{ color: "var(--text-primary)" }}
                                    >
                                        {item.status === "processing" ? (
                                            <span className="flex items-center gap-1.5 text-slate-500 italic">
                                                <Loader2 size={12} className="animate-spin" />
                                                Processing
                                            </span>
                                        ) : item.status === "failed" ? (
                                            <span className="text-red-500">Failed</span>
                                        ) : (
                                            item.predicted_label
                                        )}
                                    </td>
                                    <td
                                        className="px-4 py-3"
                                        style={{ color: "var(--text-secondary)" }}
                                    >
                                        {item.status === "completed" ? `${Math.round(item.tumor_probability * 100)}%` : "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.status === "completed" ? (
                                            <ConfidenceBadge confidence={item.confidence as any} />
                                        ) : (
                                            <span className="text-slate-600">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.status === "processing" ? (
                                            <span className="text-slate-500 text-xs italic">Waiting for AI...</span>
                                        ) : item.reviewed_label ? (
                                            <span
                                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                                                style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--confidence-high)" }}
                                            >
                                                <CheckCircle size={12} />
                                                Verified: {item.reviewed_label}
                                            </span>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleReview(item.id, "tumor")}
                                                    className="px-2 py-1 text-xs rounded border hover:bg-white/5 transition-colors"
                                                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                                                >
                                                    {item.predicted_label === "tumor" ? "Correct" : "Mark Tumor"}
                                                </button>
                                                <button
                                                    onClick={() => handleReview(item.id, "healthy")}
                                                    className="px-2 py-1 text-xs rounded border hover:bg-white/5 transition-colors"
                                                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                                                >
                                                    {item.predicted_label === "healthy" ? "Correct" : "Mark Healthy"}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 sm:hidden">
                {data.items.map((item) => (
                    <div
                        key={item.id}
                        className="rounded-xl border p-4 transition-colors"
                        style={{
                            backgroundColor: "var(--surface)",
                            borderColor: "var(--border)",
                        }}
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <span
                                className="text-[14px] font-bold capitalize"
                                style={{ color: "var(--text-primary)" }}
                            >
                                {item.status === "processing" ? (
                                    <span className="flex items-center gap-1.5 text-slate-500 italic">
                                        <Loader2 size={12} className="animate-spin" />
                                        Processing
                                    </span>
                                ) : item.status === "failed" ? (
                                    <span className="text-red-500">Failed</span>
                                ) : (
                                    item.predicted_label
                                )}
                            </span>
                            {item.status === "completed" && (
                                <ConfidenceBadge confidence={item.confidence as any} />
                            )}
                        </div>

                        <div className="space-y-2 border-t pt-3" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                            <Row label="File" value={item.original_filename || "—"} />
                            <Row
                                label="Probability"
                                value={item.status === "completed" ? `${Math.round(item.tumor_probability * 100)}%` : "—"}
                            />
                            <Row label="Time" value={formatTime(item.timestamp)} />
                        </div>

                        {/* Mobile Actions */}
                        <div className="mt-4 pt-3 border-t" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                            {item.status === "processing" ? (
                                <p className="text-[11px] text-slate-500 italic text-center">AI is analyzing this scan...</p>
                            ) : item.reviewed_label ? (
                                <div
                                    className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold"
                                    style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--confidence-high)" }}
                                >
                                    <CheckCircle size={13} />
                                    Verified: {item.reviewed_label}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => handleReview(item.id, "tumor")}
                                        className="rounded-lg border py-2 text-[12px] font-semibold transition-colors active:scale-95"
                                        style={{ borderColor: "var(--border)", color: "var(--text-primary)", backgroundColor: "var(--surface-elevated)" }}
                                    >
                                        Verify: Tumor
                                    </button>
                                    <button
                                        onClick={() => handleReview(item.id, "healthy")}
                                        className="rounded-lg border py-2 text-[12px] font-semibold transition-colors active:scale-95"
                                        style={{ borderColor: "var(--border)", color: "var(--text-primary)", backgroundColor: "var(--surface-elevated)" }}
                                    >
                                        Verify: Healthy
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-5 flex items-center justify-center gap-3">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-30"
                        style={{
                            borderColor: "var(--border)",
                            color: "var(--text-primary)",
                            backgroundColor: "var(--surface)",
                        }}
                    >
                        Previous
                    </button>
                    <span
                        className="text-[13px]"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-30"
                        style={{
                            borderColor: "var(--border)",
                            color: "var(--text-primary)",
                            backgroundColor: "var(--surface)",
                        }}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-[12px]">
            <span style={{ color: "var(--text-secondary)" }}>{label}</span>
            <span
                className="max-w-[180px] truncate"
                style={{ color: "var(--text-primary)" }}
            >
                {value}
            </span>
        </div>
    );
}

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
