import { Info } from "lucide-react";

export default function Disclaimer() {
    return (
        <div
            className="border-b px-4 py-2.5"
            style={{
                backgroundColor: "var(--surface-elevated)",
                borderColor: "var(--border)",
            }}
        >
            <div className="mx-auto flex max-w-3xl items-start gap-2">
                <Info
                    size={14}
                    className="mt-0.5 shrink-0"
                    style={{ color: "var(--text-secondary)" }}
                />
                <p
                    className="text-[12px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                >
                    This tool is a research prototype and does not provide clinical
                    diagnoses. All outputs are AI-generated assessments and must be
                    reviewed by a qualified medical professional.
                </p>
            </div>
        </div>
    );
}
