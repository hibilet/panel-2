import { Component } from "react";
import strings from "../localization";

// Minimal boundary: if children throw during render (e.g. a chart/map lib
// misbehaves), show `fallback` instead of crashing the page.
class ErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { failed: false };
	}

	static getDerivedStateFromError() {
		return { failed: true };
	}

	componentDidCatch(error, info) {
		console.error("Render error", error, info?.componentStack);
	}

	render() {
		if (!this.state.failed) return this.props.children;
		if (this.props.fallback !== undefined) return this.props.fallback;
		return (
			<div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center">
				<i className="fa-solid fa-triangle-exclamation text-2xl text-red-500" aria-hidden />
				<h2 className="mt-3 text-base font-medium text-red-900">
					{strings("error.renderFailed")}
				</h2>
				<p className="mt-1 text-sm text-red-700">
					{strings("error.renderFailedDesc")}
				</p>
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="mt-4 inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
				>
					<i className="fa-solid fa-rotate-right" aria-hidden />
					{strings("error.reload")}
				</button>
			</div>
		);
	}
}

export default ErrorBoundary;
