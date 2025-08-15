// app/components/ui/form/Form.tsx
import * as React from "react";

/** Root form wrapper (or compose as a <div> with `as="div">`) */
type FormProps = React.FormHTMLAttributes<HTMLFormElement> & {
    title?: string;
    description?: string;
    as?: "form" | "div";
};

export function Form({ title, description, as = "form", children, ...props }: FormProps) {
    const Tag: any = as;
    return (
        <Tag {...props} className={`space-y-6 ${props.className ?? ""}`}>
            {(title || description) && (
                <header className="space-y-1">
                    {title ? <h2 className="text-xl font-semibold">{title}</h2> : null}
                    {description ? <p className="text-sm text-gray-500">{description}</p> : null}
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
        <div className={`space-y-2 ${className ?? ""}`}>
            <label htmlFor={htmlFor} className="block text-sm font-medium">
                {label} {requiredMark ? <span className="text-red-600">*</span> : null}
            </label>
            {children}
            {helpText && !error ? <p className="text-xs text-gray-500">{helpText}</p> : null}
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
    );
}

export const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
    <textarea
        ref={ref}
        className={`w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 ${className ?? ""}`}
        {...props}
    />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
    ({ className, children, ...props }, ref) => (
        <select
            ref={ref}
            className={`w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 ${className ?? ""}`}
            {...props}
        >
            {children}
        </select>
    ),
);
Select.displayName = "Select";

/** Actions row (submit/cancel/etc). Keeps buttons together and aligned. */
type FormActionsProps = {
    children: React.ReactNode;
    align?: "left" | "center" | "right" | "between";
    /** Make actions stick to the bottom edge of a scrolling form area */
    sticky?: boolean;
    className?: string;
    /** Optional aria-label override for the action group */
    ariaLabel?: string;
};

export function FormActions({
    children,
    align = "right",
    sticky = false,
    className,
    ariaLabel = "Form actions",
}: FormActionsProps) {
    const alignment =
        align === "center"
            ? "justify-center"
            : align === "left"
                ? "justify-start"
                : align === "between"
                    ? "justify-between"
                    : "justify-end";

    const stickyStyles = sticky
        ? "sticky bottom-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t border-gray-200 pt-4"
        : "";

    return (
        <footer
            role="group"
            aria-label={ariaLabel}
            className={`flex gap-2 ${alignment} ${stickyStyles} ${className ?? ""}`}
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
        <div
            id={id}
            role="alert"
            aria-live="polite"
            className={`rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 ${className ?? ""}`}
        >
            {message}
        </div>
    );
}