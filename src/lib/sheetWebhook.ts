import { FeedbackTicket } from './feedbackManager';

/**
 * Google Sheet Webhook Dispatcher
 * Sends incoming user support tickets directly to a Google Sheet via Google Apps Script.
 * Uses text/plain and no-cors to prevent browser CORS preflight blocking on redirect.
 */

// Replace this with your deployed Google Apps Script Web App URL:
export const GOOGLE_SHEET_WEBHOOK_URL =
  (typeof window !== 'undefined' && (window as any).__LOCALPDF_SHEET_WEBHOOK_URL__) ||
  import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK_URL ||
  'https://script.google.com/macros/s/AKfycbz2PEQmlF3h6yC6VlvLP-PyyuE_wAzhVB-H6yBNo1T572aG-euAEq3DHqj_uwAP_Gwv/exec';

export async function sendTicketToGoogleSheet(
  ticket: FeedbackTicket,
  webhookUrl: string = GOOGLE_SHEET_WEBHOOK_URL
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl) {
    console.info('Google Sheet webhook URL not yet configured. Ticket saved in local store.');
    return { success: true };
  }

  try {
    const payload = {
      id: ticket.id,
      timestamp: ticket.timestamp,
      name: ticket.name,
      email: ticket.email,
      category: ticket.category,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
    };

    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return { success: true };
  } catch (err) {
    console.warn('Could not post ticket to Google Sheet webhook:', err);
    return { success: false, error: String(err) };
  }
}
