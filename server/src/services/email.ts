import type { AuctionItem, Bid } from '../types.js';

/**
 * Pluggable email delivery.
 *
 * To keep setup zero-config, the default transport simply logs the message.
 * When a RESEND_API_KEY is present the same payload is sent via Resend's HTTP
 * API (no extra dependency — just fetch). Swap in SendGrid/SES/nodemailer here
 * without touching callers.
 */

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

async function deliver(message: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'Auction <onboarding@resend.dev>';

  if (!apiKey) {
    // Fallback transport: log so winners can be notified manually if needed.
    console.info('[email:dev] Would send email →', {
      from,
      ...message,
    });
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: message.to, subject: message.subject, text: message.text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email delivery failed (${res.status}): ${body}`);
  }
}

/** Email a winning bidder with details on how to collect their prize. */
export async function sendWinnerEmail(
  item: AuctionItem,
  bid: Bid,
  pickupInstructions: string,
): Promise<void> {
  const text = [
    `Hi ${bid.bidder_name},`,
    '',
    `Great news — you won "${item.title}" with your bid of $${bid.amount}!`,
    '',
    `How to receive your prize:`,
    pickupInstructions,
    '',
    item.contact ? `Donor contact: ${item.contact}` : '',
    '',
    'Thank you so much for supporting Ashleigh. Every bid makes a difference. 💙',
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  await deliver({
    to: bid.bidder_email,
    subject: `You won: ${item.title}`,
    text,
  });
}
