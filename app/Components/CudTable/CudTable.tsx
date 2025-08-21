// app/Components/CudTable/CudTable.tsx
"use client";
import * as React from "react";
import { Button } from "../UI/Button/Button";
import type { TableConfig, Role } from "@/lib/table/types";
import styles from "./styles.module.css";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/app/Components/UI/Dialog/Dialog";
import { Field, Form, FormActions, FormError } from "../UI/Form/Form";
import { Input } from "../UI/Input/Input";
import { Dropdown } from "../UI/Dropdown/Dropdown";
import { HiOutlinePencilSquare, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";

export type ActionResult = { ok: boolean; message: string };

// Each action is now optional and may be null.
export type ActionHandlers<TRow extends { id: string }> = {
    onCreate?: ((form: FormData) => Promise<ActionResult>) | null;
    onUpdate?: ((id: string, form: FormData) => Promise<ActionResult>) | null;
    onDelete?: ((id: string) => Promise<ActionResult>) | null;
};

type Props<TRow extends { id: string }> = {
    config: TableConfig<TRow>;
    role: Role;
    rows: TRow[];
    actions?: ActionHandlers<TRow> | null; // actions object itself can be omitted/null
    tableName?: string;
    allowCreate?: boolean;
    creationDefaults?: Partial<TRow>; // may be undefined
};

export function CudTable<TRow extends { id: string }>(props: Props<TRow>) {
    const {
        config,
        role,
        rows,
        actions,
        tableName = "Items",
        allowCreate = true,
        creationDefaults,
    } = props;

    const canCreate = Boolean(actions?.onCreate) && allowCreate;
    const canUpdate = Boolean(actions?.onUpdate);
    const canDelete = Boolean(actions?.onDelete);
    const hasRowActions = canUpdate || canDelete;

    const visibleColumns = React.useMemo(
        () =>
            config.columns.filter((c) => {
                if (!c.visibleTo || c.visibleTo.length === 0) return true;
                return c.visibleTo.includes(role);
            }),
        [config.columns, role]
    );

    const [isOpen, setOpen] = React.useState(false);
    const [mode, setMode] = React.useState<"create" | "edit">("create");
    const [current, setCurrent] = React.useState<Partial<TRow>>({} as Partial<TRow>);
    const [busy, setBusy] = React.useState(false);
    const [msg, setMsg] = React.useState<string | null>(null);

    const mergeCurrent = React.useCallback((patch: Partial<TRow>) => {
        setCurrent((prev) => ({ ...prev, ...patch }));
    }, []);

    function openCreate() {
        if (!canCreate) return;
        setMode("create");
        setMsg(null);
        const defaults = (creationDefaults ?? {}) as Partial<TRow>;
        setCurrent({ ...defaults });
        setOpen(true);
    }

    function openEdit(row: TRow) {
        if (!canUpdate) return;
        setMode("edit");
        setMsg(null);
        setOpen(true);
        setCurrent({ ...row });
    }

    function canEditKey(key: keyof TRow & string) {
        const col = config.columns.find((c) => c.key === key);
        if (!col || !col.editableBy) return false;
        return col.editableBy.includes(role);
    }

    function toDateInputValue(v: unknown) {
        if (!v) return "";
        const d = new Date(String(v));
        if (Number.isNaN(d.getTime())) return "";
        return d.toISOString().slice(0, 10);
    }

    const dateKeys = React.useMemo(
        () => config.columns.filter((c) => c.input === "date").map((c) => c.key),
        [config.columns]
    );

    function isDateOnly(s: string) {
        return /^\d{4}-\d{2}-\d{2}$/.test(s);
    }
    function isDatetimeLocal(s: string) {
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s) && !/[zZ]$/.test(s);
    }

    function renderCell(row: TRow, key: keyof TRow & string) {
        const col = config.columns.find((c) => c.key === key)!;
        const raw = (row as any)[key];
        if (col.format) return col.format(raw, row);
        if (col.options && Array.isArray(col.options)) {
            const opt = col.options.find((o) => String(o.value) === String(raw));
            return opt ? opt.label : (raw ?? "");
        }
        return raw == null ? "" : String(raw);
    }

    function renderInput(colKey: keyof TRow & string) {
        const col = config.columns.find((c) => c.key === colKey)!;
        const name = colKey;
        const disabled = !canEditKey(colKey) || busy;
        const required = !!col.required;
        const value = (current as any)[colKey];

        if (col.input === "number") {
            return (
                <Input
                    type="number"
                    name={name}
                    required={required}
                    disabled={disabled}
                    defaultValue={value ?? ""}
                    step="0.01"
                />
            );
        }
        if (col.input === "date") {
            return (
                <Input
                    type="date"
                    name={name}
                    required={required}
                    disabled={disabled}
                    defaultValue={toDateInputValue(value)}
                />
            );
        }
        if (col.input === "select" && col.options) {
            return (
                <Dropdown
                    name={name}
                    required={required}
                    disabled={disabled}
                    defaultValue={value ?? ""}
                    options={[
                        { value: "", label: "Select…" },
                        ...col.options.map((o) => ({ value: String(o.value), label: o.label })),
                    ]}
                />
            );
        }
        return (
            <Input
                type="text"
                name={name}
                required={required}
                disabled={disabled}
                defaultValue={value ?? ""}
            />
        );
    }

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const form = new FormData(e.currentTarget);
        const patched = new FormData();
        for (const [k, v] of form.entries()) {
            let val = typeof v === "string" ? v : String(v);
            if (val === "") continue;
            if (dateKeys.includes(k as any)) {
                if (isDateOnly(val)) val = new Date(val + "T00:00:00Z").toISOString();
                else if (isDatetimeLocal(val)) val = new Date(val).toISOString();
            }
            patched.append(k, val);
        }

        let res: ActionResult;
        try {
            if (mode === "create") {
                if (!actions?.onCreate) throw new Error("Create is not available.");
                res = await actions.onCreate(patched);
            } else {
                if (!actions?.onUpdate) throw new Error("Update is not available.");
                res = await actions.onUpdate(String(current.id), patched);
            }
        } catch (err: any) {
            res = { ok: false, message: err?.message ?? "Request failed" };
        }
        setBusy(false);
        setMsg(res.message);
        if (res.ok) setOpen(false);
    }

    async function onDelete(id: string) {
        if (!actions?.onDelete) return; // no button renders if not available
        if (!confirm("Delete this item?")) return;
        setBusy(true);
        setMsg(null);
        let res: ActionResult;
        try {
            res = await actions.onDelete(id);
        } catch (err: any) {
            res = { ok: false, message: err?.message ?? "Delete failed" };
        }
        setBusy(false);
        if (!res.ok) setMsg(res.message);
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>{tableName}</h2>
                {canCreate && (
                    <Button onClick={openCreate} disabled={busy} icon={<HiOutlinePlus />}>
                        New
                    </Button>
                )}
            </div>

            <div className={styles.tableCorners}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                {visibleColumns.map((c) => (
                                    <th key={c.key} className={styles.th}>
                                        {c.label}
                                    </th>
                                ))}
                                {hasRowActions && <th className={styles.th} />}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id}>
                                    {visibleColumns.map((c) => (
                                        <td key={c.key} className={styles.td}>
                                            {renderCell(r, c.key)}
                                        </td>
                                    ))}
                                    {hasRowActions && (
                                        <td className={styles.actions}>
                                            {canUpdate && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => openEdit(r)}
                                                    disabled={busy}
                                                    variant="outline"
                                                    icon={<HiOutlinePencilSquare />}
                                                >
                                                    Edit
                                                </Button>
                                            )}{" "}
                                            {canDelete && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => onDelete(r.id)}
                                                    disabled={busy}
                                                    variant="destructive"
                                                    icon={<HiOutlineTrash />}
                                                >
                                                    Delete
                                                </Button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={visibleColumns.length + (hasRowActions ? 1 : 0)} className={styles.empty}>
                                        No rows
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Only render the dialog if at least one of create/update is available */}
            {(canCreate || canUpdate) && (
                <Dialog
                    open={isOpen}
                    onOpenChange={(o) => {
                        if (!busy) {
                            setOpen(o);
                            if (!o) setCurrent({} as Partial<TRow>);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {mode === "create" ? `New ${tableName}` : `Edit ${tableName}`}
                            </DialogTitle>
                            <DialogDescription>
                                {mode === "create"
                                    ? `Create a new ${tableName.slice(0, -1).toLowerCase()} entry.`
                                    : `Update the selected ${tableName.slice(0, -1).toLowerCase()} entry.`}
                            </DialogDescription>
                        </DialogHeader>
                        <Form onSubmit={onSubmit} className={styles.form}>
                            {mode === "edit" && canUpdate && (
                                <input type="hidden" name="id" value={String(current.id)} readOnly />
                            )}
                            {visibleColumns.map((c) => (
                                <Field key={c.key} label={c.label} htmlFor={c.key} requiredMark={!!c.required}>
                                    {renderInput(c.key)}
                                </Field>
                            ))}
                            <FormError message={msg} />
                            <FormActions align="right">
                                <Button variant="destructive" type="button" onClick={() => setOpen(false)} disabled={busy}>
                                    Cancel
                                </Button>
                                {/* Submit label adapts to mode */}
                                <Button type="submit" disabled={busy}>
                                    {busy ? "Saving…" : mode === "create" ? "Create" : "Save"}
                                </Button>
                            </FormActions>
                        </Form>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
