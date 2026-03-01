const setToken = (token) => { localStorage.setItem('token', token); window.location.replace('/'); };
const deleteToken = () => { localStorage.removeItem('token'); window.location.replace('/'); };
const getToken = () => localStorage.getItem('token');

const setLang = (lang) => { localStorage.setItem('lang', lang); window.location.reload(); };
const getLang = () => localStorage.getItem('lang');

export {
  setToken, deleteToken, getToken,
  setLang, getLang,
};
