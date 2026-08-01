import type { User } from "@/types";

export interface UsersExportExtras {
  productStats?: Record<
    string,
    { productCount?: number; lastProductDate?: Date | string | null }
  >;
  commissionCounts?: Record<string, number>;
}

const COLUMNS: Array<{ header: string; width: number }> = [
  { header: "ID", width: 26 },
  { header: "სახელი", width: 26 },
  { header: "ელფოსტა", width: 30 },
  { header: "ტელეფონი", width: 18 },
  { header: "როლი", width: 16 },
  { header: "მაღაზია", width: 24 },
  { header: "პროდუქტები", width: 13 },
  { header: "ინდ. შეკვეთები", width: 15 },
  { header: "შესრულებული ინდ.", width: 17 },
  { header: "ბოლო ატვირთვა", width: 15 },
  { header: "რეგისტრაცია", width: 15 },
];

function asDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Builds a real .xlsx. Phone and ID are written as text cells so Excel cannot
 * turn a 12-digit number into 9,95599E+11, and dates are real date cells.
 * ExcelJS is loaded on demand — it is big and only admins ever export.
 */
export async function downloadUsersXlsx(
  users: User[],
  filename: string,
  extras: UsersExportExtras = {},
) {
  const { productStats = {}, commissionCounts = {} } = extras;
  // The browser build is a UMD bundle, so it may land on `default` or on the
  // namespace itself depending on the bundler's interop.
  const mod = await import("exceljs");
  const ExcelJS = ((mod as { default?: typeof mod }).default ?? mod) as typeof mod;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SoulArt admin";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Users", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = COLUMNS.map((c) => ({ width: c.width }));
  const headerRow = sheet.addRow(COLUMNS.map((c) => c.header));
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF012645" },
  };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 22;

  users.forEach((user) => {
    const stats = productStats[user._id];
    const row = sheet.addRow([
      user._id,
      user.name || "",
      user.email || "",
      user.phoneNumber || "",
      user.role || "",
      user.storeName || "",
      stats?.productCount ?? 0,
      user.artistOpenForCommissions ? "კი" : "არა",
      commissionCounts[user._id] ?? 0,
      asDate(stats?.lastProductDate),
      asDate(user.createdAt),
    ]);
    // ID + phone as text, so no scientific notation and no lost "+".
    row.getCell(1).numFmt = "@";
    row.getCell(4).numFmt = "@";
    row.getCell(10).numFmt = "dd/mm/yyyy";
    row.getCell(11).numFmt = "dd/mm/yyyy";
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
