import { useEffect } from "react";
import { useSearch } from "wouter";
import { setToken } from "../../../lib/storage";

const OAuth = () => {
	const search = useSearch();
	const params = new URLSearchParams(search);
	const token = params.get("token");

	useEffect(() => {
		if (token) setToken(token);
	}, [token]);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center">
			<i className="fa-solid fa-spinner fa-spin mb-4 text-2xl text-slate-500" aria-hidden />
			<p className="text-slate-600">Logging In</p>
		</div>
	);
};

export default OAuth;