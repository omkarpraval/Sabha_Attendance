import React, { useState } from 'react';
import { Phone, Lock, User, Calendar, AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '../api';

export default function AuthModal({ onLoginSuccess }) {
  const [isSignup, setIsSignup] = useState(false);

  // Form states
  const [phone, setPhone] = useState('9999999999');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');

  // UI status states
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (e) => {
    // Only allow numeric digits and limit to max 10 characters
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
  };

  const validatePhone = () => {
    if (!phone || phone.length !== 10) {
      setError('Mobile phone number must be exactly 10 digits.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!validatePhone()) return;

    setLoading(true);

    try {
      if (isSignup) {
        // Sign up flow
        await apiFetch('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ phone, name, dob, password }),
        });
        setInfo('Account created successfully! Account status is "pending". Please wait for Admin approval before logging in.');
        setIsSignup(false);
      } else {
        // Login flow
        const res = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ phone, password }),
        });
        onLoginSuccess(res.access_token, res.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoPhone, demoPass) => {
    setPhone(demoPhone);
    setPassword(demoPass);
    setError('');
    setInfo('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#3A322C]/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 warm-shadow border border-[#EFE7DA] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FDFBF7] border border-[#EFE7DA] text-[#8B3A3A] mb-3">
            <User className="w-6 h-6" />
          </div>
          <h2 className="font-serif-accent text-2xl font-bold text-[#8B3A3A]">
            {isSignup ? 'Create Member Account' : 'Member Login'}
          </h2>
          <p className="text-xs text-[#3A322C]/70 mt-1">
            {isSignup 
              ? 'Register with your 10-digit mobile number to get started' 
              : 'Sign in to access your attendance, streaks, & sabha portal'}
          </p>
        </div>

        {/* Quick Demo Fill Buttons */}
        {!isSignup && (
          <div className="mb-5 bg-[#FDFBF7] p-3 rounded-xl border border-[#EFE7DA]">
            <div className="text-[11px] font-semibold text-[#8B3A3A] uppercase tracking-wider mb-2">
              QUICK DEMO ACCOUNTS:
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('9999999999', 'admin123')}
                className="text-xs bg-white hover:bg-[#8B3A3A] hover:text-white text-[#8B3A3A] font-semibold py-1.5 px-2 rounded-lg border border-[#8B3A3A]/20 transition-all cursor-pointer text-center"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('8888888888', 'karyakar123')}
                className="text-xs bg-white hover:bg-[#E8A33D] hover:text-white text-[#E8A33D] font-semibold py-1.5 px-2 rounded-lg border border-[#E8A33D]/30 transition-all cursor-pointer text-center"
              >
                Karyakar
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('7777777777', 'user123')}
                className="text-xs bg-white hover:bg-[#5B8C5B] hover:text-white text-[#5B8C5B] font-semibold py-1.5 px-2 rounded-lg border border-[#5B8C5B]/30 transition-all cursor-pointer text-center"
              >
                User
              </button>
            </div>
          </div>
        )}

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
          
          {/* Phone input with strict 10 digit verification */}
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

          {/* Signup specific fields */}
          {isSignup && (
            <>
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

          {/* Password Field with Show/Hide Password Toggle */}
          <div>
            <label className="block text-xs font-semibold text-[#3A322C] mb-1">
              {isSignup ? 'Create Password' : 'Password'}
            </label>
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
            {loading ? 'Processing...' : (isSignup ? 'Submit Registration' : 'Log In to Portal')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle Signup/Login */}
        <div className="mt-5 text-center text-xs text-[#3A322C]/70">
          {isSignup ? (
            <span>Already have an account?{' '}
              <button onClick={() => { setIsSignup(false); setError(''); setInfo(''); }} className="text-[#8B3A3A] font-semibold hover:underline cursor-pointer">
                Log In
              </button>
            </span>
          ) : (
            <span>New member?{' '}
              <button onClick={() => { setIsSignup(true); setError(''); setInfo(''); }} className="text-[#8B3A3A] font-semibold hover:underline cursor-pointer">
                Sign Up Now
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
