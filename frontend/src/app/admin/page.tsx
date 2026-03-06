import type { Metadata } from "next";
import ReviewQueue from "@/components/ReviewQueue";

export const metadata: Metadata = {
    title: "Review Queue — NeuroScan AI",
    description: "Manual review of low-confidence AI vision classifications.",
};

export default function AdminPage() {
    return (
        <div>
            <div className="mb-8">
                <h1
                    className="text-xl font-semibold tracking-tight mb-2"
                    style={{ color: "var(--text-primary)" }}
                >
                    Review Queue
                </h1>
                <p className="text-[14px] text-slate-400">
                    Medical professional verification required for low-confidence or medium-confidence predictions.
                </p>
            </div>

            <ReviewQueue />
        </div>
    );
}
