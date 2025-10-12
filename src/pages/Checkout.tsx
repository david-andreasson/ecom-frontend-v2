import React, { useEffect, useState, useMemo } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

async function fetchPublishableKey(): Promise<string> {
  const res = await fetch('/api/orders/payments/config');
  if (!res.ok) throw new Error('Could not load payment config');
  const data = await res.json();
  return data.publishableKey || '';
}

async function createIntent(amountFiat: number, currencyFiat: string, token?: string): Promise<{ clientSecret: string; paymentId: string }> {
  const res = await fetch('/api/orders/payments/create-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ provider: 'stripe', amountFiat, currencyFiat })
  });
  if (!res.ok) throw new Error('Failed to create payment intent');
  return await res.json();
}

async function createOrder(paymentId: string, items: Array<{id: string, qty: number}>, token?: string): Promise<void> {
  const res = await fetch('/api/orders/purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      items: items.map(item => ({ productId: item.id, quantity: item.qty })),
      paymentId
    })
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create order: ${errorText}`);
  }
}

const CheckoutForm: React.FC<{ clientSecret: string }> = ({ clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setMessage(null);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/orders'
      },
      redirect: 'if_required'
    });
    if (result.error) {
      setError(result.error.message || 'Payment failed');
      setSubmitting(false);
    } else if (result.paymentIntent) {
      if (result.paymentIntent.status === 'succeeded') {
        setMessage('Payment successful! Creating order...');
        // Create order in backend
        try {
          await createOrder(result.paymentIntent.id, items, user?.token);
          setMessage('Order created! Redirecting...');
          // Clear localStorage immediately (don't use clearCart to avoid race condition)
          // Use same keys as CartContext: 'cart:' prefix for users, 'guest_cart' for guests
          if (user?.email) {
            localStorage.removeItem(`cart:${user.email}`);
          } else if ((user as any)?.sub) {
            localStorage.removeItem(`cart:${(user as any).sub}`);
          } else {
            localStorage.removeItem('guest_cart');
          }
          // Force full page reload to ensure CartContext rehydrates with empty cart
          window.location.replace('/horoscope');
        } catch (orderErr) {
          console.error('Failed to create order:', orderErr);
          setError('Payment succeeded but order creation failed. Please contact support.');
          setSubmitting(false);
        }
      } else {
        setMessage(`Payment status: ${result.paymentIntent.status}`);
        setSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: 'grid', gap: 12 }}>
      <PaymentElement />
      <button className="btn btn-primary" type="submit" disabled={!stripe || submitting}>
        {submitting ? 'Processing…' : 'Pay now'}
      </button>
      {message && <p style={{ color: '#22c55e' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
};

const Checkout: React.FC = () => {
  const { user } = useAuth();
  const { total, items } = useCart();
  const [publishableKey, setPublishableKey] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Early return if cart is empty
  if (total <= 0 || items.length === 0) {
    return <div className="card">Your cart is empty. Add items before checking out.</div>;
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const pk = await fetchPublishableKey();
        if (!active) return;
        if (!pk) throw new Error('Missing Stripe publishable key');
        setPublishableKey(pk);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || 'Could not load Stripe config');
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!publishableKey) return;
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      setInfo(null);
      try {
        const amountCents = Math.round(total * 100);
        const resp = await createIntent(amountCents, 'SEK', user?.token);
        if (!active) return;
        if (!resp.clientSecret) {
          throw new Error('No client secret in response');
        }
        setClientSecret(resp.clientSecret);
      } catch (err: any) {
        console.error('Payment intent error:', err);
        if (!active) return;
        setError(err?.message || 'Failed to create payment intent');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [publishableKey, total, user?.token]);

  const stripePromise = useMemo(() => publishableKey ? loadStripe(publishableKey) : null, [publishableKey]);

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: { theme: 'night' }
  };

  if (loading) return <div className="card">Loading checkout…</div>;
  if (error) return <div className="card" style={{ color: 'red' }}>{error}</div>;
  if (info) return <div className="card">{info}</div>;
  if (!stripePromise) return <div className="card">Stripe is not configured.</div>;
  if (!clientSecret) return <div className="card">Preparing checkout… (Total: {total} SEK, Items: {total > 0 ? 'Yes' : 'Empty cart'})</div>;

  return (
    <div className="container" style={{ display: 'grid', gap: 12 }}>
      <h2>Checkout</h2>
      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm clientSecret={clientSecret} />
      </Elements>
    </div>
  );
};

export default Checkout;
