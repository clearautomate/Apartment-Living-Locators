// components/ui/Link.tsx
import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import * as React from "react";
import styles from "./styles.module.css";

type AnchorExtras = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "ref">;

type TokenColor = "default" | "primary" | "secondary" | "danger";

export interface LinkProps extends NextLinkProps, AnchorExtras {
    underline?: boolean;
    active?: boolean;
    color?: TokenColor | string;   // token or arbitrary CSS color
    icon?: React.ReactNode;
    iconPosition?: "left" | "right";
}

const TOKENS = new Set<TokenColor>(["default", "primary", "secondary", "danger"]);

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
    {
        href,
        underline = false,
        active = false,
        color = "default",
        className,
        icon,
        iconPosition = "left",
        children,
        style,
        ...rest
    },
    ref
) {
    const isToken = TOKENS.has(color as TokenColor);

    const classes = [
        styles.link,
        underline && styles.underline,
        active && styles.active,
        isToken && styles[`color-${color as TokenColor}`],
        className,
    ]
        .filter(Boolean)
        .join(" ");

    // If it's NOT a token, set the CSS variable for custom color
    const inlineStyle: React.CSSProperties | undefined =
        !isToken && color ? { ...(style || {}), ["--link-color" as any]: color } : style;

    return (
        <NextLink href={href} ref={ref} className={classes} style={inlineStyle} {...rest}>
            {icon && iconPosition === "left" && <span className={styles.icon}>{icon}</span>}
            {children}
            {icon && iconPosition === "right" && <span className={styles.icon}>{icon}</span>}
        </NextLink>
    );
});

export default Link;
