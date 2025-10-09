import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { useAuth } from './AuthContext';

export type Product = { id: string; name: string; price: number; imageUrl?: string };
export type CartItem = { id: string; name: string; price: number; imageUrl?: string; qty: number };

type State = { items: CartItem[] };

type Action =
  | { type: 'ADD'; payload: Product }
  | { type: 'REMOVE'; payload: { id: string } }
  | { type: 'UPDATE_QTY'; payload: { id: string; qty: number } }
  | { type: 'CLEAR' }
  | { type: 'HYDRATE'; payload: { items: CartItem[] } };

const initialState: State = { items: [] };

// Storage keys and TTL (guest cart)
const GUEST_KEY = 'guest_cart';
const USER_CART_PREFIX = 'cart:'; // cart:<email>
const GUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type StoredCart = { items: CartItem[]; expiresAt?: number };

function nowMs() { return Date.now(); }

function readStored(key: string): StoredCart | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { items: sanitizeItems(parsed as any) };
    const items = sanitizeItems((parsed?.items ?? []) as CartItem[]);
    const expiresAt = typeof parsed?.expiresAt === 'number' ? parsed.expiresAt : undefined;
    return { items, expiresAt };
  } catch {
    return null;
  }
}

function writeStored(key: string, items: CartItem[], withTtl = false) {
  try {
    const payload: StoredCart = { items: sanitizeItems(items) };
    if (withTtl) payload.expiresAt = nowMs() + GUEST_TTL_MS;
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {}
}

function removeStored(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

function keyForUser(email?: string | null) {
  if (!email) return null;
  return `${USER_CART_PREFIX}${email}`;
}

function sanitizeItems(items: CartItem[]): CartItem[] {
  return (items ?? []).map(i => ({
    id: String(i.id),
    name: String(i.name),
    price: Number(i.price) || 0,
    imageUrl: i.imageUrl,
    qty: Math.max(1, Math.min(99, Math.round(Number(i.qty) || 1)))
  }));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE': {
      const items = sanitizeItems(action.payload.items);
      return { items };
    }
    case 'ADD': {
      const idx = state.items.findIndex(i => i.id === action.payload.id);
      if (idx >= 0) {
        const next = [...state.items];
        const current = next[idx];
        const newQty = Math.min(99, (current.qty ?? 0) + 1);
        next[idx] = { ...current, qty: newQty };
        return { items: next };
      }
      const newItem: CartItem = { id: action.payload.id, name: action.payload.name, price: action.payload.price, imageUrl: action.payload.imageUrl, qty: 1 };
      return { items: [...state.items, newItem] };
    }
    case 'REMOVE': return { items: state.items.filter(i => i.id !== action.payload.id) };
    case 'UPDATE_QTY': {
      let { qty } = action.payload;
      if (!Number.isFinite(qty)) qty = 1;
      qty = Math.max(1, Math.min(99, Math.round(qty)));
      return { items: state.items.map(i => i.id === action.payload.id ? { ...i, qty } : i) };
    }
    case 'CLEAR': return { items: [] };
    default: return state;
  }
}

function calcTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

export type CartContextValue = {
  items: CartItem[];
  total: number;
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { user } = useAuth();

  // Hydrate on mount and whenever user changes (to swap between guest/user carts)
  useEffect(() => {
    const hydrate = () => {
      const userKey = keyForUser(user?.email || user?.sub as any);
      if (userKey) {
        // If signed in: read user cart and merge any existing guest cart once
        const userCart = readStored(userKey) || { items: [] };
        const guestCart = readStored(GUEST_KEY);
        let items = userCart.items;
        if (guestCart?.items?.length) {
          // Merge quantities for identical ids
          const map = new Map<string, CartItem>();
          for (const it of items) map.set(it.id, { ...it });
          for (const it of guestCart.items) {
            const prev = map.get(it.id);
            if (prev) {
              map.set(it.id, { ...prev, qty: Math.min(99, (prev.qty ?? 1) + (it.qty ?? 1)) });
            } else {
              map.set(it.id, { ...it });
            }
          }
          items = Array.from(map.values());
          // Persist merged to user and clear guest
          writeStored(userKey, items, false);
          removeStored(GUEST_KEY);
        }
        dispatch({ type: 'HYDRATE', payload: { items } });
        return;
      }
      // Guest: read guest cart, honor TTL
      const guest = readStored(GUEST_KEY);
      if (guest?.expiresAt && guest.expiresAt < nowMs()) {
        removeStored(GUEST_KEY);
        dispatch({ type: 'HYDRATE', payload: { items: [] } });
      } else {
        dispatch({ type: 'HYDRATE', payload: { items: guest?.items ?? [] } });
      }
    };
    hydrate();
    // Re-hydrate when auth changes via storage/auth-changed events handled in AuthContext
  }, [user?.email]);

  // Persist whenever items change. Use user-specific key if signed in, guest key otherwise (with TTL)
  useEffect(() => {
    const userKey = keyForUser(user?.email || (user as any)?.sub);
    if (userKey) {
      writeStored(userKey, state.items, false);
    } else {
      writeStored(GUEST_KEY, state.items, true);
    }
  }, [state.items, user?.email]);

  const value = useMemo<CartContextValue>(() => ({
    items: state.items,
    total: calcTotal(state.items),
    addToCart: (p) => dispatch({ type: 'ADD', payload: p }),
    removeFromCart: (id) => dispatch({ type: 'REMOVE', payload: { id } }),
    updateQty: (id, qty) => dispatch({ type: 'UPDATE_QTY', payload: { id, qty } }),
    clearCart: () => dispatch({ type: 'CLEAR' }),
  }), [state.items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
