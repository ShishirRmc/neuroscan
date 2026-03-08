"use client";

import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";

interface UploadZoneProps {
    onFileSelected: (file: File) => void;
    isLoading: boolean;
}

const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

export default function UploadZone({ onFileSelected, isLoading }: UploadZoneProps) {
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const validate = useCallback((file: File): string | null => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            return `Invalid file type. Please upload a JPEG or PNG image.`;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            return `File too large. Maximum size is ${MAX_SIZE_MB} MB.`;
        }
        return null;
    }, []);

    const handleFile = useCallback(
        (file: File) => {
            const validationError = validate(file);
            if (validationError) {
                setError(validationError);
                return;
            }
            setError(null);
            onFileSelected(file);
        },
        [validate, onFileSelected]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            if (inputRef.current) inputRef.current.value = "";
        },
        [handleFile]
    );

    return (
        <div>
            <div
                role="button"
                tabIndex={0}
                className={`upload-zone flex cursor-pointer flex-col items-center justify-center rounded-xl px-6 py-14 text-center transition-all ${dragOver ? "drag-over" : ""
                    } ${isLoading ? "pointer-events-none opacity-50" : ""}`}
                style={{ backgroundColor: "var(--surface)" }}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
                <Upload
                    size={32}
                    strokeWidth={1.5}
                    style={{ color: "var(--text-secondary)" }}
                    className="mb-3"
                />
                <p
                    className="text-[15px] font-medium"
                    style={{ color: "var(--text-primary)" }}
                >
                    Drop an MRI scan here or click to browse
                </p>
                <p
                    className="mt-1.5 text-[13px]"
                    style={{ color: "var(--text-secondary)" }}
                >
                    JPEG, PNG · Max {MAX_SIZE_MB} MB
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 bg-amber-500/10 text-amber-500/90 py-2 px-4 rounded-lg border border-amber-500/20 max-w-[280px]">
                    <span className="text-sm">⚠️</span>
                    <span className="text-[12px] font-bold tracking-tight">STRICTLY Brain MRIs Only</span>
                </div>

                <input
                    ref={inputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleChange}
                />
            </div>

            {error && (
                <p className="mt-3 text-center text-[13px] font-medium" style={{ color: "var(--confidence-low)" }}>
                    {error}
                </p>
            )}
        </div>
    );
}
