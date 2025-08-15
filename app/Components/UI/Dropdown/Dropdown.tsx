"use client";

import * as React from "react";
import styles from "./styles.module.css";

interface DropdownProps
    extends React.SelectHTMLAttributes<HTMLSelectElement> {
    options: { value: string; label: string }[];
}

export function Dropdown({ options, className = "", ...props }: DropdownProps) {
    return (
        <div className={styles.wrapper}>
            <select className={`${styles.select} ${className}`} {...props}>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <span className={styles.icon}>▾</span>
        </div>
    );
}
