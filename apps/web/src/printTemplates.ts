type SivItem = {
  id?: string;
  code?: string;
  description?: string;
  modelNumber?: string;
  serialNumber?: string;
  category?: { name?: string } | string;
  unit?: { name?: string; symbol?: string } | string;
  unitPrice?: number | string;
  unitCost?: number | string;
  grnLines?: Array<{ unitPrice?: number | string }>;
  stockBatches?: Array<{ unitCost?: number | string }>;
};

type SivLine = {
  itemId?: string;
  quantity?: number | string;
  issuedQuantity?: number | string;
  unitPrice?: number | string;
  batchNumber?: string;
  shelfCode?: string;
  binCode?: string;
  remarks?: string;
  item?: SivItem;
  storageLocation?: {
    locationCode?: string;
    shelfNumber?: string;
    binNumber?: string;
    store?: { name?: string; code?: string };
  };
};

export type SivPrintRecord = {
  id?: string;
  requestNumber?: string;
  status?: string;
  purpose?: string;
  recipientName?: string;
  createdAt?: string | Date;
  issuedAt?: string | Date;
  department?: { name?: string };
  requestedBy?: { fullName?: string; email?: string };
  voucher?: {
    id?: string;
    voucherNumber?: string;
    issuedAt?: string | Date;
    createdAt?: string | Date;
    issuedBy?: { fullName?: string };
    ledgerEntries?: Array<{
      itemId?: string;
      item?: { id?: string; description?: string; code?: string };
      quantity?: number | string;
      unitCost?: number | string;
      batchNumber?: string;
      shelfCode?: string;
      binCode?: string;
      storageLocation?: {
        locationCode?: string;
        shelfNumber?: string;
        binNumber?: string;
        store?: { name?: string; code?: string };
      };
    }>;
  };
  materialReceipt?: {
    receiptNumber?: string;
    receivedAt?: string | Date;
    receivedBy?: { fullName?: string };
    notes?: string;
  };
  lines?: SivLine[];
};

function escapeHtml(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateDisplay(value?: string | Date): { day: string; month: string; year: string; full: string } {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) {
    return { day: "—", month: "—", year: "—", full: "—" };
  }
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());
  return { day, month, year, full: `${day}/${month}/${year}` };
}

function fontClass(text: unknown): string {
  if (!text) return "en";
  const str = String(text);
  const hasEthiopic = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/.test(str);
  return hasEthiopic ? "am" : "en";
}

export function buildModel22PrintDocument(record: SivPrintRecord): string {
  const voucherNumber = record.voucher?.voucherNumber ?? record.requestNumber ?? "№511017";
  const departmentName = record.department?.name ?? "—";
  const requestNumber = record.requestNumber ?? "—";
  const purpose = record.purpose ?? departmentName;
  const recipientName =
    record.recipientName?.trim() ||
    record.materialReceipt?.receivedBy?.fullName?.trim() ||
    record.requestedBy?.fullName?.trim() ||
    "";
  const dateInfo = formatDateDisplay(record.voucher?.issuedAt ?? record.voucher?.createdAt ?? record.createdAt);

  const lines = record.lines ?? [];
  const primaryLine = lines[0];
  const primaryItem = primaryLine?.item;

  const expRegistryNo = "1";
  const incomingGoodsNo = primaryLine?.batchNumber ?? primaryItem?.code ?? "GRN-2026-001";
  const categoryNames = lines
    .map((l) => (typeof l.item?.category === "string" ? l.item.category : l.item?.category?.name))
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(", ") || "General Stock";

  const storeName =
    primaryLine?.storageLocation?.store?.name ??
    record.voucher?.ledgerEntries?.[0]?.storageLocation?.store?.name ??
    "Main Store";

  const shelfNo =
    primaryLine?.storageLocation?.shelfNumber ??
    primaryLine?.shelfCode ??
    record.voucher?.ledgerEntries?.[0]?.storageLocation?.shelfNumber ??
    record.voucher?.ledgerEntries?.[0]?.shelfCode ??
    "2";

  const outgoingGoodsNo = record.voucher?.voucherNumber ?? record.requestNumber ?? "SIV-001";

  let totalAmount = 0;
  const renderedRows: string[] = [];
  const TOTAL_FIXED_ROWS = 13;

  lines.forEach((line, idx) => {
    const item = line.item ?? {};
    const qty = Number(line.issuedQuantity ?? line.quantity ?? 1);

    // Resolve unit price from line, item, ledger entries, batches, or grn lines
    const matchingEntry = record.voucher?.ledgerEntries?.find(
      (e: any) =>
        (e.itemId && (e.itemId === line.itemId || e.itemId === item.id)) ||
        (e.item?.id && (e.item.id === line.itemId || e.item.id === item.id))
    );
    const ledgerUnitPrice = matchingEntry?.unitCost ? Number(matchingEntry.unitCost) : 0;
    const batchUnitPrice = item.stockBatches?.[0]?.unitCost ? Number(item.stockBatches[0].unitCost) : 0;
    const grnUnitPrice = item.grnLines?.[0]?.unitPrice ? Number(item.grnLines[0].unitPrice) : 0;
    const itemUnitPrice = item.unitPrice ? Number(item.unitPrice) : (item.unitCost ? Number(item.unitCost) : 0);
    const lineUnitPrice = line.unitPrice ? Number(line.unitPrice) : 0;

    const rawPrice = lineUnitPrice || itemUnitPrice || ledgerUnitPrice || batchUnitPrice || grnUnitPrice || 0;
    const unitPriceNum = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0;

    const lineTotal = qty * unitPriceNum;
    totalAmount += lineTotal;

    const unitBirr = Math.floor(unitPriceNum);
    const unitCents = Math.round((unitPriceNum - unitBirr) * 100);
    const totalBirr = Math.floor(lineTotal);
    const totalCents = Math.round((lineTotal - totalBirr) * 100);

    const desc = escapeHtml(item.description ?? item.code ?? "Item");
    const model = escapeHtml(item.modelNumber ?? "—");
    const serial = escapeHtml(item.serialNumber ?? line.batchNumber ?? "—");
    const seqFrom = "1";
    const seqTo = String(qty);
    const remarks = escapeHtml(line.remarks ?? item.code ?? "");

    renderedRows.push(`
      <tr>
        <td class="en">${idx + 1}</td>
        <td class="col-desc-cell ${fontClass(desc)}">${desc}</td>
        <td class="${fontClass(model)}">${model}</td>
        <td class="${fontClass(serial)}">${serial}</td>
        <td class="en">${seqFrom}</td>
        <td class="en">${seqTo}</td>
        <td class="en">${qty}</td>
        <td class="en">${unitPriceNum > 0 ? unitBirr : ""}</td>
        <td class="en">${unitPriceNum > 0 ? String(unitCents).padStart(2, "0") : ""}</td>
        <td class="en">${lineTotal > 0 ? totalBirr : ""}</td>
        <td class="en">${lineTotal > 0 ? String(totalCents).padStart(2, "0") : ""}</td>
        <td class="remarks-cell ${fontClass(remarks)}">${remarks}</td>
      </tr>
    `);
  });

  const emptyRowsCount = Math.max(0, TOTAL_FIXED_ROWS - lines.length);
  for (let i = 0; i < emptyRowsCount; i++) {
    renderedRows.push(`
      <tr>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td class="remarks-cell"></td>
      </tr>
    `);
  }

  const grandBirr = Math.floor(totalAmount);
  const grandCents = Math.round((totalAmount % 1) * 100);

  return `<!DOCTYPE html>
<html lang="am">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width,initial-scale=1" />
		<title>Model 22 — Receipt for Articles of Property Issued</title>
		<style>
			@page {
				size: A4 portrait;
				margin: 0;
			}
			* {
				box-sizing: border-box;
			}
			html,
			body {
				margin: 0;
				padding: 0;
				background: #fff;
				color: #000;
			}
			body {
				font-family: 'Times New Roman', 'Noto Ethiopic', 'Nyala', 'Abyssinica SIL', Georgia, serif;
				-webkit-print-color-adjust: exact;
				print-color-adjust: exact;
				-webkit-font-smoothing: antialiased;
			}
			.page {
				width: 210mm;
				min-height: 297mm;
				margin: 0 auto;
				background: #fff;
				overflow: hidden;
				padding: 5.5mm 7.5mm 4.5mm;
			}
			.am {
				font-family: 'Noto Ethiopic', 'Nyala', 'Abyssinica SIL', sans-serif;
			}
			.en {
				font-family: 'Times New Roman', Georgia, serif;
			}
			.top {
				display: grid;
				grid-template-columns: 47.5% 52.5%;
				min-height: 51mm;
			}
			.left-head {
				position: relative;
				text-align: center;
				padding-top: 0;
			}
			.model {
				position: absolute;
				left: 0;
				top: -1mm;
				text-align: left;
				line-height: 1.02;
				font-size: 10px;
			}
			.model .am {
				font-size: 10px;
			}
			.model .en {
				font-size: 10px;
			}
			.logo {
				width: 18mm;
				height: 18mm;
				display: block;
				margin: 0 auto 1.2mm;
			}
			.gov-am {
				font-weight: 700;
				font-size: 10.8px;
				line-height: 1.05;
			}
			.gov-en {
				font-weight: 700;
				font-size: 10.8px;
				line-height: 1.02;
				margin-top: 0.7mm;
			}
			.ministry-am {
				font-weight: 700;
				font-size: 10.8px;
				line-height: 1;
				margin-top: 2.5mm;
			}
			.ministry-en {
				font-weight: 700;
				font-size: 10.5px;
				line-height: 1;
				margin-top: 0.7mm;
			}
			.dept {
				position: absolute;
				left: 0;
				right: 2mm;
				bottom: 0;
				height: 14mm;
				text-align: left;
			}
			.dept .line {
				height: 7mm;
				border-bottom: 1px solid #000;
				width: 82%;
				font-size: 11px;
				font-weight: 400;
				padding-left: 1.5mm;
				padding-bottom: 0.3mm;
				display: flex;
				align-items: flex-end;
				text-decoration: none;
				color: #000;
			}
			.dept .label {
				font-family: 'Times New Roman', serif;
				font-size: 11px;
				text-align: right;
				padding-right: 0;
				margin-top: -1px;
			}
			.right-head {
				position: relative;
				padding-left: 4mm;
			}
			.serial-label {
				position: absolute;
				top: -1mm;
				left: 7mm;
				line-height: 1.02;
			}
			.serial-label .am {
				font-size: 10px;
			}
			.serial-label .en {
				font-size: 10px;
			}
			.serial-no {
				position: absolute;
				top: -1mm;
				right: 0;
				font-family: 'Times New Roman', Georgia, serif;
				font-size: 15px;
				font-weight: 700;
				color: #000;
			}
			.fields {
				padding-top: 8mm;
			}
			.field {
				display: grid;
				grid-template-columns: 5mm 1fr;
				min-height: 6.1mm;
				font-size: 9.2px;
				line-height: 1.02;
			}
			.field .num {
				font-family: 'Times New Roman', Georgia, serif;
				font-size: 10px;
				font-weight: 700;
			}
			.field .amline {
				white-space: nowrap;
				display: flex;
				align-items: flex-end;
				gap: 1mm;
				font-size: 9.2px;
			}
			.field .fill {
				height: 3.8mm;
				border-bottom: 1px solid #000;
				flex: 1;
				min-width: 18mm;
				padding-left: 2mm;
				padding-bottom: 0.2mm;
				font-size: 9.2px;
				font-weight: 400;
				line-height: 1;
				display: inline-flex;
				align-items: flex-end;
				text-decoration: none;
				color: #000;
			}
			.field .en {
				font-size: 8.7px;
				margin-top: 0.5mm;
				font-family: 'Times New Roman', Georgia, serif;
				font-weight: 400;
			}
			.title {
				text-align: center;
				margin-top: 1.8mm;
				margin-bottom: 2.2mm;
			}
			.title .am {
				font-size: 16px;
				font-weight: 700;
				line-height: 1.05;
			}
			.title .en {
				font-size: 13px;
				font-weight: 700;
				line-height: 1.05;
				margin-top: 1mm;
			}
			.cert {
				font-size: 10.7px;
				line-height: 1.1;
				margin-bottom: 1.6mm;
			}
			.cert-row {
				display: flex;
				align-items: flex-end;
				justify-content: center;
				gap: 1mm;
				white-space: nowrap;
				margin-bottom: 1.1mm;
				font-size: 10.7px;
			}
			.cert-row .am {
				font-size: 10.7px;
			}
			.cert-row .en {
				font-size: 10px;
				font-family: 'Times New Roman', Georgia, serif;
			}
			.blank {
				display: inline-block;
				height: 4.3mm;
				border-bottom: 1px solid #000;
				vertical-align: bottom;
				text-align: center;
				font-size: 10px;
				font-weight: 400;
				padding: 0 1mm;
				padding-bottom: 0.2mm;
				line-height: 1;
				text-decoration: none;
				color: #000;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
			.b1 {
				width: 18mm;
			}
			.b2 {
				width: 27mm;
			}
			.b3 {
				width: 36mm;
			}
			.b4 {
				width: 43mm;
			}
			.b5 {
				width: 55mm;
			}
			.cert .final {
				font-size: 10.8px;
			}
			.items {
				width: 100%;
				border-collapse: collapse;
				table-layout: fixed;
				border: 1.15px solid #000;
				font-size: 8.2px;
				font-family: 'Times New Roman', Georgia, serif;
			}
			.items th,
			.items td {
				border: 1px solid #000;
				color: #000;
				padding: 0 1.2mm;
				text-align: center;
				vertical-align: middle;
				text-decoration: none;
			}
			.items thead th {
				height: 24mm;
				font-weight: 700;
				line-height: 1.02;
			}
			.items thead .am {
				font-size: 8.8px;
			}
			.items thead .en {
				font-size: 8.6px;
				font-weight: 400;
			}
			.items tbody td {
				height: 7.05mm;
				font-family: 'Times New Roman', Georgia, serif;
				font-size: 8.6px;
				font-weight: 400;
				color: #000;
				line-height: 1.1;
			}
			.items tbody td.col-desc-cell {
				text-align: left;
				padding-left: 2mm;
			}
			.items tbody td.am,
			.items tbody .am {
				font-family: 'Noto Ethiopic', 'Nyala', 'Abyssinica SIL', sans-serif;
				font-size: 8.8px;
				font-weight: 400;
			}
			.items tbody td.en,
			.items tbody .en {
				font-family: 'Times New Roman', Georgia, serif;
				font-size: 8.6px;
				font-weight: 400;
			}
			.items .nested {
				padding: 0 !important;
			}
			.items .nested .head {
				height: 11mm;
				display: flex;
				align-items: center;
				justify-content: center;
				border-bottom: 1px solid #000;
			}
			.items .nested .sub {
				display: grid;
				grid-template-columns: 1fr 1fr;
				height: 13mm;
			}
			.items .nested .sub > div {
				display: flex;
				align-items: center;
				justify-content: center;
			}
			.items .nested .sub > div + div {
				border-left: 1px solid #000;
			}
			.items .price .head {
				height: 11mm;
				border-bottom: 1px solid #000;
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
			}
			.items .price .sub {
				height: 13mm;
				display: grid;
				grid-template-columns: 1.6fr 1fr;
			}
			.items .price .sub > div {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
			}
			.items .price .sub > div + div {
				border-left: 1px solid #000;
			}
			.vertical {
				writing-mode: vertical-rl;
				transform: rotate(180deg);
				white-space: nowrap;
			}
			.col-serial {
				width: 6.4%;
			}
			.col-desc {
				width: 25.8%;
			}
			.col-model {
				width: 4.9%;
			}
			.col-serial2 {
				width: 6.2%;
			}
			.col-seq {
				width: 10.8%;
			}
			.col-qty {
				width: 7.5%;
			}
			.col-unit-birr {
				width: 6.6%;
			}
			.col-unit-c {
				width: 3.7%;
			}
			.col-total-birr {
				width: 6.6%;
			}
			.col-total-c {
				width: 3.7%;
			}
			.col-remarks {
				width: 17.8%;
			}
			.items tbody .remarks-cell {
				border-left: 1px solid #000;
				border-right: 1px solid #000;
			}
			.total-row td {
				height: 10mm !important;
			}
			.total-label {
				text-align: right !important;
				padding-right: 3mm !important;
				font-weight: 700;
			}
			.total-label .am {
				display: block;
				font-size: 9px;
			}
			.total-label .en {
				display: block;
				font-size: 8.5px;
				font-weight: 400;
			}
			.signatures {
				display: grid;
				grid-template-columns: 1fr 1fr;
				column-gap: 26mm;
				margin-top: 4mm;
				height: 17mm;
			}
			.sig {
				text-align: center;
				font-size: 10px;
			}
			.sig .line {
				height: 6.5mm;
				border-bottom: 1px solid #000;
			}
			.sig .am {
				font-size: 10px;
				margin-top: 1mm;
			}
			.sig .en {
				font-size: 9.5px;
			}
			.footnotes {
				margin-top: 3.5mm;
				font-size: 9.7px;
				line-height: 1.36;
				text-align: justify;
			}
			.footnotes p {
				margin: 0 0 2.5mm;
			}
			.footnotes .label {
				font-weight: 700;
			}
			@media screen {
				.page {
					box-shadow: 0 0 0 1px #ddd;
				}
			}
			@media print {
				.page {
					box-shadow: none;
					margin: 0;
				}
			}
		</style>
	</head>
	<body>
		<main class="page">
			<section class="top">
				<div class="left-head">
					<div class="model">
						<div class="am">ሞዴል 22</div>
						<div class="en">Model 22</div>
					</div>
					<!-- Color version of the Ethiopian emblem, embedded directly in the HTML. -->
					<svg
						class="logo"
						viewBox="0 0 610 610"
						xmlns="http://www.w3.org/2000/svg"
						aria-label="Emblem of Ethiopia"
					>
						<circle cx="305" cy="305" r="300" fill="#0f47af" />
						<g id="h" fill="#fcdd09">
							<path
								id="g"
								d="m305,65 53.6,165h128l-27.5,20h-185l6.5-20h57l-43.2-133M366,213.5l76.4-104.6 8,6.1-76.6,104.6"
							/>
							<use href="#g" transform="rotate(72 305 305)" />
							<use href="#g" transform="rotate(144 305 305)" />
						</g>
						<use href="#h" transform="rotate(216 305 305)" />
					</svg>
					<div class="gov-am am">የኢትዮጵያ ፌደራላዊ ዲሞክራሲያዊ ሪፐብሊክ</div>
					<div class="gov-en en">
						THE FEDERAL DEMOCRATIC REPUBLIC<br />OF ETHIOPIA
					</div>
					<div class="ministry-am am">ገንዘብ ሚኒስቴር</div>
					<div class="ministry-en en">Ministry of Finance</div>
					<div class="dept">
						<div class="line ${fontClass(departmentName)}">${escapeHtml(departmentName)}</div>
						<div class="label">Department</div>
					</div>
				</div>
				<div class="right-head">
					<div class="serial-label">
						<div class="am">ሲሪ ለ/2ኛ</div>
						<div class="en">Serial/ B-2<sup>nd</sup></div>
					</div>
					<div class="serial-no">${escapeHtml(voucherNumber)}</div>
					<div class="fields">
						<div class="field">
							<span class="num">1.</span>
							<div>
								<div class="amline am">
									የዕቃ ወጪ፣ መዝገብ የተጻፈበት ተራ ቁጥር<span class="fill ${fontClass(expRegistryNo)}">${escapeHtml(expRegistryNo)}</span>
								</div>
								<div class="en">Item No. in Expenditure Registry</div>
							</div>
						</div>
						<div class="field">
							<span class="num">2.</span>
							<div>
								<div class="amline am">
									ዕቃ ገቢ፣ መዝገብ የገባበት ቁጥር<span class="fill ${fontClass(incomingGoodsNo)}">${escapeHtml(incomingGoodsNo)}</span>
								</div>
								<div class="en">
									No. of entry in the register of incoming goods
								</div>
							</div>
						</div>
						<div class="field">
							<span class="num">3.</span>
							<div>
								<div class="amline am">
									ዕቃው የተመደበበት መደብ<span class="fill ${fontClass(categoryNames)}">${escapeHtml(categoryNames)}</span>
								</div>
								<div class="en">Classification of Stock</div>
							</div>
						</div>
						<div class="field">
							<span class="num">4.</span>
							<div>
								<div class="amline am">
									ዕቃው የተመዘገበበት መጋዘን ቁጥር<span class="fill ${fontClass(storeName)}">${escapeHtml(storeName)}</span>
								</div>
								<div class="en">Store No.</div>
							</div>
						</div>
						<div class="field">
							<span class="num">5.</span>
							<div>
								<div class="amline am">
									የመደርደሪያው ቁጥር<span class="fill ${fontClass(shelfNo)}">${escapeHtml(shelfNo)}</span>
								</div>
								<div class="en">Shelf No.</div>
							</div>
						</div>
						<div class="field">
							<span class="num">6.</span>
							<div>
								<div class="amline am">
									በዕቃው ወጪ፣ መዝገብ የተጻፈበት ቁጥር<span class="fill ${fontClass(outgoingGoodsNo)}">${escapeHtml(outgoingGoodsNo)}</span>
								</div>
								<div class="en">
									No. of entry in the register of outgoing goods
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section class="title">
				<div class="am">የዕቃ ወይም የንብረት ወጪ ደረሰኝ</div>
				<div class="en">RECEIPT FOR ARTICLES OF PROPERTY ISSUED</div>
			</section>

			<section class="cert">
				<div class="cert-row">
					<span class="am">እኔ</span><span class="blank b3 ${fontClass(recipientName)}">${escapeHtml(recipientName)}</span
					><span class="am">ቀን</span><span class="blank b1 en">${escapeHtml(dateInfo.day + "/" + dateInfo.month)}</span
					><span class="am">ዓ.ም.</span
					><span class="en">In accordance with the</span
					><span class="blank b2 ${fontClass(purpose)}">${escapeHtml(purpose)}</span><span class="en">order No.</span
					><span class="blank b2 en">${escapeHtml(requestNumber)}</span><span class="en">dated of</span>
				</div>
				<div class="cert-row">
					<span class="am">በተጻፈው ትዕዛዝ መሠረት ቀጥሎ በዝርዝር የተጻፉትን ዕቃዎች ለ</span
					><span class="blank b4 ${fontClass(departmentName)}">${escapeHtml(departmentName)}</span><span class="am">አገልግሎት በትክክል</span>
				</div>
				<div class="cert-row">
					<span class="en">20</span><span class="blank b1 en">${escapeHtml(dateInfo.year.slice(-2))}</span>
					<span class="en"
						>here by certify that I have counted correctly and received the
						articles enumerated below for the use of</span
					>
				</div>
				<div class="final">
					<span class="am">ቆጥሬ መረከቤን በፊርማዬ አረጋግጣለሁ፡፡</span>
				</div>
			</section>

			<table class="items">
				<thead>
					<tr>
						<th class="col-serial">
							<div class="am">ተራ<br />ቁጥር</div>
							<div class="en">Serial<br />No.</div>
						</th>
						<th class="col-desc">
							<div class="am">የዕቃው ወይም የንብረቱ ዓይነት ዝርዝር</div>
							<div class="en">
								Detailed Description of Articles<br />or property
							</div>
						</th>
						<th class="col-model"><div class="vertical am">ሞዴል Model</div></th>
						<th class="col-serial2">
							<div class="am">ሲሪ</div>
							<div class="en">Serial</div>
						</th>
						<th class="col-seq nested" colspan="2">
							<div class="head am">ተከታታይ</div>
							<div class="sub">
								<div class="am">ከ</div>
								<div class="am">እስከ</div>
							</div>
						</th>
						<th class="col-qty">
							<div class="am">ብዛት</div>
							<div class="en">Quantity</div>
						</th>
						<th class="col-unit-birr price" colspan="2">
							<div class="head">
								<div class="am">የአንዱ ዋጋ</div>
								<div class="en">Unit Price</div>
							</div>
							<div class="sub">
								<div>
									<span class="am">ብር</span><span class="en">Birr</span>
								</div>
								<div><span class="am">ሳ.</span><span class="en">C.</span></div>
							</div>
						</th>
						<th class="col-total-birr price" colspan="2">
							<div class="head">
								<div class="am">የዋጋ ድምር</div>
								<div class="en">Total Price</div>
							</div>
							<div class="sub">
								<div>
									<span class="am">ብር</span><span class="en">Birr</span>
								</div>
								<div><span class="am">ሳ.</span><span class="en">C.</span></div>
							</div>
						</th>
						<th class="col-remarks">
							<div class="am">ምርመራ</div>
							<div class="en">Remarks</div>
						</th>
					</tr>
				</thead>
				<tbody>
					${renderedRows.join("\n")}
					<tr class="total-row">
						<td colspan="8" class="total-label">
							<span class="am">ድምር</span><span class="en">Total</span>
						</td>
						<td class="en">${totalAmount > 0 ? grandBirr : ""}</td>
						<td class="en">${totalAmount > 0 ? String(grandCents).padStart(2, "0") : ""}</td>
						<td></td>
						<td class="remarks-cell"></td>
					</tr>
				</tbody>
			</table>

			<section class="signatures">
				<div class="sig">
					<div class="line"></div>
					<div class="am">የግምጃ ቤት ፈርማ</div>
					<div class="en">Store Keeper's Signature</div>
				</div>
				<div class="sig">
					<div class="line"></div>
					<div class="am">የተቀባዩ ፈርማ</div>
					<div class="en">Recipient's Signature</div>
				</div>
			</section>

			<section class="footnotes">
				<p>
					<span class="label am">መልክፅ፦</span> ይህ ካርኒ በ፫ ኮፒ ሆኖ በካርበን ይሠራል፡፡ ከነዚሁም
					ሁለቱ ተጉራጅ ሆነው ፩ኛው በክፍሉ መሥሪያ ቤት ሂሳብ ቤት አማካይነት የገንዘብ ሚኒስቴር ጠቅላይ ሂሳብ ቤት
					ለዕቃ መቆጣጠሪያ ክፍል ይተላለፋል፡፡ ፪ኛው ለዕቃ ወጪ መዝገብ ማስተካከያ ሰነድ እንዲሆነው ለክፍሉ ሂሳብ ቤት
					ይሰጠዋል፡፡ ፫ኛው ኮፒ ሳይግረድ እንዳለ ሆኖ የዕቃ ግምጃ ቤት ዕቃውን በትዕዛዝ ያወጣው መሆኑን ለመርማሪ
					ለማስረዳት እንዲችል ከማዘጋጀው ጋር በሙሉ አያይዞ እንዲኖር ያደርጋል፡፡
				</p>
				<p>
					<span class="label am">ማስታወሻ፦</span> መያዣው አንድ ዓይነት ለሆነና ተቀያየው አንድ ሰው
					ብቻ ለሆነ ልዩ ልዩ ዕቃዎች እንድ እንድ ቅጠል ይበቃል፡፡ መያዣው ሲለያይ ግን ለየራሳቸው እንዳንድ ደረሰኝ
					ሊጻፍላቸው ይችላል፡፡ ይኸውም በየመደቡ እየለዩ ለማኖር እንዲመች ነው፡፡ በዋጋው ድምር መጻፊያ ዐምድ ውስጥ
					የተመለከተው በውርስ ወይም በሌላ ምክንያት የተገኘ ዕቃ ወይም ንብረት የሆነ እንደሆነ ዋጋው በእክስፐርት ተገምቶ
					ግምቱ በዋጋው ዐምድ ውስጥ ይገባል፡፡
				</p>
			</section>
		</main>
	</body>
</html>`;
}

export function buildSivPrintDocument(record: SivPrintRecord): string {
  return buildModel22PrintDocument(record);
}

export type GrnLine = {
  id?: string;
  itemId?: string;
  quantityReceived?: number | string;
  unitPrice?: number | string;
  batchNumber?: string;
  expiryDate?: string | Date;
  remarks?: string;
  fundingSource?: { name?: string };
  inspection?: {
    outcome?: string;
    qualityStatus?: string;
    quantityAccepted?: number | string;
    quantityRejected?: number | string;
    storeLocationId?: string;
    shelfCode?: string;
    binCode?: string;
    inspectedBy?: { fullName?: string };
  };
  item?: {
    id?: string;
    code?: string;
    description?: string;
    modelNumber?: string;
    serialNumber?: string;
    category?: { name?: string } | string;
    unit?: { name?: string; symbol?: string } | string;
    defaultLocation?: { name?: string; code?: string };
  };
  stockBatches?: Array<{
    batchNumber?: string;
    locationBalances?: Array<{
      storageLocation?: {
        shelfNumber?: string;
        binNumber?: string;
        store?: { name?: string; code?: string };
      };
    }>;
  }>;
};

export type GrnPrintRecord = {
  id?: string;
  grnNumber?: string;
  sourceType?: string;
  purchaseOrderRef?: string;
  donationLetterRef?: string;
  governmentAllocationRef?: string;
  projectSupportRef?: string;
  deliveryNoteRef?: string;
  supplierDonor?: {
    id?: string;
    name?: string;
    type?: string;
    contact?: string;
  };
  receivedAt?: string | Date;
  createdAt?: string | Date;
  createdById?: string;
  createdBy?: { fullName?: string };
  receivedBy?: { fullName?: string };
  status?: string;
  remarks?: string;
  department?: { name?: string };
  lines?: GrnLine[];
};

export function buildModel19PrintDocument(record: GrnPrintRecord): string {
  const grnNumber = record.grnNumber ?? "GRN-2026-001";
  const departmentName = record.department?.name ?? "Federal Ministry of Health";
  const supplierName =
    record.supplierDonor?.name ??
    record.purchaseOrderRef ??
    record.donationLetterRef ??
    record.governmentAllocationRef ??
    "Supplier / Donor";
  const receiverName =
    record.receivedBy?.fullName ??
    record.createdBy?.fullName ??
    "Central Storekeeper";
  const dateInfo = formatDateDisplay(record.receivedAt ?? record.createdAt);

  const lines = record.lines ?? [];
  const primaryLine = lines[0];
  const primaryItem = primaryLine?.item;

  const expRegistryNo = "1";
  const incomingGoodsNo = primaryLine?.batchNumber ?? primaryItem?.code ?? grnNumber;
  const categoryNames =
    lines
      .map((l) => (typeof l.item?.category === "string" ? l.item.category : l.item?.category?.name))
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(", ") || "General Stock";

  const storeName =
    primaryLine?.stockBatches?.[0]?.locationBalances?.[0]?.storageLocation?.store?.name ??
    primaryItem?.defaultLocation?.name ??
    "Main Store";

  const shelfNo =
    primaryLine?.inspection?.shelfCode ??
    primaryLine?.stockBatches?.[0]?.locationBalances?.[0]?.storageLocation?.shelfNumber ??
    "A1";

  let totalAmount = 0;
  const renderedRows: string[] = [];
  const TOTAL_FIXED_ROWS = 19;

  lines.forEach((line, idx) => {
    const item = line.item ?? {};
    const qty = Number(line.quantityReceived ?? 1);
    const unitPriceNum = Number(line.unitPrice ?? 0);
    const lineTotal = qty * unitPriceNum;
    totalAmount += lineTotal;

    const unitBirr = Math.floor(unitPriceNum);
    const unitCents = Math.round((unitPriceNum - unitBirr) * 100);
    const totalBirr = Math.floor(lineTotal);
    const totalCents = Math.round((lineTotal - totalBirr) * 100);

    const desc = escapeHtml(item.description ?? item.code ?? "Item");
    const model = escapeHtml(item.modelNumber ?? "—");
    const serial = escapeHtml(line.batchNumber ?? item.serialNumber ?? "—");
    const pageFrom = "1";
    const pageTo = String(qty);

    renderedRows.push(`
      <tr>
        <td class="en">${idx + 1}</td>
        <td class="col-desc-cell ${fontClass(desc)}">${desc}</td>
        <td class="${fontClass(model)}">${model}</td>
        <td class="${fontClass(serial)}">${serial}</td>
        <td class="en">${pageFrom}</td>
        <td class="en">${pageTo}</td>
        <td class="en">${qty}</td>
        <td class="en">${unitPriceNum > 0 ? unitBirr : ""}</td>
        <td class="en">${unitPriceNum > 0 ? String(unitCents).padStart(2, "0") : ""}</td>
        <td class="en">${lineTotal > 0 ? totalBirr : ""}</td>
        <td class="en">${lineTotal > 0 ? String(totalCents).padStart(2, "0") : ""}</td>
      </tr>
    `);
  });

  const emptyRowsCount = Math.max(0, TOTAL_FIXED_ROWS - lines.length);
  for (let i = 0; i < emptyRowsCount; i++) {
    renderedRows.push(`
      <tr>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
      </tr>
    `);
  }

  const grandBirr = Math.floor(totalAmount);
  const grandCents = Math.round((totalAmount - grandBirr) * 100);

  return `<!DOCTYPE html>
<html lang="am">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width,initial-scale=1" />
		<title>Model 19 — Receipt for Articles or Property Received</title>
		<style>
			@page {
				size: A4 portrait;
				margin: 0;
			}
			* {
				box-sizing: border-box;
			}
			html,
			body {
				margin: 0;
				padding: 0;
				background: #fff;
				color: #000;
			}
			body {
				font-family: 'Times New Roman', 'Noto Ethiopic', 'Nyala', 'Abyssinica SIL', Georgia, serif;
				-webkit-print-color-adjust: exact;
				print-color-adjust: exact;
				-webkit-font-smoothing: antialiased;
			}
			.sheet {
				width: 210mm;
				min-height: 297mm;
				margin: 0 auto;
				background: #fff;
				padding: 7.5mm 8.5mm 6mm;
				overflow: hidden;
			}
			.am {
				font-family: 'Noto Sans Ethiopic', 'Noto Ethiopic', 'Nyala', 'Abyssinica SIL', sans-serif;
			}
			.en {
				font-family: 'Times New Roman', Georgia, serif;
			}
			.top {
				display: grid;
				grid-template-columns: 46% 54%;
				position: relative;
				min-height: 42mm;
			}
			.left-head {
				position: relative;
				font-weight: 700;
				font-size: 10.5pt;
				line-height: 1.12;
			}
			.model {
				font-size: 10pt;
				line-height: 1.05;
				margin-bottom: 4mm;
				text-align: left;
			}
			.logo {
				position: absolute;
				left: 37mm;
				top: 0;
				width: 17mm;
				height: 17mm;
			}
			.ministry {
				text-align: center;
				margin-top: 10.5mm;
				font-size: 10.5pt;
				line-height: 1.12;
			}
			.ministry .eng {
				font-size: 10.7pt;
				font-family: 'Times New Roman', Georgia, serif;
			}
			.right-head {
				font-size: 8.2pt;
				font-weight: 700;
				line-height: 1.13;
				padding-left: 5mm;
			}
			.serial {
				text-align: center;
				font-size: 9pt;
				line-height: 1.1;
				margin-bottom: 2.5mm;
			}
			.field {
				min-height: 7mm;
				white-space: nowrap;
				font-size: 8.2pt;
				display: flex;
				flex-direction: column;
				justify-content: flex-end;
			}
			.field .amline {
				display: flex;
				align-items: flex-end;
				white-space: nowrap;
				gap: 1mm;
			}
			.field .line {
				display: inline-block;
				border-bottom: 1px solid #000;
				height: 3.5mm;
				vertical-align: bottom;
				flex: 1;
				min-width: 18mm;
				font-family: 'Times New Roman', Georgia, serif;
				font-size: 8.8pt;
				font-weight: 400;
				padding-left: 1.5mm;
				padding-bottom: 0.2mm;
				line-height: 1;
				color: #000;
			}
			.field .enline {
				font-size: 7.8pt;
				font-family: 'Times New Roman', Georgia, serif;
				font-weight: 400;
				margin-top: 0.3mm;
			}
			.dept {
				font-weight: 700;
				font-size: 10pt;
				margin-top: 1mm;
				display: flex;
				align-items: flex-end;
				gap: 2mm;
			}
			.dept .line {
				width: 68mm;
				border-bottom: 1.2px solid #000;
				height: 4.5mm;
				font-family: 'Times New Roman', Georgia, serif;
				font-size: 10pt;
				font-weight: 400;
				padding-left: 1.5mm;
				padding-bottom: 0.2mm;
				line-height: 1;
				color: #000;
			}
			.title {
				text-align: center;
				font-weight: 800;
				margin-top: 2.5mm;
				line-height: 1.05;
				position: relative;
			}
			.title .am {
				font-size: 11.5pt;
				font-weight: 700;
			}
			.title .en {
				font-size: 13pt;
				font-family: 'Times New Roman', Georgia, serif;
				font-weight: 700;
				text-decoration: underline;
				margin-top: 0.5mm;
			}
			.title .no {
				position: absolute;
				right: 3mm;
				top: 4.5mm;
				font-size: 10pt;
				font-weight: 700;
				font-family: 'Times New Roman', Georgia, serif;
				text-decoration: none;
				color: #000;
			}
			.received {
				font-weight: 700;
				font-size: 9.2pt;
				line-height: 1.08;
				margin-top: 2.5mm;
			}
			.rline {
				display: flex;
				align-items: flex-end;
				min-height: 5.2mm;
				white-space: nowrap;
			}
			.rline .under {
				border-bottom: 1px solid #000;
				height: 4mm;
				margin: 0 2mm;
				font-family: 'Times New Roman', Georgia, serif;
				font-size: 9.5pt;
				font-weight: 400;
				text-align: center;
				padding: 0 1mm;
				padding-bottom: 0.2mm;
				line-height: 1;
				color: #000;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
			.name-line .under {
				width: 69mm;
			}
			.name-line .after {
				margin-left: 1mm;
			}
			.eng-line .under {
				width: 61mm;
			}
			.date-line {
				gap: 1mm;
			}
			.date-line .u1 {
				width: 27mm;
			}
			.date-line .u2 {
				width: 19mm;
			}
			.date-line .u3 {
				width: 58mm;
			}
			.form-table {
				width: 100%;
				border-collapse: collapse;
				table-layout: fixed;
				margin-top: 1.8mm;
				font-size: 7.6pt;
				font-weight: 700;
				line-height: 1.02;
				text-align: center;
				font-family: 'Times New Roman', Georgia, serif;
			}
			.form-table th,
			.form-table td {
				border: 1.15px solid #000;
				padding: 1px 1.2px;
				color: #000;
				text-decoration: none;
			}
			.form-table thead th {
				vertical-align: middle;
				font-weight: 700;
			}
			.form-table thead tr:first-child th {
				height: 12mm;
			}
			.form-table thead tr:nth-child(2) th {
				height: 7.3mm;
			}
			.form-table tbody td {
				height: 5.7mm;
				font-family: 'Times New Roman', Georgia, serif;
				font-size: 8pt;
				font-weight: 400;
				line-height: 1.1;
				color: #000;
			}
			.form-table tbody td.col-desc-cell {
				text-align: left;
				padding-left: 1.5mm;
			}
			.form-table tbody td.am,
			.form-table tbody td .am {
				font-family: 'Noto Sans Ethiopic', 'Noto Ethiopic', 'Nyala', 'Abyssinica SIL', sans-serif;
				font-size: 8pt;
			}
			.form-table tbody td.en,
			.form-table tbody td .en {
				font-family: 'Times New Roman', Georgia, serif;
				font-size: 8pt;
			}
			.form-table .serialcol {
				width: 7%;
			}
			.form-table .desc {
				width: 29%;
			}
			.form-table .modelcol {
				width: 8%;
			}
			.form-table .serie {
				width: 7%;
			}
			.form-table .page {
				width: 14%;
			}
			.form-table .qty {
				width: 9%;
			}
			.form-table .unit {
				width: 12%;
			}
			.form-table .total {
				width: 14%;
			}
			.total-row td {
				height: 11.5mm !important;
			}
			.total-label {
				border: 1.15px solid #000 !important;
				text-align: right;
				font-size: 9.5pt;
				font-weight: 700;
				padding-right: 2.5mm !important;
			}
			.signatures {
				display: flex;
				justify-content: space-between;
				margin-top: 6mm;
				font-weight: 700;
				font-size: 9.5pt;
			}
			.sig {
				width: 42%;
			}
			.sig.right {
				text-align: center;
			}
			.sig-title {
				margin-bottom: 6mm;
				line-height: 1.08;
			}
			.sig-line {
				width: 40mm;
				border-bottom: 1.2px solid #000;
			}
			.right .sig-line {
				width: 50mm;
				margin-left: auto;
			}
			.note {
				font-size: 7.3pt;
				font-weight: 400;
				line-height: 1.25;
				text-align: justify;
				margin-top: 4mm;
				font-family: 'Noto Sans Ethiopic', 'Noto Ethiopic', 'Nyala', 'Abyssinica SIL', sans-serif;
			}
			.note .label {
				font-weight: 700;
			}
			.page-no {
				float: right;
				margin-top: 2mm;
				white-space: nowrap;
				font-family: 'Times New Roman', Georgia, serif;
				font-weight: 700;
			}
			@media screen and (max-width: 900px) {
				.sheet {
					transform-origin: top left;
					margin: 0 auto;
				}
				.top {
					grid-template-columns: 46% 54%;
				}
			}
			@media print {
				body {
					background: #fff;
				}
				.sheet {
					margin: 0;
					width: 210mm;
					min-height: 297mm;
				}
			}
		</style>
	</head>
	<body>
		<main class="sheet">
			<section class="top">
				<div class="left-head">
					<div class="model">ሞዴል 19<br />Model 19</div>
					<svg
						class="logo"
						viewBox="0 0 610 610"
						xmlns="http://www.w3.org/2000/svg"
						aria-label="Emblem of Ethiopia"
					>
						<circle cx="305" cy="305" r="300" fill="#0f47af" />
						<g id="h" fill="#fcdd09">
							<path
								id="g"
								d="m305,65 53.6,165h128l-27.5,20h-185l6.5-20h57l-43.2-133M366,213.5l76.4-104.6 8,6.1-76.6,104.6"
							/>
							<use href="#g" transform="rotate(72 305 305)" />
							<use href="#g" transform="rotate(144 305 305)" />
						</g>
						<use href="#h" transform="rotate(216 305 305)" />
					</svg>
					<div class="ministry">
						<div class="am">የኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ</div>
						<div class="eng en">THE FEDERAL DEMOCRATIC REPUBLIC<br />OF ETHIOPIA</div>
						<div class="am">የገንዘብ ሚኒስቴር</div>
						<div class="eng en">MINISTRY OF FINANCE</div>
					</div>
				</div>
				<div class="right-head">
					<div class="serial">ሴሪ 10/14ኛ<br /><span class="en">Serial A/14<sup>th</sup></span></div>
					<div class="field">
						<div class="amline am">
							1. የወጪ ምዝገባ ውስጥ የእቃው ቁጥር&nbsp;<span class="line ${fontClass(expRegistryNo)}">${escapeHtml(expRegistryNo)}</span>
						</div>
						<div class="enline en">Item No. in Expenditure Registry</div>
					</div>
					<div class="field">
						<div class="amline am">
							2. በመጪያ እቃዎች መዝገብ ቁጥር&nbsp;<span class="line ${fontClass(incomingGoodsNo)}">${escapeHtml(incomingGoodsNo)}</span>
						</div>
						<div class="enline en">No. of entry in the register of incoming goods</div>
					</div>
					<div class="field">
						<div class="amline am">
							3. የእቃው የክፍል መደብ&nbsp;<span class="line ${fontClass(categoryNames)}">${escapeHtml(categoryNames)}</span>
						</div>
						<div class="enline en">Classification of stock</div>
					</div>
					<div class="field">
						<div class="amline am">
							4. የመደብሩ ቁጥር&nbsp;<span class="line ${fontClass(storeName)}">${escapeHtml(storeName)}</span>
						</div>
						<div class="enline en">Store No.</div>
					</div>
					<div class="field">
						<div class="amline am">
							5. መደርደሪያ ቁጥር&nbsp;<span class="line ${fontClass(shelfNo)}">${escapeHtml(shelfNo)}</span>
						</div>
						<div class="enline en">Shelf No.</div>
					</div>
				</div>
			</section>

			<div class="dept">
				<span class="am">የ</span><span class="line ${fontClass(departmentName)}">${escapeHtml(departmentName)}</span><span class="en">Department</span>
			</div>

			<div class="title">
				<div class="am">የዕቃ ወይም የንብረት ገቢ ደረሰኝ</div>
				<div class="en">RECEIPT FOR ARTICLES OR PROPERTY RECEIVED</div>
				<span class="no en">№&nbsp; ${escapeHtml(grnNumber)}</span>
			</div>

			<div class="received">
				<div class="rline name-line">
					<span class="am">ስም</span><span class="under ${fontClass(receiverName)}">${escapeHtml(receiverName)}</span><span class="after am">ከዚህ በታች በዝርዝር የተመለከተውን</span>
				</div>
				<div class="rline eng-line">
					<span class="en">Name</span>&nbsp;<span class="after en">Received the following</span>
				</div>
				<div class="rline date-line">
					<span class="en">This</span><span class="under u1 en">${escapeHtml(dateInfo.day + "/" + dateInfo.month)}</span><span class="en">Day 20</span><span class="under u2 en">${escapeHtml(dateInfo.year.slice(-2))}</span><span class="am">ከ</span><span class="en">From</span><span class="under u3 ${fontClass(supplierName)}">${escapeHtml(supplierName)}</span><span class="am">ተቀብያለሁ።</span>
				</div>
			</div>

			<table class="form-table">
				<colgroup>
					<col class="serialcol" />
					<col class="desc" />
					<col class="modelcol" />
					<col class="serie" />
					<col style="width: 7%" />
					<col style="width: 7%" />
					<col class="qty" />
					<col style="width: 6%" />
					<col style="width: 6%" />
					<col style="width: 7%" />
					<col style="width: 7%" />
				</colgroup>
				<thead>
					<tr>
						<th rowspan="2">
							<div class="am">ተ.ቁ</div>
							<div class="en">Serial<br />No.</div>
						</th>
						<th rowspan="2">
							<div class="am">የንብረቱ ወይም የዕቃው ዝርዝር</div>
							<div class="en">Detailed Description of Articles or Property</div>
						</th>
						<th rowspan="2">
							<div class="am">ሞዴል</div>
							<div class="en">Model</div>
						</th>
						<th rowspan="2">
							<div class="am">ሴሪ</div>
							<div class="en">Serie</div>
						</th>
						<th colspan="2">
							<div class="am">ገጽ ቁጥር</div>
							<div class="en">Page No.</div>
						</th>
						<th rowspan="2">
							<div class="am">ብዛት</div>
							<div class="en">Quantity</div>
						</th>
						<th colspan="2">
							<div class="am">የአንዱ ዋጋ</div>
							<div class="en">Unit Price</div>
						</th>
						<th colspan="2">
							<div class="am">የጠቅላላ ዋጋ</div>
							<div class="en">Total price</div>
						</th>
					</tr>
					<tr>
						<th>
							<div class="am">ከ</div>
							<div class="en">From</div>
						</th>
						<th>
							<div class="am">እስከ</div>
							<div class="en">To</div>
						</th>
						<th>
							<div class="am">ብር</div>
							<div class="en">Birr</div>
						</th>
						<th>
							<div class="am">ሳ</div>
							<div class="en">C</div>
						</th>
						<th>
							<div class="am">ብር</div>
							<div class="en">Birr</div>
						</th>
						<th>
							<div class="am">ሳ</div>
							<div class="en">C</div>
						</th>
					</tr>
				</thead>
				<tbody>
					${renderedRows.join("\n")}
					<tr class="total-row">
						<td colspan="7" class="total-label">
							<span class="am">ድምር</span><br /><span class="en">Total</span>
						</td>
						<td class="en" colspan="2" style="font-size: 8.5pt; font-weight: 700;"></td>
						<td class="en" style="font-size: 8.5pt; font-weight: 700;">${totalAmount > 0 ? grandBirr : ""}</td>
						<td class="en" style="font-size: 8.5pt; font-weight: 700;">${totalAmount > 0 ? String(grandCents).padStart(2, "0") : ""}</td>
					</tr>
				</tbody>
			</table>

			<div class="signatures">
				<div class="sig">
					<div class="sig-title">
						<div class="am">አስረካቢው</div>
						<div class="en">Deliverer (Donor)</div>
					</div>
					<div class="sig-line"></div>
				</div>
				<div class="sig right">
					<div class="sig-title">
						<div class="am">ተረካቢው</div>
						<div class="en">Receiver (Recipient)</div>
					</div>
					<div class="sig-line"></div>
				</div>
			</div>

			<div class="note">
				<span class="label am">ማስታወሻ፦</span> ይህ ካርድ ሶስት ኮፒ ያለው ሆኖ በካርቦን ይሠራል። ከዚሁም
				ሁለቱ ተጎራጅ ሆነው የመጀመሪያው ለክፍሉ የሒሳብ ቤት ይላክና ገንዘቡ ከወጣበት ሰነድ ጋር ተያይዞ በወሩ መጨረሻ
				ለገንዘብ ሚኒስቴር ለሒሳብ ማጠቃለያ ጽ/ቤት ይተላለፋል። ያኛው ለአስረካቢ ይሰጣል። የኋለኛው የማይጎረድ ሆኖ
				ከጥራዙ ጋር እንደሆነ ለገቢው ማስረጃ እንዲሆነው በዕቃ ግምጃ ቤቱ ይቀመጣል። የዋጋው ድምር በሚሰጠው ውስጥ በውርስ
				ወይም በሌላ ምክንያት የተገኘ ዕቃ ወይም ንብረት የሆነ እንደሆነ ዋጋው በኤክስፐርት ተገምቶ በዋጋ ኮሎን ውስጥ
				ይገባል።
				<span class="page-no en">ገጽ ቁጥር ፎርም 18175/11</span>
			</div>
		</main>
	</body>
</html>`;
}

export function printHtmlDocument(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);
  const cleanup = () => setTimeout(() => iframe.remove(), 2000);
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      cleanup();
    }, 150);
  };
  iframe.srcdoc = html;
}


