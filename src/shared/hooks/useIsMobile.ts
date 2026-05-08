import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		// подписка: вызывается при change
		(onStoreChange) => {
			const mql = window.matchMedia(query);
			mql.addEventListener("change", onStoreChange);
			return () => mql.removeEventListener("change", onStoreChange);
		},
		// считывание текущего значения
		() => window.matchMedia(query).matches,
		// вариант для серверного рендера (где window нет)
		() => false
	);
}

export default function useIsMobile() {
	return useMediaQuery(QUERY);
}
