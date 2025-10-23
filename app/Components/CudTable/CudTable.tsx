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
import { Field, Form, FormActions, FormError, Select } from "../UI/Form/Form";
import { Input } from "../UI/Input/Input";
import { Dropdown } from "../UI/Dropdown/Dropdown";
import {
    HiOutlinePencilSquare,
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import Link from "../UI/Link/Link";
import { FieldShell, type FieldAddonRenderCtx } from "../UI/Form/FieldShell";

export type ActionResult = { ok: boolean; message: string };

export type ActionHandlers<TRow extends { id: string }> = {
    onCreate?: ((form: FormData) => Promise<ActionResult>) | null;
    onUpdate?: ((id: string, form: FormData) => Promise<ActionResult>) | null;
    onDelete?: ((id: string) => Promise<ActionResult>) | null;
};

type Props<TRow extends { id: string }> = {
    config: TableConfig<TRow>;
    role: Role;
    rows: TRow[];
    actions?: ActionHandlers<TRow> | null;
    tableName?: string;
    allowCreate?: boolean;
    creationDefaults?: Partial<TRow>;
    link?: string; // e.g. "./lease" → /lease/[id]
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
        link,
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

    // Edit/Create dialog state
    const [isOpen, setOpen] = React.useState(false);
    const [mode, setMode] = React.useState<"create" | "edit">("create");
    const [current, setCurrent] = React.useState<Partial<TRow>>({} as Partial<TRow>);
    const [busy, setBusy] = React.useState(false);
    const [msg, setMsg] = React.useState<string | null>(null);

    // Delete confirm dialog state
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [deleteBusy, setDeleteBusy] = React.useState(false);
    const [deleteMsg, setDeleteMsg] = React.useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = React.useState<TRow | null>(null);

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

    function openDelete(row: TRow) {
        if (!canDelete) return;
        setDeleteMsg(null);
        setDeleteTarget(row);
        setDeleteOpen(true);
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

    // ---------- Money helpers ----------
    function moneyColor(value: unknown): string | undefined {
        const n = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(n)) return undefined;
        if (n < 0) return "var(--danger)"; // red
        if (n > 0) return "var(--success)"; // green
        return undefined; // zero → no color change
    }

    function renderCell(row: TRow, key: keyof TRow & string, isFirst: boolean) {
        const col = config.columns.find((c) => c.key === key)!;
        const raw = (row as any)[key];
        let content: React.ReactNode;

        if (col.format) content = col.format(raw, row);
        else if (col.options && Array.isArray(col.options)) {
            const opt = col.options.find((o) => String(o.value) === String(raw));
            content = opt ? opt.label : (raw ?? "");
        } else {
            content = raw == null ? "" : String(raw);
        }

        if (col.input === "money") {
            // Colorize money display
            const color = moneyColor(raw);
            content = (
                <span style={color ? { color } : undefined}>
                    {content}
                </span>
            );
        }

        // Wrap first column with link if link prop exists
        if (isFirst && link) {
            return (
                <Link color="primary" href={`${link}/${row.id}`} className={styles.linkCell}>
                    {content}
                </Link>
            );
        }

        return content;
    }

    function renderInput(colKey: keyof TRow & string) {
        const col = config.columns.find((c) => c.key === colKey)!;
        const name = colKey;
        const disabled = !canEditKey(colKey) || busy;
        const required = !!col.required;
        const placeholder = col.placeholder;
        const value = (current as any)[colKey];

        // Build the base control (uncontrolled as you already use)
        const Control: React.FC<{ inputType?: string; step?: string; inputMode?: any; defaultValue?: any }> = ({
            inputType = "text", step, inputMode, defaultValue
        }) => {
            // If you want programmatic set from addons, forward a ref and expose setInputValue
            const inputRef = React.useRef<HTMLInputElement | null>(null);
            const ctx: FieldAddonRenderCtx = {
                name,
                row: current,
                value: defaultValue,
                disabled,
                required,
                setInputValue: col.addons?.exposeInputRef ? ((v) => {
                    if (inputRef.current) {
                        inputRef.current.value = v;
                        inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
                    }
                }) : undefined
            };

            // Attach ctx to addon container so AddonButton can get it
            const attachCtx = (node: HTMLElement | null) => {
                if (node) (node as any).__ctx = ctx;
            };

            const base = (
                <Input
                    ref={col.addons?.exposeInputRef ? inputRef : undefined}
                    type={inputType}
                    name={name}
                    required={required}
                    disabled={disabled}
                    defaultValue={defaultValue ?? ""}
                    step={step}
                    inputMode={inputMode}
                    placeholder={placeholder}
                    className="input"
                />
            );

            return (
                <FieldShell
                    {...ctx}
                    className="fieldShell"
                    startAddon={col.addons?.startAddon}
                    endAddon={col.addons?.endAddon}
                    wrap={col.addons?.wrap}
                >
                    {/* attach ctx for any nested DOM node that needs it */}
                    <div ref={attachCtx as any}>{base}</div>
                </FieldShell>
            );
        };

        // Map your inputs
        if (col.input === "number") {
            return <Control inputType="number" step="0.01" defaultValue={value} />;
        }
        if (col.input === "money") {
            return <Control inputType="number" step="0.01" inputMode="decimal" defaultValue={value} />;
        }
        if (col.input === "date") {
            return <Control inputType="date" defaultValue={toDateInputValue(value)} />;
        }
        if (col.input === "select" && col.options) {
            // Select can use the same FieldShell too — just render the <select> as children
            const SelectWithAddons: React.FC = () => {
                const ctx: FieldAddonRenderCtx = { name, row: current, value, disabled, required };
                return (
                    <FieldShell
                        {...ctx}
                        className="fieldShell"
                        startAddon={col.addons?.startAddon}
                        endAddon={col.addons?.endAddon}
                        wrap={col.addons?.wrap}
                    >
                        <Select
                            name={name}
                            required={required}
                            disabled={disabled}
                            defaultValue={value ?? ""}
                            className="select"
                        >
                            <option value="">Select…</option>
                            {col.options?.map((o) => (
                                <option key={String(o.value)} value={String(o.value)}>
                                    {o.label}
                                </option>
                            ))}
                        </Select>
                    </FieldShell>
                );
            };
            return <SelectWithAddons />;
        }

        // default text
        return <Control inputType="text" defaultValue={value} />;
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
                if (isDateOnly(val)) val = new Date(val + "T12:00:00Z").toISOString();
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

    async function confirmDelete() {
        if (!actions?.onDelete || !deleteTarget) return;
        setDeleteBusy(true);
        setDeleteMsg(null);
        let res: ActionResult;
        try {
            res = await actions.onDelete(deleteTarget.id);
        } catch (err: any) {
            res = { ok: false, message: err?.message ?? "Delete failed" };
        }
        setDeleteBusy(false);
        if (!res.ok) {
            setDeleteMsg(res.message);
            return;
        }
        // Success: close and clear
        setDeleteOpen(false);
        setDeleteTarget(null);
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>{tableName}</h2>
                {canCreate && (
                    <Button onClick={openCreate} disabled={busy || deleteBusy} color="text" icon={<HiOutlinePlus />}>
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
                                    {visibleColumns.map((c, idx) => (
                                        <td key={c.key} className={styles.td}>
                                            {renderCell(r, c.key, idx === 0)}
                                        </td>
                                    ))}
                                    {hasRowActions && (
                                        <td className={styles.actions}>
                                            {canUpdate && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => openEdit(r)}
                                                    disabled={busy || deleteBusy}
                                                >
                                                    Edit
                                                </Button>
                                            )}{" "}
                                            {canDelete && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => openDelete(r)}
                                                    disabled={busy || deleteBusy}
                                                    color="var(--danger)"
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
                                    <td
                                        colSpan={visibleColumns.length + (hasRowActions ? 1 : 0)}
                                        className={styles.empty}
                                    >
                                        No rows
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

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
                            {visibleColumns
                                .filter((c) => canEditKey(c.key))
                                .map((c) => (
                                    <Field key={c.key} label={c.label} htmlFor={c.key} requiredMark={!!c.required}>
                                        {renderInput(c.key)}
                                    </Field>
                                ))}
                            <FormError message={msg} />
                            <FormActions align="right">
                                <Button
                                    color="bg"
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    disabled={busy}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" loading={busy}>
                                    {mode === "create" ? "Create" : "Save"}
                                </Button>
                            </FormActions>
                        </Form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Confirm Delete Dialog */}
            {canDelete && (
                <Dialog
                    open={deleteOpen}
                    onOpenChange={(o) => {
                        if (deleteBusy) return;
                        setDeleteOpen(o);
                        if (!o) {
                            setDeleteTarget(null);
                            setDeleteMsg(null);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className={styles.deleteTitle}>
                                <HiOutlineExclamationTriangle className={styles.deleteIcon} aria-hidden size={20} />
                                Confirm deletion
                            </DialogTitle>
                            <DialogDescription>
                                This action cannot be undone.{" "}
                                {deleteTarget ? (
                                    <>
                                        You’re about to delete item <code>{String(deleteTarget.id)}</code>.
                                    </>
                                ) : (
                                    "You’re about to delete this item."
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        {/* Optional place to surface errors from delete */}
                        {deleteMsg && <FormError message={deleteMsg} />}

                        <FormActions align="right">
                            <Button
                                type="button"
                                color="bg"
                                onClick={() => setDeleteOpen(false)}
                                disabled={deleteBusy}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                color="var(--danger)"
                                onClick={confirmDelete}
                                loading={deleteBusy}
                                autoFocus
                            >
                                Delete
                            </Button>
                        </FormActions>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
