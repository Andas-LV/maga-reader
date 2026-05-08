import axios from "axios";
import { getSession } from "next-auth/react";
import { toCamelCase, toSnakeCase } from "@/shared/utils/case";
import { getAuthToken } from "@/core/config/cookie";

const isClient = typeof window !== "undefined"

const axiosInstance = axios.create({
	baseURL: process.env.NEXT_BACKEND_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

// 👉 Request interceptor
axiosInstance.interceptors.request.use(async (config) => {
	if (isClient) {
		const token = getAuthToken();
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}

		// const session = await getSession();
		// if (!session) {
		// 	console.warn("⚠️ No access token available! Request may fail.");
		// } else {
		// 	config.headers.Authorization = `Bearer ${session.access}`;
		// }
	}

	if (config.data && typeof config.data === "object") {
		config.data = toSnakeCase(config.data);
	}

	if (config.params && typeof config.params === "object") {
		config.params = toSnakeCase(config.params);
	}

	return config;
});

axiosInstance.interceptors.response.use(
	(response) => {
		if (response.data && typeof response.data === "object") {
			response.data = toCamelCase(response.data);
		}
		return response;
	},
	(error) => {
		if (
			error.response &&
			error.response.data &&
			typeof error.response.data === "object"
		) {
			error.response.data = toCamelCase(error.response.data);
		}
		return Promise.reject(error);
	},
);

export default axiosInstance;
