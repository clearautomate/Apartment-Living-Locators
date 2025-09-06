"use client";

import * as React from "react";
import styles from "./styles.module.css";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline";
    size?: "sm" | "md" | "lg";
    color?: "primary" | "bg" | "bgLight" | "text" | (string & {});
    loading?: boolean;
    fullWidth?: boolean;
    icon?: React.ReactNode;
    iconPosition?: "left" | "right";
}

function cx(...args: Array<string | false | undefined>) {
    return args.filter(Boolean).join(" ");
}

// Centralize the preset color classes once
const PRESET_COLOR_CLASS = {
    primary: styles.color_primary,
    bg: styles.color_bg,
    bgLight: styles.color_bg_light,
    text: styles.color_text,
} as const;

type PresetColor = keyof typeof PRESET_COLOR_CLASS;

function isPresetColor(c: ButtonProps["color"]): c is PresetColor {
    return typeof c === "string" && c in PRESET_COLOR_CLASS;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            children,
            variant = "default",
            size = "md",
            color = "primary",
            loading = false,
            fullWidth = false,
            icon,
            iconPosition = "left",
            disabled,
            style,
            ...props
        },
        ref
    ) => {
        const isPreset = isPresetColor(color);
        const colorClass = isPreset ? PRESET_COLOR_CLASS[color] : styles.color_custom;

        // Only set the CSS var for custom colors
        const mergedStyle: React.CSSProperties = isPreset
            ? style || {}
            : {
                ...(style || {}),
                ["--btn-color" as any]: color,
            };

        return (
            <button
                ref={ref}
                className={cx(
                    styles.base,
                    styles[`variant_${variant}`],
                    styles[`size_${size}`],
                    colorClass,
                    fullWidth && styles.fullWidth,
                    loading && styles.loading,
                    className
                )}
                style={mergedStyle}
                aria-busy={loading || undefined}
                disabled={disabled || loading}
                {...props}
            >
                <span
                    className={cx(
                        styles.content,
                        iconPosition === "right" ? styles.iconRight : styles.iconLeft
                    )}
                >
                    {icon && (
                        <span
                            className={cx(styles.icon, loading && styles.hiddenContent)}
                            aria-hidden={loading || undefined}
                        >
                            {icon}
                        </span>
                    )}
                    <span
                        className={cx(styles.label, loading && styles.hiddenContent)}
                        aria-hidden={loading || undefined}
                    >
                        {children}
                    </span>
                </span>
                {loading && <span className={styles.spinnerOverlay} />}
            </button>
        );
    }
);

Button.displayName = "Button";
