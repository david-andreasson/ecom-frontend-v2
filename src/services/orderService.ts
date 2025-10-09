export interface OrderItemRequest { productId: string; quantity: number; }
export interface PurchaseRequest { items: OrderItemRequest[] }
export interface PurchaseResponse { orderId: string; orderNumber?: string; totalAmount?: number }
export interface OrderHistoryItem {
  id: string;
  createdAt?: string;
  orderDate?: string;
  status?: string;
  totalAmount?: number;
  total?: number;
  currency?: string;
  items?: Array<{ productId?: string; name?: string; productName?: string; quantity?: number; price?: number }>;
}

const ORDERS_BASE = '/api/orders';

export async function purchase(req: PurchaseRequest): Promise<PurchaseResponse> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('You must be signed in.');
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` } as const;
  const res = await fetch(`${ORDERS_BASE}/purchase`, { method: 'POST', headers, body: JSON.stringify(req) });
  const text = await res.text();
  if (!res.ok) {
    try { const body = JSON.parse(text); const detail = body?.detail || body?.message || body?.error; if (detail) throw new Error(detail); } catch {}
    throw new Error(`Purchase failed (${res.status})`);
  }
  try { return JSON.parse(text); } catch { return { orderId: '' } as PurchaseResponse; }
}

export async function getOrderHistory(): Promise<OrderHistoryItem[]> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('You must be signed in.');
  const res = await fetch(`${ORDERS_BASE}/history`, { headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` } });
  if (!res.ok) {
    let msg = `Could not fetch order history (${res.status})`;
    try { const body = await res.json(); msg = body?.message || body?.error || msg; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  if (Array.isArray(data)) return data as OrderHistoryItem[];
  if (Array.isArray((data as any)?.orders)) return (data as any).orders as OrderHistoryItem[];
  if (Array.isArray((data as any)?.content)) return (data as any).content as OrderHistoryItem[];
  return [];
}
