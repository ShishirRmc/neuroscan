"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, History, ArrowLeft, CheckCircle } from "lucide-react";

export default function Navbar() {
    const pathname = usePathname();
    const isHome = pathname === "/";

    return (
        <nav
            className="sticky top-0 z-50 border-b"
            style={{
                backgroundColor: "var(--nav)",
                borderColor: "rgba(255,255,255,0.08)",
            }}
        >
            <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2 text-white shrink-0">
                    <Brain size={20} className="sm:w-[22px]" strokeWidth={1.8} />
                    <span className="text-[14px] sm:text-[15px] font-bold tracking-tight">
                        NeuroScan <span className="hidden xs:inline">AI</span>
                    </span>
                </Link>

                {isHome ? (
                    <div className="flex gap-1.5 sm:gap-2">
                        <Link
                            href="/history"
                            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 sm:px-3 text-[13px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <History size={16} strokeWidth={1.8} />
                            <span className="hidden sm:inline">History</span>
                        </Link>
                        <Link
                            href="/admin"
                            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 sm:px-3 text-[13px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <CheckCircle size={16} strokeWidth={1.8} />
                            <span className="hidden sm:inline">Admin</span>
                        </Link>
                    </div>
                ) : (
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <ArrowLeft size={16} strokeWidth={1.8} />
                        Back
                    </Link>
                )}
            </div>
        </nav>
    );
}
