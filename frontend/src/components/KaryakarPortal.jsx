import React, { useState, useEffect } from 'react';
import { Search, UserCheck, CheckCircle2, XCircle, Clock, Eye, QrCode, ShieldAlert, Award, Calendar, ChevronDown, Users } from 'lucide-react';
import { apiFetch } from '../api';
import QRScannerModal from './QRScannerModal';
import UserManagementSection from './UserManagementSection';

export default function KaryakarPortal({ user, onUserUpdated }) {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'members'

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [activeEvent, setActiveEvent] = useState(null);
  
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showSelfScanner, setShowSelfScanner] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadEventsAndUsers();
  }, []);

  useEffect(() => {
    if (selectedEventId && events.length > 0) {
      const selected = events.find(e => e.id === parseInt(selectedEventId));
      if (selected) {
        setActiveEvent(selected);
        loadEventAttendance(selected.id);
      }
    }
  }, [selectedEventId, events]);

  const loadEventsAndUsers = async () => {
    try {
      setLoading(true);
      const [evList, memberList] = await Promise.all([
        apiFetch('/events'),
        apiFetch('/users?status=approved')
      ]);

      setEvents(evList);
      setUsers(memberList);

      // Default selected event: Today's event or first event in smart list
      if (evList.length > 0) {
        const now = new Date();
        const istTime = new Date(now.getTime() + (5.5 * 3600 * 1000));
        const todayStr = istTime.toISOString().split('T')[0];

        const todayEv = evList.find(e => e.event_date === todayStr);
        const defaultEv = todayEv || evList[0];

        setSelectedEventId(defaultEv.id.toString());
        setActiveEvent(defaultEv);
        loadEventAttendance(defaultEv.id);
      }
    } catch (err) {
      console.error("Error loading Karyakar data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadEventAttendance = async (eventId) => {
    try {
      const hist = await apiFetch(`/attendance/history?event_id=${eventId}`);
      const map = {};
      hist.forEach(h => { map[h.user_id] = h; });
      setAttendanceMap(map);
    } catch (err) {
      console.error("Error loading event attendance:", err);
    }
  };

  const handleManualMark = async (targetUser, newStatus) => {
    if (!activeEvent) {
      alert("Please select an event to mark attendance.");
      return;
    }
    try {
      const res = await apiFetch('/attendance/manual', {
        method: 'POST',
        body: JSON.stringify({
          user_id: targetUser.id,
          event_id: activeEvent.id,
          status: newStatus
        })
      });

      setAttendanceMap(prev => ({
        ...prev,
        [targetUser.id]: res
      }));

      setToastMessage(`Marked ${targetUser.name} as ${newStatus.toUpperCase()} for ${activeEvent.title} (Tagged with Karyakar: ${user.name})`);
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSelfScanSuccess = async (qrRef, lat, lng) => {
    setShowSelfScanner(false);
    try {
      const res = await apiFetch('/attendance/scan', {
        method: 'POST',
        body: JSON.stringify({
          qr_code_reference: qrRef,
          latitude: lat,
          longitude: lng
        })
      });
      setToastMessage(`Your own attendance marked present successfully!`);
      setTimeout(() => setToastMessage(''), 4000);
      loadEventsAndUsers();
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      alert(`Scan failed: ${err.message}`);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone.includes(searchQuery)
  );

  const totalPresentCount = Object.values(attendanceMap).filter(a => a.status === 'present').length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-[#5B8C5B] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner & Tab Navigation Bar */}
      <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA] space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#EFE7DA] pb-4">
          <div>
            <div className="flex items-center gap-2 text-[#E8A33D] text-xs font-bold uppercase tracking-wider mb-1">
              <Award className="w-4 h-4" />
              <span>Karyakar Portal • Volunteer Control</span>
            </div>
            <h2 className="font-serif-accent text-2xl md:text-3xl font-bold text-[#8B3A3A]">
              Attendance & Member Portal
            </h2>
          </div>

          {/* Mark Own Attendance Button */}
          <button
            onClick={() => setShowSelfScanner(true)}
            className="bg-[#E8A33D] hover:bg-[#D98A2B] text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
          >
            <QrCode className="w-4 h-4" />
            <span>Mark My Attendance</span>
          </button>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-[#8B3A3A] text-white shadow-xs'
                : 'bg-[#FDFBF7] text-[#3A322C]/70 hover:bg-[#EFE7DA]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Attendance & Manual Override</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'members'
                ? 'bg-[#8B3A3A] text-white shadow-xs'
                : 'bg-[#FDFBF7] text-[#3A322C]/70 hover:bg-[#EFE7DA]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Member Accounts & Category Management</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ATTENDANCE & MANUAL OVERRIDE */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* EVENT SELECTOR DROPDOWN CARD */}
          <div className="bg-white p-5 rounded-2xl warm-shadow border border-[#EFE7DA] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="w-full md:w-2/3">
              <label className="block text-xs font-semibold text-[#8B3A3A] mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#E8A33D]" />
                Select Sabha Event to View / Mark Attendance:
              </label>
              <div className="relative">
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full p-2.5 pr-8 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs font-semibold text-[#3A322C] focus:outline-none focus:border-[#8B3A3A] cursor-pointer appearance-none"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.event_date === new Date().toISOString().split('T')[0] ? "TODAY: " : ""}
                      {ev.title} ({ev.event_date} • {ev.start_time} - {ev.end_time} IST) — Status: {ev.status.toUpperCase()}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-[#3A322C]/40 pointer-events-none" />
              </div>
            </div>

            {/* Real-time Headcount Ratio for Selected Event */}
            <div className="bg-[#FDFBF7] px-5 py-2.5 rounded-xl border border-[#EFE7DA] text-center w-full md:w-auto">
              <div className="font-serif-accent text-2xl font-bold text-[#8B3A3A]">
                {totalPresentCount} <span className="text-sm font-normal text-[#3A322C]/70">/ {users.length}</span>
              </div>
              <div className="text-[11px] text-[#3A322C]/70 font-medium">Present Recorded</div>
            </div>
          </div>

          {/* Searchable Member Directory & Manual Attendance Marking Table */}
          <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA] space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif-accent text-xl font-bold text-[#8B3A3A]">
                  Member Directory & Manual Attendance Override
                </h3>
                <p className="text-xs text-[#3A322C]/70">
                  Showing status for: <strong>{activeEvent ? `${activeEvent.title} (${activeEvent.event_date})` : 'Selected Sabha'}</strong>
                </p>
              </div>

              {/* Search Input */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[#3A322C]/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search member name or phone..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                />
              </div>
            </div>

            {/* Member Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#3A322C]">
                <thead>
                  <tr className="bg-[#FDFBF7] border-b border-[#EFE7DA] text-[#8B3A3A] uppercase font-bold text-[11px] tracking-wider">
                    <th className="p-3 rounded-l-xl">Member Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Streak / Total</th>
                    <th className="p-3">Event Status</th>
                    <th className="p-3 text-right rounded-r-xl">Manual Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE7DA]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-[#3A322C]/60 italic">
                        No members match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((member) => {
                      const record = attendanceMap[member.id];
                      const isPresent = record?.status === 'present';
                      const isAbsent = record?.status === 'absent';
                      const isExcused = record?.status === 'excused';

                      return (
                        <tr key={member.id} className="hover:bg-[#FDFBF7]/60 transition-colors">
                          <td className="p-3 font-semibold text-[#3A322C]">
                            {member.name}
                            {member.role !== 'user' && (
                              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-[#EFE7DA] text-[#8B3A3A] font-bold capitalize">
                                {member.role}
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-[#3A322C]/70">{member.phone}</td>

                          <td className="p-3">
                            <span className="font-semibold text-[#E8A33D]">{member.current_streak} streak</span>
                            <span className="text-[#3A322C]/50 text-[11px] ml-1">({member.lifetime_count} total)</span>
                          </td>

                          <td className="p-3">
                            {record ? (
                              <div>
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                  isPresent ? 'bg-[#5B8C5B]/15 text-[#5B8C5B]' :
                                  isAbsent ? 'bg-[#C1554A]/15 text-[#C1554A]' : 'bg-[#D9B166]/20 text-[#D9B166]'
                                }`}>
                                  {record.status}
                                </span>
                                <div className="text-[10px] text-[#3A322C]/60 mt-0.5">
                                  {record.timestamp_utc && (
                                    <span className="font-semibold text-[#8B3A3A] block">
                                      ⏰ {new Date(record.timestamp_utc).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })} IST
                                    </span>
                                  )}
                                  Marked by: {record.marked_by_name || 'Self'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-[#3A322C]/50 italic">Not Marked Yet</span>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleManualMark(member, 'present')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                                  isPresent
                                    ? 'bg-[#5B8C5B] text-white'
                                    : 'bg-white hover:bg-[#5B8C5B] text-[#5B8C5B] hover:text-white border border-[#5B8C5B]'
                                }`}
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Mark Present</span>
                              </button>

                              <button
                                onClick={() => handleManualMark(member, 'absent')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                  isAbsent
                                    ? 'bg-[#C1554A] text-white'
                                    : 'bg-white hover:bg-[#C1554A] text-[#C1554A] hover:text-white border border-[#C1554A]/40'
                                }`}
                                title="Mark Absent"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEMBER ACCOUNTS & CATEGORY MANAGEMENT */}
      {activeTab === 'members' && (
        <UserManagementSection currentUser={user} />
      )}

      {/* Karyakar Self Attendance QR Scanner Modal */}
      {showSelfScanner && (
        <QRScannerModal
          onClose={() => setShowSelfScanner(false)}
          onScanSuccess={handleSelfScanSuccess}
          activeEvent={activeEvent}
        />
      )}

    </div>
  );
}
