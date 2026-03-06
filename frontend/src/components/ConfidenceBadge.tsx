interface ConfidenceBadgeProps {
    confidence: "high" | "medium" | "low";
}

const config = {
    high: { label: "High confidence", color: "var(--confidence-high)" },
    medium: { label: "Medium confidence", color: "var(--confidence-medium)" },
    low: { label: "Low confidence", color: "var(--confidence-low)" },
};

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
    const { label, color } = config[confidence];

    return (
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
            <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
            />
            <span style={{ color }}>{label}</span>
        </span>
    );
}
