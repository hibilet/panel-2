import { useEffect, useState } from "react";
import Modal from "../../../../components/shared/Modal";
import { getToken } from "../../../../lib/storage";
import strings from "../../../../localization";

const QR_API = "https://api.qrserver.com/v1/create-qr-code/";

const LoginQRModal = ({ isOpen, onClose }) => {
	const [copied, setCopied] = useState(false);

	const baseUrl = (import.meta.env.VITE_APP_URL || "").replace(/\/$/, "");
	const token = getToken();
	const loginUrl = token
		? `${baseUrl}/oauth?token=${encodeURIComponent(token)}`
		: null;
	const qrUrl = loginUrl
		? `${QR_API}?size=600x600&margin=0&data=${encodeURIComponent(loginUrl)}`
		: null;

	useEffect(() => {
		if (!isOpen) setCopied(false);
	}, [isOpen]);

	const handleCopyLink = async () => {
		if (!loginUrl) return;
		try {
			await navigator.clipboard.writeText(loginUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// fallback for older browsers
			const ta = document.createElement("textarea");
			ta.value = loginUrl;
			ta.style.position = "fixed";
			ta.style.opacity = "0";
			document.body.appendChild(ta);
			ta.select();
			try {
				document.execCommand("copy");
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			} catch {
				alert(strings("form.reader.errorCopy"));
			}
			document.body.removeChild(ta);
		}
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={strings("page.settings.showLoginQr")}
			aria-label={strings("page.settings.showLoginQr")}
			maxWidth="sm"
		>
			<div className="flex flex-col items-center gap-4">
				{!token ? (
					<p className="text-sm text-slate-600 dark:text-slate-400">
						{strings("error.failedLoad")}
					</p>
				) : (
					<>
						<p className="text-center text-sm text-slate-600 dark:text-slate-400">
							{strings("form.reader.readQrCode")}
						</p>
						{qrUrl && (
							<img
								alt={strings("form.reader.qrCodeAlt")}
								src={qrUrl}
								className="my-2 w-[200px]"
								style={{ imageRendering: "pixelated" }}
							/>
						)}
						<button
							type="button"
							onClick={handleCopyLink}
							className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
						>
							{copied ? (
								<>
									<i
										className="fa-solid fa-check text-emerald-600"
										aria-hidden
									/>
									{strings("form.channel.copied")}
								</>
							) : (
								<>
									<i className="fa-solid fa-copy" aria-hidden />
									{strings("form.reader.copyLink")}
								</>
							)}
						</button>
					</>
				)}
			</div>
		</Modal>
	);
};

export default LoginQRModal;
