"use client";
import * as React from "react";
import styles from "./styles.module.css";

type DialogProps = {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
};

export function Dialog({ open, onOpenChange, children }: DialogProps) {
    // ESC to close
    React.useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onOpenChange?.(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onOpenChange]);

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            className={styles.overlay}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onOpenChange?.(false);
            }}
        >
            {children}
        </div>
    );
}

export function DialogContent({ children }: { children: React.ReactNode }) {
    return (
        <div className={styles.content} role="document">
            {children}
        </div>
    );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
    return <div className={styles.header}>{children}</div>;
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
    return <h3 className={`${styles.title} ${className ?? ""}`}>{children}</h3>;
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
    return <p className={styles.description}>{children}</p>;
}
