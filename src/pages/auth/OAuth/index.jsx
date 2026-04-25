import { useEffect } from "react";
import { useSearch } from "wouter";
import { setToken } from "../../../lib/storage";
import { showToast } from "../../../lib/toastStore";

const OAuth = () => {
	const search = useSearch();
	const params = new URLSearchParams(search);
	const token = params.get("token");
	const error = params.get("error");

	useEffect(() => {
		if (token) {
			setToken(token);
			return;
		}
		if (error) {
			showToast("error", error.replace(/_/g, " "));
			window.location.replace("/");
		}
	}, [token, error]);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center">
			<i className="fa-solid fa-spinner fa-spin mb-4 text-2xl text-slate-500" aria-hidden />
			<p className="text-slate-600">Logging In</p>
		</div>
	);
};

export default OAuth;