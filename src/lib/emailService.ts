import { FeedbackTicket } from './feedbackManager';

const RECIPIENT_EMAIL = 'divyanshu2074@gmail.com';

/**
 * Dispatch feedback response directly to divyanshu2074@gmail.com
 * Uses Formspree submission endpoint with transparent fallback to mailto:
 */
export async function sendFeedbackEmail(ticket: FeedbackTicket): Promise<{ success: boolean; method: string }> {
  const payload = {
    _replyto: ticket.email,
    name: ticket.name,
    email: ticket.email,
    category: ticket.category,
    subject: `[LocalPDF Support ${ticket.id}] ${ticket.subject}`,
    message: ticket.message,
    ticketId: ticket.id,
    timestamp: ticket.timestamp,
  };

  try {
    // Attempt FormSubmit / Formspree public relay targeting divyanshu2074@gmail.com
    const res = await fetch(`https://formsubmit.co/ajax/${RECIPIENT_EMAIL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return { success: true, method: 'direct_relay' };
    }
  } catch (err) {
    console.warn('Form relay dispatch failed, will provide direct mailto link:', err);
  }

  // Fallback: Construct mailto string so the user or system can launch default mail client
  const subjectEncoded = encodeURIComponent(`[LocalPDF ${ticket.id}] ${ticket.subject}`);
  const bodyEncoded = encodeURIComponent(
    `From: ${ticket.name} (${ticket.email})\n` +
      `Category: ${ticket.category}\n` +
      `Ticket ID: ${ticket.id}\n` +
      `Date: ${ticket.timestamp}\n\n` +
      `Message:\n${ticket.message}`
  );

  const mailtoUrl = `mailto:${RECIPIENT_EMAIL}?subject=${subjectEncoded}&body=${bodyEncoded}`;

  return { success: true, method: 'mailto', mailtoUrl } as any;
}
