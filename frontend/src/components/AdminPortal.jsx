import React, { useState, useEffect } from 'react';
import {
  Shield, Users, MapPin, Calendar, QrCode, FileSpreadsheet, FileText,
  UserCheck, UserX, Plus, CheckCircle2, AlertCircle, Edit, History,
  Lock, RefreshCw, Download, Layers, Award, Trash2, ChevronDown, Filter, X, Sparkles, Clock, Link2, Search, User, Check, XCircle, Printer
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
  ctx.fillText('BAPS SABHA ATTENDANCE', 400, 105);

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
            <h1>BAPS SABHA ATTENDANCE SYSTEM</h1>
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
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // User Management Search & Filter State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Master Attendance Log Grid State
  const [masterLogViewMode, setMasterLogViewMode] = useState('events');
  const [selectedDetailModal, setSelectedDetailModal] = useState(null);
  const [masterSearchQuery, setMasterSearchQuery] = useState('');

  // Event Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  const initialLive = getLiveEventTimes();

  const [eventForm, setEventForm] = useState({
    title: `${initialLive.dayName} Sabha`,
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

  // Admin Self Scanner
  const [showSelfScanner, setShowSelfScanner] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [evList, venList, pendList, usrList, attList] = await Promise.all([
        apiFetch('/events'),
        apiFetch('/venues'),
        apiFetch('/users/pending'),
        apiFetch('/users?status=approved'),
        apiFetch('/attendance/history')
      ]);

      setEvents(evList);
      setVenues(venList);
      setPendingUsers(pendList);
      setAllUsers(usrList);
      setAttendanceRecords(attList);

      if (venList.length > 0 && !eventForm.venue_id) {
        setEventForm(prev => ({ ...prev, venue_id: venList[0].id }));
      }
    } catch (err) {
      console.error("Admin data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWizard = () => {
    const live = getLiveEventTimes();
    setEventForm(prev => ({
      ...prev,
      title: `${live.dayName} Sabha`,
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

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl warm-shadow border border-[#EFE7DA]">
              <div className="text-xs text-[#3A322C]/70 font-semibold mb-1">Total Active Members</div>
              <div className="font-serif-accent text-3xl font-bold text-[#8B3A3A]">{allUsers.length}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl warm-shadow border border-[#EFE7DA]">
              <div className="text-xs text-[#3A322C]/70 font-semibold mb-1">Total Venues Configured</div>
              <div className="font-serif-accent text-3xl font-bold text-[#5B8C5B]">{venues.length}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl warm-shadow border border-[#EFE7DA]">
              <div className="text-xs text-[#3A322C]/70 font-semibold mb-1">Total Historical Scans</div>
              <div className="font-serif-accent text-3xl font-bold text-[#3A322C]">{attendanceRecords.length}</div>
            </div>
          </div>

          {activeEvent && (
            <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#5B8C5B]/15 text-[#5B8C5B] font-bold uppercase tracking-wider">
                  Active Event Status: {activeEvent.status.toUpperCase()}
                </span>
                <h3 className="font-serif-accent text-2xl font-bold text-[#8B3A3A] mt-1">
                  {activeEvent.title}
                </h3>
                <p className="text-xs text-[#3A322C]/70">
                  {activeEvent.event_date} ({activeEvent.start_time} - {activeEvent.end_time} IST) • QR Ref: {activeEvent.qr_code_reference}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => setSelectedDetailModal({ type: 'event', data: activeEvent })}
                  className="bg-[#5B8C5B] hover:bg-[#4A734A] text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                >
                  <UserCheck className="w-4 h-4" /> Live Attendance & Override
                </button>

                <button
                  onClick={() => handleViewQR(activeEvent.id)}
                  className="bg-[#FDFBF7] hover:bg-[#EFE7DA] text-[#8B3A3A] font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-[#EFE7DA] flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                >
                  <QrCode className="w-4 h-4" /> View QR Code
                </button>
                {activeEvent.status === 'open' && (
                  <button
                    onClick={() => handleCloseEvent(activeEvent.id)}
                    className="bg-[#C1554A] hover:bg-[#A8453B] text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                  >
                    <Lock className="w-4 h-4" /> Close Attendance (Auto-Absent)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EVENTS & QR CODES */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-6 rounded-2xl warm-shadow border border-[#EFE7DA]">
            <div>
              <h3 className="font-serif-accent text-2xl font-bold text-[#8B3A3A]">
                Sabha Event Master Schedule
              </h3>
              <p className="text-xs text-[#3A322C]/70">
                Organized into active/scheduled sabhas and past closed sessions
              </p>
            </div>
            <button
              onClick={handleOpenWizard}
              className="bg-[#8B3A3A] hover:bg-[#6E2C2C] text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Launch Creation Wizard
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA] space-y-4">
            <div className="flex items-center gap-2 border-b border-[#EFE7DA] pb-3">
              <Sparkles className="w-5 h-5 text-[#5B8C5B]" />
              <h4 className="font-serif-accent text-xl font-bold text-[#8B3A3A]">
                Active & Scheduled Events ({openEvents.length})
              </h4>
            </div>

            {openEvents.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#3A322C]/60 italic">
                No active or scheduled events currently open. Launch the wizard above to create one!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {openEvents.map((ev, index) => (
                  <div
                    key={ev.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      index === 0
                        ? 'border-[#5B8C5B] bg-[#5B8C5B]/5 warm-shadow'
                        : 'border-[#EFE7DA] bg-[#FDFBF7]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        {index === 0 && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] bg-[#5B8C5B] text-white font-bold uppercase tracking-wider mb-1">
                            PRIMARY LIVE EVENT
                          </span>
                        )}
                        <h5 className="font-bold text-base text-[#3A322C]">{ev.title}</h5>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#5B8C5B]/15 text-[#5B8C5B] font-bold uppercase shrink-0">
                        {ev.status}
                      </span>
                    </div>

                    <div className="text-xs text-[#3A322C]/80 space-y-1 mb-4">
                      <div className="font-medium flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#8B3A3A]" />
                        <span>Date: {ev.event_date} ({ev.start_time} - {ev.end_time} IST)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#8B3A3A]" />
                        <span>Venue: {ev.venue_name || 'Central Mandir'} ({ev.venue_radius_meters}m radius)</span>
                      </div>
                      <div className="text-[11px] text-[#8B3A3A] font-semibold">QR Mode: {ev.qr_mode} • Ref: {ev.qr_code_reference}</div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#EFE7DA]">
                      <button
                        onClick={() => setSelectedDetailModal({ type: 'event', data: ev })}
                        className="w-full bg-[#5B8C5B] hover:bg-[#4A734A] text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Live Attendance
                      </button>

                      <button
                        onClick={() => handleViewQR(ev.id)}
                        className="w-full bg-white hover:bg-[#EFE7DA] text-[#8B3A3A] border border-[#EFE7DA] font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Printable QR
                      </button>

                      <button
                        onClick={() => handleCloseEvent(ev.id)}
                        className="w-full bg-[#C1554A] hover:bg-[#A8453B] text-white font-semibold text-xs py-2.5 rounded-xl cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" /> Close Sabha
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PAST & COMPLETED EVENTS HISTORY WITH EVENT-SPECIFIC REPORT EXPORTS */}
          <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA] space-y-4">
            <div className="flex items-center gap-2 border-b border-[#EFE7DA] pb-3">
              <History className="w-5 h-5 text-[#3A322C]/60" />
              <h4 className="font-serif-accent text-xl font-bold text-[#8B3A3A]">
                Past & Completed Events History ({closedEvents.length})
              </h4>
            </div>

            {closedEvents.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#3A322C]/60 italic">
                No past closed events found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {closedEvents.map((ev) => (
                  <div key={ev.id} className="p-4 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#3A322C]">{ev.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#C1554A]/15 text-[#C1554A] font-bold uppercase">
                          CLOSED
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
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-[#EFE7DA]">
                      <div className="text-[10px] font-bold uppercase text-[#8B3A3A] tracking-wider">
                        Download Event Report:
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
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
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-[#3A322C] flex items-center gap-2">
                        <span>{v.name}</span>
                        {editingVenueId === v.id && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] bg-[#8B3A3A] text-white font-bold uppercase">
                            EDITING NOW
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#3A322C]/70 mt-0.5">{v.address}</div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
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
                                        new Date(r.timestamp_utc).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST'
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
                                new Date(r.timestamp_utc).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST'
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
        <div className="fixed inset-0 z-50 bg-[#3A322C]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 warm-shadow border border-[#EFE7DA] space-y-4 relative">
            <button
              onClick={() => { setShowWizard(false); setWizardStep(1); }}
              className="absolute top-4 right-4 text-[#3A322C]/50 hover:text-[#8B3A3A] cursor-pointer p-1"
              title="Close Wizard"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif-accent text-2xl font-bold text-[#8B3A3A]">
              Event Creation Wizard (Step {wizardStep} of 4)
            </h3>

            {wizardStep === 1 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3A322C] mb-1">Sabha Title</label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3A322C] mb-1">Event Date</label>
                  <input
                    type="date"
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
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
                  <div className="flex gap-2">
                    <div className="w-1/2">
                      <label className="block text-[11px] text-[#3A322C]/70 mb-0.5">Start Time (IST)</label>
                      <input
                        type="time"
                        value={eventForm.start_time}
                        onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs font-semibold"
                      />
                    </div>
                    <div className="w-1/2">
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

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="recSat"
                    checked={eventForm.is_recurring_saturday}
                    onChange={(e) => setEventForm({ ...eventForm, is_recurring_saturday: e.target.checked })}
                    className="accent-[#8B3A3A]"
                  />
                  <label htmlFor="recSat" className="text-xs font-medium text-[#3A322C]">
                    Create Recurring Saturday Events automatically
                  </label>
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
                      className={`p-3 rounded-xl border cursor-pointer ${
                        eventForm.venue_id === v.id
                          ? 'border-[#8B3A3A] bg-[#8B3A3A]/5 font-bold'
                          : 'border-[#EFE7DA] bg-[#FDFBF7]'
                      }`}
                    >
                      <div className="text-xs text-[#3A322C]">{v.name} ({v.radius_meters}m geofence radius)</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#3A322C]">Select QR Code Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setEventForm({ ...eventForm, qr_mode: 'reusable' })}
                    className={`p-4 rounded-xl border cursor-pointer ${
                      eventForm.qr_mode === 'reusable'
                        ? 'border-[#8B3A3A] bg-[#8B3A3A]/5 font-bold'
                        : 'border-[#EFE7DA] bg-[#FDFBF7]'
                    }`}
                  >
                    <div className="text-xs text-[#8B3A3A]">Reusable QR</div>
                    <div className="text-[11px] font-normal text-[#3A322C]/70 mt-1">
                      Tied to venue poster indefinitely
                    </div>
                  </div>

                  <div
                    onClick={() => setEventForm({ ...eventForm, qr_mode: 'per_event' })}
                    className={`p-4 rounded-xl border cursor-pointer ${
                      eventForm.qr_mode === 'per_event'
                        ? 'border-[#8B3A3A] bg-[#8B3A3A]/5 font-bold'
                        : 'border-[#EFE7DA] bg-[#FDFBF7]'
                    }`}
                  >
                    <div className="text-xs text-[#8B3A3A]">Per-Event Fresh QR</div>
                    <div className="text-[11px] font-normal text-[#3A322C]/70 mt-1">
                      Unique QR code generated for this specific date only
                    </div>
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="space-y-2 bg-[#FDFBF7] p-4 rounded-xl border border-[#EFE7DA] text-xs">
                <div className="font-bold text-[#8B3A3A] text-sm">Summary Confirmation</div>
                <div>Title: <strong>{eventForm.title}</strong></div>
                <div>Date: <strong>{eventForm.event_date}</strong> ({eventForm.start_time} - {eventForm.end_time} IST)</div>
                <div>QR Mode: <strong>{eventForm.qr_mode}</strong></div>
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

              {wizardStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(s => s + 1)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#8B3A3A] hover:bg-[#6E2C2C] rounded-xl cursor-pointer"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePublishEvents}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#5B8C5B] hover:bg-[#4A734A] rounded-xl cursor-pointer shadow-sm"
                >
                  Publish Event Now
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

    </div>
  );
}
