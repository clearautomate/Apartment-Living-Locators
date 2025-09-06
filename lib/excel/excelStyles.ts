// app/lib/excel/excelStyles.ts

import type ExcelJS from "exceljs";

/**
 * Centralized Excel styling: number formats, fonts, and common alignments.
 * Tweak here to theme every sheet.
 */
export const numberFormats = {
    usd: "$#,##0.00;[Red]-$#,##0.00",
};

export const fonts: Record<
    "h1" | "h2" | "p",
    Partial<ExcelJS.Font>
> = {
    h1: { size: 28, bold: true, color: { argb: "00000000" } },
    h2: { size: 20, bold: true, color: { argb: "00000000" } },
    p: { size: 11, bold: false, color: { argb: "00595959" } },
};

export const align = {
    right: { horizontal: "right" } as Partial<ExcelJS.Alignment>,
    leftTop: { horizontal: "left", vertical: "top" } as Partial<ExcelJS.Alignment>,
};

// --- Color helpers ---
export const fillSolid = (argb: string) => ({
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb },
});

export const colors = {
    darkGray: "00D9D9D9",  // medium/dark gray
    lightGray: "00F2F2F2", // lighter gray
};