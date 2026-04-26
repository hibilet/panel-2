import ReactMarkdown from "react-markdown";

const components = {
	h1: (props) => (
		<h1 className="mt-3 mb-2 text-lg font-semibold text-slate-900" {...props} />
	),
	h2: (props) => (
		<h2 className="mt-4 mb-2 text-base font-semibold text-slate-900" {...props} />
	),
	h3: (props) => (
		<h3 className="mt-3 mb-1.5 text-sm font-semibold text-slate-900" {...props} />
	),
	p: (props) => <p className="my-2 text-sm leading-relaxed text-slate-700" {...props} />,
	ul: (props) => (
		<ul className="my-2 ml-5 list-disc space-y-1 text-sm text-slate-700" {...props} />
	),
	ol: (props) => (
		<ol className="my-2 ml-5 list-decimal space-y-1 text-sm text-slate-700" {...props} />
	),
	li: (props) => <li className="leading-relaxed" {...props} />,
	strong: (props) => <strong className="font-semibold text-slate-900" {...props} />,
	em: (props) => <em className="italic" {...props} />,
	code: (props) => (
		<code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-800" {...props} />
	),
	a: (props) => (
		<a className="text-violet-700 underline underline-offset-2 hover:text-violet-900" {...props} />
	),
	blockquote: (props) => (
		<blockquote className="my-2 border-l-2 border-slate-300 pl-3 text-sm italic text-slate-600" {...props} />
	),
	hr: () => <hr className="my-3 border-slate-200" />,
};

const Markdown = ({ children, className = "" }) => (
	<div className={className}>
		<ReactMarkdown components={components}>{children ?? ""}</ReactMarkdown>
	</div>
);

export default Markdown;
