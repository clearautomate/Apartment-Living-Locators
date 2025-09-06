// components/ui/input.tsx
import * as React from "react";
import styles from './styles.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className = "", ...props }, ref) => {
        return (
            <input
                ref={ref}
                className={`${styles.input} ${className}`}
                onWheel={(e) => (e.currentTarget as HTMLElement).blur()} // prevent scroll change
                {...props}
            />
        );
    }
);

Input.displayName = "Input";
