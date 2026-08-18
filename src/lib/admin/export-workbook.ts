import "server-only";

import ExcelJS from "exceljs";

import type {
  CustomerExportRow,
  OrderExportRow,
  OrderItemExportRow,
} from "@/lib/admin/export-data";

const BRAND = "FF6C93C4";
const BRAND_DARK = "FF3F5F87";
const ZEBRA = "FFF4F7FB";
const BORDER = "FFD9E2EC";

const MONEY_FORMAT = '#,##0.00';
const DATE_FORMAT = "yyyy-mm-dd hh:mm";

type ColumnSpec<Row> = {
  header: string;
  key: string;
  width: number;
  /** Applied to the data cells of this column. */
  format?: "money" | "date" | "integer";
  value: (row: Row) => string | number | Date | null;
  total?: boolean;
};

/**
 * Builds one presentation-ready sheet: a title band, the filter description,
 * a frozen and filterable header row, zebra striping, typed number formats,
 * and a bold totals row for numeric columns.
 */
function addSheet<Row>(
  workbook: ExcelJS.Workbook,
  options: {
    name: string;
    title: string;
    subtitle: string;
    columns: Array<ColumnSpec<Row>>;
    rows: Row[];
  },
) {
  const { columns, rows } = options;
  const sheet = workbook.addWorksheet(options.name, {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: "landscape" },
  });
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));

  const lastColumn = columns.length;

  const titleRow = sheet.addRow([options.title]);
  sheet.mergeCells(titleRow.number, 1, titleRow.number, lastColumn);
  titleRow.height = 26;
  titleRow.getCell(1).font = { bold: true, size: 15, color: { argb: BRAND_DARK } };
  titleRow.getCell(1).alignment = { vertical: "middle" };

  const subtitleRow = sheet.addRow([options.subtitle]);
  sheet.mergeCells(subtitleRow.number, 1, subtitleRow.number, lastColumn);
  subtitleRow.getCell(1).font = { size: 10, color: { argb: "FF6B7280" } };

  sheet.addRow([]);

  const headerRow = sheet.addRow(columns.map((column) => column.header));
  headerRow.height = 20;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = { bottom: { style: "thin", color: { argb: BRAND_DARK } } };
  });

  for (const [index, row] of rows.entries()) {
    const values: Record<string, string | number | Date | null> = {};
    for (const column of columns) values[column.key] = column.value(row);
    const added = sheet.addRow(values);
    if (index % 2 === 1) {
      added.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
      });
    }
    added.eachCell((cell) => {
      cell.border = { bottom: { style: "hair", color: { argb: BORDER } } };
      cell.alignment = { vertical: "middle" };
    });
  }

  if (rows.length === 0) {
    const empty = sheet.addRow([`No records matched this export.`]);
    sheet.mergeCells(empty.number, 1, empty.number, lastColumn);
    empty.getCell(1).font = { italic: true, color: { argb: "FF6B7280" } };
  }

  // Number formats are applied per column so every data cell is consistent.
  for (const column of columns) {
    const sheetColumn = sheet.getColumn(column.key);
    if (column.format === "money") sheetColumn.numFmt = MONEY_FORMAT;
    if (column.format === "date") sheetColumn.numFmt = DATE_FORMAT;
    if (column.format === "integer") sheetColumn.numFmt = "#,##0";
  }

  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: headerRow.number, column: 1 },
      to: { row: headerRow.number, column: lastColumn },
    };

    const totalsRow = sheet.addRow(
      columns.reduce<Record<string, string | number>>((acc, column, index) => {
        if (index === 0) acc[column.key] = "Total";
        else if (column.total) {
          acc[column.key] = rows.reduce((sum, row) => {
            const value = column.value(row);
            return sum + (typeof value === "number" ? value : 0);
          }, 0);
        }
        return acc;
      }, {}),
    );
    totalsRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: BRAND_DARK } };
      cell.border = { top: { style: "thin", color: { argb: BRAND } } };
    });
    for (const column of columns) {
      if (column.format === "money") {
        totalsRow.getCell(column.key).numFmt = MONEY_FORMAT;
      }
      if (column.format === "integer") {
        totalsRow.getCell(column.key).numFmt = "#,##0";
      }
    }
  }

  return sheet;
}

function newWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Heaven Beauty Admin";
  workbook.created = new Date();
  return workbook;
}

export async function buildOrdersWorkbook(options: {
  orderRows: OrderExportRow[];
  itemRows: OrderItemExportRow[];
  filterSummary: string;
  generatedAt: Date;
}) {
  const workbook = newWorkbook();
  const subtitle = `${options.filterSummary} · ${options.orderRows.length} orders · generated ${options.generatedAt.toISOString().slice(0, 16).replace("T", " ")} UTC`;

  addSheet<OrderExportRow>(workbook, {
    name: "Orders",
    title: "Heaven Beauty — Orders",
    subtitle,
    rows: options.orderRows,
    columns: [
      { header: "Order", key: "orderNumber", width: 18, value: (r) => r.orderNumber },
      { header: "Date", key: "createdAt", width: 18, format: "date", value: (r) => r.createdAt },
      { header: "Customer", key: "customerName", width: 24, value: (r) => r.customerName },
      { header: "Phone", key: "phone", width: 18, value: (r) => r.phone },
      { header: "Email", key: "email", width: 26, value: (r) => r.email },
      { header: "Country", key: "country", width: 14, value: (r) => r.country },
      { header: "City", key: "city", width: 16, value: (r) => r.city },
      { header: "Delivery area", key: "area", width: 20, value: (r) => r.area },
      { header: "Address", key: "address", width: 34, value: (r) => r.address },
      { header: "Status", key: "status", width: 14, value: (r) => r.status },
      { header: "Items", key: "itemCount", width: 8, format: "integer", total: true, value: (r) => r.itemCount },
      { header: "Currency", key: "currency", width: 10, value: (r) => r.currency },
      { header: "Subtotal", key: "subtotal", width: 13, format: "money", total: true, value: (r) => r.subtotal },
      { header: "Shipping", key: "shippingFee", width: 12, format: "money", total: true, value: (r) => r.shippingFee },
      { header: "Total", key: "total", width: 14, format: "money", total: true, value: (r) => r.total },
      { header: "Tracking", key: "wakilniTracking", width: 18, value: (r) => r.wakilniTracking },
      { header: "Courier status", key: "wakilniStatus", width: 18, value: (r) => r.wakilniStatus },
      { header: "Notes", key: "notes", width: 30, value: (r) => r.notes },
    ],
  });

  addSheet<OrderItemExportRow>(workbook, {
    name: "Order Items",
    title: "Heaven Beauty — Order Line Items",
    subtitle: `${options.itemRows.length} line items across ${options.orderRows.length} orders`,
    rows: options.itemRows,
    columns: [
      { header: "Order", key: "orderNumber", width: 18, value: (r) => r.orderNumber },
      { header: "Date", key: "createdAt", width: 18, format: "date", value: (r) => r.createdAt },
      { header: "Product", key: "product", width: 38, value: (r) => r.product },
      { header: "Qty", key: "quantity", width: 8, format: "integer", total: true, value: (r) => r.quantity },
      { header: "Currency", key: "currency", width: 10, value: (r) => r.currency },
      { header: "Unit price", key: "unitPrice", width: 14, format: "money", value: (r) => r.unitPrice },
      { header: "Line total", key: "lineTotal", width: 14, format: "money", total: true, value: (r) => r.lineTotal },
    ],
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildCustomersWorkbook(options: {
  rows: CustomerExportRow[];
  filterSummary: string;
  generatedAt: Date;
}) {
  const workbook = newWorkbook();

  addSheet<CustomerExportRow>(workbook, {
    name: "Customers",
    title: "Heaven Beauty — Customers",
    subtitle: `${options.filterSummary} · ${options.rows.length} customers · generated ${options.generatedAt.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    rows: options.rows,
    columns: [
      { header: "Name", key: "name", width: 26, value: (r) => r.name },
      { header: "Phone", key: "phone", width: 18, value: (r) => r.phone },
      { header: "Email", key: "email", width: 28, value: (r) => r.email },
      { header: "Country", key: "country", width: 16, value: (r) => r.country },
      { header: "Orders", key: "orderCount", width: 10, format: "integer", total: true, value: (r) => r.orderCount },
      { header: "Currency", key: "currency", width: 10, value: (r) => r.currency },
      { header: "Total spend", key: "totalSpend", width: 15, format: "money", total: true, value: (r) => r.totalSpend },
      { header: "Last order", key: "lastOrderAt", width: 18, format: "date", value: (r) => r.lastOrderAt },
      { header: "Registered", key: "createdAt", width: 18, format: "date", value: (r) => r.createdAt },
    ],
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
