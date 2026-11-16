#!/usr/bin/env python3
"""Generate the optional Excel workbook used to prepare CSV imports into MyCustomer."""

from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

OUTPUT = Path(__file__).parent / "mycustomer-database-template.xlsx"
HEADER_FILL = PatternFill("solid", fgColor="1F4E78")
HEADER_FONT = Font(bold=True, color="FFFFFF")
SAMPLE_FILL = PatternFill("solid", fgColor="FFF2CC")
CHANNEL_ENUM = "dine_in,takeaway,gofood,grab,shopee,whatsapp,custom"
BRANCH_ENUM = "CMH,BDG,BKS"
GENDER_ENUM = "L,P"

SHEETS = {
    "import_customers": {
        "headers": [
            "Nama", "No WhatsApp", "Cabang", "Gender", "Rentang Usia",
            "Tanggal Order Pertama", "Catatan",
        ],
        "sample": [["Budi Santoso", "081234567890", "CMH", "L", "26-35", "2026-09-01", "Customer reguler"]],
        "dropdowns": {"Cabang": BRANCH_ENUM, "Gender": GENDER_ENUM},
    },
    "import_orders": {
        "headers": ["No WhatsApp", "Nama", "Tanggal Order", "Channel", "Cabang"],
        "sample": [["081234567890", "Budi Santoso", "2026-09-01", "gofood", "CMH"]],
        "dropdowns": {"Channel": CHANNEL_ENUM, "Cabang": BRANCH_ENUM},
    },
}

GUIDE = [
    ["PANDUAN IMPORT CSV", ""],
    ["1", "Isi data pada tab import_customers atau import_orders."],
    ["2", "Hapus baris contoh berwarna kuning sebelum mengisi data."],
    ["3", "Ekspor tab yang akan diimport sebagai file CSV."],
    ["4", "Di aplikasi MyCustomer, buka Pengaturan > Import dan unggah file CSV."],
    ["5", "Data divalidasi lalu disimpan ke Supabase; workbook ini bukan datastore."],
    ["", ""],
    ["FORMAT", ""],
    ["Nomor WhatsApp", "Kolom telepon disimpan sebagai teks agar angka 0 di depan tidak hilang."],
    ["Tanggal", "Gunakan format YYYY-MM-DD."],
    ["Channel", CHANNEL_ENUM],
    ["Cabang", BRANCH_ENUM],
]


def build_workbook() -> Workbook:
    workbook = Workbook()
    workbook.remove(workbook.active)

    for name, spec in SHEETS.items():
        sheet = workbook.create_sheet(title=name)
        headers = spec["headers"]
        for column, header in enumerate(headers, start=1):
            cell = sheet.cell(row=1, column=column, value=header)
            cell.fill = HEADER_FILL
            cell.font = HEADER_FONT
            cell.alignment = Alignment(horizontal="center")

        for row_idx, values in enumerate(spec.get("sample", []), start=2):
            for column, value in enumerate(values, start=1):
                cell = sheet.cell(row=row_idx, column=column, value=value)
                cell.fill = SAMPLE_FILL

        phone_column = headers.index("No WhatsApp") + 1
        phone_letter = get_column_letter(phone_column)
        for row_idx in range(2, 2001):
            sheet[f"{phone_letter}{row_idx}"].number_format = "@"

        for column_name, values in spec["dropdowns"].items():
            column_letter = get_column_letter(headers.index(column_name) + 1)
            validation = DataValidation(type="list", formula1=f'"{values}"', allow_blank=True)
            validation.error = f"Nilai harus salah satu dari: {values}"
            validation.errorTitle = "Nilai tidak valid"
            sheet.add_data_validation(validation)
            validation.add(f"{column_letter}2:{column_letter}2000")

        sheet.freeze_panes = "A2"
        for column, header in enumerate(headers, start=1):
            sheet.column_dimensions[get_column_letter(column)].width = max(16, min(32, len(header) + 4))

    guide = workbook.create_sheet(title="_panduan")
    for row in GUIDE:
        guide.append(row)
    guide.column_dimensions["A"].width = 28
    guide.column_dimensions["B"].width = 100
    for row in guide.iter_rows(min_col=1, max_col=1):
        if row[0].value and str(row[0].value).isupper():
            row[0].font = Font(bold=True)
    return workbook


def verify(path: Path) -> None:
    workbook = load_workbook(path, read_only=True)
    expected_names = [*SHEETS, "_panduan"]
    assert workbook.sheetnames == expected_names
    for name, spec in SHEETS.items():
        actual = [cell.value for cell in next(workbook[name].iter_rows(min_row=1, max_row=1))]
        assert actual == spec["headers"], f"Header {name} tidak sesuai: {actual}"
    workbook.close()


def main() -> None:
    build_workbook().save(OUTPUT)
    verify(OUTPUT)
    print(f"Template import Supabase dibuat: {OUTPUT}")


if __name__ == "__main__":
    main()
