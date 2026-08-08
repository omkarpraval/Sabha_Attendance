import React, { useState, useEffect } from 'react';
import { Phone, Mail, Lock, User, Calendar, AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff, X } from 'lucide-react';
import { apiFetch } from '../api';

export default function AuthModal({ onLoginSuccess, onClose }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'

  // Form states
  const [identifier, setIdentifier] = useState(''); // Phone or Email for Login
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');

  // UI status states
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('pending_qr_ref')) {
      setInfo('You scanned a Sabha Mandir QR poster! Please log in or sign up below to mark your attendance automatically.');
    }
  }, []);

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
  };

  const handleIdentifierChange = (e) => {
    setIdentifier(e.target.value.trim());
  };

  const validateEmail = (val) => {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (mode === 'signup') {
      if (!phone || phone.length !== 10) {
        setError('Mobile phone number must be exactly 10 numeric digits.');
        return;
      }
      if (!email || !validateEmail(email)) {
        setError('Please enter a valid email address (e.g. name@domain.com).');
        return;
      }
    }

    if (mode === 'login') {
      if (!identifier) {
        setError('Please enter your 10-digit mobile number or email address.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        await apiFetch('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ phone, email, name, dob, password }),
        });
        setInfo('Account created successfully! Account status is "pending". Please wait for Admin approval before logging in.');
        setMode('login');
      } else if (mode === 'login') {
        const res = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ identifier, password }),
        });
        onLoginSuccess(res.access_token, res.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#3A322C]/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 warm-shadow border border-[#EFE7DA] animate-in fade-in zoom-in-95 duration-200 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#3A322C]/40 hover:text-[#8B3A3A] p-1 cursor-pointer transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FDFBF7] border border-[#EFE7DA] text-[#8B3A3A] mb-3">
            <User className="w-6 h-6" />
          </div>
          <h2 className="font-serif-accent text-2xl font-bold text-[#8B3A3A]">
            {mode === 'signup' ? 'Create Member Account' : 'Member Login'}
          </h2>
          <p className="text-xs text-[#3A322C]/70 mt-1">
            {mode === 'signup' ? 'Register with your email & 10-digit phone to get started' : 'Sign in with your Phone Number or Email Address & Password'}
          </p>
        </div>

        {/* Error / Info Banners */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#C1554A]/10 border border-[#C1554A]/30 text-[#C1554A] text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="mb-4 p-3 rounded-xl bg-[#5B8C5B]/10 border border-[#5B8C5B]/30 text-[#5B8C5B] text-xs font-medium flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{info}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* LOGIN MODE: Identifier (Phone or Email) */}
          {mode === 'login' && (
            <div>
              <label className="block text-xs font-semibold text-[#3A322C] mb-1">
                Mobile Phone Number or Email Address
              </label>
              <div className="relative">
                {identifier.includes('@') ? (
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-[#3A322C]/40" />
                ) : (
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-[#3A322C]/40" />
                )}
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={handleIdentifierChange}
                  placeholder="e.g. 9999999999 or user@domain.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-sm text-[#3A322C] focus:outline-none focus:border-[#E8A33D] transition-colors tracking-wide"
                />
              </div>
            </div>
          )}

          {/* SIGNUP MODE: Specific Phone and Email fields */}
          {mode === 'signup' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#3A322C]">Mobile Phone Number</label>
                  <span className="text-[11px] font-medium text-[#3A322C]/60">
                    {phone.length}/10 digits
                  </span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-[#3A322C]/40" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="10-digit mobile number"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-sm text-[#3A322C] focus:outline-none focus:border-[#E8A33D] transition-colors tracking-wide"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3A322C] mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-[#3A322C]/40" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. name@domain.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-sm text-[#3A322C] focus:outline-none focus:border-[#E8A33D] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3A322C] mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-[#3A322C]/40" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-sm text-[#3A322C] focus:outline-none focus:border-[#E8A33D] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3A322C] mb-1">Date of Birth (DOB)</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-3 text-[#3A322C]/40" />
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-sm text-[#3A322C] focus:outline-none focus:border-[#E8A33D] transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          {/* LOGIN & SIGNUP MODE: Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#3A322C]">
                {mode === 'signup' ? 'Create Password' : 'Password'}
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-[#3A322C]/40" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-sm text-[#3A322C] focus:outline-none focus:border-[#E8A33D] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-[#3A322C]/40 hover:text-[#8B3A3A] transition-colors cursor-pointer"
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#E8A33D] hover:bg-[#D98A2B] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {loading ? 'Processing...' : (
              mode === 'signup' ? 'Submit Registration' : 'Log In to Portal'
            )}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Navigation Mode Switcher */}
        <div className="mt-5 text-center text-xs text-[#3A322C]/70 space-y-1.5">
          {mode === 'signup' && (
            <div>Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError(''); setInfo(''); }} className="text-[#8B3A3A] font-semibold hover:underline cursor-pointer">
                Log In
              </button>
            </div>
          )}
          {mode === 'login' && (
            <div>New member?{' '}
              <button onClick={() => { setMode('signup'); setError(''); setInfo(''); }} className="text-[#8B3A3A] font-semibold hover:underline cursor-pointer">
                Sign Up Now
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
