const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function money(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return currency.format(amount);
}

/** A short emoji hint based on item keywords — purely decorative placeholder art. */
export function itemEmoji(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('golf')) return '⛳';
  if (t.includes('wine') || t.includes('cocktail') || t.includes('whiskey')) return '🍷';
  if (t.includes('jersey') || t.includes('soccer')) return '🏟️';
  if (t.includes('twins') || t.includes('baseball')) return '⚾';
  if (t.includes('wild') || t.includes('hockey') || t.includes('kraken')) return '🏒';
  if (t.includes('lynx') || t.includes('basketball')) return '🏀';
  if (t.includes('art') || t.includes('mandala')) return '🎨';
  if (t.includes('botox') || t.includes('skincare') || t.includes('facial')) return '✨';
  if (t.includes('dairy queen') || t.includes('dilly')) return '🍦';
  if (t.includes('fish')) return '🎣';
  if (t.includes('jewelry') || t.includes('diamond')) return '💎';
  if (t.includes('restaurant') || t.includes('gift card')) return '🍽️';
  if (t.includes('training') || t.includes('life time') || t.includes('pilates')) return '💪';
  return '🎁';
}
