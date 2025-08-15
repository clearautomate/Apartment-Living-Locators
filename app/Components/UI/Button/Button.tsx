// components/ui/button.tsx
import * as React from "react";
import styles from "./styles.module.css";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline" | "destructive";
    size?: "sm" | "md" | "lg";
    color?: "primary" | "bg" | "text" | (string & {}); // presets or custom hex/name

    loading?: boolean;
    fullWidth?: boolean;
    icon?: React.ReactNode;
    iconPosition?: "left" | "right";
}

function cx(...args: Array<string | false | undefined>) {
    return args.filter(Boolean).join(" ");
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
            ...props
        },
        ref
    ) => {
        const isCustom =
            typeof color === "string" &&
            color !== "primary" &&
            color !== "bg" &&
            color !== "text";

        const colorClass =
            color === "primary"
                ? styles.color_primary
                : color === "bg"
                    ? styles.color_bg
                    : color === "text"
                        ? styles.color_text
                        : styles.color_custom;

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
                style={isCustom ? ({ ["--btn-color" as any]: color } as React.CSSProperties) : undefined}
                aria-busy={loading || undefined}
                disabled={disabled || loading}
                {...props}
            >
                {/* content wrapper controls icon side */}
                <span
                    className={cx(
                        styles.content,
                        iconPosition === "right" ? styles.iconRight : styles.iconLeft
                    )}
                >
                    {loading && <span className={styles.spinner} aria-hidden="true" />}
                    {icon && <span className={styles.icon}>{icon}</span>}
                    <span className={styles.label}>{children}</span>
                </span>
            </button>
        );
    }
);
Button.displayName = "Button";
