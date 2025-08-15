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
    color?: "default" | "primary" | "secondary" | "danger" | (string & {}); // allow preset or custom string
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
    (
        { href, underline = false, active = false, color = "default", className, ...rest },
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

        return <NextLink href={href} ref={ref} className={classes} {...rest} />;
    }
);

Link.displayName = "Link";
export default Link;
