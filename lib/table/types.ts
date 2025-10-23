import { FieldAddonRenderCtx } from "@/app/Components/UI/Form/FieldShell";
import React from "react";
import type { ZodType } from "zod";

export type Role = "owner" | "agent";

// Narrow, declarative hints the client can map to real fns
export type FormatHint =
    | "text"
    | "number"
    | "currency"
    | "date"
    | "datetime";

// Extend your TableColumn type
type ColumnAddons<T> = {
    startAddon?: React.ReactNode | ((ctx: FieldAddonRenderCtx) => React.ReactNode);
    endAddon?: React.ReactNode | ((ctx: FieldAddonRenderCtx) => React.ReactNode);
    wrap?: (control: React.ReactNode, ctx: FieldAddonRenderCtx) => React.ReactNode;
    /** If true, forwards a ref and exposes setInputValue in ctx for programmatic updates */
    exposeInputRef?: boolean;
};

export type ColumnDef<T> = {
    key: keyof T & string;
    label: string;
    input?: "text" | "number" | "date" | "select" | "money";
    options?: { value: string | number; label: string }[];
    editableBy?: Role[];
    visibleTo?: Role[];
    required?: boolean;
    placeholder?: string;
    format?: (value: unknown, row: T) => string;

    addons?: ColumnAddons<T>;
};

export type TableConfig<TRow extends { id: string }> = {
    id: string;
    schema: ZodType<TRow>;
    columns: ColumnDef<TRow>[];
};
