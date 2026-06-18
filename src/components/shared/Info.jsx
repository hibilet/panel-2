// Inline info icon with a hover tooltip (native title - accessible, zero deps).
// Use next to any metric/label that needs an explanation.
const Info = ({ text, className = "" }) => {
	if (!text) return null;
	return (
		<span
			className={`ml-1 cursor-help text-slate-400 hover:text-slate-600 ${className}`}
			title={text}
			aria-label={text}
			role="img"
		>
			<i className="fa-solid fa-circle-info" aria-hidden />
		</span>
	);
};

export default Info;
