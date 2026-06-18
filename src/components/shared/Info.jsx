// Inline info icon with an INSTANT hover tooltip (pure CSS group-hover - no
// native-title delay, no JS). Use next to any metric/label needing context.
const Info = ({ text, className = "" }) => {
	if (!text) return null;
	return (
		<span className={`group/info relative inline-flex items-center align-middle ${className}`}>
			<i className="fa-solid fa-circle-info cursor-help text-slate-400 transition-colors group-hover/info:text-slate-600" aria-hidden />
			<span
				role="tooltip"
				className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-56 -translate-x-1/2 whitespace-normal rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal normal-case leading-snug text-white shadow-lg group-hover/info:block"
			>
				{text}
			</span>
		</span>
	);
};

export default Info;
