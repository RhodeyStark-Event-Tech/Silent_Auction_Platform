/**
 * Editable site content. Drop in real copy and photos here without touching
 * component code.
 *
 * PHOTOS: place image files in `client/public/gallery/` and `client/public/`,
 * then reference them by their public path (e.g. "/gallery/photo1.jpg").
 * Any entry left as null renders a friendly placeholder tile instead.
 */

export const heroContent = {
  eyebrow: 'Bid with heart',
  name: 'Ashleigh',
  /** Personal blurb about Ashleigh and her needs. Replace with real copy. */
  blurb:
    'We are rallying around Ashleigh — an athlete, friend, and fighter — to help cover the costs of her care and recovery. Every bid in this silent auction goes directly toward supporting her on this journey. Thank you for showing up, bidding generously, and being part of her team. 💙',
  /** Public path to the hero portrait, or null for a placeholder. */
  photo: '/hero.jpg' as string | null,
};

/** Up to 5 gallery photos. Set a path string to show a photo, or null for a placeholder. */
export const galleryPhotos: Array<{ src: string | null; alt: string }> = [
  { src: '/gallery/photo1.jpg', alt: 'Ashleigh smiling in athletic wear at the gym' },
  { src: '/gallery/photo2.jpg', alt: 'Ashleigh in a white dress at a waterfront dinner, with a colorful bouquet on the table' },
  { src: '/gallery/photo3.jpg', alt: 'Ashleigh hugging her daughter outdoors' },
  { src: '/gallery/photo4.jpg', alt: 'Ashleigh and her family outdoors' },
  { src: '/gallery/photo5.jpg', alt: 'Ashleigh posing confidently behind the Fearless Girl statue in New York City' },
];
