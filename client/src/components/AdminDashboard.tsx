import { useEffect, useState } from 'react';
import type { AuctionItem, AuctionResult, AdminBid } from '../types';
import {
  fetchItems,
  adminDeleteItem,
  adminClearItemBids,
  adminFetchItemBids,
  adminDeleteBid,
  adminFetchResults,
  adminNotifyWinners,
  adminExportWinners,
  clearToken,
  ApiError,
} from '../api';
import { money } from '../utils/format';
import { AdminItemForm } from './AdminItemForm';

interface AdminDashboardProps {
  onLogout: () => void;
  onExit: () => void;
}

type Tab = 'items' | 'results';

export function AdminDashboard({ onLogout, onExit }: AdminDashboardProps): JSX.Element {
  const [tab, setTab] = useState<Tab>('items');
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [results, setResults] = useState<AuctionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AuctionItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadItems(): Promise<void> {
    setLoading(true);
    try {
      const res = await fetchItems({ fresh: true });
      setItems(res.items);
      setError(null);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadResults(): Promise<void> {
    setLoading(true);
    try {
      const res = await adminFetchResults();
      setResults(res.results);
      setError(null);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  function handleError(err: unknown): void {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      onLogout();
      return;
    }
    setError(err instanceof ApiError ? err.message : 'Something went wrong.');
  }

  useEffect(() => {
    if (tab === 'items') void loadItems();
    else void loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleDelete(item: AuctionItem): Promise<void> {
    if (!window.confirm(`Delete "${item.title}"? This also removes its bids.`)) return;
    try {
      await adminDeleteItem(item.id);
      await loadItems();
    } catch (err) {
      handleError(err);
    }
  }

  async function handleClearBids(item: AuctionItem): Promise<void> {
    if (
      !window.confirm(
        `Clear all ${item.bid_count} bid(s) for "${item.title}"? The item stays; this cannot be undone.`,
      )
    )
      return;
    try {
      const res = await adminClearItemBids(item.id);
      setNotice(`Cleared ${res.cleared} bid(s) from "${item.title}".`);
      if (openBids?.itemId === item.id) setOpenBids(null);
      await loadItems();
    } catch (err) {
      handleError(err);
    }
  }

  // Inline per-item bid list (with per-bid delete), toggled open from the row.
  const [openBids, setOpenBids] = useState<{ itemId: string; bids: AdminBid[] } | null>(null);
  const [bidsLoading, setBidsLoading] = useState(false);

  async function toggleBids(item: AuctionItem): Promise<void> {
    if (openBids?.itemId === item.id) {
      setOpenBids(null);
      return;
    }
    setBidsLoading(true);
    try {
      const res = await adminFetchItemBids(item.id);
      setOpenBids({ itemId: item.id, bids: res.bids });
    } catch (err) {
      handleError(err);
    } finally {
      setBidsLoading(false);
    }
  }

  async function handleDeleteBid(bid: AdminBid): Promise<void> {
    if (!window.confirm(`Delete the ${money(bid.amount)} bid from ${bid.bidder_name}? This cannot be undone.`))
      return;
    try {
      await adminDeleteBid(bid.id);
      const res = await adminFetchItemBids(bid.item_id);
      setOpenBids({ itemId: bid.item_id, bids: res.bids });
      await loadItems();
    } catch (err) {
      handleError(err);
    }
  }

  async function handleNotify(itemId?: string): Promise<void> {
    const instructions = window.prompt(
      'Enter the prize pickup instructions to email to winners:',
      'Please reply to this email to arrange pickup of your prize at the event.',
    );
    if (!instructions) return;
    try {
      const res = await adminNotifyWinners(instructions, itemId);
      setNotice(
        `Notified ${res.notified} winner(s).` +
          (res.failures.length ? ` ${res.failures.length} failed.` : ''),
      );
    } catch (err) {
      handleError(err);
    }
  }

  const [exporting, setExporting] = useState(false);

  async function handleExport(): Promise<void> {
    if (
      !window.confirm(
        'Export the current winners to Google Sheets? This overwrites the sheet with a fresh snapshot.',
      )
    )
      return;
    setExporting(true);
    setNotice(null);
    try {
      const res = await adminExportWinners();
      setNotice(`Exported ${res.exported} winner row(s) to Google Sheets.`);
    } catch (err) {
      handleError(err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="admin-wrap">
      <div className="container">
        <div className="admin-toolbar">
          <h1 style={{ margin: 0 }}>Admin dashboard</h1>
          <div className="admin-actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={onExit}>
              View site
            </button>
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => {
                clearToken();
                onLogout();
              }}
            >
              Log out
            </button>
          </div>
        </div>

        <div className="admin-actions" role="tablist" aria-label="Admin sections" style={{ marginBottom: '1rem' }}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'items'}
            className={`btn btn--sm ${tab === 'items' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setTab('items')}
          >
            Items
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'results'}
            className={`btn btn--sm ${tab === 'results' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setTab('results')}
          >
            Winners
          </button>
        </div>

        {notice && (
          <div className="alert alert--success" role="status">
            {notice}
          </div>
        )}
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="spinner">Loading…</div>
        ) : tab === 'items' ? (
          <>
            <div className="admin-toolbar">
              <p style={{ margin: 0 }}>{items.length} item(s)</p>
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>
                + New item
              </button>
            </div>

            {items.map((item) => (
              <div key={item.id}>
                <div className="admin-item">
                  <div>
                    <strong>{item.title}</strong>
                    <div className="admin-item__meta">
                      Value {money(item.value)} · Min {money(item.minimum_bid)} · +
                      {money(item.increment)} · Qty {item.quantity}
                      {item.threshold != null ? ` · Threshold ${money(item.threshold)}` : ''} ·{' '}
                      {item.bid_count} bid(s)
                    </div>
                  </div>
                  <div className="admin-actions">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(item)}>
                      Edit
                    </button>
                    {item.bid_count > 0 && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        aria-expanded={openBids?.itemId === item.id}
                        onClick={() => void toggleBids(item)}
                      >
                        {openBids?.itemId === item.id ? 'Hide bids' : `Bids (${item.bid_count})`}
                      </button>
                    )}
                    {item.bid_count > 0 && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => handleClearBids(item)}
                      >
                        Clear bids
                      </button>
                    )}
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => handleDelete(item)}>
                      Delete
                    </button>
                  </div>
                </div>

                {openBids?.itemId === item.id && (
                  <div className="admin-item" style={{ display: 'block', background: 'var(--bg-soft, #f7f7f9)' }}>
                    {bidsLoading ? (
                      <p className="admin-item__meta">Loading bids…</p>
                    ) : openBids.bids.length === 0 ? (
                      <p className="admin-item__meta">No bids on this item.</p>
                    ) : (
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                        {openBids.bids.map((bid) => (
                          <li
                            key={bid.id}
                            className="admin-item__meta"
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.4rem 0',
                              borderTop: '1px solid var(--border, #eee)',
                            }}
                          >
                            <span>
                              <strong>{money(bid.amount)}</strong> · {bid.bidder_name} · {bid.bidder_email} ·{' '}
                              {bid.bidder_phone}
                            </span>
                            <button
                              type="button"
                              className="btn btn--danger btn--sm"
                              onClick={() => handleDeleteBid(bid)}
                            >
                              Delete
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="admin-toolbar">
              <p style={{ margin: 0 }}>Computed winners (honours multiples &amp; thresholds)</p>
              <div className="admin-actions">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => void handleExport()}
                  disabled={exporting}
                >
                  {exporting ? 'Exporting…' : 'Export to Google Sheets'}
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleNotify()}>
                  Email all winners
                </button>
              </div>
            </div>

            {results.map(({ item, winners }) => (
              <div key={item.id} className="admin-item" style={{ display: 'block' }}>
                <strong>{item.title}</strong>
                {winners.length === 0 ? (
                  <p className="admin-item__meta">No qualifying winners yet.</p>
                ) : (
                  <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
                    {winners.map(({ bid, rank }) => (
                      <li key={bid.id} className="admin-item__meta">
                        #{rank} · {bid.bidder_name} ({bid.bidder_email}, {bid.bidder_phone}) —{' '}
                        <strong>{money(bid.amount)}</strong>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {creating && (
        <AdminItemForm
          item={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void loadItems();
          }}
        />
      )}
      {editing && (
        <AdminItemForm
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void loadItems();
          }}
        />
      )}
    </div>
  );
}
