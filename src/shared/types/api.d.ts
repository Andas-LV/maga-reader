export type ApiResponse<T> =
	| { success: true; data: T }
	| { success: false; error: string };


export interface ApiListResponse<T> {
	count: number;
	items: T[];
}

export interface PaginatedResponse<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}