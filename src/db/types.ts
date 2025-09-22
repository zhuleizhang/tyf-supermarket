export type SortOrder = 'asc' | 'desc';

export interface getProductListRequest {
	page?: number;
	pageSize?: number;
	keyword?: string;
	category_id?: string;
	sortBy?: string;
	sortOrder?: SortOrder;
}
