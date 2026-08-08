import React, { useState, useEffect, lazy, Suspense } from 'react';
import { CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import Header from './components/Header';
import { apiFetch, getAuthToken, setAuthToken, removeAuthToken } from './api';
import { syncOfflineScans } from './utils/offlineQueue';

const HomePage = lazy(() => import('./components/HomePage'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const UserPortal = lazy(() => import('./components/UserPortal'));
const KaryakarPortal = lazy(() => import('./components/KaryakarPortal'));
const AdminPortal = lazy(() => import('./components/AdminPortal'));

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [autoScanNotice, setAutoScanNotice] = useState(null);

  useEffect(() => {
    // Register PWA Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('SW registration failed:', err);
      });
    }

    // Sync offline queued scans when online
    const handleOnline = () => {
      syncOfflineScans(apiFetch);
    };
    window.addEventListener('online', handleOnline);
    syncOfflineScans(apiFetch);

    // Listen for PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    // Check if URL has ?qr_ref=... from standard camera scan
    const urlParams = new URLSearchParams(window.location.search);
    const scannedQrRef = urlParams.get('qr_ref');
    if (scannedQrRef) {
      sessionStorage.setItem('pending_qr_ref', scannedQrRef);
      // Clean URL parameter without page refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    checkAuth();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (user && !loading) {
      const pendingRef = sessionStorage.getItem('pending_qr_ref');
      if (pendingRef) {
        processPendingScan(pendingRef);
      }
    }
  }, [user, loading]);

  const processPendingScan = async (qrRef) => {
    sessionStorage.removeItem('pending_qr_ref');
    setAutoScanNotice({
      status: 'loading',
      title: 'Verifying Camera Scan...',
      message: 'Fetching your GPS location for geofence verification...'
    });

    if (!navigator.geolocation) {
      setAutoScanNotice({
        status: 'error',
        title: 'Geolocation Unsupported',
        message: 'Geolocation is not supported by your browser.'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          setAutoScanNotice({
            status: 'loading',
            title: 'Verifying Mandir Geofence...',
            message: 'Validating active event and distance radius...'
          });

          const res = await apiFetch('/attendance/scan', {
            method: 'POST',
            body: JSON.stringify({
              qr_code_reference: qrRef,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            })
          });

          const formattedTime = new Date(res.timestamp_utc).toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });

          setAutoScanNotice({
            status: 'success',
            title: `Attendance Marked Successfully!`,
            message: `Event: "${res.event_title || 'Sabha'}" • Status: PRESENT (${formattedTime} IST)`,
            detail: res.distance_meters !== null ? `Geofence Distance: ${res.distance_meters.toFixed(1)}m away` : 'Mandir Radius Verified'
          });

          checkAuth();
        } catch (err) {
          setAutoScanNotice({
            status: 'error',
            title: 'Scan Verification Failed',
            message: err.message || 'Could not verify attendance.'
          });
        }
      },
      (geoErr) => {
        setAutoScanNotice({
          status: 'error',
          title: 'GPS Location Permission Required',
          message: 'Please enable Location / GPS permission on your phone so we can verify your Mandir distance radius.'
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

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
      {/* Navigation Header for Logged-In Users */}
      {user && (
        <Header
          user={user}
          onLogout={handleLogout}
          onSwitchAccount={handleSwitchAccount}
          onInstallPWA={handleInstallPWA}
          deferredPrompt={deferredPrompt}
        />
      )}

      {/* Auto Camera Scan Notification Modal */}
      {autoScanNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full warm-shadow border border-[#EFE7DA] text-center space-y-4 relative">
            {autoScanNotice.status !== 'loading' && (
              <button
                onClick={() => setAutoScanNotice(null)}
                className="absolute top-4 right-4 text-[#3A322C]/50 hover:text-[#8B3A3A] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {autoScanNotice.status === 'loading' && (
              <div className="space-y-3 py-4">
                <Loader2 className="w-12 h-12 text-[#E8A33D] animate-spin mx-auto" />
                <h3 className="font-serif-accent text-xl font-bold text-[#8B3A3A]">
                  {autoScanNotice.title}
                </h3>
                <p className="text-xs text-[#3A322C]/70">{autoScanNotice.message}</p>
              </div>
            )}

            {autoScanNotice.status === 'success' && (
              <div className="space-y-3 py-2">
                <div className="w-16 h-16 rounded-full bg-[#5B8C5B]/15 text-[#5B8C5B] flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="font-serif-accent text-2xl font-bold text-[#5B8C5B]">
                  {autoScanNotice.title}
                </h3>
                <p className="text-xs font-semibold text-[#3A322C]">{autoScanNotice.message}</p>
                {autoScanNotice.detail && (
                  <p className="text-[11px] text-[#3A322C]/60 italic">{autoScanNotice.detail}</p>
                )}
                <button
                  onClick={() => setAutoScanNotice(null)}
                  className="w-full bg-[#5B8C5B] hover:bg-[#4A734A] text-white font-semibold text-xs py-2.5 rounded-xl cursor-pointer shadow-xs mt-2"
                >
                  Great! Done
                </button>
              </div>
            )}

            {autoScanNotice.status === 'error' && (
              <div className="space-y-3 py-2">
                <div className="w-16 h-16 rounded-full bg-[#C1554A]/15 text-[#C1554A] flex items-center justify-center mx-auto">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="font-serif-accent text-xl font-bold text-[#C1554A]">
                  {autoScanNotice.title}
                </h3>
                <p className="text-xs text-[#3A322C] font-medium">{autoScanNotice.message}</p>
                <button
                  onClick={() => setAutoScanNotice(null)}
                  className="w-full bg-[#8B3A3A] hover:bg-[#6E2C2C] text-white font-semibold text-xs py-2.5 rounded-xl cursor-pointer shadow-xs mt-2"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <main>
        <Suspense fallback={
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#8B3A3A] animate-spin" />
            <p className="text-xs font-semibold text-[#8B3A3A]">Loading Sabha Application Modules...</p>
          </div>
        }>
          {!user ? (
            <>
              <HomePage onOpenLogin={() => setShowLoginModal(true)} />
              {(showLoginModal || sessionStorage.getItem('pending_qr_ref')) && (
                <AuthModal 
                  onLoginSuccess={(token, uData) => {
                    setShowLoginModal(false);
                    handleLoginSuccess(token, uData);
                  }}
                  onClose={() => setShowLoginModal(false)}
                />
              )}
            </>
          ) : (
            <div className="pb-12">
              {user.role === 'admin' && (
                <AdminPortal user={user} onUserUpdated={checkAuth} />
              )}
              {user.role === 'karyakar' && (
                <KaryakarPortal user={user} onUserUpdated={checkAuth} />
              )}
              {user.role === 'user' && (
                <UserPortal user={user} onUserUpdated={checkAuth} />
              )}
            </div>
          )}
        </Suspense>
      </main>
    </div>
  );
}
