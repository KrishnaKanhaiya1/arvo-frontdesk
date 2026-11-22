import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  ExternalLink,
  Sparkles,
  Zap,
  UserPlus,
  Building2,
  User
} from 'lucide-react';
import { usePersona } from '../hooks/usePersona';
import { useTheme } from '../hooks/useTheme';

const SLIDES = [
  {
    image: '/arvo-ops-center.jpg',
    title: 'Operations Command Center',
    subtitle: 'Real-time multi-tenant SLA monitoring & incident routing',
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
  const { loginWithEmail, registerNewCustomer, setAgentPersona, setCustomerPersona, actorId, actorName, role } = usePersona();
  const { theme, toggleTheme } = useTheme();

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

  // Auto-cycle carousel every 7 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const user = await loginWithEmail(email.trim(), password.trim());
      if (user.role === 'customer') {
        navigate('/customer');
      } else {
        navigate('/tickets/ARV-101');
      }
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

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await registerNewCustomer({
        name: regName.trim(),
        company: regCompany.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
      });
      navigate('/customer');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = async (userEmail: string) => {
    setEmail(userEmail);
    setPassword('arvo2026');
    setErrorMsg(null);
    try {
      setIsSubmitting(true);
      const user = await loginWithEmail(userEmail, 'arvo2026');
      if (user.role === 'customer') {
        navigate('/customer');
      } else {
        navigate('/tickets/ARV-101');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectDemo = async () => {
    try {
      setIsSubmitting(true);
      await setAgentPersona('agent-meera');
      navigate('/tickets/ARV-101');
    } catch {
      navigate('/tickets/ARV-101');
    } finally {
      setIsSubmitting(false);
    }
  };

  const highlights = [
    { icon: BarChart3, label: 'Live SLA calculation', color: 'text-blue-600' },
    { icon: ShieldCheck, label: 'Role-based access', color: 'text-emerald-600' },
    { icon: TimerReset, label: 'Deterministic SLA engine', color: 'text-purple-600' },
  ];

  const workflowSteps = [
    { icon: UserCheck, label: 'Identity', value: 'Approved account' },
    { icon: KeyRound, label: 'Routing', value: 'Role workspace' },
    { icon: ClipboardCheck, label: 'Audit', value: 'Traceable records' },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--surface-subtle)] px-3 py-4 sm:px-6 lg:px-10 flex items-center justify-center transition-colors duration-200">
      <main className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl w-full items-center justify-center">
        {/* Floating Card Container */}
        <div className="relative flex w-full flex-col overflow-y-auto lg:overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-[0_35px_90px_-45px_rgba(15,23,42,0.45)] lg:grid lg:min-h-[700px] lg:grid-cols-[0.92fr_1.08fr]">
          
          {/* Header Bar Spanning Across Top of Card */}
          <header className="relative lg:absolute inset-x-0 top-0 z-30 flex h-20 lg:h-22 items-center justify-between px-6 sm:px-10 lg:px-12 border-b lg:border-0 border-[var(--border)]/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center font-bold text-base sm:text-lg tracking-wider text-white shadow-md shadow-blue-500/25">
                A
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-[var(--content)] font-['Archivo',sans-serif]">
                    ARVO FRONTDESK
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-mono">
                    CORE
                  </span>
                </div>
                <span className="text-[10px] text-[var(--muted)] font-mono leading-none mt-1 hidden sm:inline">
                  ENTERPRISE SLA OPERATIONS CONSOLE
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6">
              <nav className="hidden items-center gap-6 text-sm font-semibold lg:flex">
                {/* Live IST Telemetry Banner */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-subtle)] border border-[var(--border)] text-xs font-mono text-[var(--content)] backdrop-blur-md shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>09:30–18:30 IST Active</span>
                </div>
                <Link to="/tickets/ARV-101" className="text-[var(--content)] hover:text-blue-600 transition-colors">
                  Console
                </Link>
                <Link to="/customer" className="text-[var(--muted)] hover:text-blue-600 transition-colors">
                  Customer Portal
                </Link>
                <button
                  type="button"
                  onClick={handleDirectDemo}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Direct Demo Launch
                </button>
              </nav>

              <button
                type="button"
                onClick={toggleTheme}
                className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-sm hover:bg-[var(--surface-subtle)] text-[var(--muted)] transition-colors shadow-sm cursor-pointer"
                title="Toggle light / dark theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>
            </div>
          </header>

          {/* Left Form Section */}
          <section className="relative z-20 flex flex-col justify-start lg:justify-center overflow-y-auto max-h-[calc(100vh-2rem)] lg:max-h-[820px] px-6 pb-8 pt-5 lg:pt-22 sm:px-10 lg:px-14 scrollbar-thin">
            <div className="w-full max-w-md mx-auto lg:mx-0">
              
              {/* Active Session Reconnect Alert if already logged in */}
              {actorId && (
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/50 px-3.5 py-2 text-xs text-blue-900 dark:text-blue-200">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 shrink-0 rounded-full bg-blue-500 animate-pulse" />
                    <span className="truncate">Signed in: <strong>{actorName}</strong> ({role})</span>
                  </div>
                  <Link
                    to={role === 'customer' ? '/customer' : '/tickets/ARV-101'}
                    className="font-bold underline hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1 shrink-0 self-end sm:self-auto"
                  >
                    Enter Console <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {/* Auth Mode Toggle (Sign In vs Create Customer Account) */}
              <div className="flex items-center p-1 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setErrorMsg(null); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
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
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    authMode === 'signup'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--content)]'
                  }`}
                >
                  Create Account (New User)
                </button>
              </div>

              {authMode === 'signin' ? (
                <>
                  <div className="mb-4">
                    <div className="mb-1 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> SECURE SIGN IN
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--content)] tracking-tight font-['Archivo',sans-serif]">
                      Welcome back
                    </h2>
                    <p className="mt-0.5 text-xs sm:text-sm text-[var(--muted)]">
                      Enter your approved account details to continue.
                    </p>
                  </div>

                  {/* Error Alert */}
                  {errorMsg && (
                    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Credentials Form */}
                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold uppercase text-[var(--content)] mb-1 font-mono">
                        Email
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@arvo.systems"
                          required
                          autoFocus
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[15px] font-medium text-[var(--content)] placeholder-[var(--subtle)] focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
                        />
                        <Mail className="w-4 h-4 text-[var(--muted)] absolute right-3.5 top-3.5 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-[var(--content)] mb-1 font-mono">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password"
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[15px] font-medium text-[var(--content)] placeholder-[var(--subtle)] focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3.5 text-[var(--muted)] hover:text-[var(--content)] cursor-pointer"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 active:translate-y-px disabled:opacity-50 transition-all shadow-md shadow-blue-500/20 cursor-pointer group"
                    >
                      <span>{isSubmitting ? 'Authenticating...' : 'Sign in'}</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    <div className="pt-0.5 text-center text-xs text-[var(--muted)]">
                      First-time user or new client organization?{' '}
                      <button
                        type="button"
                        onClick={() => { setAuthMode('signup'); setErrorMsg(null); }}
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                      >
                        Sign up for Customer Portal
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <div className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" /> CLIENT ONBOARDING
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--content)] tracking-tight font-['Archivo',sans-serif]">
                      Create Account
                    </h2>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      Register your organization to access the Arvo Customer Portal.
                    </p>
                  </div>

                  {/* Error Alert */}
                  {errorMsg && (
                    <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 px-3.5 py-2 text-xs text-red-700 dark:text-red-300">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Registration Form */}
                  <form onSubmit={handleRegister} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[var(--content)] mb-1 font-mono">
                          Full Name
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            placeholder="e.g. Aditi Sen"
                            required
                            autoFocus
                            className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--content)] placeholder-[var(--subtle)] focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
                          />
                          <User className="w-3.5 h-3.5 text-[var(--muted)] absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[var(--content)] mb-1 font-mono">
                          Company / Org
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={regCompany}
                            onChange={(e) => setRegCompany(e.target.value)}
                            placeholder="e.g. Acme Labs"
                            required
                            className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--content)] placeholder-[var(--subtle)] focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
                          />
                          <Building2 className="w-3.5 h-3.5 text-[var(--muted)] absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[var(--content)] mb-1 font-mono">
                        Work Email
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="you@company.in"
                          required
                          className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--content)] placeholder-[var(--subtle)] focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
                        />
                        <Mail className="w-3.5 h-3.5 text-[var(--muted)] absolute right-3 top-2.5 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[var(--content)] mb-1 font-mono">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Create password (min 6 chars)"
                          required
                          minLength={6}
                          className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--content)] placeholder-[var(--subtle)] focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2 text-[var(--muted)] hover:text-[var(--content)] cursor-pointer"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Prominent Primary Submit Button Immediately Below Inputs */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:translate-y-px disabled:opacity-50 transition-all shadow-md shadow-blue-500/25 cursor-pointer group mt-1"
                    >
                      <span>{isSubmitting ? 'Creating Account & Launching...' : 'Create Account & Launch Portal'}</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    {/* Compact Enterprise RBAC Notice */}
                    <div className="flex items-start gap-2 p-2 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 text-[11px] text-blue-900 dark:text-blue-200 leading-snug">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <span><strong>Enterprise RBAC Note:</strong> Support Agent & Lead roles are IT-provisioned. Client organizations self-register here to submit and track support tickets.</span>
                    </div>

                    <div className="pt-0.5 text-center text-xs text-[var(--muted)]">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setAuthMode('signin'); setErrorMsg(null); }}
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                      >
                        Sign in to existing account
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* Evaluator Quick-Access Accounts and Highlights (Shown in Sign-In Mode) */}
              {authMode === 'signin' && (
                <>
                  <div id="evaluator-credentials" className="mt-5 pt-4 border-t border-[var(--border)]">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] font-mono mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Evaluator Quick-Access (PW: arvo2026)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickFill('meera@arvo.systems')}
                        disabled={isSubmitting}
                        className="p-2 text-left rounded-xl border border-[var(--border)] hover:border-purple-500 bg-[var(--surface-subtle)] hover:bg-purple-50/20 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-[var(--content)] group-hover:text-purple-600 dark:group-hover:text-purple-400">
                            Meera (Lead)
                          </span>
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                        </div>
                        <div className="text-[10px] text-[var(--muted)] font-mono truncate">meera@arvo.systems</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickFill('rahul@arvo.systems')}
                        disabled={isSubmitting}
                        className="p-2 text-left rounded-xl border border-[var(--border)] hover:border-blue-500 bg-[var(--surface-subtle)] hover:bg-blue-50/20 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-[var(--content)] group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            Rahul (Agent)
                          </span>
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                        </div>
                        <div className="text-[10px] text-[var(--muted)] font-mono truncate">rahul@arvo.systems</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickFill('priya@arvo.systems')}
                        disabled={isSubmitting}
                        className="p-2 text-left rounded-xl border border-[var(--border)] hover:border-emerald-500 bg-[var(--surface-subtle)] hover:bg-emerald-50/20 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-[var(--content)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                            Priya (Agent)
                          </span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                        <div className="text-[10px] text-[var(--muted)] font-mono truncate">priya@arvo.systems</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickFill('vikram@acmecorp.in')}
                        disabled={isSubmitting}
                        className="p-2 text-left rounded-xl border border-[var(--border)] hover:border-amber-500 bg-[var(--surface-subtle)] hover:bg-amber-50/20 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-[var(--content)] group-hover:text-amber-600 dark:group-hover:text-amber-400">
                            Vikram (Customer)
                          </span>
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                        </div>
                        <div className="text-[10px] text-[var(--muted)] font-mono truncate">vikram@acmecorp.in</div>
                      </button>
                    </div>
                  </div>

                  {/* 3 Highlights at the bottom (Exact Reference 2 Layout) */}
                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    {highlights.map(({ icon: Icon, label, color }) => (
                      <div
                        key={label}
                        className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2.5"
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                        <span className="text-[11px] font-bold leading-4 text-[var(--muted)]">{label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Right VisualPanel (Real Photography, Organic Curved Wave Divider, & Access Flow Card - Desktop) */}
          <section className="relative hidden lg:block w-full overflow-hidden bg-slate-950 lg:h-auto lg:min-h-[740px]">
            
            {/* Organic Curved Wave Divider on the Left of the Image Panel */}
            <svg
              className="absolute left-0 top-0 bottom-0 h-full w-24 sm:w-32 lg:w-44 z-10 text-[var(--surface)] fill-current pointer-events-none hidden lg:block"
              viewBox="0 0 160 800"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M 0,0 L 140,0 C 130,120 40,200 45,360 C 50,500 135,560 115,680 C 100,750 35,780 0,800 Z" />
            </svg>

            {/* High-Resolution Enterprise Visuals with Cross-Fade */}
            {SLIDES.map((slide, idx) => (
              <img
                key={slide.image}
                src={slide.image}
                alt={slide.title}
                className={`absolute inset-0 h-full w-full object-cover object-center transition-all duration-1000 filter brightness-90 contrast-105 ${
                  idx === activeSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
                }`}
              />
            ))}

            {/* Ambient Scrim Gradients */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-950/25 via-transparent to-slate-950/70" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/70 to-transparent lg:hidden" />

            {/* Floating Frosted Glass Access Flow Card (Exact Reference 2 Layout) */}
            <div className="absolute bottom-9 left-14 hidden w-[23.5rem] rounded-2xl border border-white/70 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/85 p-4 shadow-2xl backdrop-blur-xl lg:block z-20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase text-[var(--muted)] font-mono">Access flow</div>
                  <div className="mt-1 text-base font-extrabold text-[var(--content)] font-['Archivo',sans-serif]">
                    Verified before support data
                  </div>
                </div>
                <span className="rounded-full border border-blue-500/20 bg-blue-50 dark:bg-blue-950 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                  Secure
                </span>
              </div>

              <div className="mt-3.5 grid grid-cols-3 gap-2">
                {workflowSteps.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 px-3 py-2.5">
                    <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div className="mt-2 text-xs font-extrabold text-[var(--content)]">{label}</div>
                    <div className="mt-0.5 text-[10px] font-medium leading-4 text-[var(--muted)]">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Carousel Pagination Dots on Bottom-Right */}
            <div className="absolute bottom-10 right-10 hidden grid-cols-3 gap-2 lg:grid z-20">
              {SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  className={`h-2.5 rounded-full transition-all cursor-pointer ${
                    idx === activeSlide ? 'bg-white shadow-md w-7' : 'bg-white/40 hover:bg-white/70 w-2.5'
                  }`}
                  title={SLIDES[idx].title}
                />
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};
