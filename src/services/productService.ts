export interface ProductResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  categoryName: string | null;
  stockQuantity: number;
  active: boolean;
  attributes: Record<string, string>;
  images: string[];
  imageUrls?: string[];
  imageUrl?: string;
  thumbnailUrl?: string;
  mainImageUrl?: string;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

const PRODUCTS_BASE = '/api/products';

export const productService = {
  async listAllProducts(signal?: AbortSignal): Promise<ProductResponse[]> {
    const res = await fetch(`${PRODUCTS_BASE}/all`, { signal, headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`Failed to load products: ${res.status}`);
    return await res.json();
  },
  async getProductById(id: string, signal?: AbortSignal): Promise<ProductResponse | null> {
    const res = await fetch(`${PRODUCTS_BASE}/${encodeURIComponent(id)}`, { signal, headers: { 'Accept': 'application/json' } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to load product: ${res.status}`);
    return await res.json();
  }
};

export default productService;
