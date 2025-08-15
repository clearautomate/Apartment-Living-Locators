"use client";
import React, { createContext, useContext, useState, useCallback } from "react";

type Toast = {
    id: number;
    description: string;
};

type ToastContextType = {
    toast: (opts: { description: string }) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = useCallback(({ description }: { description: string }) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, description }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-50 space-y-2">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className="bg-gray-900 text-white px-4 py-2 rounded shadow text-sm"
                    >
                        {t.description}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return ctx;
}
