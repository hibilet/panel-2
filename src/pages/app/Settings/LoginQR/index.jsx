import { useState, useEffect } from "react";
import Modal from "../../../../components/shared/Modal";
import { post } from "../../../../lib/client";
import strings from "../../../../localization";

const QR_API = "https://api.qrserver.com/v1/create-qr-code/";

const LoginQRModal = ({ isOpen, onClose }) => {
	const [token, setToken] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!isOpen) return;
		setToken(null);
		setError(null);
		setLoading(true);
		// TODO: Replace with actual login token API (e.g. post('/auth/login-token', { type: 'account.login' }))
		post("/auth/token", { type: "account.login" })
			.then((r) => setToken(r.data?.token ?? null))
			.catch((err) =>
				setError(err?.message ?? strings("form.reader.errorToken")),
			)
			.finally(() => setLoading(false));
	}, [isOpen]);

	const qrUrl = token
		? `${QR_API}?size=200x200&data=${encodeURIComponent(token)}`
		: null;

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={strings("page.settings.showLoginQr")}
			aria-label={strings("page.settings.showLoginQr")}
			maxWidth="sm"
		>
			<div className="flex flex-col items-center gap-4">
				{loading && (
					<div className="flex h-48 items-center justify-center">
						<i
							className="fa-solid fa-spinner fa-spin text-3xl text-slate-400"
							aria-hidden
						/>
					</div>
				)}
				{error && (
					<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
				)}
				{!loading && !error && (
					<>
						<p className="text-center text-sm text-slate-600 dark:text-slate-400">
							{strings("form.reader.readQrCode")}
						</p>
						{qrUrl && (
							<img
								alt={strings("form.reader.qrCodeAlt")}
								src={qrUrl}
								className="my-2 w-[200px] invert dark:invert-0"
								style={{ imageRendering: "pixelated" }}
							/>
						)}
					</>
				)}
			</div>
		</Modal>
	);
};

export default LoginQRModal;
