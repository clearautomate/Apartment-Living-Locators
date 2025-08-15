// components/ui/label.tsx
import * as React from "react";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> { }

export const Label: React.FC<LabelProps> = ({ className = "", ...props }) => {
    return <label className={`block text-sm font-medium mb-1 ${className}`} {...props} />;
};
