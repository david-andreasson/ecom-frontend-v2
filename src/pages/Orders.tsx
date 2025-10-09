import React, { useEffect, useState } from 'react';
import { getOrderHistory, type OrderHistoryItem } from '../services/orderService';

const Orders: React.FC = () => {
  const [items, setItems] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getOrderHistory();
        if (active) setItems(data);
      } catch (e: any) {
        if (active) setError(e?.message || 'Kunde inte hämta orderhistorik');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="container" style={{ display: 'grid', gap: 12 }}>
      <h2>Order history</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map(o => (
          <div key={o.id} className="card" style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>Order #{o.id}</strong>
              <span>{o.orderDate || o.createdAt || ''}</span>
            </div>
            <div>Status: {o.status || '—'}</div>
            <div>Total: {(o.totalAmount ?? o.total ?? 0).toFixed(2)} {o.currency || 'USD'}</div>
            {Array.isArray(o.items) && o.items.length > 0 && (
              <ul style={{ margin: '8px 0 0 16px' }}>
                {o.items.map((i, idx) => (
                  <li key={idx}>{i.name || i.productName || i.productId} × {i.quantity} @ {i.price}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {!loading && !error && items.length === 0 && <p>No orders yet.</p>}
      </div>
    </div>
  );
};

export default Orders;
