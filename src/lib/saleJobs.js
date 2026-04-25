import { API_BASE_URL } from "./client";
import { getRealm } from "./realm";
import { getToken } from "./storage";

const SALE_JOB_TEMPLATES = [
	{ type: "report.sales.daily", schedule: "0 20 * * *", countType: "single" },
	{ type: "report.sales.weekly", schedule: "0 20 * * 1", countType: "single" },
	{ type: "report.sales.monthly", schedule: "0 20 1 * *", countType: "single" },
	{ type: "report.churn.daily", schedule: "0 20 * * *" },
	{ type: "report.churn.weekly", schedule: "0 20 * * 1" },
	{ type: "report.churn.monthly", schedule: "0 20 1 * *" },
];

const buildHeaders = () => {
	const headers = { "Content-Type": "application/json" };
	const token = getToken();
	if (token) headers.authorization = token;
	const realm = getRealm();
	if (realm) headers["x-realm"] = realm;
	return headers;
};

const postQuiet = async (endpoint, body) => {
	try {
		const res = await fetch(API_BASE_URL + endpoint, {
			method: "post",
			headers: buildHeaders(),
			body: JSON.stringify(body),
		});
		if (!res.ok) return null;
		return res.json();
	} catch {
		return null;
	}
};

export const seedSaleJobs = (saleId, saleName) => {
	if (!saleId) return Promise.resolve([]);
	const requests = SALE_JOB_TEMPLATES.map((tpl) => {
		const params = { sale: saleId };
		if (tpl.countType) params.countType = tpl.countType;
		const body = {
			name: saleName ? `${saleName} - ${tpl.type}` : tpl.type,
			type: tpl.type,
			schedule: tpl.schedule,
			params,
			enabled: true,
		};
		return postQuiet("/jobs", body);
	});
	return Promise.allSettled(requests);
};
