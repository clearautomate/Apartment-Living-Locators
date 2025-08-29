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
    HiOutlineIdentification,
    HiOutlineCurrencyDollar,
    HiOutlineEllipsisHorizontalCircle,
} from "react-icons/hi2";
import * as React from "react";
import { onCreate, onDelete, onUpdate } from "@/app/(actions)/paymentActions";
import { logColumns, LogRow } from "@/lib/table/configs/log";

type PageProps = {
    params: Promise<{ id: string }>;
};

function isBlank(v: React.ReactNode) {
    if (v === null || v === undefined) return true;
    if (typeof v === "string" && v.trim() === "") return true;
    return false;
}

function Field({ label, children }: { label: string; children?: React.ReactNode }) {
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

export default async function LeasePage({ params }: PageProps) {
    const user = await withUser();

    const { id } = await params;

    const rows = await listRows({ id });

    const lease = await prisma.lease.findUnique({
        where: { id },
        include: {
            user: {
                select: { fname: true, lname: true },
            },
        },
    });

    if (!lease) {
        notFound();
    }

    // Convert Prisma lease into LogRow-compatible shape
    const leaseRow: LogRow = {
        ...lease,
        moveInDate: lease.moveInDate?.toISOString() ?? "",
        createdAt: lease.createdAt?.toISOString(),
        tenantEmail: lease.tenantEmail ?? undefined,
        extraNotes: lease.extraNotes ?? undefined,
        commissionPrecent:
            (lease as any).commissionPercent ?? (lease as any).commissionPrecent,
    };

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
                    <div className={`card`}>
                        <div className={styles.sectionTitle}>
                            <HiOutlineInformationCircle size={24} />
                            <h3>Info</h3>
                        </div>
                        <div className={styles.fieldGrid}>
                            <Field label={getColumn("invoiceNumber")?.label!}>
                                {renderValue("invoiceNumber", leaseRow.invoiceNumber, leaseRow)}
                            </Field>
                            <Field label="Agent">
                                {lease.user?.fname} {lease.user?.lname}
                            </Field>
                            <Field label={getColumn("moveInDate")?.label!}>
                                {renderValue("moveInDate", leaseRow.moveInDate, leaseRow)}
                            </Field>
                        </div>
                    </div>

                    {/* Property Section */}
                    <div className={`card`}>
                        <div className={styles.sectionTitle}>
                            <HiOutlineIdentification size={24} />
                            <h3>Property</h3>
                        </div>
                        <div className={styles.fieldGrid}>
                            <Field
                                label={`${getColumn("tenantFname")?.label!} ${getColumn(
                                    "tenantLname"
                                )?.label!}`}
                            >
                                {leaseRow.tenantFname} {leaseRow.tenantLname}
                            </Field>
                            <Field label={getColumn("tenantEmail")?.label!}>
                                {renderValue("tenantEmail", leaseRow.tenantEmail, leaseRow)}
                            </Field>
                            <Field label={getColumn("complex")?.label!}>
                                {renderValue("complex", leaseRow.complex, leaseRow)}
                            </Field>
                            <Field label={getColumn("apartmentNumber")?.label!}>
                                {renderValue("apartmentNumber", leaseRow.apartmentNumber, leaseRow)}
                            </Field>
                            <Field label={getColumn("rentAmount")?.label!}>
                                {renderValue("rentAmount", leaseRow.rentAmount, leaseRow)}
                            </Field>
                        </div>
                    </div>

                    {/* Payment Section */}
                    <div className={`card`}>
                        <div className={styles.sectionTitle}>
                            <HiOutlineCurrencyDollar size={24} />
                            <h3>Payment</h3>
                        </div>
                        <div className={styles.fieldGrid}>
                            <Field label={getColumn("commissionType")?.label!}>
                                {renderValue("commissionType", leaseRow.commissionType, leaseRow)}
                            </Field>
                            {leaseRow.commissionType === "percent" && (
                                <Field label={getColumn("commissionPrecent")?.label!}>
                                    {renderValue(
                                        "commissionPrecent",
                                        leaseRow.commissionPrecent,
                                        leaseRow
                                    )}
                                </Field>
                            )}
                            <Field label={getColumn("commission")?.label!}>
                                {renderValue("commission", leaseRow.commission, leaseRow)}
                            </Field>
                            <Field label={getColumn("paidStatus")?.label!}>
                                {renderValue("paidStatus", leaseRow.paidStatus, leaseRow)}
                            </Field>
                            <Field label="Total Paid">
                                {renderValue("commission", lease.totalPaid as any, leaseRow)}
                            </Field>
                            <Field label="Balance Diff">
                                {renderValue("commission", lease.paidDifference as any, leaseRow)}
                            </Field>
                        </div>
                    </div>

                    {/* Extra Section */}
                    <div className={`card`}>
                        <div className={styles.sectionTitle}>
                            <HiOutlineEllipsisHorizontalCircle size={24} />
                            <h3>Extra</h3>
                        </div>
                        <div className={styles.fieldGrid}>
                            <Field label={getColumn("extraNotes")?.label!}>
                                {renderValue("extraNotes", leaseRow.extraNotes, leaseRow)}
                            </Field>
                            <Field label={getColumn("createdAt")?.label!}>
                                {renderValue("createdAt", leaseRow.createdAt, leaseRow)}
                            </Field>
                        </div>
                    </div>
                </div>

                <div className="section">
                    <Client
                        rows={rows}
                        role={user.permissions}
                        actions={{
                            onCreate: onCreateBound,
                            onUpdate: onUpdateBound,
                            onDelete: onDeleteBound,
                        }}
                    />
                </div>
            </div>
        </>
    );
}
