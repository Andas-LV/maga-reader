import { create } from "zustand";

interface StoreState {
	state: string | null;
	isLoading: boolean;
	error: string | null;
	clearError: () => void;
}

export const useItemsStore = create<StoreState>()((set) => ({
	state: null,
	isLoading: false,
	error: null,

	// exampleAction: async (id) => {
	// 	set({ isLoading: true, error: null });
	// 	try {
	// 		// 	request
	// 		set({ isLoading: true, error: null });
	// 	}
	// 	catch (error) {
	// 		set({
	// 			error:
	// 				error instanceof Error ? error.message : "Failed to fetch sessions",
	// 		});
	// 	} finally {
	// 		set({ isLoading: false });
	// 	}
	// },

	clearError: () => set({ error: null }),
}));
