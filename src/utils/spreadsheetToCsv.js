import * as XLSX from "xlsx";

const EXT = new Set(["csv", "tsv", "xlsx", "xls"]);

function extOf(filename) {
	const i = filename.lastIndexOf(".");
	return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
}

/** MIME when `File.type` is missing (drag/drop often leaves it empty). */
export function mimeTypeFromSpreadsheetName(filename) {
	const kind = extOf(filename);
	switch (kind) {
		case "csv":
			return "text/csv; charset=utf-8";
		case "tsv":
			return "text/tab-separated-values; charset=utf-8";
		case "xlsx":
			return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
		case "xls":
			return "application/vnd.ms-excel";
		default:
			return "application/octet-stream";
	}
}

function spreadsheetMimeType(file) {
	const t = file.type?.trim();
	if (t) return t;
	return mimeTypeFromSpreadsheetName(file.name || "");
}

/** Base64 (no `data:` prefix) for JSON / inlineData.fileData payloads. */
export function arrayBufferToBase64(buffer) {
	const bytes = new Uint8Array(buffer);
	const chunk = 0x8000;
	let binary = "";
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
	}
	return btoa(binary);
}

/** Escape and join tab-separated fields into CSV lines. */
function tsvTextToCsv(tsv) {
	return tsv
		.split(/\r?\n/)
		.filter((line) => line.length > 0)
		.map((line) =>
			line
				.split("\t")
				.map((cell) => {
					const s = cell ?? "";
					if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
					return s;
				})
				.join(","),
		)
		.join("\n");
}

function contentsFromBuffer(buf, kind) {
	if (kind === "csv") {
		return new TextDecoder("utf-8").decode(buf);
	}
	if (kind === "tsv") {
		const tsv = new TextDecoder("utf-8").decode(buf);
		return tsvTextToCsv(tsv);
	}
	const wb = XLSX.read(buf, { type: "array", cellDates: true });
	const parts = [];
	for (const sheetName of wb.SheetNames) {
		const ws = wb.Sheets[sheetName];
		if (!ws) continue;
		const csv = XLSX.utils.sheet_to_csv(ws);
		if (csv.trim()) parts.push(csv);
	}
	return parts.join("\n\n");
}

/**
 * One read of the file: raw bytes as base64 for the API, plus CSV text for display / text models.
 * Use `fileData` / `inlineData` on the wire (see SaleGuidedForm).
 */
export async function prepareSpreadsheetAttachment(file) {
	const name = file.name || "upload";
	const kind = extOf(name);
	if (!EXT.has(kind)) {
		throw new Error(
			`Unsupported file type (.${kind || "unknown"}). Use CSV or Excel.`,
		);
	}
	const buf = await file.arrayBuffer();
	const dataBase64 = arrayBufferToBase64(buf);
	const mimeType = spreadsheetMimeType(file);
	const contents = contentsFromBuffer(buf, kind);
	return {
		name,
		size: file.size,
		mimeType,
		dataBase64,
		contents,
	};
}

/**
 * @deprecated Prefer prepareSpreadsheetAttachment — keeps original bytes for the API.
 */
export async function fileToCsvContents(file) {
	const { name, contents, size } = await prepareSpreadsheetAttachment(file);
	return { name, contents, size };
}

export function isSpreadsheetFilename(filename) {
	return EXT.has(extOf(filename));
}
