import strings from "../../localization";

const PanelHeader = ({ title, onClose, className = "" }) => (
	<header
		className={`flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 ${className}`.trim()}
	>
		<h2 className="text-lg font-semibold text-slate-900">
			{title}
		</h2>
		<button
			type="button"
			onClick={onClose}
			className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
			aria-label={strings("common.ariaClose")}
		>
			<i className="fa-solid fa-xmark text-lg" aria-hidden />
		</button>
	</header>
);

export default PanelHeader;
