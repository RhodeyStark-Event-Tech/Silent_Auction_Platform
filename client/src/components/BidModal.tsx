import { useState, type FormEvent } from 'react';
import type { AuctionItem } from '../types';
import { placeBid, ApiError } from '../api';
import { money } from '../utils/format';
import { Modal } from './Modal';

interface BidModalProps {
  item: AuctionItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function BidModal({ item, onClose, onSuccess }: BidModalProps): JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<string>(String(item.next_minimum_bid));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const titleId = `bid-modal-${item.id}`;

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await placeBid({
        item_id: item.id,
        bidder_name: name.trim(),
        bidder_email: email.trim(),
        bidder_phone: phone.trim(),
        amount: Number(amount),
      });
      setSuccess(true);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.nextMinimumBid !== undefined) setAmount(String(err.nextMinimumBid));
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal titleId={titleId} title={`Bid on ${item.title}`} onClose={onClose}>
      {success ? (
        <div>
          <div className="alert alert--success" role="status">
            🎉 Your bid of {money(Number(amount))} has been placed! If you win, we&rsquo;ll email
            you with details on how to receive your prize.
          </div>
          <button type="button" className="btn btn--primary btn--block" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="alert alert--info">
            Minimum next bid: <strong>{money(item.next_minimum_bid)}</strong> · increments of{' '}
            {money(item.increment)}
          </div>

          {error && (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          )}

          <div className="field">
            <label htmlFor="bid-name">Full name</label>
            <input
              id="bid-name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="bid-email">Email address</label>
            <input
              id="bid-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="bid-phone">Phone number</label>
            <input
              id="bid-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="bid-amount">Your bid (USD)</label>
            <input
              id="bid-amount"
              type="number"
              inputMode="numeric"
              min={item.next_minimum_bid}
              step={item.increment}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-describedby="bid-amount-hint"
            />
            <p id="bid-amount-hint" className="field__hint">
              Your contact details stay private — other bidders only see your initials and bid
              amount.
            </p>
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={submitting}
          >
            {submitting ? 'Placing bid…' : `Place bid of ${money(Number(amount) || 0)}`}
          </button>
        </form>
      )}
    </Modal>
  );
}
