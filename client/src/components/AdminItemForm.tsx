import { useState, type FormEvent } from 'react';
import type { AuctionItem } from '../types';
import { adminCreateItem, adminUpdateItem, type ItemFormInput, ApiError } from '../api';
import { Modal } from './Modal';

interface AdminItemFormProps {
  /** Existing item to edit, or null to create a new one. */
  item: AuctionItem | null;
  onClose: () => void;
  onSaved: () => void;
}

type FormState = {
  title: string;
  description: string;
  value: string;
  minimum_bid: string;
  increment: string;
  quantity: string;
  threshold: string;
  image_url: string;
  contact: string;
  product_at_event: boolean;
  sort_order: string;
};

function toFormState(item: AuctionItem | null): FormState {
  return {
    title: item?.title ?? '',
    description: item?.description ?? '',
    value: item ? String(item.value) : '',
    minimum_bid: item ? String(item.minimum_bid) : '',
    increment: item ? String(item.increment) : '5',
    quantity: item ? String(item.quantity) : '1',
    threshold: item?.threshold != null ? String(item.threshold) : '',
    image_url: item?.image_url ?? '',
    contact: item?.contact ?? '',
    product_at_event: item?.product_at_event ?? false,
    sort_order: item ? String(item.sort_order) : '0',
  };
}

export function AdminItemForm({ item, onClose, onSaved }: AdminItemFormProps): JSX.Element {
  const [form, setForm] = useState<FormState>(() => toFormState(item));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = item !== null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload: ItemFormInput = {
      title: form.title.trim(),
      description: form.description.trim(),
      value: Number(form.value),
      minimum_bid: Number(form.minimum_bid),
      increment: Number(form.increment),
      quantity: Number(form.quantity),
      threshold: form.threshold.trim() === '' ? null : Number(form.threshold),
      image_url: form.image_url.trim() === '' ? null : form.image_url.trim(),
      contact: form.contact.trim() === '' ? null : form.contact.trim(),
      product_at_event: form.product_at_event,
      sort_order: Number(form.sort_order),
    };

    try {
      if (isEdit && item) {
        await adminUpdateItem(item.id, payload);
      } else {
        await adminCreateItem(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save item.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      titleId="item-form-title"
      title={isEdit ? 'Edit item' : 'New auction item'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        <div className="field">
          <label htmlFor="f-title">Title</label>
          <input
            id="f-title"
            type="text"
            required
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="f-desc">Description</label>
          <textarea
            id="f-desc"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="f-value">Retail value ($)</label>
            <input
              id="f-value"
              type="number"
              min="0"
              required
              value={form.value}
              onChange={(e) => update('value', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="f-min">Minimum bid ($)</label>
            <input
              id="f-min"
              type="number"
              min="0"
              required
              value={form.minimum_bid}
              onChange={(e) => update('minimum_bid', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="f-inc">Increment ($)</label>
            <input
              id="f-inc"
              type="number"
              min="1"
              required
              value={form.increment}
              onChange={(e) => update('increment', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="f-qty">Quantity available</label>
            <input
              id="f-qty"
              type="number"
              min="1"
              required
              value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="f-threshold">Winning threshold ($) — for multiples</label>
          <input
            id="f-threshold"
            type="number"
            min="0"
            value={form.threshold}
            onChange={(e) => update('threshold', e.target.value)}
            aria-describedby="f-threshold-hint"
          />
          <p id="f-threshold-hint" className="field__hint">
            Leave blank for single items. For multiples, top bidders must exceed this to win.
          </p>
        </div>

        <div className="field">
          <label htmlFor="f-image">Image</label>
          <input
            id="f-image"
            type="text"
            placeholder="/items/photo.jpg or https://…"
            value={form.image_url}
            onChange={(e) => update('image_url', e.target.value)}
            aria-describedby="f-image-hint"
          />
          <p id="f-image-hint" className="field__hint">
            A site path like /items/twins.jpg (file lives in client/public/items/) or a full image URL.
          </p>
        </div>

        <div className="field">
          <label htmlFor="f-contact">Donor / contact (private)</label>
          <input
            id="f-contact"
            type="text"
            value={form.contact}
            onChange={(e) => update('contact', e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="f-sort">Display order</label>
            <input
              id="f-sort"
              type="number"
              value={form.sort_order}
              onChange={(e) => update('sort_order', e.target.value)}
            />
          </div>
          <div className="field field--checkbox" style={{ alignSelf: 'end', paddingBottom: '0.9rem' }}>
            <input
              id="f-event"
              type="checkbox"
              checked={form.product_at_event}
              onChange={(e) => update('product_at_event', e.target.checked)}
            />
            <label htmlFor="f-event" style={{ margin: 0 }}>
              Available at the event
            </label>
          </div>
        </div>

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create item'}
        </button>
      </form>
    </Modal>
  );
}
