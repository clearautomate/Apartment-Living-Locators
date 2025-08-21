// components/ui/Link.tsx
import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import * as React from "react";
import styles from "./styles.module.css";

type AnchorExtras = Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "href" | "ref"
>;

export interface LinkProps extends NextLinkProps, AnchorExtras {
    underline?: boolean;
    active?: boolean;
    color?: "default" | "primary" | "secondary" | "danger" | (string & {});
    icon?: React.ReactNode; // ✅ new prop
    iconPosition?: "left" | "right"; // ✅ configurable placement
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
    (
        {
            href,
            underline = false,
            active = false,
            color = "default",
            className,
            icon,
            iconPosition = "left",
            children,
            ...rest
        },
        ref
    ) => {
        const classes = [
            styles.link,
            underline && styles.underline,
            active && styles.active,
            styles[`color-${color}` as keyof typeof styles],
            className,
        ]
            .filter(Boolean)
            .join(" ");

        return (
            <NextLink href={href} ref={ref} className={classes} {...rest}>
                {icon && iconPosition === "left" && (
                    <span className={styles.icon}>{icon}</span>
                )}
                {children}
                {icon && iconPosition === "right" && (
                    <span className={styles.icon}>{icon}</span>
                )}
            </NextLink>
        );
    }
);

Link.displayName = "Link";
export default Link;
