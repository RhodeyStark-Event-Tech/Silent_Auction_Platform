interface NavProps {
  onAdminClick: () => void;
  isAdmin: boolean;
}

/** Top navigation bar with the brand and the red-circle admin login button. */
export function Nav({ onAdminClick, isAdmin }: NavProps): JSX.Element {
  return (
    <header className="nav">
      <div className="container nav__inner">
        <div className="nav__brand">
          <span className="nav__heart" aria-hidden="true">
            ♥
          </span>
          <span>Ashleigh&rsquo;s Silent Auction</span>
        </div>

        <button
          type="button"
          className="admin-dot"
          onClick={onAdminClick}
          aria-label={isAdmin ? 'Open admin dashboard' : 'Admin login'}
          title={isAdmin ? 'Admin dashboard' : 'Admin login'}
        />
      </div>
    </header>
  );
}
