import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const ANIM_DURATION = 250;

const SlidePanel = ({
	isOpen,
	onClose,
	title,
	children,
	"aria-label": ariaLabel,
}) => {
	const [isExiting, setIsExiting] = useState(false);
	const show = isOpen || isExiting;

	useEffect(() => {
		if (isOpen) {
			setIsExiting(false);
		} else if (show) {
			setIsExiting(true);
			const t = setTimeout(() => setIsExiting(false), ANIM_DURATION);
			return () => clearTimeout(t);
		}
	}, [isOpen, show]);

	if (!show) return null;

	const handleOverlayClick = () => {
		if (isExiting) return;
		onClose?.();
	};

	const content = (
		<>
			<div
				className="slide-panel-overlay fixed inset-0 z-[100] bg-slate-900/20"
				data-exiting={isExiting || undefined}
				aria-hidden
				onClick={handleOverlayClick}
			/>
			<aside
				className="slide-panel fixed inset-y-0 right-0 z-[101] w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white shadow-xl"
				data-exiting={isExiting || undefined}
				aria-label={ariaLabel ?? title}
			>
				{children}
			</aside>
		</>
	);

	return createPortal(content, document.body);
};

export default SlidePanel;
