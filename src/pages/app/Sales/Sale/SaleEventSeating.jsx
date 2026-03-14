import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { get, put } from "../../../../lib/client";
import strings from "../../../../localization";
import { toId } from "../../../../utils/object";

const SEAT_ENGINE_URL = "https://seating.hibilet.com/";

const getVenuePlan = (planId, setter) => {
	if (!planId) return;
	get(`/venues/plans/${planId}`)
		.then(({ data }) => setter(data))
		.catch((err) => {
			alert(strings(err?.message ?? "error.failedLoad"));
		});
};

const SaleEventSeating = ({ product, sale, plan, onClose, onSave }) => {
	const [loading, setLoading] = useState(false);
	const [planData, setPlanData] = useState(null);

	const mode = useRef("roam");
	const [modeState, setModeState] = useState(mode.current);
	const selected = useRef(sale?.seating?.[product?.id] || []);
	const [selectedState, setSelectedState] = useState(selected.current);

	const engine = useRef(null);

	useEffect(() => {
		if (plan) {
			getVenuePlan(toId(plan), setPlanData);
		} else {
			setPlanData(null);
		}
	}, [plan]);

	const Message = (msg) => {
		if (msg.method && engine?.current?.contentWindow) {
			engine.current.contentWindow.postMessage(msg, "*");
		}
	};

	const SelectSeats = (selection) => {
		let seats = selected.current;

		if (mode.current === "multi-add")
			seats = seats.concat(selection.map((s) => s.id));
		if (mode.current === "multi-remove")
			seats = seats.filter(
				(a) => !selection.map((b) => b.id).includes(a),
			);

		Message({
			method: "POST/ LoadDistribution",
			data: seats.reduce((acc, id) => {
				acc[id] = [1];
				return acc;
			}, {}),
		});
		Message({ method: "POST/ PaintSeats" });
		selected.current = seats;
		setSelectedState(seats);
	};

	const Bootstrap = () => {
		if (!planData) return;
		Message({ method: "POST/ UserType", data: "organizer" });
		Message({ method: "POST/ Category", data: 1 });
		Message({ method: "POST/ Layout", data: planData });
		Message({ method: "POST/ LoadOccupation", data: [] });
		SelectSeats([]);
	};

	const controllersRef = useRef(null);
	controllersRef.current = {
		"RES/ SelectedSeats": SelectSeats,
		"HOOK/ OnInitialize": Bootstrap,
		"HOOK/ OnLoadLayout": () => null,
		"HOOK/ OnPaint": () => null,
		"HOOK/ OnMode": (data) => {
			mode.current = data;
			setModeState(data);
		},
	};

	const handleBroker = useCallback((e) => {
		const data = e?.data;
		if (!data?.type) return;
		const handler = controllersRef.current[data.type];
		if (!handler) return;
		try {
			handler(data.data);
		} catch (err) {
			console.error("Seating engine message error:", data, err);
		}
	}, []);

	useEffect(() => {
		window.addEventListener("message", handleBroker);
		return () => window.removeEventListener("message", handleBroker);
	}, [handleBroker]);

	const UpdateSale = () => {
		setLoading(true);
		const form = {
			type: "sale.event",
			seating: { ...sale?.seating, [product.id]: selected.current },
		};
		put(`/sales/${sale.id}`, form)
			.then(({ data }) => {
				onSave?.(data);
				onClose?.();
			})
			.catch((err) => {
				console.error(err);
				alert(strings(err?.message ?? "error.failedSave"));
			})
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		selected.current = sale?.seating?.[product?.id] || [];
		setSelectedState(selected.current);
	}, [product?.id, sale?.seating]);

	useEffect(() => {
		const onKeyDown = (e) => {
			if (e.key === "Escape" && product && !loading) onClose?.();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [product, loading, onClose]);

	if (!product) return null;

	const content = (
		<div
			className="fixed inset-0 z-[110] flex flex-col bg-white"
			role="dialog"
			aria-modal="true"
			aria-labelledby="seating-modal-title"
		>
			<div className="flex flex-1 flex-col overflow-hidden">
				<header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
					<h2
						id="seating-modal-title"
						className="text-xl font-semibold text-slate-900"
					>
						{strings("form.ticket.selectSeatsModalTitle", [
							product?.name ?? strings("common.untitled"),
						])}
					</h2>
					<div className="flex items-center gap-2">
						<button
							type="button"
							disabled={loading}
							onClick={() => onClose?.(false)}
							className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							disabled={loading}
							aria-busy={loading}
							onClick={UpdateSale}
							className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
						>
							{loading ? (
								<>
									<i
										className="fa-solid fa-spinner fa-spin"
										aria-hidden
									/>
									{strings("common.saving")}
								</>
							) : (
								strings("common.save")
							)}
						</button>
					</div>
				</header>

				<section className="flex flex-1 flex-col overflow-hidden">
					<nav className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-6 py-3">
						<span className="flex-1 text-sm font-medium text-slate-700">
							{strings("form.ticket.seatsSelected", [
								selectedState.length,
							])}
						</span>
						<button
							type="button"
							disabled
							className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
								modeState === "multi-add"
									? "bg-slate-900 text-white"
									: "border border-slate-300 bg-white text-slate-600"
							}`}
						>
							{strings("form.ticket.toolbarMultiAdd")}
						</button>
						<button
							type="button"
							disabled
							className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
								modeState === "multi-remove"
									? "bg-slate-900 text-white"
									: "border border-slate-300 bg-white text-slate-600"
							}`}
						>
							{strings("form.ticket.toolbarMultiRemove")}
						</button>
					</nav>

					<div className="relative flex-1 min-h-0">
						{!planData ? (
							<div className="flex h-full items-center justify-center bg-slate-50">
								<div className="flex flex-col items-center gap-4">
									<i
										className="fa-solid fa-spinner fa-spin text-3xl text-slate-400"
										aria-hidden
									/>
									<p className="text-sm text-slate-500">
										{strings("common.loading")}
									</p>
								</div>
							</div>
						) : (
							<iframe
								ref={engine}
								title="seat-engine"
								src={SEAT_ENGINE_URL}
								className="absolute inset-0 h-full w-full border-0"
							/>
						)}
					</div>
				</section>
			</div>
		</div>
	);

	return createPortal(content, document.body);
};

export default SaleEventSeating;
