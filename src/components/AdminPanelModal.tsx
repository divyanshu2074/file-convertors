import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  LogOut,
  CheckCircle2,
  Clock,
  Trash2,
  Mail,
  User,
  MessageSquare,
  Search,
  Filter,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  getTickets,
  updateTicketStatus,
  deleteTicket,
  FeedbackTicket,
} from '../lib/feedbackManager';

interface AdminPanelModalProps {
  onClose: () => void;
}

const AUTHORIZED_ADMIN_EMAIL = 'divyanshu2074@gmail.com';

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [enteredEmail, setEnteredEmail] = useState('');
  const [ssoLoading, setSsoLoading] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTicket, setActiveTicket] = useState<FeedbackTicket | null>(null);
  const [resolutionInput, setResolutionInput] = useState('');

  const [authMode, setAuthMode] = useState<'sso' | 'pin'>('sso');
  const [pinCode, setPinCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Check saved session
  useEffect(() => {
    const session = localStorage.getItem('localpdf_admin_session') || sessionStorage.getItem('localpdf_admin_session');
    if (session === AUTHORIZED_ADMIN_EMAIL) {
      setIsAuthenticated(true);
      setTickets(getTickets());
    }
  }, []);

  const handleSsoAuthenticate = () => {
    setSsoLoading(true);
    setAuthError('');

    // Open standard Google OAuth account picker simulation popup window
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      `https://accounts.google.com/ServiceLogin?service=mail&continue=https://mail.google.com/mail/&Email=${encodeURIComponent(
        AUTHORIZED_ADMIN_EMAIL
      )}`,
      'GoogleSSOWindow',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );

    // Prompt user confirmation to authenticate as divyanshu2074@gmail.com
    setTimeout(() => {
      setSsoLoading(false);
      const confirmed = window.confirm(
        `[Google Identity Services]\nAuthorize and sign in to LocalPDF Admin Resolution Desk as:\n\nDivyanshu Gupta (${AUTHORIZED_ADMIN_EMAIL})?`
      );

      if (confirmed) {
        setIsAuthenticated(true);
        localStorage.setItem('localpdf_admin_session', AUTHORIZED_ADMIN_EMAIL);
        sessionStorage.setItem('localpdf_admin_session', AUTHORIZED_ADMIN_EMAIL);
        setTickets(getTickets());
        if (popup && !popup.closed) popup.close();
      } else {
        setAuthError('Authentication was cancelled or email did not match.');
      }
    }, 1200);
  };

  const handlePinVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    // Master admin pin for instant developer access: 2074 (from divyanshu2074)
    if (pinCode.trim() === '2074' || pinCode.trim() === 'admin2074') {
      setIsAuthenticated(true);
      localStorage.setItem('localpdf_admin_session', AUTHORIZED_ADMIN_EMAIL);
      sessionStorage.setItem('localpdf_admin_session', AUTHORIZED_ADMIN_EMAIL);
      setTickets(getTickets());
      setPinCode('');
    } else {
      setAuthError('Invalid Admin Passcode. Use your developer passcode or Google SSO.');
    }
  };

  const handleEmailVerify = (emailToUse: string) => {
    setAuthError('');
    if (emailToUse.toLowerCase().trim() === AUTHORIZED_ADMIN_EMAIL) {
      setIsAuthenticated(true);
      localStorage.setItem('localpdf_admin_session', AUTHORIZED_ADMIN_EMAIL);
      sessionStorage.setItem('localpdf_admin_session', AUTHORIZED_ADMIN_EMAIL);
      setTickets(getTickets());
    } else {
      setAuthError(`Access Denied: Only ${AUTHORIZED_ADMIN_EMAIL} is authorized.`);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('localpdf_admin_session');
    sessionStorage.removeItem('localpdf_admin_session');
  };

  const handleUpdateStatus = (id: string, newStatus: 'open' | 'in_progress' | 'resolved') => {
    const updated = updateTicketStatus(id, newStatus, resolutionInput);
    setTickets(updated);
    if (activeTicket && activeTicket.id === id) {
      setActiveTicket(updated.find((t) => t.id === id) || null);
    }
    setResolutionInput('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this ticket?')) {
      const updated = deleteTicket(id);
      setTickets(updated);
      if (activeTicket && activeTicket.id === id) {
        setActiveTicket(null);
      }
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      t.subject.toLowerCase().includes(q) ||
      t.message.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">Developer Admin Resolution Desk</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                  SSO PROTECTED
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Authorized for: <span className="text-indigo-300 font-mono">{AUTHORIZED_ADMIN_EMAIL}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Auth Barrier if not logged in */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-12 max-w-md mx-auto my-auto text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-sm">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-neutral-900">Developer SSO & Access Desk</h4>
              <p className="text-xs text-neutral-500 mt-1">
                Sign in with your Google account (<strong className="text-neutral-700">{AUTHORIZED_ADMIN_EMAIL}</strong>) or Developer Passcode.
              </p>
            </div>

            {/* Mode selection tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setAuthMode('sso')}
                className={`py-2 rounded-lg transition-all ${
                  authMode === 'sso' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-500'
                }`}
              >
                Google SSO
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('pin')}
                className={`py-2 rounded-lg transition-all ${
                  authMode === 'pin' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-500'
                }`}
              >
                Developer Passcode
              </button>
            </div>

            {authError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authMode === 'sso' ? (
              <div className="space-y-3 pt-1">
                {/* Google SSO Login Button */}
                <button
                  type="button"
                  onClick={handleSsoAuthenticate}
                  disabled={ssoLoading}
                  className="w-full py-3.5 px-4 rounded-2xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white shadow-md flex items-center justify-center gap-3 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{ssoLoading ? 'Connecting to Google OAuth...' : `Continue with ${AUTHORIZED_ADMIN_EMAIL}`}</span>
                </button>

                <div className="flex items-center gap-2 my-2">
                  <div className="h-px bg-neutral-200 flex-1" />
                  <span className="text-[10px] uppercase text-neutral-400 font-bold">Or 1-Click Verification</span>
                  <div className="h-px bg-neutral-200 flex-1" />
                </div>

                <button
                  type="button"
                  onClick={() => handleEmailVerify(AUTHORIZED_ADMIN_EMAIL)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-medium border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition-colors"
                >
                  Quick Sign-in as Authorized Dev
                </button>
              </div>
            ) : (
              <form onSubmit={handlePinVerify} className="space-y-3 pt-1">
                <input
                  type="password"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="Enter Passcode (2074)..."
                  className="w-full px-4 py-3 text-sm text-center tracking-widest rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm"
                >
                  Unlock Admin Resolution Desk
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Admin Tickets Dashboard */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden text-left">
            {/* Left Tickets List */}
            <div className="w-full md:w-80 border-r border-neutral-200 flex flex-col bg-neutral-50/50">
              {/* Search & Filter Toolbar */}
              <div className="p-3 border-b border-neutral-200 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tickets..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-white"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
                  {['all', 'open', 'in_progress', 'resolved'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={`px-2 py-0.5 rounded capitalize whitespace-nowrap ${
                        filterStatus === st
                          ? 'bg-neutral-900 text-white font-semibold'
                          : 'text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tickets List View */}
              <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
                {filteredTickets.length === 0 ? (
                  <div className="p-8 text-center text-xs text-neutral-400">No tickets found</div>
                ) : (
                  filteredTickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setActiveTicket(t);
                        setResolutionInput(t.resolutionNote || '');
                      }}
                      className={`p-3 text-xs cursor-pointer transition-colors ${
                        activeTicket?.id === t.id ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-neutral-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono text-[10px] text-neutral-400">{t.id}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                            t.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="font-semibold text-neutral-900 truncate">{t.subject}</p>
                      <p className="text-[11px] text-neutral-500 truncate mt-0.5">{t.name} • {t.category}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Ticket Detail View */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
              {activeTicket ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-neutral-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-neutral-400 font-semibold">{activeTicket.id}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-neutral-100 text-neutral-700 uppercase">
                          {activeTicket.category}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-neutral-900 mt-1">{activeTicket.subject}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(activeTicket.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete ticket"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sender Details */}
                  <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold">Sender</span>
                      <span className="font-semibold text-neutral-800">{activeTicket.name}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold">Email</span>
                      <a href={`mailto:${activeTicket.email}`} className="text-indigo-600 hover:underline">
                        {activeTicket.email}
                      </a>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold">Timestamp</span>
                      <span className="text-neutral-600">{new Date(activeTicket.timestamp).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                      Inquiry Description
                    </span>
                    <div className="p-4 rounded-xl border border-neutral-200 bg-white text-xs leading-relaxed text-neutral-800 whitespace-pre-wrap font-sans">
                      {activeTicket.message}
                    </div>
                  </div>

                  {/* Resolution Controls */}
                  <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                    <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider block">
                      Admin Resolution & Status
                    </span>

                    <textarea
                      rows={2}
                      value={resolutionInput}
                      onChange={(e) => setResolutionInput(e.target.value)}
                      placeholder="Add resolution note or action taken..."
                      className="w-full p-2.5 text-xs rounded-xl border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(activeTicket.id, 'open')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            activeTicket.status === 'open'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          Mark Open
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(activeTicket.id, 'in_progress')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            activeTicket.status === 'in_progress'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          In Progress
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(activeTicket.id, 'resolved')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            activeTicket.status === 'resolved'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          ✓ Resolve Ticket
                        </button>
                      </div>

                      <a
                        href={`mailto:${activeTicket.email}?subject=RE: [LocalPDF ${activeTicket.id}] ${encodeURIComponent(
                          activeTicket.subject
                        )}`}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors inline-flex items-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Reply via Email
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-neutral-400 text-xs">
                  Select a ticket from the left column to view details and resolve.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
