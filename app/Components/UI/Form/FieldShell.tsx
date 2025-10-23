// app/Components/Form/FieldShell.tsx
import * as React from "react";
import styles from './styles.module.css'

export type FieldAddonRenderCtx = {
    name: string;
    row: any;              // current row (Partial<TRow>)
    value: unknown;        // defaultValue for the field
    disabled: boolean;
    required: boolean;
    setInputValue?: (v: string) => void; // optional helper if you pass a ref
};

export type FieldShellProps = {
    className?: string;
    startAddon?: React.ReactNode | ((ctx: FieldAddonRenderCtx) => React.ReactNode);
    endAddon?: React.ReactNode | ((ctx: FieldAddonRenderCtx) => React.ReactNode);
    wrap?: (control: React.ReactNode, ctx: FieldAddonRenderCtx) => React.ReactNode;
    children: React.ReactNode; // your input/select/etc
} & FieldAddonRenderCtx;

export function FieldShell(props: FieldShellProps) {
    const { className, startAddon, endAddon, wrap, children, ...ctx } = props;

    const start =
        typeof startAddon === "function" ? (startAddon as any)(ctx) : startAddon;
    const end =
        typeof endAddon === "function" ? (endAddon as any)(ctx) : endAddon;

    const body = (
        <div className={className ?? "fieldShell"}>
            {start ? <div className="fieldShell__addon fieldShell__addon--start">{start}</div> : null}
            <div className="fieldShell__control">{children}</div>
            {end ? <div className="fieldShell__addon fieldShell__addon--end">{end}</div> : null}
        </div>
    );

    return wrap ? <>{wrap(body, ctx)}</> : body;
}
