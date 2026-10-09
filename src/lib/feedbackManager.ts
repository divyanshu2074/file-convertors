export interface FeedbackTicket {
  id: string;
  name: string;
  email: string;
  category: 'concern' | 'query' | 'bug' | 'feature' | 'other';
  subject: string;
  message: string;
  timestamp: string; // ISO string
  status: 'open' | 'in_progress' | 'resolved';
  resolvedAt?: string;
  resolutionNote?: string;
}

const STORAGE_KEY = 'localpdf_feedback_tickets';

export function getTickets(): FeedbackTicket[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultTickets();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : getDefaultTickets();
  } catch {
    return getDefaultTickets();
  }
}

export function saveTicket(ticket: Omit<FeedbackTicket, 'id' | 'timestamp' | 'status'>): FeedbackTicket {
  const all = getTickets();
  const newTicket: FeedbackTicket = {
    ...ticket,
    id: `TCK-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    status: 'open',
  };
  const updated = [newTicket, ...all];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save ticket to localStorage:', err);
  }
  return newTicket;
}

export function updateTicketStatus(
  id: string,
  status: 'open' | 'in_progress' | 'resolved',
  resolutionNote?: string
): FeedbackTicket[] {
  const all = getTickets();
  const updated = all.map((t) => {
    if (t.id === id) {
      return {
        ...t,
        status,
        resolutionNote: resolutionNote !== undefined ? resolutionNote : t.resolutionNote,
        resolvedAt: status === 'resolved' ? new Date().toISOString() : t.resolvedAt,
      };
    }
    return t;
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update ticket in localStorage:', err);
  }
  return updated;
}

export function deleteTicket(id: string): FeedbackTicket[] {
  const all = getTickets();
  const updated = all.filter((t) => t.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete ticket in localStorage:', err);
  }
  return updated;
}

function escapeCsvField(val: string): string {
  if (!val) return '""';
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function ticketToCsvRow(t: FeedbackTicket): string {
  return [
    escapeCsvField(t.id),
    escapeCsvField(t.timestamp),
    escapeCsvField(t.name),
    escapeCsvField(t.email),
    escapeCsvField(t.category),
    escapeCsvField(t.subject),
    escapeCsvField(t.message),
    escapeCsvField(t.status),
  ].join(',');
}

export function ticketsToCsv(tickets: FeedbackTicket[]): string {
  const header = 'Ticket ID,Timestamp,Name,Email,Category,Subject,Message,Status';
  const rows = tickets.map(ticketToCsvRow);
  return [header, ...rows].join('\n');
}

export function downloadSupportTicketsCsv(tickets?: FeedbackTicket[], filename = 'support_tickets.csv') {
  const data = tickets || getTickets();
  const csvContent = ticketsToCsv(data);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getDefaultTickets(): FeedbackTicket[] {
  return [
    {
      id: 'TCK-DEMO-01',
      name: 'System Test User',
      email: 'user@example.com',
      category: 'query',
      subject: 'Welcome to LocalPDF Feedback Desk',
      message: 'This is a sample ticket verifying the repository inquiry tracking system.',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      status: 'resolved',
      resolvedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      resolutionNote: 'Sample ticket verified and acknowledged.',
    },
  ];
}
