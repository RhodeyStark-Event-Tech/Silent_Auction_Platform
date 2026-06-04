import { useCallback, useEffect, useState } from 'react';
import type { AuctionItem } from './types';
import { fetchItems, adminVerify, getToken, clearToken } from './api';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Gallery } from './components/Gallery';
import { ItemCard } from './components/ItemCard';
import { BidModal } from './components/BidModal';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';

type View = 'public' | 'admin';

export default function App(): JSX.Element {
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [bidItem, setBidItem] = useState<AuctionItem | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [view, setView] = useState<View>('public');
  const [isAdmin, setIsAdmin] = useState(false);

  // A guest who scans an item's QR code lands on `/?item=<id>` — show just that
  // item. Empty when browsing normally.
  const [focusedItemId, setFocusedItemId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('item'),
  );

  function backToAll(): void {
    setFocusedItemId(null);
    window.history.pushState({}, '', window.location.pathname);
  }

  const loadItems = useCallback(async (fresh = false): Promise<void> => {
    try {
      const res = await fetchItems(fresh ? { fresh: true } : undefined);
      setItems(res.items);
      setLoadError(null);
    } catch {
      setLoadError('We could not load the auction items. Please refresh to try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load uses the CDN cache; reloads after a bid (refreshKey > 0)
    // bypass it so the bidder sees their own bid immediately.
    void loadItems(refreshKey > 0);
  }, [loadItems, refreshKey]);

  // Restore an existing admin session on load.
  useEffect(() => {
    if (!getToken()) return;
    adminVerify()
      .then(() => setIsAdmin(true))
      .catch(() => clearToken());
  }, []);

  const handleBidSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  function handleAdminClick(): void {
    if (isAdmin) setView('admin');
    else setShowLogin(true);
  }

  if (view === 'admin' && isAdmin) {
    return (
      <>
        <Nav onAdminClick={handleAdminClick} isAdmin={isAdmin} />
        <main id="main">
          <AdminDashboard
            onLogout={() => {
              setIsAdmin(false);
              setView('public');
            }}
            onExit={() => setView('public')}
          />
        </main>
      </>
    );
  }

  // Deep-linked single item (e.g. scanned from a printed QR code at the event).
  if (focusedItemId) {
    const focusedItem = items.find((i) => i.id === focusedItemId) ?? null;
    return (
      <>
        <Nav onAdminClick={handleAdminClick} isAdmin={isAdmin} />
        <main id="main">
          <div className="container" style={{ paddingTop: '1.5rem' }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={backToAll}>
              ← See all items
            </button>

            {loading ? (
              <div className="spinner" role="status">
                Loading…
              </div>
            ) : focusedItem ? (
              <section
                className="items items--single"
                aria-label={focusedItem.title}
                style={{ marginTop: '1rem' }}
              >
                <ItemCard item={focusedItem} onBid={(it) => setBidItem(it)} />
              </section>
            ) : (
              <div className="alert alert--error" role="alert" style={{ marginTop: '1rem' }}>
                Sorry, we couldn’t find that item. Please pick it from the full list.
              </div>
            )}
          </div>
        </main>

        {bidItem && (
          <BidModal
            item={bidItem}
            onClose={() => setBidItem(null)}
            onSuccess={() => handleBidSuccess()}
          />
        )}
        {showLogin && (
          <AdminLogin
            onClose={() => setShowLogin(false)}
            onSuccess={() => {
              setShowLogin(false);
              setIsAdmin(true);
              setView('admin');
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <a className="skip-link" href="#auction-items">
        Skip to auction items
      </a>
      <Nav onAdminClick={handleAdminClick} isAdmin={isAdmin} />

      <main id="main">
        <Hero />
        <Gallery />

        <div className="container">
          <div className="section-head">
            <h2 id="auction-items">Auction items</h2>
            <p>Bid generously — every dollar supports Ashleigh.</p>
          </div>

          {loadError && (
            <div className="alert alert--error" role="alert">
              {loadError}
            </div>
          )}

          {loading ? (
            <div className="spinner" role="status">
              Loading auction items…
            </div>
          ) : (
            <section className="items" aria-label="Auction items">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onBid={(it) => setBidItem(it)}
                />
              ))}
            </section>
          )}
        </div>

        <footer className="footer">
          <p>Thank you for supporting Ashleigh. ♥</p>
        </footer>
      </main>

      {bidItem && (
        <BidModal
          item={bidItem}
          onClose={() => setBidItem(null)}
          onSuccess={() => {
            handleBidSuccess();
          }}
        />
      )}

      {showLogin && (
        <AdminLogin
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            setIsAdmin(true);
            setView('admin');
          }}
        />
      )}
    </>
  );
}
