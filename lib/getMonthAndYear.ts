export function getMonthAndYear(
    monthNum?: number | null,
    yearNum?: number | null
): { month: string; monthNumber: number; year: number } {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const now = new Date();

    const monthIndex =
        monthNum && monthNum >= 1 && monthNum <= 12
            ? monthNum - 1
            : now.getMonth(); // 0–11

    const year = yearNum && yearNum > 0 ? yearNum : now.getFullYear();

    return {
        month: months[monthIndex],
        monthNumber: monthIndex + 1, // 1–12
        year,
    };
}

export function getMonthCutoffs(month?: number | null, year?: number | null) {
    const now = new Date();

    const fallbackMonth = now.getUTCMonth() + 1; // 1–12
    const fallbackYear = now.getUTCFullYear();

    const month01 =
        month && month >= 1 && month <= 12 ? month : fallbackMonth;
    const yyyy =
        year && year >= 1900 && year <= 9999 ? year : fallbackYear;

    const start = new Date(Date.UTC(yyyy, month01 - 1, 1, 0, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(yyyy, month01, 1, 0, 0, 0, 0));

    return { start, nextMonthStart, month: month01, year: yyyy };
}
