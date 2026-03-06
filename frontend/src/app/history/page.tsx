import type { Metadata } from "next";
import HistoryTable from "@/components/HistoryTable";

export const metadata: Metadata = {
    title: "Inference History — NeuroScan AI",
    description: "Audit log of past AI-generated brain tumor assessments.",
};

export default function HistoryPage() {
    return (
        <div>
            <h1
                className="mb-6 text-xl font-semibold tracking-tight"
                style={{ color: "var(--text-primary)" }}
            >
                Inference History
            </h1>
            <HistoryTable />
        </div>
    );
}
