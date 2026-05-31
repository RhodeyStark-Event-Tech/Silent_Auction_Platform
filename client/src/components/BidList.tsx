import type { PublicBid } from '../types';
import { money } from '../utils/format';

interface BidListProps {
  bids: PublicBid[];
  /** Highlight the top N as standing/winning (item quantity). */
  winningCount: number;
  limit?: number;
}

/**
 * Anonymised leaderboard: shows only each bidder's initials and amount, sorted
 * strongest-first, to entice higher bids without exposing any personal info.
 */
export function BidList({ bids, winningCount, limit = 5 }: BidListProps): JSX.Element {
  if (bids.length === 0) {
    return <p className="bidlist__empty">No bids yet — be the first to bid!</p>;
  }

  const shown = bids.slice(0, limit);

  return (
    <ol className="bidlist" aria-label="Current bids, highest first">
      {shown.map((bid, index) => (
        <li key={bid.id} className="bidlist__row">
          <span className="bidlist__rank" aria-hidden="true">
            {index + 1}.
          </span>
          <span className="bidlist__initials">
            {bid.initials}
            {index < winningCount && (
              <span className="badge" style={{ marginLeft: '0.4rem', color: 'var(--accent)' }}>
                ★
              </span>
            )}
          </span>
          <span className="bidlist__amount">{money(bid.amount)}</span>
        </li>
      ))}
      {bids.length > shown.length && (
        <li className="bidlist__empty">+ {bids.length - shown.length} more bid(s)</li>
      )}
    </ol>
  );
}
