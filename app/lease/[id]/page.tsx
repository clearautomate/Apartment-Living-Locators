import Navbar from "@/app/Components/Navbar/Navbar";
import BackLink from "./BackLink";
import { withUser } from "@/lib/withUser";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import styles from "./styles.module.css";
import Client from "./Client";
import { listRows } from "@/lib/queries/paymentQueries";
import {
    HiOutlineInformationCircle,
    HiOutlineCurrencyDollar,
    HiOutlineEllipsisHorizontalCircle,
    HiOutlineHome,
} from "react-icons/hi2";
import * as React from "react";
import { onCreate, onDelete, onUpdate } from "@/app/(actions)/paymentActions";
import { logColumns, LogRow } from "@/lib/table/configs/log";
import { computeLeasePaymentTotals } from "@/lib/computeLeaseTotals";

type PageProps = {
    params: Promise<{ id: string }>;
};

/* ───────────────────────── helpers ───────────────────────── */

function isBlank(v: React.ReactNode) {
    if (v === null || v === undefined) return true;
    if (typeof v === "string" && v.trim() === "") return true;
    return false;
}

function fmtUSD(n: number | null | undefined) {
    if (n == null || Number.isNaN(n)) return "—";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(n);
}

function Field({
    label,
    children,
}: {
    label: string;
    children?: React.ReactNode;
}) {
    return (
        <div className={styles.field}>
            <p className={styles.fieldTitle}>{label}</p>
            <p>{isBlank(children) ? "—" : children}</p>
        </div>
    );
}

function getColumn(key: string) {
    return logColumns.find((c) => c.key === key);
}

function renderValue(key: string, value: any, row: LogRow) {
    const col = getColumn(key);
    if (!col) return value ?? "—";
    if (col.format) return col.format(value, row);

    if (col.input === "select" && col.options) {
        const opt = col.options.find((o) => o.value === value);
        return opt?.label ?? value ?? "—";
    }
    return value ?? "—";
}

/* ───────────────────────── page ───────────────────────── */

export default async function LeasePage({ params }: PageProps) {
    const user = await withUser();
    const { id } = await params;

    // Payment rows (your log rows)
    const rows = await listRows({ id });

    // Lease w/ agent name (all lease scalars included by default)
    const lease = await prisma.lease.findUnique({
        where: { id },
        include: {
            user: {
                select: { fname: true, lname: true },
            },
        },
    });

    if (!lease) notFound();

    // Convert Prisma lease into LogRow-compatible shape
    const leaseRow: LogRow = {
        ...lease,
        moveInDate: lease.moveInDate?.toISOString() ?? "",
        createdAt: lease.createdAt?.toISOString(),
        tenantEmail: lease.tenantEmail ?? undefined,
        extraNotes: lease.extraNotes ?? undefined,
        // Back-compat for the "precent" typo (keep your intended fallback):
        commissionPercent:
            (lease as any).commissionPercent ?? (lease as any).commissionPrecent,
        balancePaid: lease.balancePaid ?? 0,
        balanceDue: lease.balanceDue ?? 0,
    };

    /* ── Use computeLeasePaymentTotals for this lease ──────────────────────────
       IMPORTANT: hasAdvance must come from the LEASE, not the payment rows.
       We pass the same lease-level boolean to every payment for this lease. */
    const payments = Array.isArray(rows)
        ? rows.map((r) => ({
            amount: Number(r.amount) || 0,
            payout: Number(r.payout) || 0,
        }))
        : [];

    const totals = computeLeasePaymentTotals(payments, lease.commission);
    const balanceDue = totals.remainingBalance;
    const agentBillOut = totals.totalBillOut;

    const onCreateBound = onCreate.bind(null, id);
    const onUpdateBound = onUpdate.bind(null, id);
    const onDeleteBound = onDelete.bind(null, id);

    return (
        <>
            <Navbar permissions={user.permissions} id={user.id} />
            <div className="page-width">
                <div className={styles.title}>
                    <h2>Lease</h2>
                    <BackLink />
                </div>

                <div className={styles.grid}>
                    {/* Info Section */}
                    <div className="card">
                        <div className={styles.sectionTitle}>
                            <HiOutlineInformationCircle size={24} />
                            <h3>Info</h3>
                        </div>
                        <div className={styles.fieldGrid}>
                            <Field label={getColumn("invoiceNumber")?.label ?? "Invoice #"}>
                                {renderValue("invoiceNumber", leaseRow.invoiceNumber, leaseRow)}
                            </Field>
                            <Field label="Agent">
                                {lease.user?.fname} {lease.user?.lname}
                            </Field>
                            <Field label={getColumn("moveInDate")?.label ?? "Move-in Date"}>
                                {renderValue("moveInDate", leaseRow.moveInDate, leaseRow)}
                            </Field>
                        </div>
                    </div>

                    {/* Property Section */}
                    <div className="card">
                        <div className={styles.sectionTitle}>
                            <HiOutlineHome size={24} />
                            <h3>Property</h3>
                        </div>
                        <div className={styles.fieldGrid}>
                            <Field label="Tenant Name">
                                {leaseRow.tenantFname} {leaseRow.tenantLname}
                            </Field>
                            <Field label={getColumn("tenantEmail")?.label ?? "Tenant Email"}>
                                {renderValue("tenantEmail", leaseRow.tenantEmail, leaseRow)}
                            </Field>
                            <Field label={getColumn("complex")?.label ?? "Complex"}>
                                {renderValue("complex", leaseRow.complex, leaseRow)}
                            </Field>
                            <Field label={getColumn("apartmentNumber")?.label ?? "Apt #"}>
                                {renderValue("apartmentNumber", leaseRow.apartmentNumber, leaseRow)}
                            </Field>
                            <Field label={getColumn("rentAmount")?.label ?? "Rent"}>
                                {renderValue("rentAmount", leaseRow.rentAmount, leaseRow)}
                            </Field>
                        </div>
                    </div>

                    {/* Payment Section */}
                    <div className="card">
                        <div className={styles.sectionTitle}>
                            <HiOutlineCurrencyDollar size={24} />
                            <h3>Payment</h3>
                        </div>
                        <div className={styles.fieldGrid}>
                            <Field label={getColumn("commissionType")?.label ?? "Type"}>
                                {renderValue("commissionType", leaseRow.commissionType, leaseRow)}
                            </Field>

                            {leaseRow.commissionType === "percent" && (
                                <Field label={getColumn("commissionPercent")?.label ?? "Commission %"}>
                                    {renderValue("commissionPercent", leaseRow.commissionPercent, leaseRow)}
                                </Field>
                            )}

                            <Field label={getColumn("commission")?.label ?? "Commission"}>
                                {renderValue("commission", leaseRow.commission, leaseRow)}
                            </Field>

                            <Field label={getColumn("paidStatus")?.label ?? "Status"}>
                                {renderValue("paidStatus", leaseRow.paidStatus, leaseRow)}
                            </Field>

                            <Field label="Balance Due">{fmtUSD(balanceDue)}</Field>

                            <Field label="Total Bill Out">{fmtUSD(agentBillOut)}</Field>

                            <Field label="Split Amount">
                                {fmtUSD(agentBillOut * 0.7)}
                            </Field>
                        </div>
                    </div>

                    {/* Extra Section */}
                    <div className="card">
                        <div className={styles.sectionTitle}>
                            <HiOutlineEllipsisHorizontalCircle size={24} />
                            <h3>Extra</h3>
                        </div>
                        <div className={styles.fieldGrid}>
                            <Field label={getColumn("extraNotes")?.label ?? "Notes"}>
                                {renderValue("extraNotes", leaseRow.extraNotes, leaseRow)}
                            </Field>
                            <Field label={getColumn("createdAt")?.label ?? "Created"}>
                                {/* Note: your formatter key here was "moveInDate"—kept as-is if intentional */}
                                {renderValue("moveInDate", leaseRow.createdAt, leaseRow)}
                            </Field>
                        </div>
                    </div>
                </div>

                <div className="section">
                    <Client
                        rows={rows}
                        role={user.permissions}
                        maxPayment={balanceDue}
                        actions={user.permissions === 'owner' ? {
                            onCreate: onCreateBound,
                            onUpdate: onUpdateBound,
                            onDelete: onDeleteBound,
                        } : {}}
                    />
                </div>
            </div>
        </>
    );
}
