// app/Components/MonthlyPaymentBreakdown/MonthlyPaymentBreakdown.tsx
import styles from "./styles.module.css";

import Link from "../UI/Link/Link";
import Chip from "../UI/Chip/Chip";
import Summary from "../Summary/Summary";
import DownloadReportButton from "../DownloadReportButton/DownloadReportButton";
import { StatGrid } from "../UI/StatCard/StatCard";

import { prisma } from "@/lib/prisma";
import { getMonthAndYear, getMonthCutoffs } from "@/lib/getMonthAndYear";
import { computeLeasePaymentTotals } from "@/lib/computeLeaseTotals";

import { paymentColumns, type PaymentRow } from "@/lib/table/configs/payment";
import { logColumns, type LogRow } from "@/lib/table/configs/log";
import { drawColumns, type DrawRow } from "@/lib/table/configs/draw";
import type { WorkbookData } from "@/lib/excel/types";

/* ────────────────────────────────────────────────────────────────────────────
   Types & Props
──────────────────────────────────────────────────────────────────────────── */

type Props = {
    id: string; // agent/user id
    sp?: { month?: string | number; year?: string | number };
    agent: string;
    totalDraws: number;
    drawRows: DrawRow[];
};

// Derive the element type of the `payments` array we fetch below
type PaymentWithLease = Awaited<ReturnType<typeof fetchPayments>>[number];

/** Local widening (so we don't have to change shared PaymentRow type) */
type PaymentRowWithPayout = PaymentRow & { payout?: number | null };

/* ────────────────────────────────────────────────────────────────────────────
   DB
──────────────────────────────────────────────────────────────────────────── */

async function fetchPayments(userId: string, month: number, year: number) {
    const { start, nextMonthStart } = getMonthCutoffs(month, year);

    return prisma.payment.findMany({
        where: { userId, date: { gte: start, lt: nextMonthStart } },
        orderBy: { date: "desc" },
        include: {
            lease: {
                select: {
                    id: true,
                    moveInDate: true,
                    rentAmount: true,
                    invoiceNumber: true,
                    paidStatus: true,
                    complex: true,
                    tenantFname: true,
                    tenantLname: true,
                    apartmentNumber: true,
                    commission: true,
                    commissionType: true,
                    commissionPercent: true,
                    createdAt: true, // used for grouping sort
                },
            },
        },
    });
}

/* ────────────────────────────────────────────────────────────────────────────
   Column helpers (Payment & Draw)
──────────────────────────────────────────────────────────────────────────── */

function getPaymentColumn<K extends keyof PaymentRow>(key: K) {
    return paymentColumns.find((c) => c.key === key);
}

function renderPaymentValue<K extends keyof PaymentRow>(
    key: K,
    value: PaymentRow[K],
    row: PaymentRow,
) {
    const col = getPaymentColumn(key);
    if (!col) {
        // Graceful fallback formatting for amount/payout even if column isn't defined in config
        if (typeof value === "number" && (key as string) === "amount") return formatUSD(value);
        if (typeof value === "number" && (key as string) === "payout") return formatUSD(value as any);
        return (value as any) ?? "—";
    }
    if (col.format) return col.format(value, row);

    if (col.input === "select" && col.options) {
        const opt = col.options.find((o) => o.value === value);
        return opt?.label ?? (value as any) ?? "—";
    }

    // Generic fallback for money-ish fields
    if (
        typeof value === "number" &&
        ((col.key as string) === "amount" || (col.key as string) === "payout")
    ) {
        return formatUSD(value);
    }

    return (value as any) ?? "—";
}

// Prisma Payment → PaymentRow (string dates for z.iso.datetime()) + local payout
function toPaymentRow(p: {
    id: string;
    leaseId: string;
    paymentType: PaymentRow["paymentType"];
    amount: number;
    payout?: number | null; // NEW
    date: Date | string;
    notes: string | null;
    createdAt?: Date | string | null;
}): PaymentRowWithPayout {
    const toIso = (d: Date | string | null | undefined) => {
        if (!d) return undefined;
        if (typeof d === "string") return d; // assume already ISO
        return d.toISOString();
    };

    return {
        id: p.id,
        leaseId: p.leaseId,
        paymentType: p.paymentType,
        amount: p.amount,
        payout: p.payout ?? undefined, // NEW
        date: toIso(p.date)!,
        notes: p.notes,
        createdAt: toIso(p.createdAt),
    };
}

/** Use UI renderers to produce export-ready strings for a payment row */
function toRenderedPaymentExportRow(row: PaymentRowWithPayout) {
    // Casts keep the existing PaymentRow-based renderers happy without changing shared types
    const base = row as unknown as PaymentRow;
    return {
        type: String(renderPaymentValue("paymentType", base.paymentType, base)),
        date: String(renderPaymentValue("date", base.date, base)),
        leaseId: base.leaseId,
        amount: String(renderPaymentValue("amount", base.amount, base)),
        payout:
            row.payout != null
                ? String(renderPaymentValue("payout" as any, row.payout as any, base))
                : undefined,
        note: base.notes ? String(renderPaymentValue("notes", base.notes, base)) : undefined,
    };
}

/* ────────────────────────────────────────────────────────────────────────────
   Draw helpers (formatting via column config)
──────────────────────────────────────────────────────────────────────────── */

function getDrawColumn<K extends keyof DrawRow>(key: K) {
    return drawColumns.find((c) => c.key === key);
}

function renderDrawValue<K extends keyof DrawRow>(
    key: K,
    value: DrawRow[K],
    row: DrawRow,
) {
    const col = getDrawColumn(key);
    if (!col) return (value as any) ?? "—";
    if (col.format) return col.format(value, row);

    if (col.input === "select" && col.options) {
        const opt = col.options.find((o) => o.value === value);
        return opt?.label ?? (value as any) ?? "—";
    }
    return (value as any) ?? "—";
}

/** Export-ready draw row using same UI formatting (notably date + amount) */
function toRenderedDrawExportRow(row: DrawRow) {
    return {
        date: String(renderDrawValue("date", row.date, row)),
        amount: String(renderDrawValue("amount", row.amount, row)),
        note: row.notes ? String(renderDrawValue("notes", row.notes, row)) : undefined,
    };
}

/* ────────────────────────────────────────────────────────────────────────────
   Log helpers (header formatters, no generics)
──────────────────────────────────────────────────────────────────────────── */

function isISODateString(v: unknown): v is string {
    return typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v);
}
function isDateObject(v: unknown): v is Date {
    return typeof v === "object" && v !== null && typeof (v as Date).getTime === "function";
}
function formatDateSafe(v: unknown): string {
    const d = isISODateString(v) ? new Date(v) : isDateObject(v) ? v : null;
    return d ? d.toLocaleDateString() : String(v ?? "—");
}

function renderLogValueSafe(
    key: keyof LogRow,
    value: unknown,
    row: Partial<LogRow>,
) {
    const col = logColumns.find((c) => c.key === key);

    // Column-specific formatter
    if (col?.format) return (col.format as any)(value, row);

    if (value == null || value === "") return "—";

    // Money-ish keys → USD
    if (typeof value === "number" && /amount|rent|commission|total|paid/i.test(String(key))) {
        return value.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 2,
        });
    }

    // Dates (ISO string or Date object)
    if (isISODateString(value) || isDateObject(value)) {
        return formatDateSafe(value);
    }

    // Select-like columns
    if (col?.input === "select" && col.options) {
        const opt = col.options.find((o) => o.value === (value as any));
        return opt?.label ?? (value as any);
    }

    return value as any;
}

/** Adapter: Lease → LogRow-ish for header formatters */
function toHeaderLogRow(lease: {
    id: string;
    moveInDate: Date | string;
    rentAmount: number;
    commission: number;
    paidStatus: string;
    invoiceNumber: string;
    complex?: string | null;
    tenantFname?: string | null;
    tenantLname?: string | null;
    apartmentNumber?: string | null;
    commissionType?: "flat" | "percent" | null;
    commissionPercent?: number | null;
}): Partial<LogRow> & { id: string } {
    const toIso = (d: Date | string) => (typeof d === "string" ? d : d.toISOString());
    return {
        id: lease.id,
        moveInDate: toIso(lease.moveInDate) as any,
        rentAmount: lease.rentAmount as any,
        commission: lease.commission as any,
        paidStatus: lease.paidStatus as any,
        invoiceNumber: lease.invoiceNumber as any,
        complex: (lease.complex ?? "") as any,
        tenantFname: (lease.tenantFname ?? "") as any,
        tenantLname: (lease.tenantLname ?? "") as any,
        apartmentNumber: (lease.apartmentNumber ?? "") as any,
        commissionType: (lease.commissionType ?? undefined) as any,
        commissionPercent: (lease.commissionPercent ?? undefined) as any,
    };
}

/** Build export-ready header values using the same UI renderers as the table */
function toRenderedHeaderExportRow(
    lease: {
        id: string;
        moveInDate: Date | string;
        rentAmount: number;
        invoiceNumber: string;
        paidStatus: string;
        commission: number;
        commissionType?: "flat" | "percent" | null;
        commissionPercent?: number | null;
        complex?: string | null;
        tenantFname?: string | null;
        tenantLname?: string | null;
        apartmentNumber?: string | null;
        createdAt?: Date | string;
    },
    totals: { totalBillOut: number },
) {
    const logRow = toHeaderLogRow(lease);

    return {
        invoice: `#${String(renderLogValueSafe("invoiceNumber", logRow.invoiceNumber, logRow))}`,
        moveInDate: String(renderLogValueSafe("moveInDate", logRow.moveInDate, logRow)),
        rent: String(renderLogValueSafe("rentAmount", logRow.rentAmount, logRow)),
        commission: String(renderLogValueSafe("commission", logRow.commission, logRow)),
        status: String(renderLogValueSafe("paidStatus", logRow.paidStatus, logRow)),
        // Use totalBillOut so chargebacks are reflected, formatted by the same UI renderer
        totalBillout: String(
            renderLogValueSafe("totalPaidThisMonth" as keyof LogRow, totals.totalBillOut, logRow),
        ),
    };
}

/* ────────────────────────────────────────────────────────────────────────────
   Small utils
──────────────────────────────────────────────────────────────────────────── */

function formatUSD(n: number) {
    return n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    });
}

/* ────────────────────────────────────────────────────────────────────────────
   Component
──────────────────────────────────────────────────────────────────────────── */

export default async function MonthlyPaymentBreakdown(props: Props) {
    const month = Number(props.sp?.month);
    const year = Number(props.sp?.year);
    const userId = props.id;

    const payments = await fetchPayments(userId, month, year);

    if (payments.length === 0) {
        const { month: formattedMonth, year: formattedYear } = getMonthAndYear(month, year);
        return (
            <>
                <Summary
                    totalBillOut={0}
                    splitAmount={0}
                    totalChargebacksStat={0}
                    totalDrawsStat={0}
                    monthlyPayout={0}
                    exportData={undefined}
                />

                <div className="section card">
                    <div className="header">
                        <h2>Transactions</h2>
                        <div className={styles.info}>
                            <p><b>Agent:</b> {props.agent}</p>
                            <p><b>Period:</b> {formattedMonth} {formattedYear}</p>
                        </div>
                    </div>
                    <div>No payments found for this period.</div>
                </div>
            </>
        );
    }

    // Group by leaseId, compute per-lease totals
    const byLease = new Map<
        string,
        {
            lease: NonNullable<PaymentWithLease["lease"]>;
            payments: PaymentWithLease[];
            totals: ReturnType<typeof computeLeasePaymentTotals>;
        }
    >();

    for (const p of payments) {
        const key = p.leaseId;
        const commission = p.lease.commission;

        // Ensure we always have 'totals' on the entry
        let entry = byLease.get(key);
        if (!entry) {
            entry = {
                lease: p.lease,
                payments: [],
                totals: computeLeasePaymentTotals([], commission),
            };
            byLease.set(key, entry);
        }

        entry.payments.push(p);

        // Normalize payout to number so it matches LeasePaymentLike
        const leasePayments = entry.payments.map(({ amount, payout }) => ({
            amount,
            payout: payout ?? 0,
        }));

        entry.totals = computeLeasePaymentTotals(leasePayments, commission);
    }

    // Sort groups by the LEASE createdAt (newest → oldest).
    const groups = [...byLease.values()].sort((a, b) => {
        const aTime = new Date(a.lease.createdAt as any).getTime();
        const bTime = new Date(b.lease.createdAt as any).getTime();
        return bTime - aTime;
    });

    // Grand totals (use totalBillOut so chargebacks are reflected)
    const grandTotal = groups.reduce((sum, g) => sum + g.totals.totalBillOut, 0);
    const totalChargebacks = groups.reduce((sum, g) => sum + g.totals.totalChargebacks, 0);

    const { month: formattedMonth, year: formattedYear } = getMonthAndYear(month, year);

    const paymentHueMap: Record<string, number> = {
        advance: 210,      // warm yellow-orange
        payment: 145,        // green
        adjustment: 45,     // blue
        chargeback: 350,  // red/pink
    };

    // For UI only (formatted)
    const totalBillOut = grandTotal;
    const splitAmount = grandTotal * 0.7;
    const totalChargebacksStat = totalChargebacks;
    const totalDrawsStat = Number(props.totalDraws || 0);
    const monthlyPayout = splitAmount + totalDrawsStat;

    // Build export rows with UI-rendered values for both header and payments (sorted groups)
    const paymentRows: WorkbookData["payments"]["rows"] = groups.map(
        ({ lease, payments, totals }) => ({
            headerRow: toRenderedHeaderExportRow(lease, totals),
            transactionRow: payments.map((p) => {
                const uiRow = toPaymentRow({
                    id: p.id,
                    leaseId: p.leaseId,
                    paymentType: p.paymentType as PaymentRow["paymentType"],
                    amount: p.amount,
                    payout: (p as any).payout ?? 0, // NEW
                    date: p.date as any,
                    notes: p.notes,
                    createdAt: p.createdAt as any,
                });
                return toRenderedPaymentExportRow(uiRow);
            }),
        }),
    );

    // Render draws using same column configs (date formatting included)
    const renderedDrawRows = props.drawRows.map(toRenderedDrawExportRow);

    const exportData: WorkbookData = {
        agent: props.agent,
        period: `${formattedMonth} ${formattedYear}`,
        stats: {
            totalBillOut: grandTotal.toFixed(2),
            splitAmount: splitAmount.toFixed(2),
            chargebacks: totalChargebacks.toFixed(2),
            draws: totalDrawsStat.toFixed(2),
            monthlyPayout: monthlyPayout.toFixed(2),
        },
        payments: { rows: paymentRows },
        draws: { rows: renderedDrawRows },
    };

    return (
        <>
            <Summary
                totalBillOut={totalBillOut}
                splitAmount={splitAmount}
                totalChargebacksStat={totalChargebacksStat}
                totalDrawsStat={totalDrawsStat}
                monthlyPayout={monthlyPayout}
                exportData={exportData}
            />

            <div className="section card">
                <div className="header">
                    <h2>Transactions</h2>
                    <div className={styles.info}>
                        <p><b>Agent:</b> {props.agent}</p>
                        <p><b>Period:</b> {formattedMonth} {formattedYear}</p>
                    </div>
                </div>

                {groups.map(({ lease, payments, totals }) => {
                    const logRow = toHeaderLogRow(lease);

                    return (
                        <div key={lease.id} className={styles.leaseRow}>
                            <div className={styles.tableWrap}>
                                {/* Lease Header Table */}
                                <table className={styles.leaseHeaderTable}>
                                    <thead>
                                        <tr>
                                            {[
                                                <th key="invoice">Invoice</th>,
                                                <th key="moveInDate">Move In Date</th>,
                                                <th key="rent">Rent</th>,
                                                <th key="commission">Commission</th>,
                                                <th key="status">Status</th>,
                                                <th key="totalBillOut">Total Bill Out</th>,
                                            ]}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            {[
                                                <td key="invoice">
                                                    <Link
                                                        color="primary"
                                                        href={`/lease/${lease.id}`}
                                                        className={styles.leaseLink}
                                                    >
                                                        #{renderLogValueSafe("invoiceNumber", logRow.invoiceNumber, logRow)}
                                                    </Link>
                                                </td>,
                                                <td key="moveInDate">
                                                    {renderLogValueSafe("moveInDate", logRow.moveInDate, logRow)}
                                                </td>,
                                                <td key="rent">
                                                    {renderLogValueSafe("rentAmount", logRow.rentAmount, logRow)}
                                                </td>,
                                                <td key="commission">
                                                    {renderLogValueSafe("commission", logRow.commission, logRow)}
                                                </td>,
                                                <td key="status">
                                                    {renderLogValueSafe("paidStatus", logRow.paidStatus, logRow)}
                                                </td>,
                                                <td key="totalBillOut">
                                                    {renderLogValueSafe(
                                                        "totalPaidThisMonth" as keyof LogRow,
                                                        totals.totalBillOut,
                                                        logRow,
                                                    )}
                                                </td>,
                                            ]}
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Payments Table */}
                                <table className={styles.paymentTable}>
                                    <thead>
                                        <tr>
                                            {[
                                                <th key="type">{getPaymentColumn("paymentType")?.label}</th>,
                                                <th key="date">{getPaymentColumn("date")?.label}</th>,
                                                <th key="amount">{getPaymentColumn("amount")?.label}</th>,
                                                <th key="payout">{getPaymentColumn("payout" as any)?.label ?? "Payout"}</th>,
                                                <th key="notes">{getPaymentColumn("notes")?.label}</th>,
                                            ]}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map((p) => {
                                            const row = toPaymentRow({
                                                id: p.id,
                                                leaseId: p.leaseId,
                                                paymentType: p.paymentType as PaymentRow["paymentType"],
                                                amount: p.amount,
                                                payout: p.payout ?? 0, // NEW
                                                date: p.date,
                                                notes: p.notes,
                                                createdAt: p.createdAt,
                                            });

                                            const base = row as unknown as PaymentRow;

                                            return (
                                                <tr key={p.id} className={styles.paymentRow}>
                                                    {[
                                                        <td key="type">
                                                            <Chip hue={paymentHueMap[row.paymentType] ?? 210}>
                                                                {renderPaymentValue("paymentType", base.paymentType, base)}
                                                            </Chip>
                                                        </td>,
                                                        <td key="date">{renderPaymentValue("date", base.date, base)}</td>,
                                                        <td key="amount">{renderPaymentValue("amount", base.amount, base)}</td>,
                                                        <td key="payout">
                                                            {renderPaymentValue("payout" as any, row.payout as any, base)}
                                                        </td>,
                                                        <td key="notes">
                                                            {renderPaymentValue("notes", (base.notes ?? "") as any, base)}
                                                        </td>,
                                                    ]}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
