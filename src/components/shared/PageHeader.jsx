const PageHeader = ({ title, actions, children }) => (
	<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
		{actions && (
			<div className="flex flex-wrap items-center gap-2">{actions}</div>
		)}
		{children}
	</div>
);

export default PageHeader;
