import { Component } from "react";

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

	componentDidCatch() {}

	render() {
		if (this.state.failed) return this.props.fallback ?? null;
		return this.props.children;
	}
}

export default ErrorBoundary;
