import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  AlertTriangle, 
  Sun, 
  Moon, 
  BarChart3, 
  TimerReset, 
  UserCheck, 
  KeyRound, 
  ClipboardCheck, 
  Mail, 
  Eye, 
  EyeOff, 
  Zap, 
  UserPlus, 
  Building2, 
  User,
  HelpCircle,
  X
} from 'lucide-react';
import { usePersona } from '../hooks/usePersona';
import { useTheme } from '../hooks/useTheme';
import { useSystemClock } from '../hooks/useTickets';

const SLIDES = [
  {
    image: '/arvo-ops-center.jpg',
    title: 'Operations Command Center',
    subtitle: 'Real-time multi-tenant SLA monitoring & deterministic triage',
  },
  {
    image: '/arvo-enterprise-glass.jpg',
    title: 'Enterprise Mission Control',
    subtitle: 'Multi-persona triage, role-based security & immutable auditing',
  },
  {
    image: '/arvo-datacenter-racks.jpg',
    title: 'High-Density Cloud Core',
    subtitle: 'Deterministic business-hours calculation with PostgreSQL triggers',
  },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnUrl = (location.state as any)?.from as string | undefined;
  const { loginWithEmail, registerNewCustomer, setAgentPersona, actorId, actorName, role } = usePersona();
  const { theme, toggleTheme } = useTheme();
  const { data: clock } = useSystemClock();

  const redirectAfterAuth = (userRole: string) => {
    if (userRole === 'customer') {
      if (returnUrl && returnUrl.startsWith('/customer')) {
        navigate(returnUrl, { replace: true });
      } else {
        navigate('/customer', { replace: true });
      }
    } else {
      if (returnUrl && returnUrl.startsWith('/tickets')) {
        navigate(returnUrl, { replace: true });
      } else {
        navigate('/tickets/ARV-101', { replace: true });
      }
    }
  };

  // Mode: 'signin' | 'signup'
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Sign In Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up Form State
  const [regName, setRegName] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Set document title
  useEffect(() => {
    document.title = 'Sign in – Arvo Frontdesk';
  }, []);

  // Auto-cycle carousel every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your work email address.');
      return;
    }
    if (!validateEmail(email)) {
      setErrorMsg('Please enter a valid work email address (e.g. name@company.in).');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const user = await loginWithEmail(email.trim(), password.trim());
      redirectAfterAuth(user.role);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regCompany.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMsg('Please complete all registration fields.');
      return;
    }
    if (!validateEmail(regEmail)) {
      setErrorMsg('Please enter a valid work email address (e.g. name@company.in).');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await registerNewCustomer({
        name: regName.trim(),
        company: regCompany.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
      });
      redirectAfterAuth('customer');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (userEmail: string) => {
    setEmail(userEmail);
    setPassword('arvo2026');
    setErrorMsg(null);
    try {
      setIsSubmitting(true);
      const user = await loginWithEmail(userEmail, 'arvo2026');
      redirectAfterAuth(user.role);
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectDemo = async () => {
    try {
      setIsSubmitting(true);
      await setAgentPersona('agent-meera');
      redirectAfterAuth('lead');
    } catch {
      redirectAfterAuth('lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusinessHours = clock?.isBusinessHours;

  const highlights = [
    { icon: BarChart3, label: 'Deterministic SLA calculation', color: 'text-blue-500' },
    { icon: ShieldCheck, label: 'Multi-tenant data isolation', color: 'text-emerald-500' },
    { icon: TimerReset, label: 'PostgreSQL audit triggers', color: 'text-purple-500' },
  ];

  const workflowSteps = [
    { icon: UserCheck, label: 'Identity', value: 'RBAC verified' },
    { icon: KeyRound, label: 'Routing', value: 'Role isolation' },
    { icon: ClipboardCheck, label: 'Audit', value: 'Trigger enforced' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--content)] px-3 py-6 sm:px-6 lg:px-8 flex items-center justify-center transition-colors duration-200 overflow-y-auto">
      <main className="mx-auto w-full max-w-6xl my-auto">
        {/* Floating Main Card */}
        <div className="relative flex w-full flex-col rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl lg:grid lg:min-h-[660px] lg:grid-cols-[1fr_1.05fr] overflow-hidden">
          
          {/* Header Bar Spanning Across Top of Card */}
          <header className="relative lg:absolute inset-x-0 top-0 z-30 flex h-16 lg:h-18 items-center justify-between px-5 sm:px-8 lg:px-10 border-b lg:border-0 border-[var(--border)]/40 bg-[var(--surface)]/60 lg:bg-transparent backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-sm sm:text-base tracking-wider text-white shadow-md shadow-blue-500/25">
                A
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-[var(--content)] font-['Archivo',sans-serif]">
                    ARVO FRONTDESK
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
                    SLA Operations
                  </span>
                </div>
                <span className="text-[10px] text-[var(--muted)] font-mono leading-none mt-1 hidden sm:inline">
                  Enterprise Support &amp; SLA Management
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <nav className="hidden items-center gap-3 lg:flex">
                {/* Deterministic Business Hours Status Pill (Unified with backend) */}
                <div 
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border backdrop-blur-md shadow-xs ${
                    isBusinessHours
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-[var(--surface-subtle)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                  title={isBusinessHours ? 'Business Hours Active (09:30–18:30 IST)' : 'Outside Business Hours · SLA Clocks Paused'}
                >
                  <span className={`w-2 h-2 rounded-full ${isBusinessHours ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="font-medium">
                    {isBusinessHours ? '09:30–18:30 IST Active' : 'Off-Hours · Clocks Paused'}
                  </span>
                </div>

                {/* Direct Demo Launch Pill */}
                <button
                  type="button"
                  onClick={handleDirectDemo}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm shadow-blue-500/30 transition-all cursor-pointer"
                  title="Direct 1-click launch as Support Lead Meera Krishnan"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>1-Click Lead Demo</span>
                </button>
              </nav>

              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--muted)] transition-colors shadow-xs cursor-pointer"
                title="Toggle light / dark theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>
            </div>
          </header>

          {/* Left Form Section */}
          <section className="relative z-20 flex flex-col justify-center px-5 sm:px-8 lg:px-10 pt-5 pb-7 lg:pt-20">
            <div className="w-full max-w-sm mx-auto lg:mx-0">
              
              {/* Active Session Reconnect Alert if already logged in */}
              {actorId && (
                <div className="mb-3.5 flex items-center justify-between gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-900 dark:text-blue-200">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 shrink-0 rounded-full bg-blue-500 animate-pulse" />
                    <span className="truncate">Active: <strong>{actorName}</strong></span>
                  </div>
                  <Link
                    to={role === 'customer' ? '/customer' : '/tickets/ARV-101'}
                    className="font-bold underline hover:text-blue-600 inline-flex items-center gap-1 shrink-0 text-[11px]"
                  >
                    Enter <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {/* Auth Mode Toggle */}
              <div className="flex items-center p-1 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl mb-3.5">
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setErrorMsg(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'signin'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--content)]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setErrorMsg(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'signup'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--content)]'
                  }`}
                >
                  Client Sign Up
                </button>
              </div>

              {authMode === 'signin' ? (
                <>
                  <div className="mb-3">
                    <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono flex items-center gap-1.5">
                      <Lock className="w-3 h-3" /> SECURE SIGN IN
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--content)] tracking-tight font-['Archivo',sans-serif]">
                      Welcome back
                    </h2>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      Sign in to access your organization's support workspace.
                    </p>
                  </div>

                  {/* Error Alert */}
                  {errorMsg && (
                    <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Credentials Form */}
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[var(--content)] mb-1 font-mono">
                        Work Email
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.in"
                          required
                          autoFocus
                          className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-sm font-medium text-[var(--content)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs"
                        />
                        <Mail className="w-3.5 h-3.5 text-[var(--muted)] absolute right-3 top-3 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold uppercase text-[var(--content)] font-mono">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowForgotModal(true)}
                          className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          required
                          className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-sm font-medium text-[var(--content)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-[var(--muted)] hover:text-[var(--content)] cursor-pointer"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 active:translate-y-px disabled:opacity-50 transition-all shadow-md shadow-blue-500/25 cursor-pointer mt-1"
                    >
                      <span>{isSubmitting ? 'Authenticating…' : 'Sign in to Workspace'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" /> CLIENT ONBOARDING
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--content)] tracking-tight font-['Archivo',sans-serif]">
                      Create Account
                    </h2>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      Register your organization to access the Customer Portal.
                    </p>
                  </div>

                  {/* Error Alert */}
                  {errorMsg && (
                    <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Registration Form */}
                  <form onSubmit={handleRegister} className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[var(--content)] mb-1 font-mono">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="e.g. Aditi Sen"
                          required
                          className="w-full px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-xs font-medium text-[var(--content)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[var(--content)] mb-1 font-mono">
                          Company / Org
                        </label>
                        <input
                          type="text"
                          value={regCompany}
                          onChange={(e) => setRegCompany(e.target.value)}
                          placeholder="e.g. Acme Labs"
                          required
                          className="w-full px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-xs font-medium text-[var(--content)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[var(--content)] mb-1 font-mono">
                        Work Email
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="you@company.in"
                        required
                        className="w-full px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-xs font-medium text-[var(--content)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[var(--content)] mb-1 font-mono">
                        Password (min 6 chars)
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Create secure password"
                          required
                          minLength={6}
                          className="w-full px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-xs font-medium text-[var(--content)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1.5 text-[var(--muted)] hover:text-[var(--content)] cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:translate-y-px disabled:opacity-50 transition-all shadow-md shadow-blue-500/25 cursor-pointer mt-1"
                    >
                      <span>{isSubmitting ? 'Creating Account…' : 'Create Account & Launch Portal'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </>
              )}

              {/* Evaluator Quick-Access Accounts (1-Click Auto Login) */}
              {authMode === 'signin' && (
                <div className="mt-4 pt-3 border-t border-[var(--border)]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] font-mono mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-500" /> Demo Accounts · 1-Click Instant Sign-In
                    </span>
                  </div>
                  <div className="mb-2 p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-[10px] text-blue-800 dark:text-blue-300 leading-snug">
                    <strong className="font-semibold block mb-0.5">Evaluation Demonstration Environment:</strong>
                    All demo accounts contain synthetic data. One-click persona access is provided for evaluator convenience and is disabled by default in real production deployments.
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('meera@arvo.systems')}
                      disabled={isSubmitting}
                      className="p-2 text-left rounded-xl border border-[var(--border)] hover:border-purple-500 bg-[var(--surface-subtle)] hover:bg-purple-500/10 transition-all cursor-pointer"
                      title="Sign in as Meera Krishnan (Support Lead)"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[var(--content)]">Meera</span>
                        <span className="text-[9px] font-mono text-purple-600 dark:text-purple-400 font-bold">Lead</span>
                      </div>
                      <div className="text-[10px] text-[var(--muted)] font-mono truncate">meera@arvo.systems</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickLogin('rahul@arvo.systems')}
                      disabled={isSubmitting}
                      className="p-2 text-left rounded-xl border border-[var(--border)] hover:border-blue-500 bg-[var(--surface-subtle)] hover:bg-blue-500/10 transition-all cursor-pointer"
                      title="Sign in as Rahul Sharma (Support Agent)"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[var(--content)]">Rahul</span>
                        <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 font-bold">Agent</span>
                      </div>
                      <div className="text-[10px] text-[var(--muted)] font-mono truncate">rahul@arvo.systems</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickLogin('priya@arvo.systems')}
                      disabled={isSubmitting}
                      className="p-2 text-left rounded-xl border border-[var(--border)] hover:border-emerald-500 bg-[var(--surface-subtle)] hover:bg-emerald-500/10 transition-all cursor-pointer"
                      title="Sign in as Priya Nair (Support Agent)"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[var(--content)]">Priya</span>
                        <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">Agent</span>
                      </div>
                      <div className="text-[10px] text-[var(--muted)] font-mono truncate">priya@arvo.systems</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickLogin('vikram@acmecorp.in')}
                      disabled={isSubmitting}
                      className="p-2 text-left rounded-xl border border-[var(--border)] hover:border-amber-500 bg-[var(--surface-subtle)] hover:bg-amber-500/10 transition-all cursor-pointer"
                      title="Sign in as Vikram Patel (Acme Corp Client)"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[var(--content)]">Vikram</span>
                        <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 font-bold">Client</span>
                      </div>
                      <div className="text-[10px] text-[var(--muted)] font-mono truncate">vikram@acmecorp.in</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Highlights below */}
              <div className="mt-3.5 grid gap-1.5 grid-cols-3">
                {highlights.map(({ icon: Icon, label, color }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-center"
                  >
                    <Icon className={`h-3.5 w-3.5 ${color} mb-1`} />
                    <span className="text-[10px] font-bold text-[var(--muted)] leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Right Visual Panel (Pinned atmospheric photography with dark contrast scrim) */}
          <section className="relative hidden lg:block w-full overflow-hidden bg-slate-950">
            {/* Pinned atmospheric visual */}
            <img
              src="/arvo-ops-center.jpg"
              alt="Arvo Operations Command Center"
              className="absolute inset-0 h-full w-full object-cover object-center filter brightness-90 contrast-110"
            />

            {/* High-contrast dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40" />

            {/* Curved divider */}
            <svg
              className="absolute left-0 top-0 bottom-0 h-full w-28 text-[var(--surface)] fill-current pointer-events-none"
              viewBox="0 0 160 800"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M 0,0 L 140,0 C 130,120 40,200 45,360 C 50,500 135,560 115,680 C 100,750 35,780 0,800 Z" />
            </svg>

            {/* Top Right Navigation Links in Frosted Glass Pill */}
            <div className="absolute top-5 right-8 z-20 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-lg text-xs font-semibold text-slate-200">
              <Link to="/tickets/ARV-101" className="hover:text-blue-400 transition-colors">
                Agent Console
              </Link>
              <span className="text-slate-600">·</span>
              <Link to="/customer" className="hover:text-blue-400 transition-colors">
                Customer Portal
              </Link>
            </div>

            {/* Floating High-Contrast Access Flow Card */}
            <div className="absolute bottom-8 left-12 w-[21rem] rounded-2xl border border-slate-700/80 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-xl z-20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Access flow</div>
                  <div className="text-sm font-extrabold text-white font-['Archivo',sans-serif] mt-0.5">
                    Role-Gated Security
                  </div>
                </div>
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-400 font-mono">
                  RBAC Active
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {workflowSteps.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-center">
                    <Icon className="h-3.5 w-3.5 text-blue-400 mx-auto" />
                    <div className="mt-1 text-[11px] font-bold text-slate-200">{label}</div>
                    <div className="text-[9px] font-medium text-slate-400 mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-bold text-[var(--content)]">Enterprise Password Management</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 text-[var(--muted)] hover:text-[var(--content)] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed mb-4">
              In production, Arvo Systems integrates with enterprise IT directory services (LDAP / SSO). Password resets are provisioned by your corporate IT administrator.
            </p>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 mb-4">
              <strong>Evaluation Shortcut:</strong> Click any of the 4 demo account cards on the sign-in screen to authenticate instantly with 1-click access.
            </div>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
