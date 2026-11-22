import React from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink, 
  X, 
  Play, 
  RotateCcw, 
  Lock, 
  Users, 
  Clock, 
  Database,
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
      desc: 'Open unassigned ticket ARV-104. Verify atomic compare-and-swap assertion prevents race conditions.',
      actionLabel: 'Inspect ARV-104',
      run: async () => {
        await setAgentPersona('agent-meera');
        navigate('/tickets/ARV-104');
        onClose();
      },
    },
    {
      num: 2,
      title: 'Private Note Security & Boundary Isolation (INC-0304)',
      desc: 'ARV-101 has 2 confidential team notes. Switch to customer Vikram Patel (Acme Corp) and confirm notes are 100% excluded.',
      actionLabel: 'Verify Customer View',
      run: async () => {
        await setCustomerPersona('cust-acme');
        navigate('/customer/tickets/ARV-101');
        onClose();
      },
    },
    {
      num: 3,
      title: 'PostgreSQL Tamper-Proof Audit Immutability (INC-0318)',
      desc: 'Inspect the append-only audit trail in ARV-101. DB trigger prevents UPDATE and DELETE statements.',
      actionLabel: 'Inspect Audit Ledger',
      run: async () => {
        await setAgentPersona('agent-meera');
        navigate('/tickets/ARV-101');
        onClose();
      },
    },
    {
      num: 4,
      title: 'Business Hours SLA Calculation & Holiday Engine',
      desc: 'Hours operate strictly Mon–Fri 09:30–18:30 IST. Saturday, Sunday, and 21 gazetted Indian holidays are strictly zero-elapsed.',
      actionLabel: 'Open Time Simulator',
      run: () => {
        onClose();
        onOpenClock();
      },
    },
    {
      num: 5,
      title: 'Mid-Flight Priority Escalation (Preserve Elapsed Minutes)',
      desc: 'Inspect ARV-106. When escalating from Medium to Critical, elapsed minutes are preserved, setting a realistic same-day deadline.',
      actionLabel: 'Inspect ARV-106',
      run: async () => {
        await setAgentPersona('agent-rahul');
        navigate('/tickets/ARV-106');
        onClose();
      },
    },
    {
      num: 6,
      title: 'Atomic CAS Reopen Window (5 Working Days / 2700 Mins)',
      desc: 'ARV-107 is within the window (eligible). ARV-108 is expired (> 2700 biz mins), offering a Linked Follow-Up Ticket instead.',
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
        className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--content)] font-['Archivo',sans-serif]">
                Evaluator 60-Second Verification Journey
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Direct one-click test scenarios covering all 3 architectural incidents and SLA requirements.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--content)] hover:bg-[var(--surface)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scenarios List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5 slim-scrollbar">
          {scenarios.map((s) => (
            <div
              key={s.num}
              className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-blue-500/60 transition-all duration-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {s.num}
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-[var(--content)]">{s.title}</h4>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
              <button
                onClick={s.run}
                className="self-end sm:self-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                {s.actionLabel}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] flex items-center justify-between text-xs text-[var(--muted)]">
          <span>All 40 automated backend tests passing (23 SLA + 17 Incidents & Concurrency)</span>
          <button
            onClick={() => {
              onClose();
              onOpenReset();
            }}
            className="text-purple-600 dark:text-purple-400 font-medium hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Canonical Data
          </button>
        </div>
      </div>
    </div>
  );
};
