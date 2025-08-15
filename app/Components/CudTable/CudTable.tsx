// app/Components/CudTable/CudTable.tsx
"use client";
import * as React from "react";
import { Button } from "../UI/Button/Button";
import type { TableConfig, Role } from "@/lib/table/types";

// ⬇️ import your dialog primitives
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

export type ActionHandlers<TRow extends { id: string }> = {
    onCreate: (form: FormData) => Promise<ActionResult>;
    onUpdate: (id: string, form: FormData) => Promise<ActionResult>;
    onDelete: (id: string) => Promise<ActionResult>;
};

type Props<TRow extends { id: string }> = {
    config: TableConfig<TRow>;
    role: Role;
    rows: TRow[];
    actions: ActionHandlers<TRow>;
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

    const visibleColumns = React.useMemo(
        () =>
            config.columns.filter((c) => {
                if (!c.visibleTo || c.visibleTo.length === 0) return true;
                return c.visibleTo.includes(role);
            }),
        [config.columns, role]
    );

    // ---- Dialog + form state
    const [isOpen, setOpen] = React.useState(false);
    const [mode, setMode] = React.useState<"create" | "edit">("create");
    const [current, setCurrent] = React.useState<Partial<TRow>>({} as Partial<TRow>);
    const [busy, setBusy] = React.useState(false);
    const [msg, setMsg] = React.useState<string | null>(null);

    // Always merge Partial<TRow> to avoid `{ id?: TRow['id'] }` narrowing
    const mergeCurrent = React.useCallback((patch: Partial<TRow>) => {
        setCurrent((prev) => ({ ...prev, ...patch }));
    }, []);

    function openCreate() {
        setMode("create");
        setMsg(null);
        const defaults = (creationDefaults ?? {}) as Partial<TRow>; // <- never undefined
        setCurrent({ ...defaults }); // satisfies SetStateAction<Partial<TRow>>
        setOpen(true);
    }

    function openEdit(row: TRow) {
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

    // Identify which keys are date inputs, once
    const dateKeys = React.useMemo(
        () => config.columns.filter(c => c.input === "date").map(c => c.key),
        [config.columns]
    );

    // String helpers
    function isDateOnly(s: string) {
        return /^\d{4}-\d{2}-\d{2}$/.test(s);
    }
    function isDatetimeLocal(s: string) {
        // No trailing Z and at least YYYY-MM-DDTHH:mm
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s) && !/[zZ]$/.test(s);
    }

    function renderCell(row: TRow, key: keyof TRow & string) {
        const col = config.columns.find((c) => c.key === key)!;
        const raw = (row as any)[key];
        if (col.format) return col.format(raw, row);
        if (col.options && Array.isArray(col.options)) {
            const opt = col.options.find(o => String(o.value) === String(raw));
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
                // <select
                //     name={name}
                //     required={required}
                //     disabled={disabled}
                //     defaultValue={value ?? ""}
                // >
                //     <option value="" disabled hidden>
                //         Select…
                //     </option>
                //     {col.options.map((o) => (
                //         <option key={String(o.value)} value={String(o.value)}>
                //             {o.label}
                //         </option>
                //     ))}
                // </select>
                <Dropdown
                    name={name}
                    required={required}
                    disabled={disabled}
                    defaultValue={value ?? ""}
                    options={[
                        { value: "", label: "Select…" },
                        ...col.options.map((o) => ({
                            value: String(o.value),
                            label: o.label
                        }))
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

        // Build a patched FormData where date inputs are normalized to ISO
        const patched = new FormData();
        for (const [k, v] of form.entries()) {
            let val = typeof v === "string" ? v : String(v);

            if (dateKeys.includes(k as any)) {
                if (isDateOnly(val)) {
                    // Choose UTC midnight as the canonical moment
                    val = new Date(val + "T00:00:00Z").toISOString();
                } else if (isDatetimeLocal(val)) {
                    // Treat as local time, convert to UTC ISO
                    val = new Date(val).toISOString();
                }
            }

            patched.append(k, val);
        }

        let res: ActionResult;
        try {
            if (mode === "create") {
                res = await actions.onCreate(patched);
            } else {
                const id = String(current.id);
                res = await actions.onUpdate(id, patched);
            }
        } catch (err: any) {
            res = { ok: false, message: err?.message ?? "Request failed" };
        }

        setBusy(false);
        setMsg(res.message);
        if (res.ok) {
            setOpen(false);
            // Server action revalidates; no local mutate here
        }
    }

    async function onDelete(id: string) {
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
        <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0 }}>{tableName}</h2>
                {allowCreate && (
                    <Button onClick={openCreate} disabled={busy} icon={<HiOutlinePlus />}>
                        New
                    </Button>
                )}
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            {visibleColumns.map((c) => (
                                <th
                                    key={c.key}
                                    style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}
                                >
                                    {c.label}
                                </th>
                            ))}
                            <th style={{ borderBottom: "1px solid #ddd" }} />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id}>
                                {visibleColumns.map((c) => (
                                    <td key={c.key} style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>
                                        {renderCell(r, c.key)}
                                    </td>
                                ))}
                                <td style={{ whiteSpace: "nowrap", padding: 8 }}>
                                    <Button onClick={() => openEdit(r)} disabled={busy} variant="outline" icon={<HiOutlinePencilSquare />}>
                                        Edit
                                    </Button>{" "}
                                    <Button onClick={() => onDelete(r.id)} disabled={busy} variant="destructive" icon={<HiOutlineTrash />}>
                                        Delete
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={visibleColumns.length + 1} style={{ padding: 12, opacity: 0.7 }}>
                                    No rows
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ⬇️ Use your Dialog instead of the ad-hoc overlay */}
            <Dialog open={isOpen} onOpenChange={(o) => {
                if (!busy) {
                    setOpen(o);
                    if (!o) setCurrent({} as Partial<TRow>);
                }
            }}>
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

                    <Form onSubmit={onSubmit} className="grid gap-3">
                        {mode === "edit" && (
                            <input type="hidden" name="id" value={String(current.id)} readOnly />
                        )}

                        {/* Fields */}
                        {visibleColumns.map((c) => (
                            <Field
                                key={c.key}
                                label={c.label}
                                htmlFor={c.key}
                                requiredMark={!!c.required}
                            >
                                {renderInput(c.key)}
                            </Field>
                        ))}

                        {/* Error message */}
                        <FormError message={msg} />

                        {/* Actions */}
                        <FormActions align="right">
                            <Button
                                variant="destructive"
                                type="button"
                                onClick={() => setOpen(false)}
                                disabled={busy}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={busy}>
                                {busy ? "Saving…" : "Save"}
                            </Button>
                        </FormActions>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
