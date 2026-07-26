import { useCallback, useEffect, useState } from "react";
import { Input, Select } from "../../../../components/inputs";
import { useApp } from "../../../../context";
import { get, post, put } from "../../../../lib/client";
import { getToken, pushToken, setToken } from "../../../../lib/storage";
import strings from "../../../../localization";

/**
 * Merchant staff: the people who work for this organizer.
 *
 * Roles are presets, not cages - the API resolves per-account overrides above
 * them - so this page deliberately offers the role only. Fine-grained per-key
 * editing belongs to an admin, not to every merchant.
 *
 * "Work as" mints a token for the staff member and stashes the current one, so
 * a merchant can see the panel exactly as that person does and switch straight
 * back. It reuses the same hot-swap mechanism as admin login-as.
 */

const ROLES = [
	{
		value: "finance",
		label: "Finance",
		blurb: "Dashboard and transactions, including amounts.",
	},
	{
		value: "event-manager",
		label: "Event Manager",
		blurb:
			"Events, venues and links. No revenue figures, transactions or invoices.",
	},
];

const roleLabel = (value) =>
	ROLES.find((r) => r.value === value)?.label ?? value;

const Team = () => {
	const { account } = useApp();
	const [staff, setStaff] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [busyId, setBusyId] = useState(null);
	const [form, setForm] = useState({
		name: "",
		email: "",
		staffRole: "finance",
	});
	const [creating, setCreating] = useState(false);

	// Staff run as their merchant, so they must never be offered the tools to
	// manage or become one another. The API refuses this too.
	const isDelegated = Boolean(account?.staff);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await get("/accounts/staff");
			setStaff(res?.data ?? []);
		} catch (err) {
			setError(err?.message ?? strings("error.failedLoad"));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!isDelegated) load();
		else setLoading(false);
	}, [load, isDelegated]);

	const handleCreate = async (e) => {
		e.preventDefault();
		if (!form.email.trim()) return;
		setCreating(true);
		setError(null);
		try {
			await post("/accounts/staff", {
				name: form.name.trim() || form.email.trim(),
				email: form.email.trim(),
				staffRole: form.staffRole,
			});
			setForm({ name: "", email: "", staffRole: "finance" });
			await load();
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setCreating(false);
		}
	};

	const handleToggleStatus = async (member) => {
		setBusyId(member._id ?? member.id);
		setError(null);
		try {
			await put(`/accounts/staff/${member._id ?? member.id}`, {
				status: member.status === "active" ? "inactive" : "active",
			});
			await load();
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setBusyId(null);
		}
	};

	const handleWorkAs = async (member) => {
		setBusyId(member._id ?? member.id);
		setError(null);
		try {
			const res = await post("/auth/token", {
				id: member._id ?? member.id,
				type: "account.staff",
			});
			const token = res?.data?.token ?? res?.token;
			if (!token) throw new Error(strings("error.failedSave"));
			// Keep the current session so the navbar can offer a way back.
			pushToken(getToken(), account?.name ?? account?.email ?? null);
			setToken(token);
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
			setBusyId(null);
		}
	};

	if (isDelegated) {
		return (
			<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
				You are signed in as {account.staff.name || account.staff.email}. Team
				management is available to the account owner.
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-lg font-semibold text-slate-900">Team</h2>
				<p className="mt-1 text-sm text-slate-500">
					People who work on this account. Each sees only what their role
					allows.
				</p>
			</div>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					{error}
				</div>
			)}

			<form
				onSubmit={handleCreate}
				className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4 sm:items-end"
			>
				<Input
					label="Name"
					value={form.name}
					onChange={(e) => setForm({ ...form, name: e.target.value })}
					placeholder="Jane Doe"
				/>
				<Input
					label="Email"
					type="email"
					value={form.email}
					onChange={(e) => setForm({ ...form, email: e.target.value })}
					placeholder="jane@example.com"
				/>
				<Select
					label="Role"
					value={form.staffRole}
					onChange={(e) => setForm({ ...form, staffRole: e.target.value })}
					options={ROLES.map(({ value, label }) => ({ value, label }))}
				/>
				<button
					type="submit"
					disabled={creating || !form.email.trim()}
					className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
				>
					{creating ? "Adding..." : "Add"}
				</button>
				<p className="sm:col-span-4 text-xs text-slate-500">
					{ROLES.find((r) => r.value === form.staffRole)?.blurb}{" "}
					They sign in with a one-time code sent to this address, so it must be
					a mailbox they can read.
				</p>
			</form>

			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
				{loading ? (
					<div className="p-4 text-sm text-slate-500">Loading...</div>
				) : staff.length === 0 ? (
					<div className="p-4 text-sm text-slate-500">
						No team members yet.
					</div>
				) : (
					<table className="w-full text-sm">
						<thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
							<tr>
								<th className="px-4 py-3">Name</th>
								<th className="px-4 py-3">Email</th>
								<th className="px-4 py-3">Role</th>
								<th className="px-4 py-3">Status</th>
								<th className="px-4 py-3 text-right">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{staff.map((m) => {
								const id = m._id ?? m.id;
								const busy = busyId === id;
								return (
									<tr key={id}>
										<td className="px-4 py-3 font-medium text-slate-900">
											{m.name || "—"}
										</td>
										<td className="px-4 py-3 text-slate-600">{m.email}</td>
										<td className="px-4 py-3 text-slate-600">
											{roleLabel(m.staffRole)}
										</td>
										<td className="px-4 py-3">
											<span
												className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
													m.status === "active"
														? "bg-emerald-50 text-emerald-700"
														: "bg-slate-100 text-slate-600"
												}`}
											>
												{m.status}
											</span>
										</td>
										<td className="px-4 py-3 text-right whitespace-nowrap">
											<button
												type="button"
												onClick={() => handleWorkAs(m)}
												disabled={busy || m.status !== "active"}
												title={
													m.status !== "active"
														? "Only active members can be used"
														: "See the panel as this person"
												}
												className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
											>
												Work as
											</button>
											<button
												type="button"
												onClick={() => handleToggleStatus(m)}
												disabled={busy}
												className="ml-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
											>
												{m.status === "active" ? "Deactivate" : "Activate"}
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
};

export default Team;
