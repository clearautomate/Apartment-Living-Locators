// app/components/ui/form/Form.tsx
import * as React from "react";
import styles from "./styles.module.css";

/** Root form wrapper (or compose as a <div> with `as="div">`) */
type FormProps = React.FormHTMLAttributes<HTMLFormElement> & {
    title?: string;
    description?: string;
    as?: "form" | "div";
};

export function Form({ title, description, as = "form", children, ...props }: FormProps) {
    const Tag: any = as;
    return (
        <Tag {...props} className={`${styles.form} ${props.className ?? ""}`}>
            {(title || description) && (
                <header className={styles.header}>
                    {title ? <h2 className={styles.title}>{title}</h2> : null}
                    {description ? <p className={styles.description}>{description}</p> : null}
                </header>
            )}
            {children}
        </Tag>
    );
}

/** Field wrapper with label/help/error */
type FieldProps = {
    label: string;
    htmlFor: string;
    requiredMark?: boolean;
    helpText?: string;
    error?: string;
    className?: string;
    children: React.ReactNode;
};

export function Field({
    label,
    htmlFor,
    requiredMark,
    helpText,
    error,
    className,
    children,
}: FieldProps) {
    return (
        <div className={`${styles.field} ${className ?? ""}`}>
            <label htmlFor={htmlFor} className={styles.label}>
                {label} {requiredMark ? <span className={styles.required}>*</span> : null}
            </label>
            {children}
            {helpText && !error ? <p className={styles.help}>{helpText}</p> : null}
            {error ? <p className={styles.error}>{error}</p> : null}
        </div>
    );
}

export const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
    <textarea ref={ref} className={`${styles.textarea} ${className ?? ""}`} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
    HTMLSelectElement,
    React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
    <select ref={ref} className={`${styles.select} ${className ?? ""}`} {...props}>
        {children}
    </select>
));
Select.displayName = "Select";

/** Actions row (submit/cancel/etc). Keeps buttons together and aligned. */
type FormActionsProps = {
    children: React.ReactNode;
    align?: "left" | "center" | "right" | "between";
    sticky?: boolean;
    className?: string;
    ariaLabel?: string;
};

export function FormActions({
    children,
    align = "right",
    sticky = false,
    className,
    ariaLabel = "Form actions",
}: FormActionsProps) {
    return (
        <footer
            role="group"
            aria-label={ariaLabel}
            className={`${styles.actions} ${styles[align]} ${sticky ? styles.sticky : ""} ${className ?? ""}`}
        >
            {children}
        </footer>
    );
}

export function FormError({
    message,
    id = "form-error",
    className,
}: {
    message?: string | null;
    id?: string;
    className?: string;
}) {
    if (!message) return null;
    return (
        <div id={id} role="alert" aria-live="polite" className={`${styles.errorBox} ${className ?? ""}`}>
            {message}
        </div>
    );
}
