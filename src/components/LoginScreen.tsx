import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Subsidiary } from '../types';
import { getSupabase, supabase } from '../supabaseClient';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  User, 
  IdCard, 
  Building2, 
  Check, 
  X, 
  Briefcase,
  Layers,
  ChevronDown,
  Sparkles
} from 'lucide-react';

type AuthViewMode = 'login' | 'request-access' | 'request-submitted';

export const LoginScreen: React.FC = () => {
  const { loginWithCredentials, submitAccessRequest, requestPasswordReset } = useApp();

  // Navigation mode within Auth
  const [viewMode, setViewMode] = useState<AuthViewMode>('login');

  // Signup Success Message State
  const [signupSuccessMessage, setSignupSuccessMessage] = useState<string | null>(null);

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<{ message: string; status?: 'pending' | 'rejected' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState<boolean>(false);

  // Forgot Password Modal State
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);
  const [forgotResetSent, setForgotResetSent] = useState<boolean>(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Request Access Form State
  const [fullName, setFullName] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [officialEmail, setOfficialEmail] = useState<string>('');
  const [subsidiary, setSubsidiary] = useState<Subsidiary>('CMPDI HQ');
  const [department, setDepartment] = useState<string>('Geology & Exploration');
  const [designation, setDesignation] = useState<string>('');
  const [requestPassword, setRequestPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showReqPassword, setShowReqPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [requestFormError, setRequestFormError] = useState<string | null>(null);

  // Submitted Request Details
  const [submittedDetails, setSubmittedDetails] = useState<{
    requestId: string;
    name: string;
    employeeId: string;
    email: string;
    subsidiary: Subsidiary;
    requiresEmailConfirmation?: boolean;
    message?: string;
  } | null>(null);

  // Password strength calculation
  const getPasswordStrength = (pass: string): { score: number; label: string; color: string } => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-300' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak', color: 'bg-rose-500' };
      case 2:
        return { score: 50, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 75, label: 'Good', color: 'bg-blue-500' };
      case 4:
        return { score: 100, label: 'Strong', color: 'bg-emerald-600' };
      default:
        return { score: 15, label: 'Very Weak', color: 'bg-rose-400' };
    }
  };

  const passwordStrength = getPasswordStrength(requestPassword);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    try {
      const res = await loginWithCredentials(loginIdentifier, loginPassword, rememberMe);
      setIsSubmitting(false);

      if (!res.success) {
        if (res.status === 'pending') {
          setLoginError({
            status: 'pending',
            message: 'Your access request is still awaiting administrator approval.',
          });
        } else if (res.status === 'rejected') {
          setLoginError({
            status: 'rejected',
            message: 'Your access request was not approved. Please contact your administrator.',
          });
        } else {
          setLoginError({
            message: res.message || 'Unable to sign in. Please check your credentials.',
          });
        }
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setLoginError({
        message: err?.message || 'Authentication error. Please check your network connection.',
      });
    }
  };

  // Handle Request Access Submit
  const handleRequestAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestFormError(null);

    if (requestPassword.length < 8) {
      setRequestFormError('Password must be at least 8 characters long.');
      return;
    }

    if (requestPassword !== confirmPassword) {
      setRequestFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitAccessRequest({
        name: fullName,
        employeeId,
        email: officialEmail,
        subsidiary,
        department,
        designation,
        password: requestPassword,
      });

      setIsSubmitting(false);
      if (!res.success) {
        setRequestFormError(res.message || 'Failed to submit access request. Please try again.');
        return;
      }

      // UX Flow:
      // 1. Do NOT auto-login the user.
      // 2. Redirect to the Sign In page.
      // 3. Show a clear success message ("Account created — check your email to confirm, then sign in.")
      // 4. Pre-fill the email field on the Sign In page with the email they just used.
      const userRegisteredEmail = officialEmail.trim();
      setLoginIdentifier(userRegisteredEmail);
      setLoginPassword('');
      setLoginError(null);
      setSignupSuccessMessage(
        res.message || 'Account created — check your email to confirm, then sign in.'
      );
      setViewMode('login');
    } catch (err: any) {
      setIsSubmitting(false);
      setRequestFormError(err?.message || 'Failed to submit access request. Please try again.');
    }
  };

  // Open Forgot Password Modal
  const handleOpenForgotPasswordModal = () => {
    if (loginIdentifier.trim()) {
      setForgotEmail(loginIdentifier.trim());
    }
    setForgotError(null);
    setForgotResetSent(false);
    setIsForgotPasswordModalOpen(true);
  };

  // Close Forgot Password Modal
  const handleCloseForgotPasswordModal = () => {
    setIsForgotPasswordModalOpen(false);
    setForgotResetSent(false);
    setForgotError(null);
  };

  // Handle Forgot Password Modal Submit
  const handleForgotModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail) {
      setForgotError('Please enter your official email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail) && !cleanEmail.includes('.')) {
      setForgotError('Please enter a valid official email address.');
      return;
    }

    setForgotError(null);
    setIsSendingReset(true);

    try {
      await requestPasswordReset(cleanEmail);
      setIsSendingReset(false);
      setForgotResetSent(true);
    } catch (err: any) {
      setIsSendingReset(false);
      setForgotError(err?.message || 'Failed to dispatch reset request.');
    }
  };

  // Handle Google OAuth Sign-in via Supabase
  const handleGoogleSignIn = async () => {
    setLoginError(null);
    const client = getSupabase() || supabase;
    if (!client) {
      setLoginError({
        message: 'Supabase is not configured. Please ensure your Supabase URL and Key are set in environment settings.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (error) {
        setLoginError({
          message: error.message || 'Google sign-in failed. Please verify your Supabase Google OAuth provider settings.',
        });
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setLoginError({
        message: err?.message || 'An unexpected error occurred during Google sign-in.',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      id="minemind-auth-container" 
      className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden select-none font-sans"
    >
      {/* ============================================================ */}
      {/* FULL-BLEED INDUSTRIAL MINING & CONSTRUCTION SITE BACKGROUND */}
      {/* ============================================================ */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#0F172A]"
        aria-hidden="true"
      >
        {/* Cinematic Mining Photo Background */}
        <img
          src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=2400&q=85"
          alt="Mining Site Excavation"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 filter brightness-75 contrast-110"
        />

        {/* Ambient Dusk & Twilight Atmospheric Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120]/90 via-[#0B1120]/50 to-[#0F172A]/70 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/60 via-transparent to-[#0F172A]/60" />
      </div>

      {/* ============================================================ */}
      {/* APP NAME / LOGO (TOP-LEFT CORNER OUTSIDE CARD) */}
      {/* ============================================================ */}
      <header className="relative z-20 pt-6 px-6 sm:px-10 flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#141C2B]/90 backdrop-blur-md border border-white/20 text-[#C8892E] flex items-center justify-center shadow-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif tracking-tight text-white drop-shadow-md">
              MineMind AI
            </h1>
            <span className="text-[10px] font-mono text-amber-300/90 tracking-wider uppercase block">
              Mining Intelligence Workspace
            </span>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MAIN CENTERED FROSTED-GLASS CARD OVERLAY */}
      {/* ============================================================ */}
      <main className="relative z-20 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div 
          id="auth-card-container"
          className="w-full max-w-[440px] rounded-3xl bg-white/75 backdrop-blur-xl border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.35)] p-6 sm:p-8 text-[#141C2B] transition-all duration-300"
        >
          {/* ============================================================ */}
          {/* 1. SIGN IN VIEW */}
          {/* ============================================================ */}
          {viewMode === 'login' && (
            <div className="space-y-5">
              {/* Heading & Subtext */}
              <div className="text-center space-y-1">
                <h2 className="font-bold text-2xl sm:text-3xl text-[#141C2B] tracking-tight">
                  Welcome back
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] font-normal leading-relaxed">
                  Sign in to access your intelligence dashboard
                </p>
              </div>

              {/* Success Notification (e.g. from SignUp redirect) */}
              {signupSuccessMessage && (
                <div 
                  id="signup-success-alert"
                  className="p-3 rounded-xl border bg-[#F0FDF4]/90 border-[#86EFAC] text-[#166534] text-xs leading-relaxed flex items-start gap-2.5 shadow-xs animate-in fade-in duration-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-[#14532D]">Account Created</p>
                    <p className="text-[#166534] mt-0.5">{signupSuccessMessage}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSignupSuccessMessage(null)}
                    className="text-[#166534] hover:text-[#14532D] p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Login Error Alert */}
              {loginError && (
                <div 
                  id="auth-error-alert"
                  className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 shadow-xs ${
                    loginError.status === 'pending'
                      ? 'bg-[#FEF3C7]/90 border-[#FDE68A] text-[#92400E]'
                      : 'bg-[#FEF2F2]/90 border-[#FECACA] text-[#991B1B]'
                  }`}
                >
                  {loginError.status === 'pending' ? (
                    <Clock className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
                  )}
                  <p className="font-medium">{loginError.message}</p>
                </div>
              )}

              {/* Sign In Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email Address Field */}
                <div>
                  <label 
                    htmlFor="input-login-email" 
                    className="block text-xs font-semibold text-[#1E293B] mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                    <input
                      id="input-login-email"
                      name="email"
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-white/80 hover:bg-white focus:bg-white border border-slate-300/80 focus:border-[#C8892E] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C8892E] text-[#0F172A] placeholder:text-[#94A3B8] shadow-2xs transition-all"
                    />
                  </div>
                </div>

                {/* Password Field with Top-Right Forgot Link */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label 
                      htmlFor="input-login-password" 
                      className="block text-xs font-semibold text-[#1E293B]"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      id="btn-forgot-password-link"
                      onClick={handleOpenForgotPasswordModal}
                      className="text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                    <input
                      id="input-login-password"
                      name="password"
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white/80 hover:bg-white focus:bg-white border border-slate-300/80 focus:border-[#C8892E] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C8892E] text-[#0F172A] placeholder:text-[#94A3B8] shadow-2xs transition-all"
                    />
                    <button
                      type="button"
                      id="btn-toggle-login-password"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] cursor-pointer p-0.5"
                      title={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#475569] select-none">
                    <input
                      type="checkbox"
                      id="checkbox-remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#141C2B] focus:ring-[#C8892E] cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>
                </div>

                {/* Primary Button: Sign In → */}
                <button
                  type="submit"
                  id="btn-login-submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#0A0D14] hover:bg-[#1E293B] active:bg-[#000000] text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider OR */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300/70" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                  <span className="bg-white/80 backdrop-blur-md px-3 text-slate-500 font-semibold rounded-full">
                    OR
                  </span>
                </div>
              </div>

              {/* Secondary Button: Continue with Google */}
              <button
                type="button"
                id="btn-google-signin"
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 bg-white/90 hover:bg-white text-slate-800 font-medium text-xs sm:text-sm rounded-xl border border-slate-300/90 shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer hover:shadow-sm"
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
                <span>Continue with Google</span>
              </button>

              {/* Register Link */}
              <div className="text-center pt-2">
                <p className="text-xs text-[#475569]">
                  New to MineMind AI?{' '}
                  <button
                    type="button"
                    id="btn-switch-to-register"
                    onClick={() => {
                      setRequestFormError(null);
                      setSignupSuccessMessage(null);
                      setViewMode('request-access');
                    }}
                    className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline cursor-pointer"
                  >
                    Register here
                  </button>
                </p>
              </div>

              {/* Quick Demo Accounts Autofill (Seamlessly integrated) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                  className="w-full flex items-center justify-between text-[11px] font-mono text-slate-500 hover:text-slate-800 p-1 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Quick Demo Accounts (Autofill)
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDemoAccounts ? 'rotate-180' : ''}`} />
                </button>

                {showDemoAccounts && (
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-300/60 animate-in fade-in duration-200">
                    <button
                      type="button"
                      id="btn-demo-admin"
                      onClick={() => {
                        setLoginIdentifier('CMPDI-HQ-10294');
                        setLoginPassword('Password@123');
                        setLoginError(null);
                      }}
                      className="p-2 text-left bg-white/90 hover:bg-white border border-slate-300/80 rounded-xl transition-all text-xs cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0F172A]">Admin</span>
                        <span className="text-[9px] px-1 py-0.5 rounded bg-[#0F172A] text-amber-300 font-mono">CMPDI</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">Dr. Arindam M.</p>
                    </button>

                    <button
                      type="button"
                      id="btn-demo-employee"
                      onClick={() => {
                        setLoginIdentifier('CIL-SECL-84920');
                        setLoginPassword('Password@123');
                        setLoginError(null);
                      }}
                      className="p-2 text-left bg-white/90 hover:bg-white border border-slate-300/80 rounded-xl transition-all text-xs cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0F172A]">Employee</span>
                        <span className="text-[9px] px-1 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">SECL</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">Er. Rajesh Verma</p>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 2. SIGN UP / REQUEST ACCESS VIEW */}
          {/* ============================================================ */}
          {viewMode === 'request-access' && (
            <div className="space-y-4">
              {/* Heading & Subtext */}
              <div className="text-center space-y-1">
                <h2 className="font-bold text-2xl sm:text-3xl text-[#141C2B] tracking-tight">
                  Request Access
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] font-normal leading-relaxed">
                  Create an authorized MineMind AI organizational account
                </p>
              </div>

              {/* Error Alert */}
              {requestFormError && (
                <div className="p-3 bg-[#FEF2F2]/90 border border-[#FECACA] text-[#991B1B] rounded-xl text-xs flex items-center gap-2 shadow-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{requestFormError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleRequestAccessSubmit} className="space-y-3">
                {/* Full Name Field */}
                <div>
                  <label 
                    htmlFor="input-request-fullname" 
                    className="block text-xs font-semibold text-[#1E293B] mb-1"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                    <input
                      id="input-request-fullname"
                      name="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Arindam Mukherjee"
                      className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-sm bg-white/80 hover:bg-white focus:bg-white border border-slate-300/80 focus:border-[#C8892E] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C8892E] text-[#0F172A] placeholder:text-[#94A3B8] shadow-2xs transition-all"
                    />
                  </div>
                </div>

                {/* Employee ID Field */}
                <div>
                  <label 
                    htmlFor="input-request-empid" 
                    className="block text-xs font-semibold text-[#1E293B] mb-1"
                  >
                    Employee ID
                  </label>
                  <div className="relative">
                    <IdCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                    <input
                      id="input-request-empid"
                      name="employeeId"
                      type="text"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="e.g. CMPDI-HQ-10294"
                      className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-sm bg-white/80 hover:bg-white focus:bg-white border border-slate-300/80 focus:border-[#C8892E] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C8892E] text-[#0F172A] placeholder:text-[#94A3B8] shadow-2xs transition-all"
                    />
                  </div>
                </div>

                {/* Official Email Field */}
                <div>
                  <label 
                    htmlFor="input-request-email" 
                    className="block text-xs font-semibold text-[#1E293B] mb-1"
                  >
                    Official Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                    <input
                      id="input-request-email"
                      name="officialEmail"
                      type="email"
                      required
                      value={officialEmail}
                      onChange={(e) => setOfficialEmail(e.target.value)}
                      placeholder="name@cmpdi.co.in"
                      className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-sm bg-white/80 hover:bg-white focus:bg-white border border-slate-300/80 focus:border-[#C8892E] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C8892E] text-[#0F172A] placeholder:text-[#94A3B8] shadow-2xs transition-all"
                    />
                  </div>
                </div>

                {/* Department / Subsidiary & Designation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label 
                      htmlFor="select-request-subsidiary" 
                      className="block text-xs font-semibold text-[#1E293B] mb-1"
                    >
                      Department / Subsidiary
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                      <select
                        id="select-request-subsidiary"
                        name="subsidiary"
                        value={subsidiary}
                        onChange={(e) => setSubsidiary(e.target.value as Subsidiary)}
                        className="w-full pl-10 pr-2 py-2 text-xs bg-white/80 hover:bg-white focus:bg-white border border-slate-300/80 focus:border-[#C8892E] rounded-xl focus:outline-none text-[#0F172A] shadow-2xs"
                      >
                        <option value="CMPDI HQ">CMPDI HQ</option>
                        <option value="SECL">SECL</option>
                        <option value="BCCL">BCCL</option>
                        <option value="NCL">NCL</option>
                        <option value="CCL">CCL</option>
                        <option value="ECL">ECL</option>
                        <option value="WCL">WCL</option>
                        <option value="MCL">MCL</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label 
                      htmlFor="input-request-designation" 
                      className="block text-xs font-semibold text-[#1E293B] mb-1"
                    >
                      Designation
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                      <input
                        id="input-request-designation"
                        name="designation"
                        type="text"
                        required
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="Sr. Geologist"
                        className="w-full pl-10 pr-3.5 py-2 text-xs bg-white/80 hover:bg-white focus:bg-white border border-slate-300/80 focus:border-[#C8892E] rounded-xl focus:outline-none text-[#0F172A] placeholder:text-[#94A3B8] shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Password & Strength Meter */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label 
                      htmlFor="input-request-password" 
                      className="block text-xs font-semibold text-[#1E293B]"
                    >
                      Password
                    </label>
                    {requestPassword && (
                      <span className="text-[10px] font-mono text-slate-500">
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                    <input
                      id="input-request-password"
                      name="password"
                      type={showReqPassword ? 'text' : 'password'}
                      required
                      value={requestPassword}
                      onChange={(e) => setRequestPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-10 pr-10 py-2 text-xs bg-white/80 hover:bg-white focus:bg-white border border-slate-300/80 focus:border-[#C8892E] rounded-xl focus:outline-none text-[#0F172A] placeholder:text-[#94A3B8] shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowReqPassword(!showReqPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
                    >
                      {showReqPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {requestPassword && (
                    <div className="mt-1 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label 
                      htmlFor="input-request-confirmpassword" 
                      className="block text-xs font-semibold text-[#1E293B]"
                    >
                      Confirm Password
                    </label>
                    {confirmPassword && (
                      <span className="text-[10px] font-medium flex items-center gap-1">
                        {requestPassword === confirmPassword ? (
                          <span className="text-emerald-700 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Match
                          </span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-0.5">
                            <X className="w-3 h-3" /> Don't match
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                    <input
                      id="input-request-confirmpassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-10 pr-10 py-2 text-xs bg-white/80 hover:bg-white focus:bg-white border border-slate-300/80 focus:border-[#C8892E] rounded-xl focus:outline-none text-[#0F172A] placeholder:text-[#94A3B8] shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Requested Role Indicator */}
                <div className="p-2.5 bg-slate-100/80 border border-slate-300/70 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">
                    Requested Role: <strong className="text-slate-900">Employee</strong>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Standard Access
                  </span>
                </div>

                {/* Primary Button: Submit Access Request → */}
                <button
                  type="submit"
                  id="btn-submit-request-access"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#0A0D14] hover:bg-[#1E293B] active:bg-[#000000] text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting Request...</span>
                    </span>
                  ) : (
                    <>
                      <span>Submit Access Request</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Already registered? Sign In */}
              <div className="text-center pt-2 border-t border-slate-300/60">
                <p className="text-xs text-[#475569]">
                  Already registered?{' '}
                  <button
                    type="button"
                    id="btn-switch-to-signin"
                    onClick={() => {
                      setLoginError(null);
                      setViewMode('login');
                    }}
                    className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 3. ACCESS REQUEST SUBMITTED (CONFIRMATION VIEW) */}
          {/* ============================================================ */}
          {viewMode === 'request-submitted' && (
            <div className="space-y-5 text-center">
              <div className="w-12 h-12 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center mx-auto shadow-xs">
                <Mail className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-xl text-[#141C2B]">
                  Confirm Your Email
                </h3>
                <div className="p-3 bg-white/90 border border-slate-300/80 rounded-xl text-left shadow-xs">
                  <p className="text-xs font-semibold text-[#1E293B] flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>Check your email and confirm your account before logging in.</span>
                  </p>
                  {submittedDetails?.email && (
                    <p className="text-[11px] text-[#64748B] mt-1 pl-6">
                      A verification link has been dispatched to <strong>{submittedDetails.email}</strong>.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setLoginError(null);
                  setViewMode('login');
                }}
                className="w-full py-2.5 bg-[#0A0D14] hover:bg-[#1E293B] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Return to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ============================================================ */}
      {/* FOOTER (OUTSIDE CARD) */}
      {/* ============================================================ */}
      <footer className="relative z-20 pb-6 px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] sm:text-xs text-slate-300 font-medium">
        <p className="drop-shadow-xs">
          © 2024 minemind AI. All rights reserved.
        </p>
        <div className="flex items-center gap-4 sm:gap-6 drop-shadow-xs">
          <a href="#privacy" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#terms" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Terms of Service</a>
          <a href="#help" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Help Center</a>
        </div>
      </footer>

      {/* ============================================================ */}
      {/* FORGOT PASSWORD MODAL */}
      {/* ============================================================ */}
      {isForgotPasswordModalOpen && (
        <div 
          id="forgot-password-modal" 
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseForgotPasswordModal();
            }
          }}
        >
          <div className="relative w-full max-w-md bg-white/90 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-2xl p-6 sm:p-7 text-[#141C2B] animate-in zoom-in-95 duration-200">
            <button
              type="button"
              id="btn-close-forgot-modal"
              onClick={handleCloseForgotPasswordModal}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#0A0D14] text-amber-400 flex items-center justify-center shadow-md flex-shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 id="forgot-password-title" className="font-bold text-xl text-[#0F172A]">
                  Forgot Password
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reset your MineMind AI credentials
                </p>
              </div>
            </div>

            {forgotResetSent ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs text-[#166534] flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-[#14532D]">Recovery Link Dispatched</p>
                    <p className="leading-relaxed text-[#166534]">
                      If an authorized organizational account is registered for <span className="font-semibold underline text-[#14532D]">{forgotEmail}</span>, password recovery instructions have been sent.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseForgotPasswordModal}
                  className="w-full py-2.5 bg-[#0A0D14] hover:bg-[#1E293B] text-white font-semibold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotModalSubmit} className="space-y-4 pt-2">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your registered official email address. We will send you verification instructions and a secure link to reset your account password.
                </p>

                {forgotError && (
                  <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div>
                  <label 
                    htmlFor="input-forgot-modal-email" 
                    className="block text-xs font-semibold text-[#1E293B] mb-1.5"
                  >
                    Official Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                    <input
                      id="input-forgot-modal-email"
                      name="email"
                      type="text"
                      required
                      autoFocus
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@cmpdi.co.in"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#C8892E] text-[#0F172A]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className="w-full py-2.5 bg-[#0A0D14] hover:bg-[#1E293B] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                  >
                    {isSendingReset ? 'Sending...' : 'Send Recovery Instructions'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseForgotPasswordModal}
                    className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

