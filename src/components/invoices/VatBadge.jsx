import { vatModeMeta } from "../../lib/vat";
import strings from "../../localization";

const VatBadge = ({ vat, showRate = true }) => {
	if (!vat || !vat.mode) return <span className="text-slate-400">-</span>;
	const meta = vatModeMeta(vat.mode);
	const rate = vat.rate != null ? Math.round(vat.rate * 100) : null;
	const showStandardRate = showRate && rate != null && vat.mode === "standard";
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.color}`}
		>
			{showStandardRate ? `${rate}% - ` : ""}
			{strings(meta.labelKey)}
		</span>
	);
};

export default VatBadge;
