// app/lib/excel/reportSheet.ts
"use server";

import type { Workbook, Worksheet } from "exceljs";
import { numberFormats, fonts, fillSolid, colors } from "./excelStyles";
import type { WorkbookData } from "./types";

/** Creates the "Draws" sheet for agent/user draws */
export async function createDrawsSheet(
    wb: Workbook,
    data: WorkbookData,
): Promise<Worksheet> {
    const ws = wb.addWorksheet("Draws");

    // Title spans columns B → E
    ws.mergeCells("B2:E4");
    const title = ws.getCell("B2");
    title.value = "Draws";
    title.font = fonts.h1;
    ws.addRow([]);

    // Add header row starting in col B
    const header = ws.addRow(["", "Date", "Amount", "Notes"]); // empty col A
    header.font = { ...fonts.p, bold: true };

    // Apply fill only to the header cells B–D
    ["B", "C", "D"].forEach((col) => {
        const cell = header.getCell(col);
        cell.fill = fillSolid(colors.darkGray);
    });

    // Loop through draws
    for (const draw of data.draws.rows) {
        ws.addRow([
            "", // skip col A
            draw.date ? new Date(draw.date) : "",
            draw.amount,
            draw.note ?? "",
        ]);
    }

    // Column widths (start from B)
    ws.getColumn(2).width = 15; // Date
    ws.getColumn(3).width = 12; // Amount
    ws.getColumn(4).width = 40; // Notes

    // Format Amount column as currency
    ws.getColumn(3).numFmt = numberFormats.usd;

    return ws;
}
