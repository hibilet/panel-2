const realm = import.meta.env.VITE_REALM ?? null;

export const getRealm = () => realm;
