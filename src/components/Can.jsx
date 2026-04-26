import { useApp } from "../context";
import { can, familyEnabled, quota } from "../lib/capabilities";

/**
 * Conditional render based on capabilities.
 *
 * <Can cap="ai.tips">...</Can>           bool gate
 * <Can cap="sales" min={5}>...</Can>     numeric quota gate
 * <Can family="reporting">...</Can>       renders if any key in family enabled
 * <Can cap="ai.tips" fallback={<X/>} >...</Can>
 */
const Can = ({ cap, family, min, fallback = null, children }) => {
	const { account } = useApp();
	let enabled = false;
	if (family) enabled = familyEnabled(account, family);
	else if (cap) {
		if (typeof min === "number") enabled = quota(account, cap) >= min;
		else enabled = can(account, cap);
	}
	if (!enabled) return fallback;
	return typeof children === "function" ? children() : children;
};

export default Can;
