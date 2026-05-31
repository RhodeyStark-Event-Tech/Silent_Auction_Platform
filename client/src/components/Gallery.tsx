import { useState } from 'react';
import { galleryPhotos } from '../content';

function GalleryTile({ src, alt }: { src: string | null; alt: string }): JSX.Element {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <li className="gallery__item">
        <div className="gallery__placeholder" role="img" aria-label={`${alt} (photo coming soon)`}>
          <span aria-hidden="true">📷</span>
        </div>
      </li>
    );
  }
  return (
    <li className="gallery__item">
      <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
    </li>
  );
}

/** A small photo gallery celebrating Ashleigh. */
export function Gallery(): JSX.Element {
  return (
    <section className="gallery" aria-labelledby="gallery-heading">
      <div className="container">
        <h2 id="gallery-heading" className="visually-hidden">
          Photo gallery
        </h2>
        <ul className="gallery__grid">
          {galleryPhotos.map((photo, i) => (
            <GalleryTile key={i} src={photo.src} alt={photo.alt} />
          ))}
        </ul>
      </div>
    </section>
  );
}
