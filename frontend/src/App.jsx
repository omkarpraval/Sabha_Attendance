import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import UserPortal from './components/UserPortal';
import KaryakarPortal from './components/KaryakarPortal';
import AdminPortal from './components/AdminPortal';
import PWAInstallTip from './components/PWAInstallTip';
import { apiFetch, getAuthToken, setAuthToken, removeAuthToken } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPwaTip, setShowPwaTip] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Listen for PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const currentUser = await apiFetch('/auth/me');
      setUser(currentUser);
    } catch (err) {
      console.warn("Auth check failed:", err.message);
      removeAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (token, loggedInUser) => {
    setAuthToken(token);
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
  };

  const handleSwitchAccount = async (phone, password) => {
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password })
      });
      handleLoginSuccess(res.access_token, res.user);
    } catch (err) {
      alert(`Account switch failed: ${err.message}`);
    }
  };

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#8B3A3A] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="font-serif-accent text-xl font-bold text-[#8B3A3A]">
            Loading Sabha Portal...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#3A322C]">
      {/* Navigation Header */}
      <Header
        user={user}
        onLogout={handleLogout}
        onSwitchAccount={handleSwitchAccount}
        onInstallPWA={handleInstallPWA}
        deferredPrompt={deferredPrompt}
      />

      {/* Main Content Body */}
      <main className="pb-12">
        {!user ? (
          <AuthModal onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            {user.role === 'admin' && (
              <AdminPortal user={user} onUserUpdated={checkAuth} />
            )}
            {user.role === 'karyakar' && (
              <KaryakarPortal user={user} onUserUpdated={checkAuth} />
            )}
            {user.role === 'user' && (
              <UserPortal user={user} onUserUpdated={checkAuth} />
            )}
          </>
        )}
      </main>

      {/* PWA Home Screen Installation Tip */}
      {showPwaTip && <PWAInstallTip onClose={() => setShowPwaTip(false)} />}
    </div>
  );
}
