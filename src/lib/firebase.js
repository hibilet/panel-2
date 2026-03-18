import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
	apiKey: "AIzaSyDtlBzY0ulA5Ushgs6_9Wdwfpu_-pQglcI",
	authDomain: "hibilet-panel-production.firebaseapp.com",
	projectId: "hibilet-panel-production",
	storageBucket: "hibilet-panel-production.firebasestorage.app",
	messagingSenderId: "588400112405",
	appId: "1:588400112405:web:0bd926d568e0a022c26f1c",
	measurementId: "G-6246ZR7KRG",
};

const app = initializeApp(firebaseConfig);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export { app, analytics };
