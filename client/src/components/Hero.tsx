import { useState } from 'react';
import { heroContent } from '../content';

/** Intro section: portrait of Ashleigh plus a blurb about her and her needs. */
export function Hero(): JSX.Element {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = heroContent.photo && !photoFailed;

  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="container">
        <div className="hero__card">
          {showPhoto ? (
            <img
              className="hero__photo"
              src={heroContent.photo ?? ''}
              alt={`Portrait of ${heroContent.name}`}
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <div
              className="hero__photo hero__photo--placeholder"
              role="img"
              aria-label={`Portrait of ${heroContent.name} (photo coming soon)`}
            >
              <span aria-hidden="true">📷 Photo coming soon</span>
            </div>
          )}

          <div className="hero__body">
            <p className="hero__eyebrow">{heroContent.eyebrow}</p>
            <h1 id="hero-heading">Supporting {heroContent.name}</h1>
            <p>{heroContent.blurb}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
