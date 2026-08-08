import React, { useState, useEffect } from 'react';
import {
  Shield, Users, MapPin, Calendar, QrCode, FileSpreadsheet, FileText,
  UserCheck, UserX, Plus, CheckCircle2, AlertCircle, Edit, History,
  Lock, RefreshCw, Download, Layers, Award, Trash2, ChevronDown, Filter, X, Sparkles, Clock, Link2, Search, User, Check, XCircle, Printer,
  Flame, TrendingUp, Activity, BarChart3, PieChart, Zap, BellRing, Cake, Phone
} from 'lucide-react';
import { apiFetch } from '../api';
import VenueMap from './VenueMap';
import QRScannerModal from './QRScannerModal';
import UserManagementSection from './UserManagementSection';

const getLiveEventTimes = () => {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const startHHMM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  
  const endHours = Math.min(now.getHours() + 3, 23);
  const endMinutes = now.getHours() + 3 > 23 ? 59 : now.getMinutes();
  const endHHMM = `${pad(endHours)}:${pad(endMinutes)}`;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[now.getDay()];

  return { todayStr, startHHMM, endHHMM, dayName };
};

const getEventLiveState = (event) => {
  if (!event) return { status: 'closed', label: 'CLOSED', isLive: false, isUpcoming: false, isClosed: true };

  const now = new Date();
  const istDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  const istTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }); // HH:MM

  const evDate = event.event_date;
  const startTime = event.start_time;
  const endTime = event.end_time;

  if (event.status === 'closed' || evDate < istDateStr || (evDate === istDateStr && istTimeStr >= endTime)) {
    return {
      status: 'closed',
      label: 'EVENT STATUS: CLOSED',
      isLive: false,
      isUpcoming: false,
      isClosed: true
    };
  }

  if (evDate > istDateStr || (evDate === istDateStr && istTimeStr < startTime)) {
    let formattedStart = startTime;
    try {
      const [h, m] = startTime.split(':');
      const d = new Date(); d.setHours(parseInt(h), parseInt(m));
      formattedStart = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {}

    return {
      status: 'upcoming',
      label: `UPCOMING SABHA (Starts at ${formattedStart} IST)`,
      isLive: false,
      isUpcoming: true,
      isClosed: false
    };
  }

  return {
    status: 'open',
    label: 'LIVE EVENT STATUS: OPEN',
    isLive: true,
    isUpcoming: false,
    isClosed: false
  };
};

const extractCoordinatesFromInput = (input) => {
  if (!input) return null;

  const atMatch = input.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]), source: 'Google Maps Link (@lat,lng)' };
  }

  const dMatch = input.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dMatch) {
    return { lat: parseFloat(dMatch[1]), lng: parseFloat(dMatch[2]), source: 'Google Maps Place Link' };
  }

  const qMatch = input.match(/(?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]), source: 'Google Maps Query Parameter' };
  }

  const rawMatch = input.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (rawMatch) {
    return { lat: parseFloat(rawMatch[1]), lng: parseFloat(rawMatch[2]), source: 'Raw Coordinates' };
  }

  return null;
};

// Canvas Poster Image Downloader (Professional & Elegant Styling)
const downloadQRPosterAsImage = (qrData) => {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1120;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#FDFBF7';
  ctx.fillRect(0, 0, 800, 1120);

  // Outer Decorative Maroon Border
  ctx.strokeStyle = '#8B3A3A';
  ctx.lineWidth = 14;
  ctx.strokeRect(24, 24, 752, 1072);

  // Inner Accent Gold Line
  ctx.strokeStyle = '#E8A33D';
  ctx.lineWidth = 3;
  ctx.strokeRect(38, 38, 724, 1044);

  // Top Header Box
  ctx.fillStyle = '#8B3A3A';
  ctx.fillRect(48, 48, 704, 140);

  // Top Header Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('SABHA ATTENDANCE SYSTEM', 400, 105);

  ctx.fillStyle = '#E8A33D';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('AUTOMATIC QR & GEOFENCE SYSTEM', 400, 150);

  // Sabha Event Title
  ctx.fillStyle = '#3A322C';
  ctx.font = 'bold 36px Georgia, serif';
  ctx.fillText(qrData.event_title || 'Weekly Sabha Event', 400, 245);

  // Event Date & Time
  ctx.fillStyle = '#8B3A3A';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`Date: ${qrData.event_date} (${qrData.start_time || 'Live'} IST)`, 400, 290);

  // White Card for QR Code
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#EFE7DA';
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(160, 335, 480, 480, 24);
  } else {
    ctx.rect(160, 335, 480, 480);
  }
  ctx.fill();
  ctx.stroke();

  // Draw QR Image
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.drawImage(img, 200, 375, 400, 400);

    // Instructions Below QR
    ctx.fillStyle = '#3A322C';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Scan with Sabha App to Mark Attendance', 400, 865);

    ctx.fillStyle = '#5B8C5B';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('GPS Geofence Radius Verification Active at Mandir', 400, 902);

    // Reference ID Footer Box
    ctx.fillStyle = '#EFE7DA';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(100, 950, 600, 60, 12);
    } else {
      ctx.rect(100, 950, 600, 60);
    }
    ctx.fill();

    ctx.fillStyle = '#8B3A3A';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`REF: ${qrData.qr_code_reference}`, 400, 987);

    // Download PNG File
    const link = document.createElement('a');
    const titleClean = (qrData.event_title || 'Sabha').replace(/\s+/g, '_');
    link.download = `Sabha_QR_Poster_${titleClean}_${qrData.event_date}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.src = qrData.qr_image_base64;
};

// Print Poster Handler (Matches Image Layout 1:1, Professional & Elegant)
const handlePrintPoster = (qrData) => {
  const printWindow = window.open('', '_blank', 'width=850,height=1100');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sabha QR Poster - ${qrData.event_title || 'Event'}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 30px;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, sans-serif;
            background-color: #FDFBF7;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .poster-card {
            width: 100%;
            max-width: 680px;
            border: 10px solid #8B3A3A;
            outline: 2px solid #E8A33D;
            outline-offset: -6px;
            padding: 35px 25px;
            box-sizing: border-box;
            background: #FDFBF7;
            text-align: center;
            border-radius: 20px;
          }
          .header-box {
            background-color: #8B3A3A !important;
            color: #FFFFFF !important;
            padding: 20px;
            border-radius: 14px;
            margin-bottom: 25px;
          }
          .header-box h1 {
            margin: 0;
            font-family: Georgia, serif;
            font-size: 28px;
            letter-spacing: 1px;
            color: #FFFFFF !important;
          }
          .header-box h3 {
            margin: 6px 0 0 0;
            color: #E8A33D !important;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 1.5px;
          }
          .title {
            font-family: Georgia, serif;
            font-size: 30px;
            font-weight: bold;
            color: #3A322C;
            margin: 15px 0 5px 0;
          }
          .meta {
            font-size: 16px;
            font-weight: 600;
            color: #8B3A3A;
            margin-bottom: 25px;
          }
          .qr-box {
            background: #FFFFFF;
            border: 3px solid #EFE7DA;
            border-radius: 20px;
            padding: 20px;
            display: inline-block;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            margin-bottom: 20px;
          }
          .qr-img {
            width: 320px;
            height: 320px;
            display: block;
          }
          .instruction {
            font-size: 16px;
            font-weight: bold;
            color: #3A322C;
            margin-bottom: 8px;
          }
          .geofence {
            font-size: 14px;
            font-weight: 600;
            color: #5B8C5B;
            margin-bottom: 20px;
          }
          .ref-box {
            background: #EFE7DA !important;
            border: 1px solid #8B3A3A;
            display: inline-block;
            padding: 10px 30px;
            border-radius: 12px;
            font-family: monospace;
            font-size: 16px;
            font-weight: bold;
            color: #8B3A3A;
          }
        </style>
      </head>
      <body>
        <div class="poster-card">
          <div class="header-box">
            <h1>SABHA ATTENDANCE SYSTEM</h1>
            <h3>AUTOMATIC QR & GEOFENCE SYSTEM</h3>
          </div>
          
          <div class="title">${qrData.event_title || 'Sabha Event'}</div>
          <div class="meta">Date: ${qrData.event_date} (${qrData.start_time || 'Live'} IST)</div>

          <div class="qr-box">
            <img class="qr-img" src="${qrData.qr_image_base64}" alt="Sabha QR Code" />
          </div>

          <div class="instruction">Scan with Sabha App to Mark Attendance</div>
          <div class="geofence">GPS Geofence Radius Verification Active at Mandir</div>

          <div class="ref-box">
            REF: ${qrData.qr_code_reference}
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 350);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export default function AdminPortal({ user, onUserUpdated }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Master data
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // User Management Search & Filter State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Master Attendance Log & User Management Pagination State
  const [masterLogPage, setMasterLogPage] = useState(1);
  const [masterLogRowsPerPage, setMasterLogRowsPerPage] = useState(25);
  const [userPage, setUserPage] = useState(1);
  const [userRowsPerPage, setUserRowsPerPage] = useState(25);
  const [masterLogViewMode, setMasterLogViewMode] = useState('events');
  const [selectedDetailModal, setSelectedDetailModal] = useState(null);
  const [masterSearchQuery, setMasterSearchQuery] = useState('');
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('monthly'); // 'weekly' | 'monthly' | 'yearly'
  const [selectedHealthModal, setSelectedHealthModal] = useState(null); // { type: 'super_active' | 'regular' | 'at_risk', title: string }
  const [healthSearchQuery, setHealthSearchQuery] = useState('');

  // Event Search & Date Filter State
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [eventDateFilter, setEventDateFilter] = useState('');

  // Event Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  const initialLive = getLiveEventTimes();

  const [eventForm, setEventForm] = useState({
    title: `${initialLive.dayName} Sabha`,
    event_type: 'recurring',
    day_of_week: initialLive.dayName.toLowerCase(),
    event_date: initialLive.todayStr,
    start_time: initialLive.startHHMM,
    end_time: initialLive.endHHMM,
    venue_id: '',
    qr_mode: 'reusable',
    is_recurring_saturday: false,
    recurring_weeks: 4
  });

  // Venue Creation & Editing State
  const [editingVenueId, setEditingVenueId] = useState(null);
  const [venueForm, setVenueForm] = useState({
    name: 'Central Sabha Mandir',
    address: 'Main Auditorium, Sector 12',
    latitude: 23.0225,
    longitude: 72.5714,
    radius_meters: 150
  });

  // Google Maps Link & Search State
  const [gmapsInput, setGmapsInput] = useState('');
  const [parseStatus, setParseStatus] = useState('');
  const [isSearchingPlace, setIsSearchingPlace] = useState(false);

  // QR Display Modal
  const [qrModalData, setQrModalData] = useState(null);

  // Edit Attendance Modal
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [editNewStatus, setEditNewStatus] = useState('present');
  const [editReason, setEditReason] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);

  // Reports Filter & Selection State
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [selectedReportEventId, setSelectedReportEventId] = useState('');

  // Admin Self Scanner & Event Editing State
  const [showSelfScanner, setShowSelfScanner] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [evList, venList, pendList, usrList, attList, analyticsRes] = await Promise.all([
        apiFetch('/events'),
        apiFetch('/venues'),
        apiFetch('/users/pending'),
        apiFetch('/users?status=approved'),
        apiFetch('/attendance/history'),
        apiFetch('/analytics/dashboard').catch(() => null)
      ]);

      setEvents(evList);
      setVenues(venList);
      setPendingUsers(pendList);
      setAllUsers(usrList);
      setAttendanceRecords(attList);
      if (analyticsRes) setAnalyticsData(analyticsRes);

      if (venList.length > 0 && !eventForm.venue_id) {
        setEventForm(prev => ({ ...prev, venue_id: venList[0].id }));
      }
    } catch (err) {
      console.error("Admin data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const data = await apiFetch('/admin/backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sabha_attendance_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download database backup: " + err.message);
    }
  };

  const handleOpenWizard = () => {
    const live = getLiveEventTimes();
    setEventForm(prev => ({
      ...prev,
      title: `${live.dayName} Sabha`,
      event_type: 'recurring',
      day_of_week: live.dayName.toLowerCase(),
      event_date: live.todayStr,
      start_time: live.startHHMM,
      end_time: live.endHHMM,
    }));
    setWizardStep(1);
    setShowWizard(true);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const getRecentBirthdays = () => {
    if (!allUsers || allUsers.length === 0) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const today = new Date(currentYear, now.getMonth(), now.getDate());

    const results = [];

    for (const u of allUsers) {
      if (!u.dob) continue;

      let birthYear, birthMonth, birthDay;

      // Handle both YYYY-MM-DD, D-M-YYYY, M/D/YYYY, YYYY/M/D formats
      if (u.dob.includes('-')) {
        const parts = u.dob.split('-');
        if (parts.length !== 3) continue;
        if (parts[0].length === 4) {
          birthYear = parseInt(parts[0], 10);
          birthMonth = parseInt(parts[1], 10) - 1;
          birthDay = parseInt(parts[2], 10);
        } else {
          birthYear = parseInt(parts[2], 10);
          birthMonth = parseInt(parts[1], 10) - 1;
          birthDay = parseInt(parts[0], 10);
        }
      } else if (u.dob.includes('/')) {
        const parts = u.dob.split('/');
        if (parts.length !== 3) continue;
        if (parts[2].length === 4) {
          birthYear = parseInt(parts[2], 10);
          birthMonth = parseInt(parts[0], 10) - 1;
          birthDay = parseInt(parts[1], 10);
        } else if (parts[0].length === 4) {
          birthYear = parseInt(parts[0], 10);
          birthMonth = parseInt(parts[1], 10) - 1;
          birthDay = parseInt(parts[2], 10);
        }
      } else {
        continue;
      }

      if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) continue;

      const bdayThisYear = new Date(currentYear, birthMonth, birthDay);
      const diffTime = today.getTime() - bdayThisYear.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      // Show birthdays today (0), past 7 days (1..7), and upcoming 7 days (-7..-1)
      if (diffDays >= -7 && diffDays <= 7) {
        const age = currentYear - birthYear;
        results.push({
          user: u,
          diffDays,
          isToday: diffDays === 0,
          isUpcoming: diffDays < 0,
          daysUntil: Math.abs(diffDays),
          age,
          formattedDob: `${birthDay}/${birthMonth + 1}/${birthYear}`
        });
      }
    }

    return results.sort((a, b) => a.diffDays - b.diffDays);
  };

  const handleGmapsInputChange = (e) => {
    const val = e.target.value;
    setGmapsInput(val);

    const extracted = extractCoordinatesFromInput(val);
    if (extracted) {
      setVenueForm(prev => ({
        ...prev,
        latitude: extracted.lat,
        longitude: extracted.lng
      }));
      setParseStatus(`Extracted ${extracted.lat.toFixed(5)}, ${extracted.lng.toFixed(5)} (${extracted.source})`);
    } else if (val.includes('goo.gl') || val.includes('maps.app.goo.gl')) {
      handleSearchPlaceName(val);
    } else if (val.trim() === '') {
      setParseStatus('');
    } else {
      setParseStatus('Paste a Google Maps link or click "Locate" to resolve location.');
    }
  };

  const handleSearchPlaceName = async (overrideInput) => {
    const targetText = typeof overrideInput === 'string' ? overrideInput : gmapsInput;
    if (!targetText || targetText.trim().length === 0) return;
    try {
      setIsSearchingPlace(true);
      setParseStatus('Resolving location link via server...');
      
      const data = await apiFetch('/venues/resolve-location', {
        method: 'POST',
        body: JSON.stringify({ input_text: targetText.trim() })
      });

      if (data && data.latitude && data.longitude) {
        setVenueForm(prev => ({
          ...prev,
          latitude: data.latitude,
          longitude: data.longitude,
          name: data.place_name ? data.place_name.split(',')[0] : prev.name,
          address: data.place_name || prev.address
        }));
        setParseStatus(`Extracted ${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)} (${data.source || 'Google Maps'})`);
      }
    } catch (err) {
      setParseStatus(err.message || 'Could not resolve location link. Try dragging the map pin directly.');
    } finally {
      setIsSearchingPlace(false);
    }
  };

  const handleAdminManualMark = async (userId, eventId, newStatus) => {
    try {
      await apiFetch('/attendance/manual', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          event_id: eventId,
          status: newStatus
        })
      });
      showToast(`Marked member as ${newStatus.toUpperCase()}`);
      loadAdminData();
    } catch (err) { alert(err.message); }
  };

  // User Approval Handlers
  const handleApproveUser = async (userId) => {
    try {
      await apiFetch(`/users/${userId}/approve`, { method: 'POST' });
      showToast("User account approved!");
      loadAdminData();
    } catch (err) { alert(err.message); }
  };

  const handleRejectUser = async (userId) => {
    try {
      await apiFetch(`/users/${userId}/reject`, { method: 'POST' });
      showToast("User account rejected (soft-state saved).");
      loadAdminData();
    } catch (err) { alert(err.message); }
  };

  // Karyakar Role Promotion/Demotion
  const handleRoleToggle = async (userId, currentRole) => {
    const newRole = currentRole === 'karyakar' ? 'user' : 'karyakar';
    try {
      await apiFetch(`/users/${userId}/role?new_role=${newRole}`, { method: 'POST' });
      showToast(`User role updated to ${newRole.toUpperCase()}`);
      loadAdminData();
    } catch (err) { alert(err.message); }
  };

  // Venue Edit & Delete Handlers
  const handleStartEditVenue = (v) => {
    setEditingVenueId(v.id);
    setVenueForm({
      name: v.name,
      address: v.address || '',
      latitude: v.latitude,
      longitude: v.longitude,
      radius_meters: v.radius_meters
    });
    setGmapsInput('');
    setParseStatus('');
    showToast(`Editing venue: "${v.name}"`);
  };

  const handleCancelEditVenue = () => {
    setEditingVenueId(null);
    setVenueForm({
      name: 'Central Sabha Mandir',
      address: 'Main Auditorium, Sector 12',
      latitude: 23.0225,
      longitude: 72.5714,
      radius_meters: 150
    });
    setGmapsInput('');
    setParseStatus('');
  };

  const handleSaveVenue = async (e) => {
    e.preventDefault();
    try {
      if (editingVenueId) {
        const updated = await apiFetch(`/venues/${editingVenueId}`, {
          method: 'PUT',
          body: JSON.stringify(venueForm)
        });
        showToast(`Venue "${updated.name}" updated successfully!`);
        setEditingVenueId(null);
      } else {
        const created = await apiFetch('/venues', {
          method: 'POST',
          body: JSON.stringify(venueForm)
        });
        showToast(`Venue "${created.name}" created with ${created.radius_meters}m geofence radius.`);
        setEventForm(prev => ({ ...prev, venue_id: created.id }));
      }
      loadAdminData();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteVenue = async (v) => {
    if (!window.confirm(`Are you sure you want to delete venue "${v.name}"?`)) return;
    try {
      await apiFetch(`/venues/${v.id}`, { method: 'DELETE' });
      showToast(`Venue "${v.name}" deleted successfully.`);
      if (editingVenueId === v.id) handleCancelEditVenue();
      loadAdminData();
    } catch (err) { alert(err.message); }
  };

  // Event Creation Wizard Submit
  const handlePublishEvents = async () => {
    try {
      await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify(eventForm)
      });
      showToast("Event(s) published successfully!");
      setShowWizard(false);
      setWizardStep(1);
      loadAdminData();
    } catch (err) { alert(err.message); }
  };

  // Save Edited Event
  const handleSaveEventEdit = async (e) => {
    e.preventDefault();
    if (!editingEvent) return;
    try {
      await apiFetch(`/events/${editingEvent.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editingEvent.title,
          event_date: editingEvent.event_date,
          start_time: editingEvent.start_time,
          end_time: editingEvent.end_time,
          venue_id: editingEvent.venue_id
        })
      });
      showToast(`Event "${editingEvent.title}" updated successfully!`);
      setEditingEvent(null);
      loadAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete Entire Recurring Series
  const handleDeleteRecurringSeries = async (masterEv) => {
    const qrRef = masterEv.qr_code_reference;
    if (!window.confirm(`Are you sure you want to delete the entire recurring series "${masterEv.title}"?\n\nThis will permanently delete all upcoming occurrences so no future events remain for this recurring series.`)) return;
    try {
      await apiFetch(`/events/recurring-series?qr_ref=${encodeURIComponent(qrRef)}&delete_all=true`, {
        method: 'DELETE'
      });
      showToast(`Recurring series "${masterEv.title}" deleted successfully.`);
      loadAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete Single Event Record
  const handleDeleteSingleEvent = async (ev) => {
    if (!window.confirm(`Are you sure you want to delete event record "${ev.title}" (${ev.event_date})?\n\nThis will permanently remove this event record and all its associated attendance logs.`)) return;
    try {
      await apiFetch(`/events/${ev.id}`, {
        method: 'DELETE'
      });
      showToast(`Event record "${ev.title}" deleted successfully.`);
      loadAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Close Event
  const handleCloseEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to close attendance for this event? This will auto-mark ABSENT for all unrecorded members and reset their streaks.")) return;
    try {
      await apiFetch(`/events/${eventId}/close`, { method: 'POST' });
      showToast("Event attendance closed! Auto-absent generated.");
      loadAdminData();
    } catch (err) { alert(err.message); }
  };

  // QR Display (Restricted strictly to Live and Upcoming open events)
  const handleViewQR = async (eventId) => {
    const targetEvent = events.find(e => e.id === eventId);
    if (targetEvent && targetEvent.status === 'closed') {
      alert("Printable QR codes are available ONLY for live and upcoming events. For closed/completed events, please use the PDF or Excel export options.");
      return;
    }
    try {
      const qrData = await apiFetch(`/events/${eventId}/qr`);
      setQrModalData(qrData);
    } catch (err) { alert(err.message); }
  };

  // Attendance Edit & Audit
  const handleOpenEditAttendance = async (record) => {
    setEditingAttendance(record);
    setEditNewStatus(record.status);
    setEditReason('');
    try {
      const audits = await apiFetch(`/attendance/audits/${record.id}`);
      setAuditLogs(audits);
    } catch (err) { setAuditLogs([]); }
  };

  const handleSaveAttendanceEdit = async (e) => {
    e.preventDefault();
    if (!editingAttendance || !editReason) return;
    try {
      await apiFetch(`/attendance/${editingAttendance.id}/edit`, {
        method: 'PUT',
        body: JSON.stringify({
          new_status: editNewStatus,
          reason: editReason
        })
      });
      showToast("Attendance record updated & audit log saved.");
      setEditingAttendance(null);

      if (selectedDetailModal) {
        const updatedAtt = await apiFetch('/attendance/history');
        setAttendanceRecords(updatedAtt);
      }
      loadAdminData();
    } catch (err) { alert(err.message); }
  };

  // Event-Specific Report Download Handlers
  const downloadReportFile = async (endpoint, defaultFilename) => {
    try {
      const blob = await apiFetch(endpoint);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = defaultFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Error generating report file.');
    }
  };

  const handleExportEventExcel = (eventId, eventTitle, eventDate) => {
    const cleanTitle = (eventTitle || 'Sabha').replace(/\s+/g, '_');
    downloadReportFile(`/reports/export/excel?event_id=${eventId}`, `Sabha_Report_${cleanTitle}_${eventDate}.xlsx`);
  };

  const handleExportEventPDF = (eventId, eventTitle, eventDate) => {
    const cleanTitle = (eventTitle || 'Sabha').replace(/\s+/g, '_');
    downloadReportFile(`/reports/export/pdf?event_id=${eventId}`, `Sabha_Report_${cleanTitle}_${eventDate}.pdf`);
  };

  const handleExportExcel = () => {
    let params = [];
    if (selectedReportEventId) params.push(`event_id=${selectedReportEventId}`);
    if (reportStartDate) params.push(`start_date=${reportStartDate}`);
    if (reportEndDate) params.push(`end_date=${reportEndDate}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    downloadReportFile(`/reports/export/excel${query}`, `Sabha_Attendance_Report.xlsx`);
  };

  const handleExportPDF = () => {
    let params = [];
    if (selectedReportEventId) params.push(`event_id=${selectedReportEventId}`);
    if (reportStartDate) params.push(`start_date=${reportStartDate}`);
    if (reportEndDate) params.push(`end_date=${reportEndDate}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    downloadReportFile(`/reports/export/pdf${query}`, `Sabha_Attendance_Report.pdf`);
  };

  const openEvents = events.filter(e => e.status === 'open');
  const closedEvents = events.filter(e => e.status === 'closed');
  const activeEvent = openEvents[0] || events[0];

  const getEventStats = (eventId) => {
    const records = attendanceRecords.filter(r => r.event_id === eventId);
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const total = records.length || allUsers.length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { records, present, absent, total, pct };
  };

  const getMemberStats = (userId) => {
    const records = attendanceRecords.filter(r => r.user_id === userId);
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const total = records.length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { records, present, absent, total, pct };
  };

  const filteredEvents = events.filter(ev =>
    ev.title.toLowerCase().includes(masterSearchQuery.toLowerCase()) ||
    ev.event_date.includes(masterSearchQuery)
  );

  const filteredMembers = allUsers.filter(u =>
    u.name.toLowerCase().includes(masterSearchQuery.toLowerCase()) ||
    u.phone.includes(masterSearchQuery)
  );

  const filteredUsersList = allUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                          u.phone.includes(userSearchQuery);
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* Toast Notice */}
      {toast && (
        <div className="bg-[#5B8C5B] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Admin Title & Navigation Tabs */}
      <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#EFE7DA] pb-5">
          <div>
            <div className="flex items-center gap-2 text-[#8B3A3A] text-xs font-bold uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4 text-[#8B3A3A]" />
              <span>Admin Master Portal</span>
            </div>
            <h2 className="font-serif-accent text-2xl md:text-3xl font-bold text-[#8B3A3A]">
              Sabha Administration & Analytics
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowSelfScanner(true)}
              className="bg-[#E8A33D] hover:bg-[#D98A2B] text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan My Attendance</span>
            </button>
            <button
              onClick={handleDownloadBackup}
              className="bg-[#5B8C5B] hover:bg-[#4A734A] text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
              title="Download 1-Click JSON Snapshot Backup of Database"
            >
              <Download className="w-4 h-4" />
              <span>Backup Snapshot</span>
            </button>
            <button
              onClick={handleOpenWizard}
              className="bg-[#8B3A3A] hover:bg-[#6E2C2C] text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>New Event Wizard</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Layers },
            { id: 'events', label: 'Events & QR Codes', icon: Calendar },
            { id: 'venues', label: 'Venues & Radius Map', icon: MapPin },
            { id: 'users', label: 'User & Role Management', icon: Users },
            { id: 'attendance', label: 'Master Attendance Log', icon: UserCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#8B3A3A] text-white shadow-xs'
                    : 'bg-[#FDFBF7] text-[#3A322C]/70 hover:bg-[#EFE7DA]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#C1554A] text-white font-bold animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW & ANALYTICS SUITE */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* 1. TOP EXECUTIVE KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Turnout Rate */}
            <div className="bg-white p-5 rounded-2xl warm-shadow border border-[#EFE7DA] transition-all hover:border-[#8B3A3A]/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#3A322C]/70 font-semibold">Average Turnout Rate</span>
                <div className="p-2 rounded-xl bg-[#5B8C5B]/10 text-[#5B8C5B]">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <div className="font-serif-accent text-3xl font-bold text-[#8B3A3A]">
                  {analyticsData?.kpis?.overall_turnout_pct ?? 0}%
                </div>
                <div className="text-[11px] font-bold text-[#5B8C5B] bg-[#5B8C5B]/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> {analyticsData?.kpis?.turnout_trend_delta || '0%'}
                </div>
              </div>
              <p className="text-[11px] text-[#3A322C]/60 mt-1">Average member attendance</p>
            </div>

            {/* KPI 2: Streak Retention Score */}
            <div className="bg-white p-5 rounded-2xl warm-shadow border border-[#EFE7DA] transition-all hover:border-[#8B3A3A]/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#3A322C]/70 font-semibold">Streak Retention Score</span>
                <div className="p-2 rounded-xl bg-[#E8A33D]/10 text-[#E8A33D]">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <div className="font-serif-accent text-3xl font-bold text-[#E8A33D]">
                {analyticsData?.kpis?.streak_retention_pct ?? 0}%
              </div>
              <p className="text-[11px] text-[#3A322C]/60 mt-1">Members with 3+ week active streak</p>
            </div>

            {/* KPI 3: Category Split */}
            <div className="bg-white p-5 rounded-2xl warm-shadow border border-[#EFE7DA] transition-all hover:border-[#8B3A3A]/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#3A322C]/70 font-semibold">Category Split</span>
                <div className="p-2 rounded-xl bg-[#8B3A3A]/10 text-[#8B3A3A]">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="font-serif-accent text-xl font-bold text-[#3A322C]">
                {analyticsData?.kpis?.satsangi_count ?? (allUsers?.filter(u => (u.member_category || 'satsangi').toLowerCase() === 'satsangi').length || 0)} <span className="text-xs text-[#5B8C5B] font-sans font-medium">Satsangi</span> / {(analyticsData?.kpis?.gunbhavi_count ?? (allUsers?.filter(u => ['gunbhavi', 'goon_bhavi', 'bhavi'].includes((u.member_category || '').toLowerCase())).length || 0))} <span className="text-xs text-[#E8A33D] font-sans font-medium">Gunbhavi</span> / {(analyticsData?.kpis?.b2y_count ?? analyticsData?.kpis?.bty_count ?? (allUsers?.filter(u => ['b2y', 'bty'].includes((u.member_category || '').toLowerCase())).length || 0))} <span className="text-xs text-[#8B3A3A] font-sans font-medium">B2Y</span>
              </div>
              <p className="text-[11px] text-[#3A322C]/60 mt-1">Total active member breakdown</p>
            </div>

            {/* KPI 4: Peak Sabha Day */}
            <div className="bg-white p-5 rounded-2xl warm-shadow border border-[#EFE7DA] transition-all hover:border-[#8B3A3A]/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#3A322C]/70 font-semibold">Peak Sabha Day</span>
                <div className="p-2 rounded-xl bg-[#5B8C5B]/10 text-[#5B8C5B]">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="font-serif-accent text-2xl font-bold text-[#5B8C5B]">
                {analyticsData?.kpis?.peak_sabha_day || 'Sunday'}
              </div>
              <p className="text-[11px] text-[#3A322C]/60 mt-1">Highest turnout day of week</p>
            </div>
          </div>

          {/* 1.5 MEMBER BIRTHDAYS CARD (TODAY & PAST 7 DAYS) */}
          {(() => {
            const birthdayList = getRecentBirthdays();
            return (
              <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA] space-y-4">
                <div className="flex items-center justify-between border-b border-[#EFE7DA] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-[#E8A33D]/15 text-[#D98A2B]">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif-accent text-lg font-bold text-[#8B3A3A] flex items-center gap-2">
                        <Cake className="w-5 h-5 text-[#8B3A3A]" />
                        <span>Member Birthday Celebrations</span>
                        {birthdayList.length > 0 && (
                          <span className="text-xs bg-[#5B8C5B]/15 text-[#5B8C5B] px-2.5 py-0.5 rounded-full font-sans font-bold">
                            {birthdayList.length} recent
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-[#3A322C]/70">
                        Members celebrating birthdays today, recent past, or upcoming days
                      </p>
                    </div>
                  </div>
                </div>

                {birthdayList.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#3A322C]/60 italic flex items-center justify-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#3A322C]/40" />
                    <span>No member birthdays today or in the past 7 days.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {birthdayList.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                          item.isToday
                            ? 'bg-[#E8A33D]/10 border-[#E8A33D]/40 shadow-xs'
                            : 'bg-[#FDFBF7] border-[#EFE7DA]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-xs text-[#3A322C]">
                            <span>{item.user.name}</span>
                            {item.isToday ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] bg-[#E8A33D] text-white font-bold uppercase tracking-wider">
                                Birthday Today!
                              </span>
                            ) : item.isUpcoming ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] bg-[#5B8C5B]/15 text-[#5B8C5B] font-bold uppercase tracking-wider">
                                Upcoming
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[11px] text-[#3A322C]/70 mt-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#8B3A3A]" />
                            <span>{item.user.phone} • {item.user.member_category === 'b2y' || item.user.member_category === 'bty' ? 'B2Y' : item.user.member_category === 'gunbhavi' || item.user.member_category === 'goon_bhavi' ? 'Gunbhavi' : 'Satsangi'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-[#8B3A3A]">
                            {item.isToday
                              ? `Turning ${item.age}`
                              : item.isUpcoming
                              ? `In ${item.daysUntil} day${item.daysUntil > 1 ? 's' : ''}`
                              : `${item.diffDays} day${item.diffDays > 1 ? 's' : ''} ago`}
                          </div>
                          <div className="text-[10px] text-[#3A322C]/60 font-mono">
                            {item.user.dob}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* 2. ACTIVE EVENT BANNER CARD */}
          {activeEvent && (() => {
            const liveState = getEventLiveState(activeEvent);
            return (
              <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    liveState.isLive ? 'bg-[#5B8C5B]/15 text-[#5B8C5B]' :
                    liveState.isUpcoming ? 'bg-[#E8A33D]/20 text-[#D98A2B]' : 'bg-[#C1554A]/15 text-[#C1554A]'
                  }`}>
                    {liveState.label}
                  </span>
                  <h3 className="font-serif-accent text-2xl font-bold text-[#8B3A3A] mt-1">
                    {activeEvent.title}
                  </h3>
                  <p className="text-xs text-[#3A322C]/70">
                    {activeEvent.event_date} ({activeEvent.start_time} - {activeEvent.end_time} IST) • QR Ref: {activeEvent.qr_code_reference}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                  {liveState.isLive && (
                    <button
                      onClick={() => setSelectedDetailModal({ type: 'event', data: activeEvent })}
                      className="bg-[#5B8C5B] hover:bg-[#4A734A] text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                    >
                      <UserCheck className="w-4 h-4" /> Live Attendance & Override
                    </button>
                  )}

                  {!liveState.isClosed && (
                    <button
                      onClick={() => handleViewQR(activeEvent.id)}
                      className="bg-[#FDFBF7] hover:bg-[#EFE7DA] text-[#8B3A3A] font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-[#EFE7DA] flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                    >
                      <QrCode className="w-4 h-4" /> View QR Code
                    </button>
                  )}

                  {liveState.isLive && (
                    <button
                      onClick={() => handleCloseEvent(activeEvent.id)}
                      className="bg-[#C1554A] hover:bg-[#A8453B] text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                    >
                      <Lock className="w-4 h-4" /> Close Attendance (Auto-Absent)
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 3. VISUAL CHARTS SECTION: WEEKLY TRENDS & PUNCTUALITY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Combined Multi-View Attendance Analytics Graph (Weekly, Monthly, Yearly) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl warm-shadow border border-[#EFE7DA] space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#EFE7DA] pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#8B3A3A]" />
                  <div>
                    <h4 className="font-serif-accent text-lg font-bold text-[#8B3A3A]">
                      Attendance Performance Analytics
                    </h4>
                    <p className="text-[11px] text-[#3A322C]/60 font-medium">
                      Combined turnout trends across Weekly, Monthly, and Yearly timeframes
                    </p>
                  </div>
                </div>

                {/* Timeframe View Switcher Pills */}
                <div className="flex items-center gap-1 bg-[#FDFBF7] p-1 rounded-xl border border-[#EFE7DA] text-xs font-semibold">
                  <button
                    onClick={() => setAnalyticsTimeframe('weekly')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      analyticsTimeframe === 'weekly' ? 'bg-[#8B3A3A] text-white shadow-2xs' : 'text-[#3A322C]/70 hover:bg-[#EFE7DA]'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setAnalyticsTimeframe('monthly')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      analyticsTimeframe === 'monthly' ? 'bg-[#8B3A3A] text-white shadow-2xs' : 'text-[#3A322C]/70 hover:bg-[#EFE7DA]'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setAnalyticsTimeframe('yearly')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      analyticsTimeframe === 'yearly' ? 'bg-[#8B3A3A] text-white shadow-2xs' : 'text-[#3A322C]/70 hover:bg-[#EFE7DA]'
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>

              {/* Render Selected Timeframe Graph */}
              {(() => {
                let dataset = [];
                if (analyticsTimeframe === 'weekly') {
                  dataset = (analyticsData?.weekly_trends || []).map(item => ({
                    title: item.title,
                    subtitle: item.event_date,
                    present: item.present_count,
                    capacity: item.present_count + item.absent_count || (allUsers.length || 1),
                    pct: item.turnout_pct
                  }));
                } else if (analyticsTimeframe === 'monthly') {
                  dataset = (analyticsData?.monthly_trends || []).map(item => ({
                    title: item.label,
                    subtitle: `${item.sabha_count} Sabhas Held`,
                    present: item.present_count,
                    capacity: item.total_capacity || (allUsers.length * item.sabha_count) || 1,
                    pct: item.turnout_pct
                  }));
                } else {
                  dataset = (analyticsData?.yearly_trends || []).map(item => ({
                    title: item.label,
                    subtitle: `${item.sabha_count} Annual Sabhas`,
                    present: item.present_count,
                    capacity: item.total_capacity || (allUsers.length * item.sabha_count) || 1,
                    pct: item.turnout_pct
                  }));
                }

                if (dataset.length === 0) {
                  return (
                    <div className="py-12 text-center text-xs text-[#3A322C]/60 italic">
                      No attendance trend data available for this timeframe view.
                    </div>
                  );
                }

                return (
                  <div className="space-y-3.5 pt-1">
                    {dataset.map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-[#3A322C]">
                          <span className="flex items-center gap-1.5">
                            <span className="font-bold text-[#8B3A3A]">{item.title}</span>
                            <span className="text-[10px] text-[#3A322C]/60 font-normal">({item.subtitle})</span>
                          </span>
                          <span className="font-mono text-[#5B8C5B] font-bold">
                            {item.pct}% ({item.present} Present)
                          </span>
                        </div>
                        <div className="w-full bg-[#EFE7DA]/60 h-3 rounded-full overflow-hidden flex">
                          <div
                            className="bg-gradient-to-r from-[#5B8C5B] to-[#8B3A3A] h-full transition-all duration-300 rounded-full"
                            style={{ width: `${item.pct}%` }}
                            title={`Present: ${item.present}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Punctuality & Arrival Time Distribution */}
            <div className="bg-white p-6 rounded-2xl warm-shadow border border-[#EFE7DA] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-[#EFE7DA] pb-3">
                  <Clock className="w-5 h-5 text-[#E8A33D]" />
                  <div>
                    <h4 className="font-serif-accent text-lg font-bold text-[#8B3A3A]">Punctuality Distribution</h4>
                    <p className="text-[11px] text-[#3A322C]/60">Scan arrival window breakdown</p>
                  </div>
                </div>

                <div className="space-y-4 py-2">
                  {/* On-Time */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-[#5B8C5B] flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> On Time (Before / +10m)</span>
                      <span className="font-mono text-[#5B8C5B]">{analyticsData?.punctuality?.on_time_pct ?? 0}%</span>
                    </div>
                    <div className="w-full bg-[#EFE7DA]/60 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-[#5B8C5B] h-full rounded-full" style={{ width: `${analyticsData?.punctuality?.on_time_pct ?? 0}%` }} />
                    </div>
                  </div>

                  {/* Grace Period */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-[#E8A33D] flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Grace Period (+10m to +30m)</span>
                      <span className="font-mono text-[#E8A33D]">{analyticsData?.punctuality?.grace_pct ?? 0}%</span>
                    </div>
                    <div className="w-full bg-[#EFE7DA]/60 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-[#E8A33D] h-full rounded-full" style={{ width: `${analyticsData?.punctuality?.grace_pct ?? 0}%` }} />
                    </div>
                  </div>

                  {/* Late Entry */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-[#C1554A] flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Late Entry (+30m)</span>
                      <span className="font-mono text-[#C1554A]">{analyticsData?.punctuality?.late_pct ?? 0}%</span>
                    </div>
                    <div className="w-full bg-[#EFE7DA]/60 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-[#C1554A] h-full rounded-full" style={{ width: `${analyticsData?.punctuality?.late_pct ?? 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-[#FDFBF7] rounded-xl border border-[#EFE7DA] text-[11px] text-[#3A322C]/70 italic">
                {((analyticsData?.punctuality?.on_time_pct || 0) + (analyticsData?.punctuality?.grace_pct || 0) + (analyticsData?.punctuality?.late_pct || 0) === 0)
                  ? "💡 No attendance scans recorded yet. Punctuality distribution will calculate automatically as members mark attendance."
                  : "💡 Most members scan within 10 minutes of Sabha commencement."
                }
              </div>
            </div>
          </div>

          {/* 4. MEMBER HEALTH MATRIX & MARKING METHODS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Member Health Matrix */}
            <div className="bg-white p-6 rounded-2xl warm-shadow border border-[#EFE7DA]">
              <div className="flex items-center gap-2 mb-4 border-b border-[#EFE7DA] pb-3">
                <Flame className="w-5 h-5 text-[#E8A33D]" />
                <div>
                  <h4 className="font-serif-accent text-lg font-bold text-[#8B3A3A]">Member Loyalty & Health Matrix</h4>
                  <p className="text-[11px] text-[#3A322C]/60">Member engagement and streak tiers</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center mb-3">
                <div
                  onClick={() => setSelectedHealthModal({ type: 'super_active', title: 'Super Active Members (3+ Streaks)' })}
                  className="p-3 bg-[#5B8C5B]/10 hover:bg-[#5B8C5B]/20 rounded-xl border border-[#5B8C5B]/30 cursor-pointer transition-all hover:scale-[1.02] shadow-2xs group"
                >
                  <div className="text-[10px] text-[#5B8C5B] uppercase font-bold group-hover:underline flex items-center justify-center gap-1">
                    <Flame className="w-3 h-3 text-[#5B8C5B]" />
                    <span>Super Active</span>
                  </div>
                  <div className="text-2xl font-bold text-[#5B8C5B]">{analyticsData?.member_health?.super_active ?? 0}</div>
                  <div className="text-[10px] text-[#3A322C]/60">3+ Streaks</div>
                </div>

                <div
                  onClick={() => setSelectedHealthModal({ type: 'regular', title: 'Regular Members (1-2 Streaks)' })}
                  className="p-3 bg-[#E8A33D]/10 hover:bg-[#E8A33D]/20 rounded-xl border border-[#E8A33D]/30 cursor-pointer transition-all hover:scale-[1.02] shadow-2xs group"
                >
                  <div className="text-[10px] text-[#E8A33D] uppercase font-bold group-hover:underline flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3 text-[#E8A33D]" />
                    <span>Regular</span>
                  </div>
                  <div className="text-2xl font-bold text-[#E8A33D]">{analyticsData?.member_health?.regular ?? 0}</div>
                  <div className="text-[10px] text-[#3A322C]/60">1-2 Streaks</div>
                </div>

                <div
                  onClick={() => setSelectedHealthModal({ type: 'at_risk', title: 'At Risk Members (0 Streak)' })}
                  className="p-3 bg-[#C1554A]/10 hover:bg-[#C1554A]/20 rounded-xl border border-[#C1554A]/30 cursor-pointer transition-all hover:scale-[1.02] shadow-2xs group"
                >
                  <div className="text-[10px] text-[#C1554A] uppercase font-bold group-hover:underline flex items-center justify-center gap-1">
                    <AlertCircle className="w-3 h-3 text-[#C1554A]" />
                    <span>At Risk</span>
                  </div>
                  <div className="text-2xl font-bold text-[#C1554A]">{analyticsData?.member_health?.at_risk ?? 0}</div>
                  <div className="text-[10px] text-[#3A322C]/60">0 Streak</div>
                </div>
              </div>
            </div>

            {/* Marking Method Breakdown */}
            <div className="bg-white p-6 rounded-2xl warm-shadow border border-[#EFE7DA]">
              <div className="flex items-center gap-2 mb-4 border-b border-[#EFE7DA] pb-3">
                <PieChart className="w-5 h-5 text-[#8B3A3A]" />
                <div>
                  <h4 className="font-serif-accent text-lg font-bold text-[#8B3A3A]">Marking Method Breakdown</h4>
                  <p className="text-[11px] text-[#3A322C]/60">Self QR Scan vs. Karyakar & Admin Overrides</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 bg-[#FDFBF7] rounded-xl border border-[#EFE7DA]">
                  <div className="text-[10px] text-[#5B8C5B] font-bold">Self QR</div>
                  <div className="text-lg font-bold text-[#3A322C]">{analyticsData?.marking_methods?.self_qr ?? 0}</div>
                  <div className="text-[9px] text-[#3A322C]/60">GPS Verified</div>
                </div>

                <div className="p-2.5 bg-[#FDFBF7] rounded-xl border border-[#EFE7DA]">
                  <div className="text-[10px] text-[#8B3A3A] font-bold">Karyakar</div>
                  <div className="text-lg font-bold text-[#3A322C]">{analyticsData?.marking_methods?.karyakar_manual ?? 0}</div>
                  <div className="text-[9px] text-[#3A322C]/60">Manual Tag</div>
                </div>

                <div className="p-2.5 bg-[#FDFBF7] rounded-xl border border-[#EFE7DA]">
                  <div className="text-[10px] text-[#E8A33D] font-bold">Admin</div>
                  <div className="text-lg font-bold text-[#3A322C]">{analyticsData?.marking_methods?.admin_manual ?? 0}</div>
                  <div className="text-[9px] text-[#3A322C]/60">Override</div>
                </div>

                <div className="p-2.5 bg-[#FDFBF7] rounded-xl border border-[#EFE7DA]">
                  <div className="text-[10px] text-[#C1554A] font-bold">Auto Absent</div>
                  <div className="text-lg font-bold text-[#3A322C]">{analyticsData?.marking_methods?.auto_absent ?? 0}</div>
<div className="text-[9px] text-[#3A322C]/60">Cutoff Finalized</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EVENTS & QR CODES */}
      {activeTab === 'events' && (() => {
        const searchedEvents = events.filter(ev => {
          const venueName = ev.venue_name || 'Central Mandir';
          const query = eventSearchQuery.toLowerCase().trim();
          const matchesQuery = !query ||
            ev.title.toLowerCase().includes(query) ||
            ev.event_date.includes(query) ||
            venueName.toLowerCase().includes(query) ||
            (ev.qr_code_reference || '').toLowerCase().includes(query) ||
            ev.status.toLowerCase().includes(query);
          
          const matchesDate = !eventDateFilter || ev.event_date === eventDateFilter;
          return matchesQuery && matchesDate;
        });

        // 1. Current Live Event Started (if any)
        const primaryLiveEvent = events.find(ev => getEventLiveState(ev).isLive);

        // 2. All Recurring Events (Reusable QR / Weekly Sabhas)
        const recurringEventsList = searchedEvents.filter(ev => ev.qr_mode === 'reusable');

        // Group recurring events by title/reference to display tenure
        const recurringGroupMap = {};
        recurringEventsList.forEach(ev => {
          const groupKey = ev.qr_code_reference || ev.title;
          if (!recurringGroupMap[groupKey]) {
            recurringGroupMap[groupKey] = {
              masterEvent: ev,
              allEvents: []
            };
          }
          recurringGroupMap[groupKey].allEvents.push(ev);
        });
        const recurringGroups = Object.values(recurringGroupMap);

        // 3. Common Finished & Special Events History (All Concluded & Special Events)
        const searchedClosedEvents = searchedEvents.filter(ev => ev.status === 'closed');

        return (
          <div className="space-y-6">
            {/* TOP BAR: Header & Creation Launcher */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-6 rounded-2xl warm-shadow border border-[#EFE7DA] gap-4">
              <div>
                <h3 className="font-serif-accent text-2xl font-bold text-[#8B3A3A]">
                  Sabha Event Master Schedule
                </h3>
                <p className="text-xs text-[#3A322C]/70 font-medium">
                  Live Event Monitor • Master Recurring Sabhas • Concluded Events Archive
                </p>
              </div>
              <button
                onClick={handleOpenWizard}
                className="bg-[#8B3A3A] hover:bg-[#6E2C2C] text-white font-semibold text-xs px-5 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Launch Creation Wizard</span>
              </button>
            </div>

            {/* MASTER SEARCH BAR & DATE FILTER */}
            <div className="bg-white p-4 rounded-2xl warm-shadow border border-[#EFE7DA] grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 relative flex items-center">
                <Search className="w-4 h-4 absolute left-3.5 text-[#3A322C]/40 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search events by name, date, venue location, or QR ref..."
                  value={eventSearchQuery}
                  onChange={(e) => setEventSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#8B3A3A]"
                />
                {eventSearchQuery && (
                  <button
                    onClick={() => setEventSearchQuery('')}
                    className="absolute right-3 text-[#3A322C]/40 hover:text-[#8B3A3A]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full">
                  <input
                    type="date"
                    value={eventDateFilter}
                    onChange={(e) => setEventDateFilter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#8B3A3A]"
                  />
                </div>
                {eventDateFilter && (
                  <button
                    onClick={() => setEventDateFilter('')}
                    className="px-2.5 py-2.5 rounded-xl bg-[#FDFBF7] hover:bg-[#EFE7DA] border border-[#EFE7DA] text-xs text-[#8B3A3A] font-semibold"
                    title="Clear Date Filter"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* 🔴 TOP SECTION: CURRENT EVENT STARTED RIGHT NOW (IF ANY) */}
            <div className={`p-6 rounded-2xl border transition-all ${
              primaryLiveEvent ? 'bg-[#5B8C5B]/10 border-[#5B8C5B] warm-shadow' : 'bg-white border-[#EFE7DA]'
            }`}>
              <div className="flex items-center justify-between border-b border-[#EFE7DA] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${primaryLiveEvent ? 'bg-[#5B8C5B] animate-ping' : 'bg-gray-300'}`} />
                  <h4 className="font-serif-accent text-xl font-bold text-[#8B3A3A]">
                    {primaryLiveEvent ? 'Live Event Started Right Now' : 'Live Event Status'}
                  </h4>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  primaryLiveEvent ? 'bg-[#5B8C5B] text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {primaryLiveEvent ? 'ACTIVE SESSION' : 'NO LIVE EVENT RUNNING'}
                </span>
              </div>

              {primaryLiveEvent ? (
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h5 className="font-bold text-lg text-[#3A322C]">{primaryLiveEvent.title}</h5>
                    <div className="text-xs text-[#3A322C]/80 space-y-0.5">
                      <p className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-[#8B3A3A]" />
                        <span>Date: {primaryLiveEvent.event_date} ({primaryLiveEvent.start_time} - {primaryLiveEvent.end_time} IST)</span>
                      </p>
                      <p className="flex items-center gap-1.5 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#8B3A3A]" />
                        <span>Venue: {primaryLiveEvent.venue_name || 'Central Mandir'} ({primaryLiveEvent.venue_radius_meters}m radius)</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button
                      onClick={() => setSelectedDetailModal({ type: 'event', data: primaryLiveEvent })}
                      className="bg-[#5B8C5B] hover:bg-[#4A734A] text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md flex-1 md:flex-none"
                    >
                      <UserCheck className="w-4 h-4" /> Live Attendance
                    </button>
                    <button
                      onClick={() => handleViewQR(primaryLiveEvent.id)}
                      className="bg-white hover:bg-[#EFE7DA] text-[#8B3A3A] border border-[#EFE7DA] font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs flex-1 md:flex-none"
                    >
                      <QrCode className="w-4 h-4" /> Printable QR
                    </button>
                    <button
                      onClick={() => handleCloseEvent(primaryLiveEvent.id)}
                      className="bg-[#C1554A] hover:bg-[#A8453B] text-white font-semibold text-xs py-2.5 px-4 rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-1.5 flex-1 md:flex-none"
                    >
                      <Lock className="w-4 h-4" /> Close Sabha
                    </button>
                    <button
                      onClick={() => handleDeleteSingleEvent(primaryLiveEvent)}
                      className="bg-[#C1554A]/10 hover:bg-[#C1554A]/20 text-[#C1554A] border border-[#C1554A]/30 font-semibold text-xs py-2.5 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 flex-1 md:flex-none transition-colors"
                      title="Delete Live Event Record"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Event
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-[#3A322C]/60 italic">
                  There is no active sabha live right now. Click "Launch Creation Wizard" to schedule or start a new sabha event.
                </div>
              )}
            </div>

            {/* 🔄 SECTION 2: RECURRING EVENTS MASTER SECTION */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 warm-shadow border border-[#EFE7DA] space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#EFE7DA] pb-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-[#E8A33D] shrink-0" />
                  <h4 className="font-serif-accent text-lg sm:text-xl font-bold text-[#8B3A3A]">
                    Master Recurring Events ({recurringGroups.length})
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#E8A33D]/15 text-[#D98A2B] font-bold uppercase tracking-wider shrink-0">
                  Reusable QR • Series View
                </span>
              </div>

              {recurringGroups.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#3A322C]/60 italic">
                  No recurring events created in the system matching your search filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recurringGroups.map((group, idx) => {
                    const masterEv = group.masterEvent;
                    const tenureDates = group.allEvents.map(e => e.event_date).sort();
                    const upcomingDates = tenureDates.filter(d => d >= new Date().toISOString().split('T')[0]);

                    return (
                      <div
                        key={idx}
                        className="p-4 sm:p-5 rounded-2xl border border-[#EFE7DA] bg-[#FDFBF7] space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div>
                              <span className="inline-block px-2 py-0.5 rounded text-[9px] bg-[#E8A33D]/20 text-[#D98A2B] font-bold uppercase tracking-wider mb-1">
                                RECURRING SABHA SERIES
                              </span>
                              <h5 className="font-bold text-base text-[#3A322C]">{masterEv.title}</h5>
                            </div>
                            <div className="flex items-center gap-1.5 self-end sm:self-auto">
                              <button
                                onClick={() => setEditingEvent(masterEv)}
                                className="bg-[#8B3A3A]/10 hover:bg-[#8B3A3A]/20 text-[#8B3A3A] text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                                title="Edit Title, Dates or Venue"
                              >
                                <Edit className="w-3.5 h-3.5" /> Edit
                              </button>
                            </div>
                          </div>

                          <div className="text-xs text-[#3A322C]/80 space-y-1">
                            <div className="font-medium flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#8B3A3A] shrink-0" />
                              <span className="break-words">Venue: {masterEv.venue_name || 'Central Mandir'} ({masterEv.venue_radius_meters || 150}m radius)</span>
                            </div>
                            <div className="font-medium flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#8B3A3A] shrink-0" />
                              <span>Timing: {masterEv.start_time} - {masterEv.end_time} IST</span>
                            </div>
                            <div className="text-[11px] text-[#8B3A3A] font-semibold break-all">
                              Reusable QR Ref: {masterEv.qr_code_reference}
                            </div>
                          </div>

                          {/* Upcoming Tenure Dates & Mobile-Responsive Skip Manager */}
                          <div className="p-3 rounded-xl bg-white border border-[#EFE7DA] space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <div className="text-[10px] font-bold uppercase text-[#8B3A3A] tracking-wider flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 shrink-0 text-[#8B3A3A]" />
                                <span>Tenure Dates ({group.allEvents.length} Occurrences):</span>
                              </div>
                              <span className="text-[10px] text-[#8B3A3A] font-semibold italic">Tap ✖ on date to skip occurrence</span>
                            </div>

                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 custom-scrollbar">
                              {group.allEvents.length === 0 ? (
                                <span className="text-xs text-[#3A322C]/60 italic">No dates scheduled</span>
                              ) : (
                                group.allEvents.map((evObj) => {
                                  const isPast = evObj.event_date < new Date().toISOString().split('T')[0];
                                  return (
                                    <div
                                      key={evObj.id}
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono border transition-all ${
                                        isPast
                                          ? 'bg-gray-100 text-gray-500 border-gray-200 opacity-60'
                                          : 'bg-[#FDFBF7] text-[#3A322C] border-[#EFE7DA] hover:border-[#8B3A3A]/40'
                                      }`}
                                    >
                                      <span>{evObj.event_date}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSingleEvent(evObj)}
                                        className="text-gray-400 hover:text-[#C1554A] p-0.5 rounded-md hover:bg-[#C1554A]/10 cursor-pointer transition-colors"
                                        title={`Skip / Cancel Sabha occurrence on ${evObj.event_date}`}
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#EFE7DA]">
                          <button
                            onClick={() => handleViewQR(masterEv.id)}
                            className="w-full sm:flex-1 bg-white hover:bg-[#EFE7DA] text-[#8B3A3A] border border-[#EFE7DA] font-semibold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <QrCode className="w-3.5 h-3.5" /> Printable QR
                          </button>
                          <button
                            onClick={() => handleDeleteRecurringSeries(masterEv)}
                            className="w-full sm:flex-1 bg-[#C1554A] hover:bg-[#A8453B] text-white font-semibold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Series
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 📜 SECTION 3: COMMON FINISHED & COMPLETED EVENTS ARCHIVE (AT BOTTOM) */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 warm-shadow border border-[#EFE7DA] space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#EFE7DA] pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-[#3A322C]/60 shrink-0" />
                  <h4 className="font-serif-accent text-lg sm:text-xl font-bold text-[#8B3A3A]">
                    Events & History Archive ({searchedClosedEvents.length})
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#C1554A]/15 text-[#C1554A] font-bold uppercase tracking-wider shrink-0">
                  Special & Concluded Sabhas
                </span>
              </div>

              {searchedClosedEvents.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#3A322C]/60 italic">
                  No concluded or special events match your search parameters.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchedClosedEvents.map((ev) => (
                    <div key={ev.id} className="p-4 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-sm text-[#3A322C] truncate">{ev.title}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                            ev.status === 'open' ? 'bg-[#5B8C5B]/15 text-[#5B8C5B]' : 'bg-[#C1554A]/15 text-[#C1554A]'
                          }`}>
                            {ev.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="text-xs text-[#3A322C]/70 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#8B3A3A]" />
                            <span>Date: {ev.event_date} ({ev.start_time} - {ev.end_time} IST)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#8B3A3A]" />
                            <span>Venue: {ev.venue_name || 'Central Mandir'}</span>
                          </div>
                          <div className="text-[10px] font-semibold text-[#8B3A3A] pt-0.5 flex items-center gap-1">
                            <span>Type:</span>
                            {ev.qr_mode === 'reusable' || (ev.qr_code_reference && (ev.qr_code_reference.startsWith('recurring_') || ev.qr_code_reference.startsWith('venue_'))) || (ev.title || '').toLowerCase().includes('sabha') || (ev.title || '').toLowerCase().includes('saturday') || (ev.title || '').toLowerCase().includes('sunday') ? (
                              <span className="inline-flex items-center gap-1 text-[#8B3A3A]"><RefreshCw className="w-3 h-3" /> Recurring Sabha</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#E8A33D]"><Zap className="w-3 h-3" /> Special One-Time</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-[#EFE7DA]">
                        <div className="text-[10px] font-bold uppercase text-[#8B3A3A] tracking-wider">
                          Actions & Event Reports:
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                          <button
                            type="button"
                            onClick={() => handleExportEventPDF(ev.id, ev.title, ev.event_date)}
                            className="bg-[#8B3A3A] hover:bg-[#6E2C2C] text-white font-semibold text-xs py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <FileText className="w-3.5 h-3.5" /> Export PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportEventExcel(ev.id, ev.title, ev.event_date)}
                            className="bg-[#5B8C5B] hover:bg-[#4A734A] text-white font-semibold text-xs py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleEvent(ev)}
                          className="w-full bg-[#C1554A]/10 hover:bg-[#C1554A]/20 text-[#C1554A] border border-[#C1554A]/30 font-semibold text-xs py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Event Record
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* EDIT EVENT MODAL */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 warm-shadow">
            <div className="flex justify-between items-center border-b border-[#EFE7DA] pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#8B3A3A]" />
                <h3 className="font-serif-accent text-xl font-bold text-[#8B3A3A]">
                  Edit Event Details
                </h3>
              </div>
              <button
                onClick={() => setEditingEvent(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEventEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8B3A3A] mb-1">Event Title</label>
                <input
                  type="text"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs font-semibold text-[#3A322C] focus:outline-none focus:border-[#8B3A3A]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8B3A3A] mb-1">Event Date</label>
                  <input
                    type="date"
                    value={editingEvent.event_date}
                    onChange={(e) => setEditingEvent({ ...editingEvent, event_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs font-semibold text-[#3A322C] focus:outline-none focus:border-[#8B3A3A]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8B3A3A] mb-1">Venue Mandir</label>
                  <select
                    value={editingEvent.venue_id || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, venue_id: parseInt(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs font-semibold text-[#3A322C] focus:outline-none focus:border-[#8B3A3A]"
                  >
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8B3A3A] mb-1">Start Time (IST)</label>
                  <input
                    type="time"
                    value={editingEvent.start_time}
                    onChange={(e) => setEditingEvent({ ...editingEvent, start_time: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs font-semibold text-[#3A322C] focus:outline-none focus:border-[#8B3A3A]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8B3A3A] mb-1">End Time (IST)</label>
                  <input
                    type="time"
                    value={editingEvent.end_time}
                    onChange={(e) => setEditingEvent({ ...editingEvent, end_time: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs font-semibold text-[#3A322C] focus:outline-none focus:border-[#8B3A3A]"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFE7DA]">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#8B3A3A] hover:bg-[#6E2C2C] rounded-xl shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: VENUES & RADIUS MAP */}
      {activeTab === 'venues' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-accent text-xl font-bold text-[#8B3A3A]">
                Saved Mandir Venues ({venues.length})
              </h3>
              {editingVenueId && (
                <button
                  onClick={handleCancelEditVenue}
                  className="text-xs text-[#8B3A3A] font-semibold hover:underline cursor-pointer"
                >
                  + Add New Venue Mode
                </button>
              )}
            </div>

            <div className="space-y-3">
              {venues.map(v => (
                <div
                  key={v.id}
                  className={`p-4 rounded-xl border transition-all ${
                    editingVenueId === v.id
                      ? 'border-[#8B3A3A] bg-[#8B3A3A]/5 warm-shadow'
                      : 'border-[#EFE7DA] bg-[#FDFBF7]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-sm text-[#3A322C] flex flex-wrap items-center gap-1.5 leading-snug">
                        <span>{v.name}</span>
                        {editingVenueId === v.id && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] bg-[#8B3A3A] text-white font-bold uppercase shrink-0">
                            EDITING NOW
                          </span>
                        )}
                      </div>
                      {v.address && <div className="text-xs text-[#3A322C]/70 break-words">{v.address}</div>}
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 mt-1 sm:mt-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditVenue(v)}
                        className="bg-white hover:bg-[#EFE7DA] text-[#8B3A3A] border border-[#EFE7DA] text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Edit className="w-3 h-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteVenue(v)}
                        className="bg-[#C1554A]/10 hover:bg-[#C1554A]/20 text-[#C1554A] border border-[#C1554A]/30 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-[#8B3A3A] font-semibold mt-3 pt-2 border-t border-[#EFE7DA]/70 flex items-center justify-between">
                    <span>GPS: {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}</span>
                    <span className="bg-[#8B3A3A]/10 px-2 py-0.5 rounded-full">Radius: {v.radius_meters}m</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DA] pb-3">
              <div>
                <h3 className="font-serif-accent text-xl font-bold text-[#8B3A3A]">
                  {editingVenueId ? 'Edit Venue & Geofence' : 'Add / Configure Venue Geofence'}
                </h3>
                <p className="text-xs text-[#3A322C]/70">
                  {editingVenueId ? `Updating record #${editingVenueId}` : 'Create a new geofenced venue location'}
                </p>
              </div>
              {editingVenueId && (
                <button
                  type="button"
                  onClick={handleCancelEditVenue}
                  className="bg-[#FDFBF7] hover:bg-[#EFE7DA] text-[#3A322C] border border-[#EFE7DA] text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveVenue} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#3A322C] mb-1">Venue Name</label>
                <input
                  type="text"
                  required
                  value={venueForm.name}
                  onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
                  placeholder="e.g. Central Sabha Mandir"
                  className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3A322C] mb-1">Address / Location Description</label>
                <input
                  type="text"
                  value={venueForm.address}
                  onChange={(e) => setVenueForm({ ...venueForm, address: e.target.value })}
                  placeholder="e.g. Main Auditorium, Sector 12"
                  className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs"
                />
              </div>

              <div className="bg-[#FDFBF7] p-3.5 rounded-xl border border-[#EFE7DA] space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#8B3A3A]">
                  <span className="flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-[#8B3A3A]" />
                    <span>Paste Google Maps Link or Location Name</span>
                  </span>
                  <span className="text-[10px] text-[#3A322C]/60 font-normal">Auto-extracts Lat & Lng</span>
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={gmapsInput}
                    onChange={handleGmapsInputChange}
                    placeholder="e.g. https://maps.google.com/?q=23.0225,72.5714 or Swaminarayan Mandir"
                    className="flex-1 p-2.5 rounded-xl border border-[#EFE7DA] bg-white text-xs text-[#3A322C] focus:outline-none focus:border-[#8B3A3A]"
                  />
                  <button
                    type="button"
                    onClick={handleSearchPlaceName}
                    disabled={isSearchingPlace}
                    className="bg-[#8B3A3A] hover:bg-[#6E2C2C] text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{isSearchingPlace ? 'Locating...' : 'Locate'}</span>
                  </button>
                </div>

                {parseStatus && (
                  <div className="text-[11px] font-medium text-[#5B8C5B] bg-[#5B8C5B]/10 p-2.5 rounded-lg border border-[#5B8C5B]/20 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#5B8C5B] shrink-0" />
                    <span>{parseStatus}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-[#3A322C] mb-1">
                  <span>Geofence Radius: {venueForm.radius_meters} meters</span>
                  <span className="text-[#8B3A3A]">Allowed range: 10m - 500m</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="5"
                  value={venueForm.radius_meters}
                  onChange={(e) => setVenueForm({ ...venueForm, radius_meters: parseFloat(e.target.value) })}
                  className="w-full accent-[#8B3A3A]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-[#3A322C] mb-1">
                  <span>Interactive Map Geofence Center</span>
                  <span className="text-[#8B3A3A]">GPS: {venueForm.latitude.toFixed(5)}, {venueForm.longitude.toFixed(5)}</span>
                </div>
                <VenueMap
                  lat={venueForm.latitude}
                  lng={venueForm.longitude}
                  radiusMeters={venueForm.radius_meters}
                  onLocationChange={(newLat, newLng) => setVenueForm({ ...venueForm, latitude: newLat, longitude: newLng })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                {editingVenueId && (
                  <button
                    type="button"
                    onClick={handleCancelEditVenue}
                    className="w-1/3 py-2.5 rounded-xl bg-[#FDFBF7] hover:bg-[#EFE7DA] text-[#3A322C] border border-[#EFE7DA] font-semibold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className={`py-2.5 rounded-xl text-white font-semibold text-xs transition-colors cursor-pointer ${
                    editingVenueId
                      ? 'w-2/3 bg-[#5B8C5B] hover:bg-[#4A734A]'
                      : 'w-full bg-[#8B3A3A] hover:bg-[#6E2C2C]'
                  }`}
                >
                  {editingVenueId ? 'Update Venue Geofence' : 'Save Venue & Geofence Circle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: USER & ROLE MANAGEMENT */}
      {activeTab === 'users' && (
        <UserManagementSection currentUser={user} />
      )}

      {/* TAB 5: MASTER ATTENDANCE LOG & DUAL GRID VIEWS */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA] space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#EFE7DA] pb-5">
            <div>
              <h3 className="font-serif-accent text-2xl font-bold text-[#8B3A3A]">
                Master Attendance Log Analytics
              </h3>
              <p className="text-xs text-[#3A322C]/70">
                Switch view layout to explore attendance grouped event-wise or member-wise
              </p>
            </div>

            <div className="flex items-center p-1 bg-[#FDFBF7] border border-[#EFE7DA] rounded-xl text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setMasterLogViewMode('events')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                  masterLogViewMode === 'events'
                    ? 'bg-[#8B3A3A] text-white shadow-xs'
                    : 'text-[#3A322C]/70 hover:text-[#8B3A3A]'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Event-Wise Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setMasterLogViewMode('members')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                  masterLogViewMode === 'members'
                    ? 'bg-[#8B3A3A] text-white shadow-xs'
                    : 'text-[#3A322C]/70 hover:text-[#8B3A3A]'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Individual Member-Wise Grid</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#3A322C]/40" />
              <input
                type="text"
                value={masterSearchQuery}
                onChange={(e) => setMasterSearchQuery(e.target.value)}
                placeholder={
                  masterLogViewMode === 'events'
                    ? "Search events by title or date (e.g. Janmashtami, 2026-07-26)..."
                    : "Search members by name or phone number..."
                }
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#8B3A3A]"
              />
            </div>
            {masterSearchQuery && (
              <button
                onClick={() => setMasterSearchQuery('')}
                className="text-xs text-[#8B3A3A] font-semibold hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {masterLogViewMode === 'events' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents.length === 0 ? (
                <div className="col-span-full py-12 text-center text-xs text-[#3A322C]/60 italic">
                  No matching events found.
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const stats = getEventStats(ev.id);
                  return (
                    <div
                      key={ev.id}
                      className="p-5 rounded-2xl border border-[#EFE7DA] bg-[#FDFBF7] hover:border-[#8B3A3A] transition-all warm-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4
                            onClick={() => setSelectedDetailModal({ type: 'event', data: ev })}
                            className="font-bold text-base text-[#3A322C] hover:text-[#8B3A3A] cursor-pointer transition-colors"
                          >
                            {ev.title}
                          </h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                            ev.status === 'open' ? 'bg-[#5B8C5B]/15 text-[#5B8C5B]' : 'bg-[#C1554A]/15 text-[#C1554A]'
                          }`}>
                            {ev.status}
                          </span>
                        </div>

                        <div className="text-xs text-[#3A322C]/70 space-y-1 mb-4">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#8B3A3A]" />
                            <span>Date: {ev.event_date} ({ev.start_time} - {ev.end_time} IST)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#8B3A3A]" />
                            <span>Venue: {ev.venue_name || 'Central Mandir'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-[#EFE7DA]">
                        <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                          <div className="bg-[#FDFBF7] p-2 rounded-xl border border-[#EFE7DA]">
                            <div className="text-[10px] text-[#3A322C]/60 uppercase">Total</div>
                            <div className="text-sm text-[#3A322C] font-bold">{stats.total}</div>
                          </div>
                          <div className="bg-[#5B8C5B]/10 p-2 rounded-xl border border-[#5B8C5B]/20">
                            <div className="text-[10px] text-[#5B8C5B] uppercase">Present</div>
                            <div className="text-sm text-[#5B8C5B] font-bold">{stats.present}</div>
                          </div>
                          <div className="bg-[#C1554A]/10 p-2 rounded-xl border border-[#C1554A]/20">
                            <div className="text-[10px] text-[#C1554A] uppercase">Absent</div>
                            <div className="text-sm text-[#C1554A] font-bold">{stats.absent}</div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-medium text-[#3A322C]/70 mb-1">
                            <span>Turnout Ratio</span>
                            <span className="font-bold text-[#8B3A3A]">{stats.pct}%</span>
                          </div>
                          <div className="w-full bg-[#EFE7DA] h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#5B8C5B] h-full rounded-full transition-all duration-300"
                              style={{ width: `${stats.pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Export & Detail Action Buttons */}
                        <div className="pt-2 border-t border-[#EFE7DA] space-y-1.5">
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleExportEventPDF(ev.id, ev.title, ev.event_date)}
                              className="bg-[#8B3A3A] hover:bg-[#6E2C2C] text-white font-semibold text-xs py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            >
                              <FileText className="w-3.5 h-3.5" /> PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportEventExcel(ev.id, ev.title, ev.event_date)}
                              className="bg-[#5B8C5B] hover:bg-[#4A734A] text-white font-semibold text-xs py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedDetailModal({ type: 'event', data: ev })}
                            className="w-full bg-white hover:bg-[#EFE7DA] text-[#8B3A3A] border border-[#EFE7DA] font-semibold text-xs py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>View Full Event Logs & Audits →</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {masterLogViewMode === 'members' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.length === 0 ? (
                <div className="col-span-full py-12 text-center text-xs text-[#3A322C]/60 italic">
                  No matching members found.
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const mStats = getMemberStats(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedDetailModal({ type: 'user', data: m })}
                      className="p-5 rounded-2xl border border-[#EFE7DA] bg-[#FDFBF7] hover:border-[#8B3A3A] hover:bg-white transition-all cursor-pointer warm-shadow group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-bold text-base text-[#3A322C] group-hover:text-[#8B3A3A] transition-colors">
                            {m.name}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize shrink-0 ${
                            m.role === 'admin' ? 'bg-[#8B3A3A]/15 text-[#8B3A3A]' :
                            m.role === 'karyakar' ? 'bg-[#E8A33D]/20 text-[#E8A33D]' : 'bg-[#5B8C5B]/15 text-[#5B8C5B]'
                          }`}>
                            {m.role}
                          </span>
                        </div>

                        <p className="text-xs text-[#3A322C]/70 mb-3">
                          Phone: {m.phone} {m.dob && `• DOB: ${m.dob}`}
                        </p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-[#EFE7DA]">
                        <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                          <div className="bg-[#FDFBF7] p-2 rounded-xl border border-[#EFE7DA]">
                            <div className="text-[10px] text-[#3A322C]/60 uppercase">Attended</div>
                            <div className="text-sm text-[#3A322C] font-bold">{mStats.total}</div>
                          </div>
                          <div className="bg-[#5B8C5B]/10 p-2 rounded-xl border border-[#5B8C5B]/20">
                            <div className="text-[10px] text-[#5B8C5B] uppercase">Present</div>
                            <div className="text-sm text-[#5B8C5B] font-bold">{mStats.present}</div>
                          </div>
                          <div className="bg-[#C1554A]/10 p-2 rounded-xl border border-[#C1554A]/20">
                            <div className="text-[10px] text-[#C1554A] uppercase">Absent</div>
                            <div className="text-sm text-[#C1554A] font-bold">{mStats.absent}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs font-semibold bg-[#E8A33D]/10 p-2 rounded-xl border border-[#E8A33D]/20 text-[#E8A33D]">
                          <span className="flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-[#E8A33D]" />
                            <span>Current Streak</span>
                          </span>
                          <span className="font-bold text-sm">{m.current_streak} Sabhas</span>
                        </div>

                        <div className="text-right text-[11px] font-semibold text-[#8B3A3A] group-hover:underline flex items-center justify-end gap-1 pt-1">
                          <span>View Member Attendance History</span>
                          <span>→</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      )}

      {/* TAB 6: REPORTS & EXPORTS */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA] space-y-6">
          <div>
            <h3 className="font-serif-accent text-2xl font-bold text-[#8B3A3A]">
              Attendance Data Exports & Reports
            </h3>
            <p className="text-xs text-[#3A322C]/70">
              Select a specific event or date range to generate event-grouped Excel spreadsheets or PDF summary reports
            </p>
          </div>

          <div className="bg-[#FDFBF7] p-4 rounded-xl border border-[#EFE7DA] space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#3A322C] mb-1">
                Select Specific Event (Optional - Overrides Date Range)
              </label>
              <select
                value={selectedReportEventId}
                onChange={(e) => setSelectedReportEventId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-white text-xs font-semibold text-[#3A322C] cursor-pointer"
              >
                <option value="">-- All Events (Grouped Event-by-Event) --</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.event_date} • {ev.start_time} - {ev.end_time} IST) — Status: {ev.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row items-end gap-4 pt-1">
              <div className="w-full sm:w-1/2">
                <label className="block text-xs font-semibold text-[#3A322C] mb-1">Start Date</label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  disabled={!!selectedReportEventId}
                  className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-white text-xs disabled:opacity-50"
                />
              </div>
              <div className="w-full sm:w-1/2">
                <label className="block text-xs font-semibold text-[#3A322C] mb-1">End Date</label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  disabled={!!selectedReportEventId}
                  className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-white text-xs disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleExportExcel}
              className="p-5 rounded-2xl bg-[#5B8C5B]/10 hover:bg-[#5B8C5B]/20 border border-[#5B8C5B]/30 text-[#5B8C5B] font-bold text-sm flex items-center justify-between cursor-pointer transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8" />
                <div className="text-left">
                  <div>Export Excel (.xlsx)</div>
                  <div className="text-xs font-normal text-[#3A322C]/70">Event-wise table with top details & stats</div>
                </div>
              </div>
              <Download className="w-5 h-5" />
            </button>

            <button
              onClick={handleExportPDF}
              className="p-5 rounded-2xl bg-[#8B3A3A]/10 hover:bg-[#8B3A3A]/20 border border-[#8B3A3A]/30 text-[#8B3A3A] font-bold text-sm flex items-center justify-between cursor-pointer transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8" />
                <div className="text-left">
                  <div>Export PDF (.pdf)</div>
                  <div className="text-xs font-normal text-[#3A322C]/70">Printable report with Event Name, Date & Location</div>
                </div>
              </div>
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* MASTER LOG DETAIL MODAL */}
      {selectedDetailModal && (
        <div className="fixed inset-0 z-50 bg-[#3A322C]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 warm-shadow border border-[#EFE7DA] space-y-4 max-h-[90vh] overflow-y-auto">

            {selectedDetailModal.type === 'event' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#EFE7DA] pb-4 mb-2">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#8B3A3A]/15 text-[#8B3A3A] font-bold uppercase tracking-wider">
                      Event Attendance Audit Log
                    </span>
                    <h3 className="font-serif-accent text-2xl font-bold text-[#8B3A3A] mt-1">
                      {selectedDetailModal.data.title}
                    </h3>
                    <p className="text-xs text-[#3A322C]/70 mt-0.5">
                      Date: {selectedDetailModal.data.event_date} ({selectedDetailModal.data.start_time} - {selectedDetailModal.data.end_time} IST) • Location: {selectedDetailModal.data.venue_name || 'Central Mandir'} • QR Ref: {selectedDetailModal.data.qr_code_reference}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleExportEventPDF(selectedDetailModal.data.id, selectedDetailModal.data.title, selectedDetailModal.data.event_date)}
                      className="bg-[#8B3A3A] hover:bg-[#6E2C2C] text-white font-semibold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5" /> PDF Report
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportEventExcel(selectedDetailModal.data.id, selectedDetailModal.data.title, selectedDetailModal.data.event_date)}
                      className="bg-[#5B8C5B] hover:bg-[#4A734A] text-white font-semibold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Excel Report
                    </button>
                    <button
                      onClick={() => setSelectedDetailModal(null)}
                      className="bg-[#FDFBF7] hover:bg-[#C1554A]/10 text-[#3A322C] hover:text-[#C1554A] border border-[#EFE7DA] rounded-xl p-2 cursor-pointer ml-1 transition-colors"
                      title="Close Modal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {(() => {
                  const evStats = getEventStats(selectedDetailModal.data.id);
                  const evRecords = attendanceRecords.filter(r => r.event_id === selectedDetailModal.data.id);
                  const evRecordMap = {};
                  evRecords.forEach(r => { evRecordMap[r.user_id] = r; });

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3 my-2 p-3.5 bg-[#FDFBF7] rounded-xl border border-[#EFE7DA] text-center text-xs font-semibold">
                        <div>
                          <div className="text-[10px] text-[#3A322C]/60 uppercase">Total Headcount</div>
                          <div className="text-lg font-bold text-[#3A322C]">{allUsers.length}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#5B8C5B] uppercase">Present Members</div>
                          <div className="text-lg font-bold text-[#5B8C5B]">{evStats.present}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#C1554A] uppercase">Absent / Excused</div>
                          <div className="text-lg font-bold text-[#C1554A]">{evStats.absent}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-bold text-[#8B3A3A]">
                          Live Attendance Directory & Manual Action Controls
                        </div>
                        <div className="relative w-64">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#3A322C]/40" />
                          <input
                            type="text"
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            placeholder="Filter members by name/phone..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#8B3A3A]"
                          />
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-[#EFE7DA] rounded-xl max-h-96">
                        <table className="w-full text-left text-xs text-[#3A322C]">
                          <thead className="sticky top-0 bg-[#FDFBF7] z-10 border-b border-[#EFE7DA] text-[#8B3A3A] uppercase font-bold text-[11px]">
                            <tr>
                              <th className="p-3">Member Name & Phone</th>
                              <th className="p-3">Status</th>
                              <th className="p-3">Time Stamp</th>
                              <th className="p-3">Marked By</th>
                              <th className="p-3 text-right">Live Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EFE7DA]">
                            {allUsers.filter(u =>
                              u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                              u.phone.includes(userSearchQuery)
                            ).length === 0 ? (
                              <tr>
                                <td colSpan="5" className="p-6 text-center text-[#3A322C]/60 italic">
                                  No members match your search criteria.
                                </td>
                              </tr>
                            ) : (
                              allUsers.filter(u =>
                                u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                u.phone.includes(userSearchQuery)
                              ).map((u) => {
                                const r = evRecordMap[u.id];
                                const isPresent = r?.status === 'present';
                                const isAbsent = r?.status === 'absent';
                                const isExcused = r?.status === 'excused';

                                return (
                                  <tr key={u.id} className="hover:bg-[#FDFBF7]/60 transition-colors">
                                    <td className="p-3 font-semibold text-[#3A322C]">
                                      {u.name}
                                      <div className="text-[10px] text-[#3A322C]/60 font-normal">{u.phone}</div>
                                    </td>

                                    <td className="p-3">
                                      {r ? (
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                          isPresent ? 'bg-[#5B8C5B]/15 text-[#5B8C5B]' :
                                          isAbsent ? 'bg-[#C1554A]/15 text-[#C1554A]' : 'bg-[#D9B166]/20 text-[#D9B166]'
                                        }`}>
                                          {r.status}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-[#3A322C]/50 italic">Not Marked Yet</span>
                                      )}
                                    </td>

                                    <td className="p-3 font-mono text-[11px] text-[#8B3A3A] font-medium">
                                      {r?.timestamp_utc ? (
                                        new Date(String(r.timestamp_utc).endsWith('Z') || String(r.timestamp_utc).includes('+') ? r.timestamp_utc : String(r.timestamp_utc) + 'Z').toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST'
                                      ) : (
                                        <span className="text-[#3A322C]/40">-</span>
                                      )}
                                    </td>

                                    <td className="p-3 text-[#3A322C]/70">
                                      {r?.marked_by_name ? `Marked by ${r.marked_by_name}` : (r ? 'Self QR / Auto' : '-')}
                                    </td>

                                    <td className="p-3 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => handleAdminManualMark(u.id, selectedDetailModal.data.id, 'present')}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                                            isPresent
                                              ? 'bg-[#5B8C5B] text-white'
                                              : 'bg-white hover:bg-[#5B8C5B] text-[#5B8C5B] hover:text-white border border-[#5B8C5B]'
                                          }`}
                                        >
                                          <UserCheck className="w-3 h-3" />
                                          <span>Present</span>
                                        </button>

                                        <button
                                          onClick={() => handleAdminManualMark(u.id, selectedDetailModal.data.id, 'absent')}
                                          className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                            isAbsent
                                              ? 'bg-[#C1554A] text-white'
                                              : 'bg-white hover:bg-[#C1554A] text-[#C1554A] hover:text-white border border-[#C1554A]/40'
                                          }`}
                                        >
                                          <XCircle className="w-3 h-3" />
                                        </button>

                                        {r && (
                                          <button
                                            onClick={() => handleOpenEditAttendance(r)}
                                            className="bg-[#FDFBF7] hover:bg-[#EFE7DA] text-[#8B3A3A] border border-[#EFE7DA] text-[11px] font-semibold px-2 py-1 rounded-lg cursor-pointer ml-1"
                                            title="Edit Record Details"
                                          >
                                            Edit
                                          </button>
                                        )}
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
                  );
                })()}
              </div>
            )}

            {selectedDetailModal.type === 'user' && (
              <div>
                <div className="flex items-start justify-between gap-4 border-b border-[#EFE7DA] pb-4 mb-2">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#5B8C5B]/15 text-[#5B8C5B] font-bold uppercase tracking-wider">
                      Member History & Audit Log
                    </span>
                    <h3 className="font-serif-accent text-2xl font-bold text-[#8B3A3A] mt-1">
                      {selectedDetailModal.data.name}
                    </h3>
                    <p className="text-xs text-[#3A322C]/70 mt-0.5">
                      Phone: {selectedDetailModal.data.phone} • Role: {selectedDetailModal.data.role.toUpperCase()} • Current Streak: {selectedDetailModal.data.current_streak} Sabhas
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedDetailModal(null)}
                    className="bg-[#FDFBF7] hover:bg-[#C1554A]/10 text-[#3A322C] hover:text-[#C1554A] border border-[#EFE7DA] rounded-xl p-2 cursor-pointer transition-colors shrink-0"
                    title="Close Modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {(() => {
                  const mStats = getMemberStats(selectedDetailModal.data.id);
                  return (
                    <div className="grid grid-cols-3 gap-3 my-4 p-3.5 bg-[#FDFBF7] rounded-xl border border-[#EFE7DA] text-center text-xs font-semibold">
                      <div>
                        <div className="text-[10px] text-[#3A322C]/60 uppercase">Total Sabhas Logged</div>
                        <div className="text-lg font-bold text-[#3A322C]">{mStats.total}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#5B8C5B] uppercase">Present Count</div>
                        <div className="text-lg font-bold text-[#5B8C5B]">{mStats.present}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#C1554A] uppercase">Absent / Missed</div>
                        <div className="text-lg font-bold text-[#C1554A]">{mStats.absent}</div>
                      </div>
                    </div>
                  );
                })()}

                <div className="overflow-x-auto border border-[#EFE7DA] rounded-xl">
                  <table className="w-full text-left text-xs text-[#3A322C]">
                    <thead>
                      <tr className="bg-[#FDFBF7] border-b border-[#EFE7DA] text-[#8B3A3A] uppercase font-bold text-[11px]">
                        <th className="p-3">Sabha Event / Date</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Time Stamp</th>
                        <th className="p-3">Marked By</th>
                        <th className="p-3">Method</th>
                        <th className="p-3 text-right">Audit Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE7DA]">
                      {attendanceRecords.filter(r => r.user_id === selectedDetailModal.data.id).length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-6 text-center text-[#3A322C]/60 italic">
                            No attendance history recorded for this member.
                          </td>
                        </tr>
                      ) : (
                        attendanceRecords.filter(r => r.user_id === selectedDetailModal.data.id).map((r) => (
                          <tr key={r.id} className="hover:bg-[#FDFBF7]/60">
                            <td className="p-3 font-semibold">
                              {r.event_title}
                              <div className="text-[10px] text-[#3A322C]/60">{r.event_date}</div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                r.status === 'present' ? 'bg-[#5B8C5B]/15 text-[#5B8C5B]' :
                                r.status === 'absent' ? 'bg-[#C1554A]/15 text-[#C1554A]' : 'bg-[#D9B166]/20 text-[#D9B166]'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-[#8B3A3A] font-medium">
                              {r.timestamp_utc ? (
                                new Date(String(r.timestamp_utc).endsWith('Z') || String(r.timestamp_utc).includes('+') ? r.timestamp_utc : String(r.timestamp_utc) + 'Z').toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST'
                              ) : (
                                <span className="text-[#3A322C]/40">-</span>
                              )}
                            </td>
                            <td className="p-3 font-semibold text-[#8B3A3A]">
                              {r.marked_by_name ? `Marked by ${r.marked_by_name}` : (r.marking_method === 'self_qr' ? 'Self (QR)' : 'Auto Absent')}
                            </td>
                            <td className="p-3 text-[#3A322C]/70 capitalize">{r.marking_method.replace('_', ' ')}</td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleOpenEditAttendance(r)}
                                className="bg-[#FDFBF7] hover:bg-[#EFE7DA] text-[#8B3A3A] border border-[#EFE7DA] text-xs font-semibold px-2.5 py-1 rounded-lg cursor-pointer"
                              >
                                Edit Record
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* EVENT CREATION WIZARD MODAL */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-[#3A322C]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 warm-shadow border border-[#EFE7DA] space-y-4 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setShowWizard(false); setWizardStep(1); }}
              className="absolute top-4 right-4 text-[#3A322C]/50 hover:text-[#8B3A3A] cursor-pointer p-1"
              title="Close Wizard"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif-accent text-xl sm:text-2xl font-bold text-[#8B3A3A]">
              Event Creation Wizard (Step {wizardStep} of 3)
            </h3>

            {wizardStep === 1 && (
              <div className="space-y-4">
                {/* Primary Choice: Recurring vs One-Time Special Event */}
                <div>
                  <label className="block text-xs font-semibold text-[#3A322C] mb-1.5">Select Event Category</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEventForm(prev => ({ ...prev, event_type: 'recurring', qr_mode: 'reusable' }))}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        eventForm.event_type === 'recurring'
                          ? 'bg-[#8B3A3A] text-white border-[#8B3A3A] shadow-xs'
                          : 'bg-[#FDFBF7] text-[#3A322C] border-[#EFE7DA] hover:bg-[#EFE7DA]'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                        <span>Recurring Weekly Event</span>
                      </div>
                      <div className={`text-[10px] mt-1 ${eventForm.event_type === 'recurring' ? 'text-white/80' : 'text-[#3A322C]/60'}`}>
                        Uses permanent reusable Mandir QR poster continuously
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEventForm(prev => ({ ...prev, event_type: 'one_time', qr_mode: 'per_event' }))}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        eventForm.event_type === 'one_time'
                          ? 'bg-[#8B3A3A] text-white border-[#8B3A3A] shadow-xs'
                          : 'bg-[#FDFBF7] text-[#3A322C] border-[#EFE7DA] hover:bg-[#EFE7DA]'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>One-Time Special Event</span>
                      </div>
                      <div className={`text-[10px] mt-1 ${eventForm.event_type === 'one_time' ? 'text-white/80' : 'text-[#3A322C]/60'}`}>
                        Generates a new fresh unique QR code every time
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3A322C] mb-1">Sabha Title</label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    placeholder="e.g. Monday Sabha or Janmashtami Special"
                    className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs font-semibold"
                  />
                </div>

                {eventForm.event_type === 'recurring' ? (
                  <div className="space-y-3 p-3 rounded-xl bg-[#FDFBF7] border border-[#EFE7DA]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-[#3A322C] mb-1">Day of Week</label>
                        <select
                          value={eventForm.day_of_week}
                          onChange={(e) => {
                            const dName = e.target.value;
                            const capitalized = dName.charAt(0).toUpperCase() + dName.slice(1);
                            setEventForm(prev => ({
                              ...prev,
                              day_of_week: dName,
                              title: `${capitalized} Sabha`
                            }));
                          }}
                          className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-white text-xs font-semibold text-[#3A322C] cursor-pointer"
                        >
                          <option value="monday">Every Monday</option>
                          <option value="tuesday">Every Tuesday</option>
                          <option value="wednesday">Every Wednesday</option>
                          <option value="thursday">Every Thursday</option>
                          <option value="friday">Every Friday</option>
                          <option value="saturday">Every Saturday</option>
                          <option value="sunday">Every Sunday</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#3A322C] mb-1">Start Date (First Instance)</label>
                        <input
                          type="date"
                          value={eventForm.event_date}
                          onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-white text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#3A322C] mb-1">Auto-Generate Schedule Duration</label>
                      <select
                        value={eventForm.recurring_weeks}
                        onChange={(e) => setEventForm({ ...eventForm, recurring_weeks: parseInt(e.target.value) })}
                        className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-white text-xs font-semibold text-[#3A322C] cursor-pointer"
                      >
                        <option value={4}>Next 4 Weeks (1 Month)</option>
                        <option value={12}>Next 12 Weeks (3 Months)</option>
                        <option value={52}>Next 52 Weeks (1 Full Year)</option>
                      </select>
                    </div>

                    <div className="bg-[#5B8C5B]/10 p-2.5 rounded-xl border border-[#5B8C5B]/30 text-[11px] text-[#5B8C5B] font-medium flex items-start gap-1.5">
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Automatic Reusable Mandir QR Code</strong>: All weekly recurring sessions for this day share the exact same QR code reference automatically.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-[#3A322C] mb-1">Event Date</label>
                    <input
                      type="date"
                      value={eventForm.event_date}
                      onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs font-semibold"
                    />
                  </div>
                )}

                <div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 mb-1">
                    <label className="block text-xs font-semibold text-[#3A322C]">Start & End Time (IST)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const live = getLiveEventTimes();
                        setEventForm(prev => ({
                          ...prev,
                          event_date: live.todayStr,
                          start_time: live.startHHMM,
                          end_time: live.endHHMM
                        }));
                      }}
                      className="text-[11px] text-[#E8A33D] font-semibold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Clock className="w-3 h-3" /> Reset to Current Live Clock
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="w-full">
                      <label className="block text-[11px] text-[#3A322C]/70 mb-0.5">Start Time (IST)</label>
                      <input
                        type="time"
                        value={eventForm.start_time}
                        onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs font-semibold"
                      />
                    </div>
                    <div className="w-full">
                      <label className="block text-[11px] text-[#3A322C]/70 mb-0.5">End Time (IST)</label>
                      <input
                        type="time"
                        value={eventForm.end_time}
                        onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#3A322C]">Select Sabha Venue</label>
                <div className="space-y-2">
                  {venues.map(v => (
                    <div
                      key={v.id}
                      onClick={() => setEventForm({ ...eventForm, venue_id: v.id })}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        eventForm.venue_id === v.id
                          ? 'border-[#8B3A3A] bg-[#8B3A3A]/5 font-bold shadow-2xs'
                          : 'border-[#EFE7DA] bg-[#FDFBF7] hover:bg-[#EFE7DA]/50'
                      }`}
                    >
                      <div className="text-xs text-[#3A322C] font-semibold">{v.name}</div>
                      <div className="text-[11px] text-[#3A322C]/60">{v.address || 'Central Sabha Location'} • Geofence Radius: {v.radius_meters}m</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-3 bg-[#FDFBF7] p-4 rounded-xl border border-[#EFE7DA] text-xs">
                <div className="font-bold text-[#8B3A3A] text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#E8A33D]" /> Summary & Final Confirmation
                </div>
                <div>Title: <strong>{eventForm.title}</strong></div>
                <div>Category: <strong>{eventForm.event_type === 'recurring' ? 'Recurring Weekly Sabha' : 'One-Time Special Event'}</strong></div>
                {eventForm.event_type === 'recurring' ? (
                  <div>Schedule: <strong>Every {eventForm.day_of_week.toUpperCase()} for next {eventForm.recurring_weeks} weeks</strong></div>
                ) : (
                  <div>Date: <strong>{eventForm.event_date}</strong></div>
                )}
                <div>Time Slot: <strong>{eventForm.start_time} - {eventForm.end_time} IST</strong></div>
                <div>Venue: <strong>{venues.find(v => v.id === eventForm.venue_id)?.name || 'Central Sabha Mandir'}</strong></div>
                <div>QR Code Mode: <strong>{eventForm.event_type === 'recurring' ? 'Automatic Permanent Reusable QR' : 'Automatic Fresh Per-Event QR'}</strong></div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-[#EFE7DA]">
              {wizardStep === 1 ? (
                <button
                  type="button"
                  onClick={() => { setShowWizard(false); setWizardStep(1); }}
                  className="px-4 py-2 text-xs font-semibold text-[#C1554A] hover:bg-[#C1554A]/10 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setWizardStep(s => s - 1)}
                  className="px-4 py-2 text-xs font-semibold text-[#3A322C] hover:bg-[#FDFBF7] border border-[#EFE7DA] rounded-xl cursor-pointer"
                >
                  Back
                </button>
              )}

              {wizardStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (wizardStep === 2 && !eventForm.venue_id && venues.length > 0) {
                      setEventForm(prev => ({ ...prev, venue_id: venues[0].id }));
                    }
                    setWizardStep(s => s + 1);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#8B3A3A] hover:bg-[#6E2C2C] rounded-xl cursor-pointer"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePublishEvents}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#5B8C5B] hover:bg-[#4A734A] rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Publish Event(s) Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE / DOWNLOADABLE QR POSTER DISPLAY MODAL */}
      {qrModalData && (
        <div className="fixed inset-0 z-50 bg-[#3A322C]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center warm-shadow border border-[#EFE7DA] relative space-y-3">
            
            <button
              onClick={() => setQrModalData(null)}
              className="absolute top-4 right-4 text-[#3A322C]/50 hover:text-[#8B3A3A] font-bold text-lg cursor-pointer"
            >
              ✕
            </button>

            {/* Portal-Matched Layout Header */}
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] bg-[#8B3A3A]/15 text-[#8B3A3A] font-bold uppercase tracking-wider mb-1">
                Sabha QR Poster Display
              </span>
              <h3 className="font-serif-accent text-2xl font-bold text-[#8B3A3A]">
                {qrModalData.event_title}
              </h3>
              <p className="text-xs text-[#3A322C]/70 flex items-center justify-center gap-1 mt-1">
                <Calendar className="w-3.5 h-3.5 text-[#8B3A3A]" />
                <span>{qrModalData.event_date} ({qrModalData.start_time || 'Live'} IST)</span>
              </p>
            </div>
            
            {/* QR Card Preview Container */}
            <div className="p-4 bg-[#FDFBF7] rounded-2xl border border-[#EFE7DA] flex flex-col items-center justify-center space-y-3">
              <div className="bg-white p-3 rounded-xl border border-[#EFE7DA] shadow-xs">
                <img src={qrModalData.qr_image_base64} alt="Sabha QR Code" className="w-56 h-56 rounded-lg" />
              </div>
              <p className="text-xs font-semibold text-[#3A322C]">
                Scan inside Mandir boundary to mark attendance
              </p>
              <p className="text-[11px] font-mono text-[#8B3A3A] bg-[#8B3A3A]/10 px-3 py-1 rounded-full">
                REF: {qrModalData.qr_code_reference}
              </p>
            </div>

            {/* Two Action Buttons: PNG Image and Print Layout */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => downloadQRPosterAsImage(qrModalData)}
                className="py-2.5 px-3 rounded-xl bg-[#8B3A3A] hover:bg-[#6E2C2C] text-white font-semibold text-xs cursor-pointer shadow-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" /> PNG Image
              </button>

              <button
                type="button"
                onClick={() => handlePrintPoster(qrModalData)}
                className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#EFE7DA] text-[#8B3A3A] border border-[#8B3A3A] font-semibold text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <Printer className="w-4 h-4" /> Print Layout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ATTENDANCE MODAL */}
      {editingAttendance && (
        <div className="fixed inset-0 z-50 bg-[#3A322C]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 warm-shadow border border-[#EFE7DA]">
            <h3 className="font-serif-accent text-xl font-bold text-[#8B3A3A] mb-2">
              Edit Attendance Record & Audit Log
            </h3>
            <p className="text-xs text-[#3A322C]/70 mb-4">
              Correction for <strong>{editingAttendance.user_name}</strong> on {editingAttendance.event_date}
            </p>

            <form onSubmit={handleSaveAttendanceEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#3A322C] mb-1">New Status</label>
                <select
                  value={editNewStatus}
                  onChange={(e) => setEditNewStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7]"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="excused">Excused</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#3A322C] mb-1">Mandatory Reason for Audit Log</label>
                <textarea
                  required
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Member phone battery died during sabha, verified by Karyakar"
                  className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] h-20"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingAttendance(null)}
                  className="px-4 py-2 font-semibold text-[#3A322C]/70 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-[#8B3A3A] hover:bg-[#6E2C2C] rounded-xl"
                >
                  Save Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Self Attendance Scanner */}
      {showSelfScanner && (
        <QRScannerModal
          onClose={() => setShowSelfScanner(false)}
          onScanSuccess={async (qrRef, lat, lng) => {
            setShowSelfScanner(false);
            try {
              await apiFetch('/attendance/scan', {
                method: 'POST',
                body: JSON.stringify({ qr_code_reference: qrRef, latitude: lat, longitude: lng })
              });
              showToast("Admin self attendance marked present!");
              loadAdminData();
              if (onUserUpdated) onUserUpdated();
            } catch (err) { alert(err.message); }
          }}
          activeEvent={activeEvent}
        />
      )}

      {/* MEMBER LOYALTY & HEALTH TIER BREAKDOWN MODAL */}
      {selectedHealthModal && (() => {
        const members = allUsers.filter(u => {
          if (selectedHealthModal.type === 'super_active') return (u.current_streak || 0) >= 3;
          if (selectedHealthModal.type === 'regular') return (u.current_streak || 0) >= 1 && (u.current_streak || 0) < 3;
          if (selectedHealthModal.type === 'at_risk') return (u.current_streak || 0) === 0;
          return true;
        }).filter(u => {
          const q = healthSearchQuery.toLowerCase().trim();
          if (!q) return true;
          return (
            u.name.toLowerCase().includes(q) ||
            u.phone.includes(q) ||
            (u.member_category || '').toLowerCase().includes(q) ||
            (u.role || '').toLowerCase().includes(q)
          );
        });

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-2xl w-full space-y-4 warm-shadow max-h-[90vh] flex flex-col justify-between">
              <div className="flex justify-between items-center border-b border-[#EFE7DA] pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#8B3A3A]" />
                  <div>
                    <h3 className="font-serif-accent text-xl font-bold text-[#8B3A3A]">
                      {selectedHealthModal.title}
                    </h3>
                    <p className="text-xs text-[#3A322C]/60 font-medium">
                      Showing {members.length} member(s) registered under this engagement tier
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedHealthModal(null); setHealthSearchQuery(''); }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Filter input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#3A322C]/40 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search members by name, phone number, category, or role..."
                  value={healthSearchQuery}
                  onChange={(e) => setHealthSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#8B3A3A]"
                />
              </div>

              {/* Member list Cards */}
              <div className="overflow-y-auto max-h-[50vh] space-y-2 pr-1">
                {members.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#3A322C]/60 italic">
                    No members found in this streak tier matching your search query.
                  </div>
                ) : (
                  members.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] flex items-center justify-between gap-3 hover:border-[#8B3A3A]/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#8B3A3A]/10 text-[#8B3A3A] font-bold text-xs flex items-center justify-center font-serif-accent">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h5 className="font-bold text-sm text-[#3A322C]">{m.name}</h5>
                          <p className="text-xs text-[#3A322C]/70 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#8B3A3A]" />
                            <span>{m.phone} • Category: <span className="font-semibold text-[#8B3A3A]">{m.member_category || 'Satsangi'}</span></span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E8A33D]/15 text-[#D98A2B]">
                          <Flame className="w-3.5 h-3.5 fill-current" /> {m.current_streak || 0} Streak
                        </span>
                        <p className="text-[10px] text-[#3A322C]/60 mt-0.5">
                          Lifetime: {m.total_attendance_count || 0} sabhas
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-[#EFE7DA]">
                <button
                  onClick={() => { setSelectedHealthModal(null); setHealthSearchQuery(''); }}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#8B3A3A] hover:bg-[#6E2C2C] rounded-xl shadow-md cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🔔 FLOATING ACTION STATUS BAR BANNER */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] animate-in fade-in slide-in-from-top-4 duration-300 w-[92%] max-w-md pointer-events-auto">
          <div className={`px-5 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-md ${
            toast.toLowerCase().includes('delete') || toast.toLowerCase().includes('reject') || toast.toLowerCase().includes('cancel') || toast.toLowerCase().includes('remove')
              ? 'bg-[#C1554A] text-white border-white/20 warm-shadow'
              : toast.toLowerCase().includes('error') || toast.toLowerCase().includes('failed')
              ? 'bg-[#8B3A3A] text-white border-white/20 warm-shadow'
              : 'bg-[#15803D] text-white border-white/20 warm-shadow'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              {toast.toLowerCase().includes('delete') || toast.toLowerCase().includes('reject') || toast.toLowerCase().includes('remove') ? (
                <Trash2 className="w-5 h-5 text-white/90 shrink-0" />
              ) : toast.toLowerCase().includes('error') || toast.toLowerCase().includes('failed') ? (
                <AlertCircle className="w-5 h-5 text-white/90 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-white/90 shrink-0" />
              )}
              <span className="truncate">{toast}</span>
            </div>
            <button
              onClick={() => setToast('')}
              className="text-white/80 hover:text-white cursor-pointer p-1 rounded-full hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
