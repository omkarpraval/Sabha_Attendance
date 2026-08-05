import React, { useState, useEffect } from 'react';
import { QrCode, Flame, Calendar as CalendarIcon, CheckCircle2, Clock, MapPin, AlertCircle, Sparkles, Send, BarChart3, TrendingUp, Award, PieChart } from 'lucide-react';
import { apiFetch } from '../api';
import QRScannerModal from './QRScannerModal';

export default function UserPortal({ user, onUserUpdated }) {
  const [activeEvent, setActiveEvent] = useState(null);
  const [isTodayEvent, setIsTodayEvent] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [history, setHistory] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pre-mark Excuse Modal state
  const [excuseModalEvent, setExcuseModalEvent] = useState(null);
  const [excuseReason, setExcuseReason] = useState('');
  const [excusing, setExcusing] = useState(false);

  useEffect(() => {
    loadUserPortalData();
  }, []);

  const loadUserPortalData = async () => {
    try {
      setLoading(true);
      const events = await apiFetch('/events');
      
      // Calculate today's date YYYY-MM-DD in IST
      const now = new Date();
      // IST offset +5:30
      const istTime = new Date(now.getTime() + (5.5 * 3600 * 1000));
      const todayStr = istTime.toISOString().split('T')[0];

      // Find event for today
      const todayEv = events.find(e => e.event_date === todayStr && e.status === 'open');
      if (todayEv) {
        setActiveEvent(todayEv);
        setIsTodayEvent(true);
      } else {
        // Fallback to nearest upcoming event if no event today
        const nearest = events.find(e => e.status === 'open') || events[0] || null;
        setActiveEvent(nearest);
        setIsTodayEvent(false);
      }

      setUpcomingEvents(events.filter(e => e.status === 'open'));

      // Fetch user's attendance history
      const hist = await apiFetch('/attendance/history');
      setHistory(hist);
    } catch (err) {
      console.error("Error loading portal data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = async (qrRef, lat, lng) => {
    setShowScanner(false);
    setScanError(null);
    setScanResult(null);

    try {
      const res = await apiFetch('/attendance/scan', {
        method: 'POST',
        body: JSON.stringify({
          qr_code_reference: qrRef,
          latitude: lat,
          longitude: lng
        })
      });

      setScanResult(res);
      loadUserPortalData();
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      setScanError(err.message);
    }
  };

  const handleSubmitExcuse = async (e) => {
    e.preventDefault();
    if (!excuseModalEvent || !excuseReason) return;
    try {
      setExcusing(true);
      await apiFetch('/attendance/excuse', {
        method: 'POST',
        body: JSON.stringify({
          event_id: excuseModalEvent.id,
          reason: excuseReason
        })
      });
      setExcuseModalEvent(null);
      setExcuseReason('');
      loadUserPortalData();
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setExcusing(false);
    }
  };

  const formatISTTime = (utcIsoString) => {
    if (!utcIsoString) return '';
    try {
      return new Date(utcIsoString).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }) + ' IST';
    } catch (e) {
      return utcIsoString;
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-10 h-10 border-4 border-[#8B3A3A] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div className="text-xs text-[#3A322C]/70 mt-3">Loading your attendance portal...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      
      {/* Header Greeting Banner & Streak Badge */}
      <div className="bg-gradient-to-r from-[#8B3A3A] via-[#A8453B] to-[#6E2C2C] text-white rounded-3xl p-6 md:p-8 warm-shadow relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-[#E8A33D]/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-[#E8A33D] text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Jai Swaminarayan</span>
            </div>
            <h2 className="font-serif-accent text-2xl md:text-3xl font-bold">
              {user.name}
            </h2>
            <p className="text-white/80 text-xs md:text-sm mt-1">
              Welcome to your personal sabha attendance dashboard
            </p>
          </div>

          {/* Diya Flame Streak Counter Widget */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#E8A33D] flex items-center justify-center text-white shadow-md">
                <Flame className="w-7 h-7 animate-diya-flame" />
              </div>
              <div>
                <div className="font-serif-accent text-2xl font-bold leading-none text-[#E8A33D]">
                  {user.current_streak} <span className="text-sm font-normal text-white/90">Events</span>
                </div>
                <div className="text-[11px] text-white/70 font-medium">Current Streak</div>
              </div>
            </div>

            <div className="h-8 w-px bg-white/20"></div>

            <div>
              <div className="font-serif-accent text-xl font-bold leading-none text-white">
                {user.lifetime_count}
              </div>
              <div className="text-[11px] text-white/70 font-medium">Lifetime Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Section: Scan to Mark Attendance */}
      <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA] text-center space-y-4">
        <div>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${
            isTodayEvent ? 'bg-[#5B8C5B]/15 text-[#5B8C5B]' : 'bg-[#E8A33D]/15 text-[#E8A33D]'
          }`}>
            {isTodayEvent ? "Today's Live Sabha Attendance" : "Next Upcoming Sabha Event"}
          </span>

          <h3 className="font-serif-accent text-2xl font-bold text-[#8B3A3A]">
            {activeEvent ? activeEvent.title : 'Saturday Sabha'}
          </h3>

          {activeEvent && (
            <p className="text-xs text-[#3A322C]/70 mt-1 flex flex-wrap items-center justify-center gap-3">
              <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> {activeEvent.event_date}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {activeEvent.start_time} - {activeEvent.end_time} IST</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {activeEvent.venue_name || 'Central Sabha Mandir'}</span>
            </p>
          )}
        </div>

        {/* Primary Scan Button or Marked Attendance Status Card */}
        {(() => {
          const activeEventRecord = activeEvent ? history.find(item => item.event_id === activeEvent.id) : null;
          if (activeEventRecord) {
            const isPresent = activeEventRecord.status === 'present';
            const isExcused = activeEventRecord.status === 'excused';
            return (
              <div className={`my-4 p-6 rounded-2xl border text-center space-y-2 animate-in fade-in zoom-in-95 ${
                isPresent ? 'bg-[#5B8C5B]/10 border-[#5B8C5B]/30 text-[#5B8C5B]' :
                isExcused ? 'bg-[#D9B166]/10 border-[#D9B166]/30 text-[#D9B166]' : 'bg-[#C1554A]/10 border-[#C1554A]/30 text-[#C1554A]'
              }`}>
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-1 ${
                  isPresent ? 'bg-[#5B8C5B]/20' : isExcused ? 'bg-[#D9B166]/20' : 'bg-[#C1554A]/20'
                }`}>
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-serif-accent text-xl font-bold">
                  Attendance Status: {activeEventRecord.status.toUpperCase()}
                </h4>
                <p className="text-xs text-[#3A322C]/80">
                  Logged on {activeEventRecord.event_date} {activeEventRecord.timestamp_utc ? `at ${formatISTTime(activeEventRecord.timestamp_utc)}` : ''} • Marked by {activeEventRecord.marked_by_name || 'Self QR'}
                </p>
                <div className="pt-2">
                  <span className={`inline-block px-3.5 py-1 rounded-full text-xs font-semibold text-white shadow-2xs ${
                    isPresent ? 'bg-[#5B8C5B]' : isExcused ? 'bg-[#D9B166]' : 'bg-[#C1554A]'
                  }`}>
                    ✓ Attendance Verified for {activeEvent?.title || 'this Sabha'}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div className="py-4 flex justify-center">
              <button
                onClick={() => setShowScanner(true)}
                className="w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-[#E8A33D] to-[#F0A93A] text-white font-bold flex flex-col items-center justify-center gap-2 shadow-xl hover:scale-105 transition-all duration-300 animate-scan-ripple cursor-pointer"
              >
                <QrCode className="w-14 h-14 sm:w-16 sm:h-16" />
                <span className="text-sm sm:text-base tracking-wide font-semibold">Tap to Scan QR</span>
                <span className="text-[10px] text-white/80 font-normal bg-black/10 px-2.5 py-0.5 rounded-full">
                  GPS Geofenced Radius
                </span>
              </button>
            </div>
          );
        })()}

        {/* Success Scan Feedback Card */}
        {scanResult && (
          <div className="p-4 rounded-2xl bg-[#5B8C5B]/10 border border-[#5B8C5B]/30 text-[#5B8C5B] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center gap-2 font-bold text-base mb-1">
              <CheckCircle2 className="w-6 h-6 text-[#5B8C5B]" />
              <span>Marked Present Successfully!</span>
            </div>
            <p className="text-xs text-[#3A322C]/80">
              Attendance recorded at {formatISTTime(scanResult.timestamp_utc)}.
              {scanResult.distance_meters !== null && ` Verified ${scanResult.distance_meters}m from venue center.`}
            </p>
          </div>
        )}

        {/* Error Feedback */}
        {scanError && (
          <div className="p-4 rounded-2xl bg-[#C1554A]/10 border border-[#C1554A]/30 text-[#C1554A] animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-sm block">Attendance Validation Failed</span>
                <span className="text-xs text-[#3A322C]/80 mt-0.5 block">{scanError}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PERSONAL ATTENDANCE RECORD (GRAPH / PERCENTAGE) */}
      <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA] space-y-5">
        <div className="flex items-center justify-between border-b border-[#EFE7DA] pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#8B3A3A]" />
            <div>
              <h3 className="font-serif-accent text-lg font-bold text-[#8B3A3A]">
                Personal Attendance Record & Analytics
              </h3>
              <p className="text-xs text-[#3A322C]/70 font-medium">Your historical turnout percentage and monthly streak graph</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5B8C5B]/15 text-[#5B8C5B] font-bold text-xs">
            <Award className="w-4 h-4" />
            <span>{history.length > 0 ? Math.round((history.filter(h => h.status === 'present').length / history.length) * 100) : 100}% Rate</span>
          </div>
        </div>

        {/* Attendance Summary Stat Cards */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-[#5B8C5B]/10 rounded-xl border border-[#5B8C5B]/20">
            <div className="text-[11px] text-[#5B8C5B] font-bold uppercase">Present</div>
            <div className="text-xl font-bold text-[#5B8C5B]">{history.filter(h => h.status === 'present').length}</div>
            <div className="text-[10px] text-[#3A322C]/60 font-medium">Sabhas Attended</div>
          </div>

          <div className="p-3 bg-[#C1554A]/10 rounded-xl border border-[#C1554A]/20">
            <div className="text-[11px] text-[#C1554A] font-bold uppercase">Absent</div>
            <div className="text-xl font-bold text-[#C1554A]">{history.filter(h => h.status === 'absent').length}</div>
            <div className="text-[10px] text-[#3A322C]/60 font-medium">Missed Sessions</div>
          </div>

          <div className="p-3 bg-[#E8A33D]/10 rounded-xl border border-[#E8A33D]/20">
            <div className="text-[11px] text-[#E8A33D] font-bold uppercase">Excused</div>
            <div className="text-xl font-bold text-[#E8A33D]">{history.filter(h => h.status === 'excused').length}</div>
            <div className="text-[10px] text-[#3A322C]/60 font-medium">Prior Informed</div>
          </div>
        </div>

        {/* Monthly Attendance Percentage Graph Bars */}
        <div className="space-y-3 pt-1">
          <div className="text-xs font-semibold text-[#8B3A3A] flex items-center justify-between">
            <span>Monthly Attendance Progress (%)</span>
            <span className="text-[11px] text-[#3A322C]/60 font-medium">Last 6 Months</span>
          </div>

          {(() => {
            const monthlyMap = {};
            history.forEach(h => {
              const dateStr = h.timestamp_utc || h.event_date;
              if (!dateStr) return;
              const key = dateStr.substring(0, 7);
              const label = new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              if (!monthlyMap[key]) monthlyMap[key] = { label, total: 0, present: 0 };
              monthlyMap[key].total += 1;
              if (h.status === 'present') monthlyMap[key].present += 1;
            });

            const months = Object.values(monthlyMap).slice(0, 6);
            if (months.length === 0) {
              return (
                <div className="py-4 text-center text-xs text-[#3A322C]/60 italic">
                  Attendance data graph will appear after your first Sabha scan.
                </div>
              );
            }

            return months.map((m, i) => {
              const pct = Math.round((m.present / m.total) * 100);
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-[#3A322C]">
                    <span>{m.label}</span>
                    <span className="font-mono text-[#5B8C5B] font-bold">{pct}% ({m.present}/{m.total} Sabhas)</span>
                  </div>
                  <div className="w-full bg-[#EFE7DA]/60 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#5B8C5B] to-[#8B3A3A] h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Attendance History Calendar Graph */}
      <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-serif-accent text-xl font-bold text-[#8B3A3A]">
              Attendance Calendar & History
            </h3>
            <p className="text-xs text-[#3A322C]/70">Your historical attendance logs across all sabha sessions</p>
          </div>
          
          {/* Status Legends */}
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-medium"><span className="w-3 h-3 rounded-full bg-[#5B8C5B]"></span> Present</span>
            <span className="flex items-center gap-1.5 font-medium"><span className="w-3 h-3 rounded-full bg-[#C1554A]"></span> Absent</span>
            <span className="flex items-center gap-1.5 font-medium"><span className="w-3 h-3 rounded-full bg-[#D9B166]"></span> Excused</span>
          </div>
        </div>

        {/* List of past attendance */}
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#3A322C]/60 italic">
              No attendance records found yet. Scan your first QR code above!
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] hover:bg-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                    item.status === 'present' ? 'bg-[#5B8C5B]' :
                    item.status === 'absent' ? 'bg-[#C1554A]' : 'bg-[#D9B166]'
                  }`}></div>
                  <div>
                    <div className="font-semibold text-sm text-[#3A322C]">
                      {item.event_title}
                    </div>
                    <div className="text-xs text-[#3A322C]/60">
                      {item.event_date} {item.timestamp_utc ? `at ${formatISTTime(item.timestamp_utc)}` : ''} • Marked by: {item.marked_by_name}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    item.status === 'present' ? 'bg-[#5B8C5B]/15 text-[#5B8C5B]' :
                    item.status === 'absent' ? 'bg-[#C1554A]/15 text-[#C1554A]' : 'bg-[#D9B166]/20 text-[#D9B166]'
                  }`}>
                    {item.status}
                  </span>
                  {item.excuse_reason && (
                    <div className="text-[11px] text-[#3A322C]/60 italic mt-0.5">
                      "{item.excuse_reason}"
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upcoming Events & Pre-mark Excused Option */}
      <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA]">
        <h3 className="font-serif-accent text-xl font-bold text-[#8B3A3A] mb-3">
          Upcoming Sabha Sessions
        </h3>
        <div className="space-y-3">
          {upcomingEvents.map((ev) => (
            <div key={ev.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7]">
              <div>
                <h4 className="font-semibold text-sm text-[#3A322C]">{ev.title}</h4>
                <p className="text-xs text-[#3A322C]/60 mt-0.5">
                  {ev.event_date} ({ev.start_time} - {ev.end_time} IST) • {ev.venue_name || 'Central Mandir'}
                </p>
              </div>

              <button
                onClick={() => setExcuseModalEvent(ev)}
                className="text-xs bg-white hover:bg-[#D9B166]/20 text-[#D9B166] border border-[#D9B166] font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer self-end sm:self-auto"
              >
                Pre-mark Excused
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* QR Camera Scanner Modal */}
      {showScanner && (
        <QRScannerModal
          onClose={() => setShowScanner(false)}
          onScanSuccess={handleScanSuccess}
          activeEvent={activeEvent}
        />
      )}

      {/* Pre-mark Excused Dialog Modal */}
      {excuseModalEvent && (
        <div className="fixed inset-0 z-50 bg-[#3A322C]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 warm-shadow border border-[#EFE7DA]">
            <h3 className="font-serif-accent text-xl font-bold text-[#8B3A3A] mb-2">
              Pre-mark Excused Absence
            </h3>
            <p className="text-xs text-[#3A322C]/70 mb-4">
              Pre-marking excused for <strong>{excuseModalEvent.title}</strong> on {excuseModalEvent.event_date}. (Note: Excused status breaks streak calculation, but avoids red absent no-show tag).
            </p>

            <form onSubmit={handleSubmitExcuse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#3A322C] mb-1">Reason for Absence</label>
                <textarea
                  required
                  value={excuseReason}
                  onChange={(e) => setExcuseReason(e.target.value)}
                  placeholder="e.g. Travel, Work duty, Illness..."
                  className="w-full p-3 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-sm text-[#3A322C] focus:outline-none focus:border-[#E8A33D] h-24"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setExcuseModalEvent(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#3A322C]/70 hover:bg-[#FDFBF7] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={excusing}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#D9B166] hover:bg-[#C89F52] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {excusing ? 'Submitting...' : 'Submit Excuse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
