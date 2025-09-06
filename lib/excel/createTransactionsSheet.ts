// app/lib/excel/reportSheet.ts
"use server";

import type { Workbook, Worksheet } from "exceljs";
import { numberFormats, fonts, fillSolid, colors } from "./excelStyles";
import type { WorkbookData } from "./types";

/** Creates the "Transactions" sheet for payments + details */
export async function createTransactionsSheet(
    wb: Workbook,
    data: WorkbookData,
): Promise<Worksheet> {
    const ws = wb.addWorksheet("Transactions");

    // Title spans columns B → G
    ws.mergeCells("B2:G4");
    const title = ws.getCell("B2");
    title.value = "Transactions Report";
    title.font = fonts.h1;
    ws.addRow([]);

    // helper: turn "123.45" -> 123.45 (or keep as string if not numeric)
    const toMaybeNumber = (v: string) => {
        if (v == null) return "";
        const n = Number(v);
        return Number.isFinite(n) ? n : v;
    };

    const labelFont = { ...fonts.p, bold: true } as any;

    for (const section of data.payments.rows) {
        // 1) header LABEL row
        const headerLabelRow = ws.addRow([
            undefined,
            "Invoice",
            "Move In Date",
            "Rent",
            "Commission",
            "Status",
            "Total Bill Out",
        ]);
        headerLabelRow.font = labelFont;
        headerLabelRow.eachCell((cell) => {
            cell.fill = fillSolid(colors.darkGray);
            cell.alignment = { horizontal: "left" }; // force left align
        });

        // 2) header DATA row
        const h = section.headerRow;
        const headerDataRow = ws.addRow([
            undefined,
            h.invoice,
            h.moveInDate,
            toMaybeNumber(h.rent),
            toMaybeNumber(h.commission),
            h.status,
            toMaybeNumber(h.totalBillout),
        ]);
        headerDataRow.eachCell((cell) => {
            cell.fill = fillSolid(colors.darkGray);
            cell.alignment = { horizontal: "left" };
        });
        [4, 5, 7].forEach((c) => {
            const cell = headerDataRow.getCell(c);
            if (typeof cell.value === "number") cell.numFmt = numberFormats.usd;
        });

        // 3) payments LABEL row
        const paymentsLabelRow = ws.addRow([
            undefined,
            "Type",
            "Date",
            "Amount",
            "Notes", "", "", // reserve 3 columns for Notes
        ]);
        paymentsLabelRow.font = labelFont;
        paymentsLabelRow.eachCell((cell) => {
            cell.fill = fillSolid(colors.lightGray);
            cell.alignment = { horizontal: "left" };
        });
        // merge the Notes label cell across D–F
        ws.mergeCells(paymentsLabelRow.number, 5, paymentsLabelRow.number, 7);

        // 4) payment rows
        for (const t of section.transactionRow) {
            const r = ws.addRow([
                undefined,
                t.type ?? "",
                t.date,
                toMaybeNumber(t.amount),
                t.note ?? "", "", "", // reserve 3 columns
            ]);

            r.eachCell((cell) => {
                cell.alignment = { horizontal: "left" };
            });

            // merge Notes cell across 3 columns
            ws.mergeCells(r.number, 5, r.number, 7);

            // Amount column = D
            const amtCell = r.getCell(4);
            if (typeof amtCell.value === "number") amtCell.numFmt = numberFormats.usd;
        }

        ws.addRow([]); // spacer
    }

    // auto width
    ws.columns.forEach((col) => {
        let max = 10;
        col.eachCell?.({ includeEmpty: true }, (cell) => {
            const v = cell.value == null ? "" : String(cell.value);
            max = Math.max(max, v.length);
        });
        col.width = Math.min(Math.max(max + 2, 12), 60);
    });

    return ws;
}
