"use client";

import { useState } from "react";
import { Info, X, Zap, ShieldCheck, Microscope, Cpu, HelpCircle } from "lucide-react";

export default function FeaturesInfo() {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold shadow-xl transition-all hover:scale-105 active:scale-95"
                style={{
                    backgroundColor: "#0d9488",
                    color: "#fff",
                    boxShadow: "0 10px 25px -5px rgba(13, 148, 136, 0.4)",
                    zIndex: 100,
                }}
            >
                <HelpCircle size={18} />
                Explore Features
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-black/60 fade-in">
            <div
                className="relative w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl scale-in"
                style={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b p-6" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg p-2 bg-blue-500/20">
                            <Info className="text-blue-400" size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white">NeuroScan AI Features</h2>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="rounded-full p-2 hover:bg-white/10 transition-colors"
                    >
                        <X size={20} className="text-slate-400 hover:text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                    {/* Feature Descriptions */}
                    <section className="space-y-6">
                        <FeatureItem
                            icon={<Zap className="text-amber-400" size={20} />}
                            title="Asynchronous Inference"
                            description="Experience a non-blocking analysis pipeline. Heavy MRI processing happens in the background, allowing you to stay productive while the AI worker computes results."
                        />
                        <FeatureItem
                            icon={<Microscope className="text-purple-400" size={20} />}
                            title="Explainable Grad-CAM Heatmaps"
                            description="Visual transparency is key. Our 'View AI Focus' mode renders heatmaps that pinpoint exactly where the model detected tumor markers."
                        />
                        <FeatureItem
                            icon={<ShieldCheck className="text-emerald-400" size={20} />}
                            title="HITL Gating & Admin Queue"
                            description="A safety-first approach. Low-confidence classifications are gated in a dedicated Admin Queue for clinical verification before the final report is generated."
                        />
                        <FeatureItem
                            icon={<Cpu className="text-blue-400" size={20} />}
                            title="Temperature Calibration"
                            description="We use Temperature Scaling (T=1.5) to calibrate our probability outputs, ensuring that confidence scores accurately reflect model certainty."
                        />
                    </section>

                    {/* Quick Test Scenarios */}
                    <section className="border-t pt-8" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Microscope size={14} />
                            Quick Test Lab
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <TestCard
                                label="OOD Check"
                                action="Upload a photo (not MRI)"
                                expect="Immediate Rejection"
                            />
                            <TestCard
                                label="HITL Gating"
                                action="Upload ambiguous MRI"
                                expect="Review Queue Entry"
                            />
                            <TestCard
                                label="Async Flow"
                                action="Upload valid scan"
                                expect="Polling Spinner"
                            />
                            <TestCard
                                label="Calibration"
                                action="Check Probability"
                                expect="Softened (T=1.5) Score"
                            />
                        </div>
                    </section>

                    <div className="rounded-xl p-5 bg-blue-500/5 border border-blue-500/10 mt-4 text-center">
                        <p className="text-[12px] text-slate-400 leading-relaxed italic">
                            "This system is a research-grade medical vision prototype."
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t flex justify-end bg-black/20" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="px-6 py-2 rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-500 transition-all shadow-lg active:scale-95"
                    >
                        Got it, thanks!
                    </button>
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="flex gap-5 items-start">
            <div className="mt-1 shrink-0 bg-white/5 p-2 rounded-lg">{icon}</div>
            <div>
                <h4 className="text-[15px] font-bold text-white mb-1.5 tracking-tight">{title}</h4>
                <p className="text-[13.5px] text-slate-300 leading-relaxed font-medium">{description}</p>
            </div>
        </div>
    );
}

function TestCard({ icon, label, action, expect }: { icon: string, label: string, action: string, expect: string }) {
    return (
        <div className="p-4 rounded-xl border bg-white/5 transition-colors hover:bg-white/10" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[18px]">{icon}</span>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            </div>
            <div className="space-y-1.5">
                <p className="text-[12px] text-slate-500 leading-tight">Action: <span className="text-slate-200 font-medium">{action}</span></p>
                <p className="text-[12px] text-slate-500 leading-tight">Expect: <span className="text-blue-400 font-bold uppercase text-[10px] tracking-tight">{expect}</span></p>
            </div>
        </div>
    );
}
