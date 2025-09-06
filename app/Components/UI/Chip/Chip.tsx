// components/Chip.tsx
import React from "react";
import styles from "./styles.module.css";

type Variant = "solid" | "outline";

export type ChipProps = {
    children: React.ReactNode;
    hue?: number; // 0–360
    variant?: Variant;
    className?: string;
};

export default function Chip({
    children,
    hue = 220,
    variant = "solid",
    className = "",
}: ChipProps) {
    const style: React.CSSProperties = { "--chip-hue": hue } as React.CSSProperties;

    return (
        <div
            style={style}
            className={[styles.chip, styles[variant], className].join(" ")}
        >
            <span className={styles.text}>{children}</span>
        </div>
    );
}
