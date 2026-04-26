import { useApp } from "../context";
import { can, familyEnabled, quota } from "./capabilities";

export const useCan = (key) => {
	const { account } = useApp();
	return can(account, key);
};

export const useQuota = (key) => {
	const { account } = useApp();
	return quota(account, key);
};

export const useFamilyEnabled = (family) => {
	const { account } = useApp();
	return familyEnabled(account, family);
};
