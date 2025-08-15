import type { ZodType } from "zod";

export type Role = "owner" | "agent";

// Narrow, declarative hints the client can map to real fns
export type FormatHint =
    | "text"
    | "number"
    | "currency"
    | "date"
    | "datetime";

export type ColumnDef<T> = {
    key: keyof T & string;
    label: string;
    input?: "text" | "number" | "date" | "select";
    options?: { value: string | number; label: string }[];
    editableBy?: Role[];
    visibleTo?: Role[];
    required?: boolean;
    format?: (value: unknown, row: T) => string;
};

export type TableConfig<TRow extends { id: string }> = {
    id: string;
    schema: ZodType<TRow>;
    columns: ColumnDef<TRow>[];
};
