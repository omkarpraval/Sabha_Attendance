import React, { useState, useEffect } from 'react';
import { 
  Trophy, Award, Calendar, Flame, CheckCircle2, MapPin, QrCode, 
  Sparkles, Gift, Send, ArrowRight, User, ShieldCheck, Clock, ChevronDown
} from 'lucide-react';
import { apiFetch } from '../api';

export default function HomePage({ onOpenLogin }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [birthdayData, setBirthdayData] = useState({ today_has_birthdays: false, today_birthdays: [], upcoming_birthdays: [] });
  const [liveStatus, setLiveStatus] = useState({ is_live: false, message: 'Loading status...' });
  const [stats, setStats] = useState({ total_attendances: 148, total_events: 24, total_members: 42 });
  const [loading, setLoading] = useState(true);
  const [visibleLeaderboardCount, setVisibleLeaderboardCount] = useState(10);

  useEffect(() => {
    fetchPublicData();
  }, []);

  const fetchPublicData = async () => {
    setLoading(true);
    try {
      const [leaderRes, bdayRes, statusRes, statsRes] = await Promise.all([
        apiFetch('/public/leaderboard').catch(() => []),
        apiFetch('/public/birthdays').catch(() => ({ today_has_birthdays: false, today_birthdays: [], upcoming_birthdays: [] })),
        apiFetch('/public/live-status').catch(() => ({ is_live: false, message: '🗓️ Sabha Portal Ready' })),
        apiFetch('/public/stats').catch(() => ({ total_attendances: 148, total_events: 24, total_members: 42 }))
      ]);

      setLeaderboard(leaderRes || []);
      setBirthdayData(bdayRes || { today_has_birthdays: false, today_birthdays: [], upcoming_birthdays: [] });
      setLiveStatus(statusRes || { is_live: false, message: '🗓️ Sabha Portal Ready' });
      setStats(statsRes || { total_attendances: 148, total_events: 24, total_members: 42 });
    } catch (err) {
      console.error('Error fetching public homepage data:', err);
    } finally {
      setLoading(false);
    }
  };

  const topThree = leaderboard.slice(0, 3);
  const remainingRanks = leaderboard.slice(3, visibleLeaderboardCount);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#3A322C] font-sans antialiased selection:bg-[#E8A33D]/20">
      
      {/* ==================== TOP NAVIGATION BAR ==================== */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#EFE7DA] px-4 sm:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8B3A3A] to-[#6A2B2B] text-white flex items-center justify-center shadow-md">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif-accent text-lg sm:text-xl font-bold text-[#8B3A3A] leading-tight">
                Sabha Attendance
              </h1>
              <p className="text-[10px] text-[#3A322C]/60 tracking-wider font-semibold uppercase hidden sm:block">
                Mandir QR & Geofence Portal
              </p>
            </div>
          </div>

          {/* Login Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenLogin}
              className="px-4 sm:px-6 py-2.5 rounded-xl bg-[#8B3A3A] hover:bg-[#722F2F] text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <User className="w-4 h-4" />
              <span>Member Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* ==================== HERO SECTION ==================== */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-8 bg-gradient-to-b from-[#FDFBF7] via-white to-[#FDFBF7]">
        {/* Background Decorative Rings */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#E8A33D]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">

          <h2 className="font-serif-accent text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#8B3A3A] tracking-tight leading-tight">
            Connect, Attend, & Grow <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[#8B3A3A] via-[#E8A33D] to-[#8B3A3A] bg-clip-text text-transparent">
              In Satsang Sabha
            </span>
          </h2>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#3A322C]/75 leading-relaxed font-normal">
            Automated Mandir QR & Geofence Attendance tracking system. Sign in to record your attendance, track your personal streaks, and view community hall of fame.
          </p>

          {/* Primary Action Button */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#8B3A3A] to-[#A34343] hover:from-[#722F2F] hover:to-[#8B3A3A] text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 group"
            >
              <Sparkles className="w-5 h-5 text-[#E8A33D] group-hover:rotate-12 transition-transform" />
              <span>Sign In / Mark Sabha Attendance</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <a
              href="#leaderboard"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white hover:bg-[#FDFBF7] text-[#3A322C] font-semibold text-sm border border-[#EFE7DA] shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-[#E8A33D]" />
              <span>View Leaderboard & Birthdays</span>
              <ChevronDown className="w-4 h-4 text-[#3A322C]/50" />
            </a>
          </div>

          {/* Latest / Next Sabha Date, Timing, & Location Cards */}
          <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl mx-auto">
            {/* Card 1: Date */}
            <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-[#EFE7DA] warm-shadow text-center flex flex-col items-center justify-center">
              <div className="p-2 rounded-xl bg-[#8B3A3A]/10 text-[#8B3A3A] mb-1.5">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="text-[11px] text-[#3A322C]/60 font-semibold uppercase tracking-wider">Sabha Date</div>
              <div className="text-sm sm:text-base font-bold font-serif-accent text-[#8B3A3A] mt-0.5">
                {liveStatus.date_formatted || 'Sunday, Aug 09, 2026'}
              </div>
            </div>

            {/* Card 2: Timing */}
            <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-[#EFE7DA] warm-shadow text-center flex flex-col items-center justify-center">
              <div className="p-2 rounded-xl bg-[#E8A33D]/10 text-[#E8A33D] mb-1.5">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-[11px] text-[#3A322C]/60 font-semibold uppercase tracking-wider">Session Timing</div>
              <div className="text-sm sm:text-base font-bold font-serif-accent text-[#E8A33D] mt-0.5">
                {liveStatus.timing_str || '17:00 – 19:00 IST'}
              </div>
            </div>

            {/* Card 3: Location */}
            <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-[#EFE7DA] warm-shadow text-center flex flex-col items-center justify-center">
              <div className="p-2 rounded-xl bg-[#5B8C5B]/10 text-[#5B8C5B] mb-1.5">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="text-[11px] text-[#3A322C]/60 font-semibold uppercase tracking-wider">Mandir Venue Location</div>
              <div className="text-sm sm:text-base font-bold font-serif-accent text-[#5B8C5B] mt-0.5 truncate max-w-full px-2" title={liveStatus.venue_name || 'BAPS Swaminarayan Mandir'}>
                {liveStatus.venue_name || 'BAPS Swaminarayan Mandir'}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ==================== TODAY'S BIRTHDAY HUB ==================== */}
      <section className="py-16 px-4 sm:px-8 bg-[#FDFBF7]">
        <div className="max-w-5xl mx-auto">
          
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-xl bg-[#E8A33D]/10 text-[#E8A33D]">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-accent text-xl sm:text-2xl font-bold text-[#8B3A3A]">
                Today's Birthday Celebrations 🎂
              </h3>
              <p className="text-xs text-[#3A322C]/70">
                Wish your fellow Satsangi members a blessed Happy Birthday!
              </p>
            </div>
          </div>

          {birthdayData.today_has_birthdays ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {birthdayData.today_birthdays.map((bday) => (
                <div key={bday.id} className="bg-white p-5 rounded-2xl border border-[#E8A33D]/40 warm-shadow relative overflow-hidden group hover:border-[#E8A33D] transition-all">
                  <div className="absolute top-0 right-0 bg-[#E8A33D] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    🎉 Birthday Today!
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E8A33D] to-[#D98A2B] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      {bday.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#3A322C] group-hover:text-[#8B3A3A] transition-colors">
                        {bday.name}
                      </h4>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-[#FDFBF7] border border-[#EFE7DA] text-[10px] font-semibold text-[#8B3A3A] capitalize">
                        {bday.member_category}
                      </span>
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/${bday.whatsapp_phone}?text=${encodeURIComponent(`Jay Swaminarayan ${bday.name} bhai! Wishing you a very Happy Birthday from Sabha Mandal! May Maharaj & Swami bless you with good health and happiness! 🎉`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Wish Happy Birthday on WhatsApp</span>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-[#EFE7DA] warm-shadow flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center md:text-left">
                <div className="text-xs font-semibold text-[#8B3A3A] uppercase tracking-wider">
                  No Birthdays Today
                </div>
                <h4 className="font-serif-accent text-lg font-bold text-[#3A322C]">
                  "Sabha is a family where every member's presence is a blessing."
                </h4>
                <p className="text-xs text-[#3A322C]/70">
                  Stay tuned for upcoming member celebrations.
                </p>
              </div>

              {birthdayData.upcoming_birthdays.length > 0 && (
                <div className="w-full md:w-auto flex flex-wrap gap-2 justify-center">
                  {birthdayData.upcoming_birthdays.map((up) => (
                    <div key={up.id} className="bg-[#FDFBF7] px-3.5 py-2 rounded-xl border border-[#EFE7DA] text-xs font-medium text-[#3A322C]">
                      <span className="font-bold">{up.name}</span>
                      <span className="text-[#8B3A3A] font-semibold ml-1.5">({up.dob_formatted})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </section>

      {/* ==================== LIVE LEADERBOARD SECTION ==================== */}
      <section id="leaderboard" className="py-16 px-4 sm:px-8 bg-white">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8A33D]/10 text-[#E8A33D] text-xs font-bold uppercase tracking-wider">
              <Trophy className="w-4 h-4" />
              <span>Hall of Fame</span>
            </div>
            <h3 className="font-serif-accent text-2xl sm:text-4xl font-extrabold text-[#8B3A3A]">
              Sabha Attendance Champions
            </h3>
            <p className="text-xs sm:text-sm text-[#3A322C]/70 max-w-xl mx-auto">
              Top members ranked by active consecutive weekly streak. Ties are broken by earliest average arrival punctuality!
            </p>
          </div>

          {/* TOP 3 PODIUM DISPLAY */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
            
            {/* 2nd Place (Silver) */}
            {topThree[1] && (
              <div className="bg-gradient-to-b from-[#F5F5F5] to-white p-6 rounded-2xl border-2 border-slate-300 warm-shadow text-center relative order-2 md:order-1">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-200 text-slate-800 font-bold text-base flex items-center justify-center shadow-md border border-slate-300">
                  🥈
                </div>
                <div className="w-14 h-14 mx-auto rounded-full bg-slate-200 text-slate-700 font-bold text-xl flex items-center justify-center mb-3 mt-2 shadow-inner">
                  {topThree[1].name.charAt(0)}
                </div>
                <h4 className="font-bold text-base text-[#3A322C] truncate">{topThree[1].name}</h4>
                <span className="text-[10px] text-[#3A322C]/60 uppercase font-semibold block mt-0.5">{topThree[1].member_category}</span>
                <div className="mt-3 py-1.5 px-3 bg-slate-100 rounded-xl inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Flame className="w-4 h-4 text-[#E8A33D]" />
                  <span>{topThree[1].current_streak} Week Streak</span>
                </div>
                <div className="mt-1.5 text-[11px] font-semibold text-[#5B8C5B]">
                  Present: {topThree[1].present_count ?? topThree[1].lifetime_count} / {topThree[1].total_events || 24} Sabhas ({topThree[1].turnout_pct ?? 0}%)
                </div>
                <div className="text-[11px] text-[#3A322C]/70 mt-1 font-medium">
                  {topThree[1].punctuality_label}
                </div>
              </div>
            )}

            {/* 1st Place (Gold Winner) */}
            {topThree[0] && (
              <div className="bg-gradient-to-b from-[#FFFDF5] via-white to-white p-7 rounded-3xl border-2 border-[#E8A33D] warm-shadow text-center relative order-1 md:order-2 shadow-xl md:-translate-y-3">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#E8A33D] text-white font-extrabold text-xs flex items-center gap-1 shadow-md">
                  👑 1st Champion
                </div>
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-[#E8A33D] to-[#F5C26B] text-white font-extrabold text-2xl flex items-center justify-center mb-3 mt-3 shadow-lg ring-4 ring-[#E8A33D]/20">
                  {topThree[0].name.charAt(0)}
                </div>
                <h4 className="font-bold text-lg text-[#8B3A3A] truncate">{topThree[0].name}</h4>
                <span className="text-[11px] text-[#E8A33D] uppercase font-bold tracking-wider block mt-0.5">{topThree[0].member_category}</span>
                
                <div className="mt-3 py-2 px-4 bg-[#E8A33D]/15 border border-[#E8A33D]/30 rounded-xl inline-flex items-center gap-2 text-sm font-extrabold text-[#8B3A3A]">
                  <Flame className="w-5 h-5 text-[#E8A33D]" />
                  <span>{topThree[0].current_streak} Week Streak</span>
                </div>
                
                <div className="mt-1.5 text-xs font-bold text-[#5B8C5B]">
                  Present: {topThree[0].present_count ?? topThree[0].lifetime_count} / {topThree[0].total_events || 24} Sabhas ({topThree[0].turnout_pct ?? 0}%)
                </div>
                <div className="text-xs text-[#3A322C]/70 font-semibold mt-1 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#E8A33D]" />
                  <span>{topThree[0].punctuality_label}</span>
                </div>
              </div>
            )}

            {/* 3rd Place (Bronze) */}
            {topThree[2] && (
              <div className="bg-gradient-to-b from-[#FAF4F0] to-white p-6 rounded-2xl border-2 border-[#D99B82] warm-shadow text-center relative order-3">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#FAF4F0] text-[#8B3A3A] font-bold text-base flex items-center justify-center shadow-md border border-[#D99B82]">
                  🥉
                </div>
                <div className="w-14 h-14 mx-auto rounded-full bg-[#FAF4F0] text-[#8B3A3A] font-bold text-xl flex items-center justify-center mb-3 mt-2 shadow-inner border border-[#D99B82]/40">
                  {topThree[2].name.charAt(0)}
                </div>
                <h4 className="font-bold text-base text-[#3A322C] truncate">{topThree[2].name}</h4>
                <span className="text-[10px] text-[#3A322C]/60 uppercase font-semibold block mt-0.5">{topThree[2].member_category}</span>
                <div className="mt-3 py-1.5 px-3 bg-[#FAF4F0] rounded-xl inline-flex items-center gap-1.5 text-xs font-bold text-[#8B3A3A]">
                  <Flame className="w-4 h-4 text-[#E8A33D]" />
                  <span>{topThree[2].current_streak} Week Streak</span>
                </div>
                <div className="mt-1.5 text-[11px] font-semibold text-[#5B8C5B]">
                  Present: {topThree[2].present_count ?? topThree[2].lifetime_count} / {topThree[2].total_events || 24} Sabhas ({topThree[2].turnout_pct ?? 0}%)
                </div>
                <div className="text-[11px] text-[#3A322C]/70 mt-1 font-medium">
                  {topThree[2].punctuality_label}
                </div>
              </div>
            )}

          </div>

          {/* RANKS 4 AND BEYOND TABLE LIST */}
          {remainingRanks.length > 0 && (
            <div className="bg-[#FDFBF7] rounded-2xl border border-[#EFE7DA] p-4 sm:p-6 space-y-2">
              <h4 className="text-xs font-bold text-[#3A322C]/60 uppercase tracking-wider mb-3 px-2">
                Honorable Leaderboard Mentions
              </h4>
              <div className="divide-y divide-[#EFE7DA]">
                {remainingRanks.map((member) => (
                  <div key={member.id} className="py-3 px-2 sm:px-4 flex items-center justify-between gap-4 hover:bg-white rounded-xl transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-[#EFE7DA] text-[#3A322C] font-bold text-xs flex items-center justify-center shrink-0">
                        #{member.rank}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-[#3A322C] truncate">
                          {member.name}
                        </div>
                        <div className="text-[11px] text-[#3A322C]/60 font-medium">
                          {member.punctuality_label}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold text-[#8B3A3A] flex items-center gap-1 justify-end">
                          <Flame className="w-3.5 h-3.5 text-[#E8A33D]" />
                          <span>{member.current_streak} wks</span>
                        </div>
                        <div className="text-[11px] text-[#5B8C5B] font-semibold mt-0.5">
                          Present: {member.present_count ?? member.lifetime_count} / {member.total_events || 24} ({member.turnout_pct ?? 0}%)
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progressive Show More Button */}
              {leaderboard.length > visibleLeaderboardCount && (
                <div className="pt-4 text-center">
                  <button
                    onClick={() => setVisibleLeaderboardCount(prev => prev + 10)}
                    className="px-6 py-2.5 rounded-xl bg-white border border-[#EFE7DA] hover:bg-[#8B3A3A] hover:text-white hover:border-[#8B3A3A] text-[#8B3A3A] text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    + Show More ({leaderboard.length - visibleLeaderboardCount} remaining)
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </section>

      {/* ==================== HOW IT WORKS SHOWCASE ==================== */}
      <section className="py-16 px-4 sm:px-8 bg-gradient-to-b from-[#FDFBF7] to-white">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#8B3A3A]">Simple 3-Step Verification</span>
            <h3 className="font-serif-accent text-2xl sm:text-3xl font-extrabold text-[#3A322C] mt-1">
              How Sabha Attendance Verification Works
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            
            <div className="bg-white p-6 rounded-2xl border border-[#EFE7DA] warm-shadow space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-[#8B3A3A]/10 text-[#8B3A3A] flex items-center justify-center font-bold">
                1
              </div>
              <h4 className="font-bold text-base text-[#3A322C] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#8B3A3A]" />
                Mandir Geofence Radius
              </h4>
              <p className="text-xs text-[#3A322C]/70 leading-relaxed">
                Your device verifies that you are physically present inside the Mandir hall or Sabha venue radius.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#EFE7DA] warm-shadow space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-[#E8A33D]/10 text-[#E8A33D] flex items-center justify-center font-bold">
                2
              </div>
              <h4 className="font-bold text-base text-[#3A322C] flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#E8A33D]" />
                Scan Mandir QR Poster
              </h4>
              <p className="text-xs text-[#3A322C]/70 leading-relaxed">
                Scan the permanent reusable Mandir QR poster using your smartphone camera or embedded app scanner.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#EFE7DA] warm-shadow space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-[#5B8C5B]/10 text-[#5B8C5B] flex items-center justify-center font-bold">
                3
              </div>
              <h4 className="font-bold text-base text-[#3A322C] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#5B8C5B]" />
                Instant Attendance Verified
              </h4>
              <p className="text-xs text-[#3A322C]/70 leading-relaxed">
                Your attendance is logged instantly, updating your active streak count and personal analytics history.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="py-8 px-4 sm:px-8 bg-white border-t border-[#EFE7DA] text-center text-xs text-[#3A322C]/70">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#8B3A3A]" />
            <span className="font-bold text-[#8B3A3A]">Sabha Attendance Management System</span>
          </div>
          <div>
            Automated Mandir QR & Geofencing System &copy; {new Date().getFullYear()}
          </div>
          <div>
            <button 
              onClick={onOpenLogin}
              className="text-[#8B3A3A] font-bold hover:underline cursor-pointer"
            >
              Member Portal Sign In
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
