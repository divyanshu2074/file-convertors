import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Code,
  User,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { saveTicket } from '../lib/feedbackManager';
import { sendFeedbackEmail } from '../lib/emailService';
import confetti from 'canvas-confetti';

interface ContactModalProps {
  onClose: () => void;
  onOpenAdmin?: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ onClose, onOpenAdmin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<'concern' | 'query' | 'bug' | 'feature' | 'other'>('query');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      // 1. Save ticket locally for ticket tracking and admin resolution
      const ticket = saveTicket({
        name: name.trim(),
        email: email.trim(),
        category,
        subject: subject.trim(),
        message: message.trim(),
      });

      // 2. Dispatch to developer's email: divyanshu2074@gmail.com
      const emailRes = await sendFeedbackEmail(ticket);

      confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
      setSubmittedTicketId(ticket.id);

      // If email relay returned mailto link fallback, trigger it
      if ((emailRes as any).mailtoUrl) {
        window.open((emailRes as any).mailtoUrl, '_blank');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to submit ticket. Please try again or reach out directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">Developer Contact & Support</h3>
              <p className="text-xs text-neutral-500">Connect directly or submit queries & concerns</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-left">
          {/* Developer Profile Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-base">Divyanshu Gupta</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Lead Developer
                </span>
              </div>
              <p className="text-xs text-neutral-300">
                Full-Stack & In-Browser Systems Architect • LocalPDF Creator
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs text-neutral-400">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                <span>divyanshu2074@gmail.com</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://www.linkedin.com/in/divyanshu-gupta-dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.79v8.37H6.46v-8.37M7.86 6.54a1.63 1.63 0 0 0-1.63 1.63c0 .9.73 1.63 1.63 1.63.9 0 1.63-.73 1.63-1.63 0-.9-.73-1.63-1.63-1.63" />
                </svg>
                <span>LinkedIn Profile</span>
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
              </a>

              {onOpenAdmin && (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
                  title="Developer Admin Desk"
                >
                  Admin Desk
                </button>
              )}
            </div>
          </div>

          {/* Feedback Form / Confirmation */}
          {submittedTicketId ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-emerald-900">Query Received & Dispatched!</h4>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                Your message has been sent directly to <strong>divyanshu2074@gmail.com</strong>.
                Ticket ID: <span className="font-mono font-bold text-emerald-950">{submittedTicketId}</span>.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={() => {
                    setSubmittedTicketId(null);
                    setSubject('');
                    setMessage('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  Submit Another Query
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  Raise Concerns & Inquiries
                </h4>
                <span className="text-[11px] text-neutral-400">Direct Notification to Developer</span>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Smith"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">Your Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-white"
                  >
                    <option value="query">General Query</option>
                    <option value="concern">Concern / Feedback</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">Subject *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of the query..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Detailed Message *</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your question, concern, or feedback in detail..."
                  className="w-full p-3 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-neutral-400">
                  Transmitted directly to divyanshu2074@gmail.com
                </span>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Sending...' : 'Send to Developer'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
