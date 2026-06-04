import { useState } from 'react';
import type { AuctionItem } from '../types';
import { money, itemEmoji } from '../utils/format';
import { BidList } from './BidList';

interface ItemCardProps {
  item: AuctionItem;
  onBid: (item: AuctionItem) => void;
}

export function ItemCard({ item, onBid }: ItemCardProps): JSX.Element {
  const [imgFailed, setImgFailed] = useState(false);
  const isMultiple = item.quantity > 1;

  // Leaderboard is embedded in the item from /api/items — no extra fetch.
  const showImage = item.image_url && !imgFailed;

  return (
    <article className="item-card" aria-labelledby={`item-${item.id}-title`}>
      <div className="item-card__media">
        {isMultiple && (
          <span className="badge badge--multiple">{item.quantity} available</span>
        )}
        {showImage ? (
          <img
            src={item.image_url ?? ''}
            alt={item.title}
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="item-card__media-placeholder" role="img" aria-label={item.title}>
            <span aria-hidden="true">{itemEmoji(item.title)}</span>
          </div>
        )}
      </div>

      <div className="item-card__body">
        <h3 className="item-card__title" id={`item-${item.id}-title`}>
          {item.title}
        </h3>
        <p className="item-card__desc">{item.description}</p>

        {item.product_at_event && (
          <p className="badge badge--event">
            Available at the event
          </p>
        )}

        <div className="item-card__stats">
          <div className="stat">
            <span className="stat__label">Retail value</span>
            <span className="stat__value">{money(item.value)}</span>
          </div>
          <div className="stat">
            <span className="stat__label">
              {item.current_high_bid ? 'Top bid' : 'Minimum bid'}
            </span>
            <span className={`stat__value ${item.current_high_bid ? 'stat__value--high' : ''}`}>
              {money(item.current_high_bid ?? item.minimum_bid)}
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">Next bid ≥</span>
            <span className="stat__value">{money(item.next_minimum_bid)}</span>
          </div>
          <div className="stat">
            <span className="stat__label">Increment</span>
            <span className="stat__value">{money(item.increment)}</span>
          </div>
        </div>

        {isMultiple && item.threshold !== null && (
          <p className="field__hint">
            Top {item.quantity} bidders over {money(item.threshold)} each win one.
          </p>
        )}

        <div>
          <h4 className="visually-hidden">Current bids for {item.title}</h4>
          <BidList bids={item.bids} winningCount={item.quantity} />
        </div>

        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() => onBid(item)}
        >
          Place a bid
        </button>
      </div>
    </article>
  );
}
