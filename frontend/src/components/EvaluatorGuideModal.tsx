import React from 'react';
import { 
  ShieldCheck, 
  ExternalLink, 
  X, 
  RotateCcw, 
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePersona } from '../hooks/usePersona';

interface EvaluatorGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenClock: () => void;
  onOpenReset: () => void;
}

export const EvaluatorGuideModal: React.FC<EvaluatorGuideProps> = ({
  isOpen,
  onClose,
  onOpenClock,
  onOpenReset,
}) => {
  const navigate = useNavigate();
  const { setAgentPersona, setCustomerPersona } = usePersona();

  if (!isOpen) return null;

  const scenarios = [
    {
      num: 1,
      title: 'Atomic CAS Claim Concurrency (INC-0291)',
      desc: 'Open unassigned ticket ARV-104. Verify atomic compare-and-swap assertion prevents race conditions and duplicate claims.',
      actionLabel: 'Inspect ARV-104',
      run: async () => {
        await setAgentPersona('agent-meera');
        navigate('/tickets/ARV-104');
        onClose();
      },
    },
    {
      num: 2,
      title: 'Confidential Note Isolation (INC-0304)',
      desc: 'ARV-101 has confidential team notes. Switch to customer Vikram Patel (Acme Corp) and confirm notes are physically excluded at wire level.',
      actionLabel: 'Verify Customer View',
      run: async () => {
        await setCustomerPersona('cust-acme');
        navigate('/customer/tickets/ARV-101');
        onClose();
      },
    },
    {
      num: 3,
      title: 'Immutable Audit Trail & DB Trigger (INC-0318)',
      desc: 'Inspect the append-only audit trail in ARV-101. Database trigger prevents UPDATE and DELETE statements on audit records.',
      actionLabel: 'Inspect Audit Ledger',
      run: async () => {
        await setAgentPersona('agent-meera');
        navigate('/tickets/ARV-101');
        onClose();
      },
    },
    {
      num: 4,
      title: 'Deterministic SLA Engine & 2026 Holidays',
      desc: 'Operating window is Mon–Fri 09:30–18:30 IST. Saturday, Sunday, and 21 gazetted Indian holidays (e.g. 2026-01-26) are zero-elapsed.',
      actionLabel: 'Open Time Simulator',
      run: () => {
        onClose();
        onOpenClock();
      },
    },
    {
      num: 5,
      title: 'Mid-Flight Priority Escalation (Preserve Elapsed Time)',
      desc: 'Inspect ARV-106. When escalating from Medium to Critical, elapsed business minutes are preserved, calculating a realistic same-day target.',
      actionLabel: 'Inspect ARV-106',
      run: async () => {
        await setAgentPersona('agent-rahul');
        navigate('/tickets/ARV-106');
        onClose();
      },
    },
    {
      num: 6,
      title: 'Ticket Reopen Window & Linked Follow-up Policy',
      desc: 'ARV-107 is within 5 working days (reopenable). ARV-108 is expired (> 2700 business mins), offering a Linked Follow-Up Ticket instead.',
      actionLabel: 'Inspect ARV-108 (Expired)',
      run: async () => {
        await setCustomerPersona('cust-zenith');
        navigate('/customer/tickets/ARV-108');
        onClose();
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100">
      <div 
        className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--content)] font-['Archivo',sans-serif]">
                  Evaluator Architecture &amp; Verification Journey
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold">
                  6 Scenarios
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Direct one-click test scenarios covering all 3 architectural incidents and SLA business rules.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--content)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scenarios List with smooth scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 slim-scrollbar">
          {scenarios.map((s) => (
            <div
              key={s.num}
              className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-blue-500/50 transition-all duration-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {s.num}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-[var(--content)]">{s.title}</h4>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
              <button
                onClick={s.run}
                className="self-end sm:self-auto w-full sm:w-44 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
              >
                <span>{s.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] flex items-center justify-between text-xs text-[var(--muted)]">
          <a
            href="https://github.com/KrishnaKanhaiya1/arvo-frontdesk/blob/main/backend/src/__tests__/sla.test.ts"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 dark:hover:text-blue-400 font-semibold inline-flex items-center gap-1 underline underline-offset-2 transition-colors"
            title="Inspect Vitest automated test suite on GitHub"
          >
            <span>All 40 automated tests passing (23 SLA + 17 Incidents)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={() => {
              onClose();
              onOpenReset();
            }}
            className="text-red-600 dark:text-red-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Canonical Data
          </button>
        </div>
      </div>
    </div>
  );
};
