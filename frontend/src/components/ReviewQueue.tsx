"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle, Image as ImageIcon } from "lucide-react";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import { getHistory, submitReview } from "@/lib/api";
import type { HistoryItem, HistoryResponse } from "@/lib/api";

export default function ReviewQueue() {
    const [data, setData] = useState<HistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadQueue = () => {
        setLoading(true);
        setError(null);
        // Fetch only items requiring review
        getHistory(1, 50, true)
            .then(setData)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadQueue();
    }, []);

    const handleReview = async (id: number, correctLabel: string) => {
        try {
            await submitReview(id, correctLabel);
            loadQueue(); // Refresh the list
        } catch (err) {
            console.error(err);
            alert("Failed to submit review.");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-slate-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-20">
                <AlertTriangle size={24} className="text-red-500" />
                <p className="text-[13px] text-slate-400">{error}</p>
            </div>
        );
    }

    if (!data || data.items.length === 0) {
        return (
            <div className="py-20 text-center">
                <p className="text-[14px] text-slate-400">Review queue is empty. All low-confidence cases processed.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4">
                {data.items.map((item) => (
                    <div
                        key={item.id}
                        className="flex flex-col md:flex-row gap-6 p-4 rounded-xl border border-slate-800 bg-slate-900/50"
                    >
                        {/* Image display */}
                        <div className="w-full md:w-32 h-32 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 overflow-hidden relative group">
                            <img 
                                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/history/${item.id}/image`} 
                                alt={`Scan ${item.id}`}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <ConfidenceBadge confidence={item.confidence} />
                                    <span className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">
                                        ID: {item.id} · {new Date(item.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="text-[15px] font-semibold text-white mb-1">
                                    Predicted: <span className="capitalize text-accent">{item.predicted_label}</span> ({Math.round(item.tumor_probability * 100)}%)
                                </h3>
                                <p className="text-[13px] text-slate-400">
                                    Original filename: <span className="text-slate-200">{item.original_filename || "unknown"}</span>
                                </p>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleReview(item.id, "tumor")}
                                    className="px-4 py-2 text-[13px] font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white"
                                >
                                    Verify as Tumor
                                </button>
                                <button
                                    onClick={() => handleReview(item.id, "healthy")}
                                    className="px-4 py-2 text-[13px] font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white"
                                >
                                    Verify as Healthy
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
