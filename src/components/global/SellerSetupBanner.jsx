import { Link, useLocation } from "wouter";
import { useApp } from "../../context";
import strings from "../../localization";

const SellerSetupBanner = () => {
	const { account, realm } = useApp();
	const [location] = useLocation();
	if (account?.type !== "account.admin") return null;
	if (!realm) return null;

	const seller = realm.seller ?? {};
	const configured = !!seller.country && seller.defaultRate != null;
	if (configured) return null;

	if (location === "/settings/realm") return null;

	return (
		<div className="mx-auto mt-4 -mb-4 max-w-5xl px-4 md:px-6 lg:px-0">
			<div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
				<i
					className="fa-solid fa-triangle-exclamation text-amber-600"
					aria-hidden
				/>
				<div className="flex-1">
					<span className="font-medium">
						{strings("page.invoices.sellerNotConfigured")}
					</span>
					<span className="ml-1 text-amber-800">
						{strings("page.invoices.sellerNotConfiguredAdmin")}
					</span>
				</div>
				<Link
					href="/settings/realm"
					className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
				>
					{strings("page.invoices.configureSeller")}
				</Link>
			</div>
		</div>
	);
};

export default SellerSetupBanner;
