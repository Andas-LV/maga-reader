import Cookies from "js-cookie";

export const setAuthToken = (token: string) => {
	Cookies.set("token", token, { expires: 10, path: "/" });
};

export const removeAuthToken = () => {
	Cookies.remove("token", { path: "/" });
};

export const getAuthToken = () => {
	if (typeof window !== "undefined") {
		return Cookies.get("token");
	}
	return null;
};
