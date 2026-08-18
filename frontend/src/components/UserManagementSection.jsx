import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Pencil, CheckCircle2, AlertCircle, Eye, EyeOff, Lock, User, Phone, Mail, Calendar, Shield, Sparkles, X, Trash2, UploadCloud, FileSpreadsheet, Download, Cake, MapPin, Briefcase, GraduationCap, UserCheck } from 'lucide-react';
import { apiFetch } from '../api';

export default function UserManagementSection({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Sorting state
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  // Notification status
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleApproveUser = async (user) => {
    try {
      await apiFetch(`/users/${user.id}/approve`, { method: 'POST' });
      setSuccess(`Account for "${user.name}" approved successfully!`);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to approve user.');
    }
  };

  const handleRejectUser = async (user) => {
    if (!window.confirm(`Are you sure you want to reject and remove registration for "${user.name}"?`)) return;
    try {
      await apiFetch(`/users/${user.id}/reject`, { method: 'POST' });
      setSuccess(`User registration for "${user.name}" rejected.`);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to reject user.');
    }
  };

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // Bulk Import state
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkPreviewData, setBulkPreviewData] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);

  // Add / Edit Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dob: '',
    password: '',
    member_category: 'satsangi',
    role: 'yuvak',
    area: '',
    is_working: '',
    is_studying: '',
    occupation: '',
    company_name: '',
    education_stream: '',
    study_details: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/users');
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBulkModal = () => {
    setBulkFile(null);
    setBulkPreviewData([]);
    setError('');
    setSuccess('');
    setIsBulkModalOpen(true);
  };

  const handleDownloadSampleCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Full Name,Mobile Number,Birthdate,Area,Working?,Studying?,Occupation(if working),Company Name,Stream of Education,Study Details\n" +
      "Virang Chauhan,9987988560,1984-12-07,Ashok Nagar,Yes,No,Information Technology,Tata Consultancy Services,Science (Engineering),Master of Computer Application\n" +
      "Jethva Jaimin,7045367083,1998-08-08,Hanuman Nagar,Yes,No,Cashier,Reliance,Others,12Pass\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sabha_members_google_form_responses.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileSelected = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        alert("The uploaded CSV file is empty or missing headers.");
        return;
      }

      const parseCSVLine = (line) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let char of line) {
          if (char === '"') { inQuotes = !inQuotes; }
          else if (char === ',' && !inQuotes) { result.push(cur.trim()); cur = ''; }
          else { cur += char; }
        }
        result.push(cur.trim());
        return result;
      };

      const headerRow = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      
      const nameIdx = headerRow.findIndex(h => h.includes('name') || h.includes('fullname'));
      const phoneIdx = headerRow.findIndex(h => h.includes('mobile') || h.includes('phone') || h.includes('number'));
      const dobIdx = headerRow.findIndex(h => h.includes('birth') || h.includes('dob') || h.includes('date'));
      const areaIdx = headerRow.findIndex(h => h.includes('area'));
      const workingIdx = headerRow.findIndex(h => h.includes('working'));
      const studyingIdx = headerRow.findIndex(h => h.includes('studying'));
      const occIdx = headerRow.findIndex(h => h.includes('occupation'));
      const compIdx = headerRow.findIndex(h => h.includes('company'));
      const streamIdx = headerRow.findIndex(h => h.includes('stream') || h.includes('education'));
      const detailsIdx = headerRow.findIndex(h => h.includes('study') || h.includes('details') || h.includes('standard') || h.includes('degree'));
      const emailIdx = headerRow.findIndex(h => h.includes('email'));
      const catIdx = headerRow.findIndex(h => h.includes('category'));

      const parsedUsers = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.length < 2) continue;

        const name = nameIdx !== -1 ? cols[nameIdx] : cols[0] || '';
        let phone = phoneIdx !== -1 ? cols[phoneIdx] : cols[1] || '';
        phone = phone.replace(/\D/g, '');
        if (phone.length > 10) phone = phone.slice(-10);

        if (!name || phone.length < 10) continue;

        const dob = dobIdx !== -1 ? cols[dobIdx] : '';
        const area = areaIdx !== -1 ? cols[areaIdx] : '';
        const is_working = workingIdx !== -1 ? cols[workingIdx] : '';
        const is_studying = studyingIdx !== -1 ? cols[studyingIdx] : '';
        const occupation = occIdx !== -1 ? cols[occIdx] : '';
        const company_name = compIdx !== -1 ? cols[compIdx] : '';
        const education_stream = streamIdx !== -1 ? cols[streamIdx] : '';
        const study_details = detailsIdx !== -1 ? cols[detailsIdx] : '';
        const email = emailIdx !== -1 ? cols[emailIdx] : '';
        const cat = catIdx !== -1 ? cols[catIdx].toLowerCase() : 'satsangi';

        parsedUsers.push({
          name,
          phone,
          email: email || null,
          dob: dob || null,
          area: area || null,
          is_working: is_working || null,
          is_studying: is_studying || null,
          occupation: occupation || null,
          company_name: company_name || null,
          education_stream: education_stream || null,
          study_details: study_details || null,
          member_category: (cat === 'b2y' || cat === 'bty') ? 'b2y' : (cat === 'gunbhavi' || cat === 'goon_bhavi' || cat === 'bhavi') ? 'gunbhavi' : 'satsangi',
          role: 'yuvak',
          password: null
        });
      }

      setBulkPreviewData(parsedUsers);
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = async () => {
    if (!bulkPreviewData || bulkPreviewData.length === 0) return;
    setBulkUploading(true);
    setError('');
    setSuccess('');

    try {
      const res = await apiFetch('/users/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ users: bulkPreviewData })
      });

      setSuccess(`Successfully imported ${res.created_count} members! (${res.skipped_count} skipped/duplicate phone numbers)`);
      setIsBulkModalOpen(false);
      setBulkPreviewData([]);
      setBulkFile(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkUploading(false);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      dob: '',
      password: '',
      member_category: 'satsangi',
      role: 'yuvak',
      area: '',
      is_working: '',
      is_studying: '',
      occupation: '',
      company_name: '',
      education_stream: '',
      study_details: ''
    });
    setError('');
    setSuccess('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      dob: user.dob || '',
      password: '',
      member_category: user.member_category || 'satsangi',
      role: user.role || 'yuvak',
      area: user.area || '',
      is_working: user.is_working || '',
      is_studying: user.is_studying || '',
      occupation: user.occupation || '',
      company_name: user.company_name || '',
      education_stream: user.education_stream || '',
      study_details: user.study_details || ''
    });
    setError('');
    setSuccess('');
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    const finalPassword = formData.password.trim() || formData.phone;

    setActionLoading(true);

    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          password: finalPassword
        })
      });
      setSuccess(`Successfully created member account for ${formData.name}!`);
      setIsAddModalOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setError('');
    setSuccess('');

    if (formData.phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    setActionLoading(true);

    const payload = {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      dob: formData.dob,
      member_category: formData.member_category,
      role: formData.role,
      area: formData.area,
      is_working: formData.is_working,
      is_studying: formData.is_studying,
      occupation: formData.occupation,
      company_name: formData.company_name,
      education_stream: formData.education_stream,
      study_details: formData.study_details
    };

    if (formData.password && formData.password.trim()) {
      payload.password = formData.password;
    }

    try {
      await apiFetch(`/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setSuccess(`Successfully updated member profile for ${formData.name}!`);
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtering and Sorting
  const filteredUsers = users
    .filter(u => {
      const matchesSearch = 
        (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.phone && u.phone.includes(searchQuery)) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      const userCat = (u.member_category || 'satsangi').toLowerCase();
      const matchesCategory = categoryFilter === 'all' || 
        (categoryFilter === 'b2y' ? ['b2y', 'bty'].includes(userCat) :
         categoryFilter === 'gunbhavi' ? ['gunbhavi', 'goon_bhavi', 'bhavi'].includes(userCat) :
         userCat === categoryFilter);

      return matchesSearch && matchesRole && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      let res = 0;
      if (sortField === 'name') {
        res = (a.name || '').localeCompare(b.name || '');
      } else if (sortField === 'phone') {
        res = (a.phone || '').localeCompare(b.phone || '');
      } else if (sortField === 'dob') {
        res = (a.dob || '').localeCompare(b.dob || '');
      } else if (sortField === 'category') {
        res = (a.member_category || '').localeCompare(b.member_category || '');
      } else if (sortField === 'role') {
        res = (a.role || '').localeCompare(b.role || '');
      } else if (sortField === 'streak') {
        res = (a.current_streak || 0) - (b.current_streak || 0);
        if (res === 0) res = (a.lifetime_count || 0) - (b.lifetime_count || 0);
      }
      return sortDirection === 'asc' ? res : -res;
    });

  const handleToggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortHeader = (label, field, className = 'p-3') => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => handleToggleSort(field)}
        className={`${className} cursor-pointer hover:bg-[#EFE7DA]/70 transition-colors select-none group`}
        title={`Click to sort by ${label} (${isActive && sortDirection === 'asc' ? 'Descending' : 'Ascending'})`}
      >
        <div className="flex items-center gap-1.5">
          <span className={isActive ? 'text-[#8B3A3A] font-extrabold' : 'text-[#8B3A3A]'}>
            {label}
          </span>
          <div className="flex flex-col text-[7px] leading-[6px] transition-colors">
            <span className={isActive && sortDirection === 'asc' ? 'text-[#8B3A3A] font-black' : 'text-[#3A322C]/30 group-hover:text-[#8B3A3A]/70'}>
              ▲
            </span>
            <span className={isActive && sortDirection === 'desc' ? 'text-[#8B3A3A] font-black' : 'text-[#3A322C]/30 group-hover:text-[#8B3A3A]/70'}>
              ▼
            </span>
          </div>
        </div>
      </th>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-6 warm-shadow border border-[#EFE7DA] my-8 animate-in fade-in duration-200">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif-accent text-xl font-bold text-[#8B3A3A] flex items-center gap-2">
            User Account & Member Management
            <span className="text-xs bg-[#8B3A3A]/10 text-[#8B3A3A] px-2.5 py-0.5 rounded-full font-sans">
              {users.length} members
            </span>
          </h2>
          <p className="text-xs text-[#3A322C]/70 mt-0.5">
            Search members, assign Satsangi / Gunbhavi status, update details, or manage roles
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenBulkModal}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-[#5B8C5B] hover:bg-[#4A734A] text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Bulk Import CSV/Excel</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-[#E8A33D] hover:bg-[#D98A2B] text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add New Member</span>
          </button>
        </div>
      </div>

      {/* 🔔 FLOATING ACTION STATUS BAR BANNER */}
      {error && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] animate-in fade-in slide-in-from-top-4 duration-300 w-[92%] max-w-md pointer-events-auto">
          <div className="px-5 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border text-xs sm:text-sm font-semibold tracking-wide bg-[#C1554A] text-white border-white/20 warm-shadow">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-5 h-5 text-white/90 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-white/80 hover:text-white cursor-pointer p-1 rounded-full hover:bg-white/10 transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {success && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] animate-in fade-in slide-in-from-top-4 duration-300 w-[92%] max-w-md pointer-events-auto">
          <div className="px-5 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border text-xs sm:text-sm font-semibold tracking-wide bg-[#15803D] text-white border-white/20 warm-shadow">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-white/90 shrink-0" />
              <span className="truncate">{success}</span>
            </div>
            <button onClick={() => setSuccess('')} className="text-white/80 hover:text-white cursor-pointer p-1 rounded-full hover:bg-white/10 transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#3A322C]/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
          >
            <option value="all">All Account Statuses</option>
            <option value="pending">Pending Approval ({users.filter(u => u.status === 'pending').length})</option>
            <option value="approved">Approved Members ({users.filter(u => u.status === 'approved').length})</option>
          </select>
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
          >
            <option value="all">All Roles ({users.length})</option>
            <option value="yuvak">Yuvak ({users.filter(u => u.role === 'yuvak' || u.role === 'user').length})</option>
            <option value="karyakar">Karyakar ({users.filter(u => u.role === 'karyakar').length})</option>
            <option value="admin">Admin ({users.filter(u => u.role === 'admin').length})</option>
          </select>
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
          >
            <option value="all">All Categories</option>
            <option value="satsangi">Satsangi ({users.filter(u => (u.member_category || 'satsangi').toLowerCase() === 'satsangi').length})</option>
            <option value="gunbhavi">Gunbhavi ({users.filter(u => ['gunbhavi', 'goon_bhavi', 'bhavi'].includes((u.member_category || '').toLowerCase())).length})</option>
            <option value="b2y">B2Y ({users.filter(u => ['b2y', 'bty'].includes((u.member_category || '').toLowerCase())).length})</option>
          </select>
        </div>
      </div>

      {/* Mobile Responsive Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#3A322C]/60">Loading members...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#3A322C]/60">No members match the selected criteria.</div>
      ) : (() => {
        const totalPages = Math.ceil(filteredUsers.length / rowsPerPage) || 1;
        const validPage = Math.min(currentPage, totalPages);
        const startIndex = (validPage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, filteredUsers.length);
        const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

        return (
          <div className="space-y-3">
            <div className="overflow-x-auto border border-[#EFE7DA] rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FDFBF7] border-b border-[#EFE7DA] text-[#8B3A3A] font-semibold text-[11px] uppercase">
                    {renderSortHeader('MEMBER NAME', 'name')}
                    {renderSortHeader('PHONE', 'phone')}
                    {renderSortHeader('DATE OF BIRTH', 'dob')}
                    {renderSortHeader('CATEGORY', 'category')}
                    {renderSortHeader('ROLE', 'role')}
                    {renderSortHeader('STREAK / TOTAL', 'streak')}
                    <th className="p-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE7DA]">
                  {paginatedUsers.map((u) => {
                    const catVal = (u.member_category || 'satsangi').toLowerCase();
                    return (
                      <tr key={u.id} className="hover:bg-[#FDFBF7]/60 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-[#3A322C]">{u.name}</div>
                          {u.email && <div className="text-[11px] text-[#3A322C]/60 font-mono">{u.email}</div>}
                        </td>
                        <td className="p-3 font-mono text-[#3A322C]">{u.phone}</td>
                        <td className="p-3 font-mono">
                          {u.dob ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-[#8B3A3A] bg-[#8B3A3A]/10 px-2.5 py-0.5 rounded-full text-[11px]">
                              <Cake className="w-3 h-3 text-[#8B3A3A]" />
                              <span>{u.dob}</span>
                            </span>
                          ) : (
                            <span className="text-[#3A322C]/40 italic text-[11px]">Not Set</span>
                          )}
                        </td>
                        <td className="p-3">
                          {['b2y', 'bty'].includes(catVal) ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#8B3A3A]/10 text-[#8B3A3A] border border-[#8B3A3A]/20">
                              <Sparkles className="w-3 h-3" /> B2Y
                            </span>
                          ) : ['gunbhavi', 'goon_bhavi', 'bhavi'].includes(catVal) ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#2D8A8A]/10 text-[#2D8A8A] border border-[#2D8A8A]/20">
                              <Sparkles className="w-3 h-3" /> Gunbhavi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E8A33D]/10 text-[#D98A2B] border border-[#E8A33D]/30">
                              Satsangi
                            </span>
                          )}
                        </td>
                      <td className="p-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                          u.role === 'admin' ? 'bg-[#8B3A3A]/10 text-[#8B3A3A]' :
                          u.role === 'karyakar' ? 'bg-[#E8A33D]/10 text-[#E8A33D]' :
                          'bg-[#5B8C5B]/10 text-[#5B8C5B]'
                        }`}>
                          {u.role === 'user' ? 'yuvak' : u.role}
                        </span>
                      </td>
                      <td className="p-3 text-[#3A322C]/80">
                        <span className="font-semibold">{u.current_streak}</span> streak ({u.lifetime_count} total)
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.status === 'pending' && (
                            <button
                              onClick={() => handleApproveUser(u)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Approve Member Account"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#FDFBF7] hover:bg-[#8B3A3A] text-[#8B3A3A] hover:text-white border border-[#8B3A3A]/30 text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Edit User Details"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {currentUser?.id !== u.id && (
                            <button
                              onClick={() => setDeletingUser(u)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#FDFBF7] hover:bg-[#C1554A] text-[#C1554A] hover:text-white border border-[#C1554A]/30 text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                              title="Delete User Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FDFBF7] p-3 rounded-xl border border-[#EFE7DA] text-xs font-medium text-[#3A322C]/80">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-2 py-1 rounded-lg border border-[#EFE7DA] bg-white text-xs text-[#3A322C]"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>
                  Showing {startIndex + 1}–{endIndex} of {filteredUsers.length} members
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={validPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#EFE7DA] hover:bg-[#EFE7DA] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Previous
                </button>
                <span className="font-semibold text-[#8B3A3A]">
                  Page {validPage} of {totalPages}
                </span>
                <button
                  disabled={validPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#EFE7DA] hover:bg-[#EFE7DA] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-[#3A322C]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 warm-shadow border border-[#EFE7DA] text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#C1554A]/15 text-[#C1554A] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif-accent text-xl font-bold text-[#8B3A3A]">Delete Member Account?</h3>
              <p className="text-xs text-[#3A322C]/80 mt-1">
                Are you sure you want to permanently delete <strong>{deletingUser.name}</strong> ({deletingUser.phone})? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="flex-1 px-4 py-2 rounded-xl bg-[#FDFBF7] hover:bg-[#EFE7DA] text-[#3A322C] font-semibold text-xs border border-[#EFE7DA] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await apiFetch(`/users/${deletingUser.id}`, { method: 'DELETE' });
                    setSuccess(`Successfully deleted user account for ${deletingUser.name}!`);
                    setDeletingUser(null);
                    fetchUsers();
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 rounded-xl bg-[#C1554A] hover:bg-[#A8453B] text-white font-semibold text-xs cursor-pointer shadow-xs"
              >
                {actionLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: ADD NEW MEMBER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#3A322C]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 warm-shadow border border-[#EFE7DA] animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#EFE7DA]">
              <h3 className="font-serif-accent text-lg font-bold text-[#8B3A3A] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#8B3A3A]" />
                Add New Member Account
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#3A322C]/60 hover:text-[#8B3A3A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#3A322C] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#3A322C] mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => {
                      const newPhone = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData(prev => {
                        const shouldSync = !prev.password || prev.password === prev.phone;
                        return {
                          ...prev,
                          phone: newPhone,
                          password: shouldSync ? newPhone : prev.password
                        };
                      });
                    }}
                    placeholder="10-digit number"
                    className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#3A322C] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="name@domain.com"
                    className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#3A322C] mb-1">Date of Birth (DOB)</label>
                  <input
                    type="date"
                    value={formData.dob || ''}
                    onChange={(e) => setFormData({...formData, dob: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                  />
                </div>
              </div>

              {/* Extended Profile Details (Area, Work, Education) */}
              <div className="p-3 bg-[#FDFBF7] rounded-xl border border-[#EFE7DA] space-y-3">
                <div className="font-semibold text-xs text-[#8B3A3A] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#8B3A3A]" />
                  <span>Area, Work & Education Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#3A322C] mb-1">Residential Area</label>
                    <input
                      type="text"
                      value={formData.area || ''}
                      onChange={(e) => setFormData({...formData, area: e.target.value})}
                      placeholder="e.g. Ashok Nagar, Hanuman Nagar"
                      className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-white text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-[#3A322C] mb-1">Working?</label>
                      <select
                        value={formData.is_working || ''}
                        onChange={(e) => setFormData({...formData, is_working: e.target.value})}
                        className="w-full px-2.5 py-2 rounded-xl border border-[#EFE7DA] bg-white text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                      >
                        <option value="">-- Select --</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#3A322C] mb-1">Studying?</label>
                      <select
                        value={formData.is_studying || ''}
                        onChange={(e) => setFormData({...formData, is_studying: e.target.value})}
                        className="w-full px-2.5 py-2 rounded-xl border border-[#EFE7DA] bg-white text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                      >
                        <option value="">-- Select --</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#3A322C] mb-1">Occupation (if working)</label>
                    <input
                      type="text"
                      value={formData.occupation || ''}
                      onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                      placeholder="e.g. Information Technology"
                      className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-white text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#3A322C] mb-1">Company Name</label>
                    <input
                      type="text"
                      value={formData.company_name || ''}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      placeholder="e.g. TCS, Reliance"
                      className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-white text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#3A322C] mb-1">Stream of Education</label>
                    <input
                      type="text"
                      value={formData.education_stream || ''}
                      onChange={(e) => setFormData({...formData, education_stream: e.target.value})}
                      placeholder="e.g. Science, Commerce, Arts"
                      className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-white text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#3A322C] mb-1">Study Details / Degree</label>
                    <input
                      type="text"
                      value={formData.study_details || ''}
                      onChange={(e) => setFormData({...formData, study_details: e.target.value})}
                      placeholder="e.g. MCA, BMS, 12th Pass"
                      className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-white text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#3A322C] mb-1">Member Category</label>
                  <select
                    value={formData.member_category}
                    onChange={(e) => setFormData({...formData, member_category: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                  >
                    <option value="satsangi">Satsangi</option>
                    <option value="gunbhavi">Gunbhavi</option>
                    <option value="b2y">B2Y</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#3A322C] mb-1">Role Permission</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                  >
                    <option value="yuvak">Yuvak</option>
                    <option value="karyakar">Karyakar</option>
                    {currentUser?.role === 'admin' && <option value="admin">Admin</option>}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-[#3A322C]">Initial Password (to share with member)</label>
                  <span className="text-[10px] text-[#8B3A3A] font-semibold">Defaults to Phone Number</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Defaults to Mobile Phone number"
                    className="w-full pl-3 pr-9 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2 text-[#3A322C]/40 hover:text-[#8B3A3A] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#3A322C]/60 mt-1">
                  Automatically set to member's phone number. You can change it if needed.
                </p>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#EFE7DA] text-[#3A322C] hover:bg-[#FDFBF7] font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-[#E8A33D] hover:bg-[#D98A2B] text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
                >
                  {actionLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: EDIT MEMBER DETAILS */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-[#3A322C]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 warm-shadow border border-[#EFE7DA] animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#EFE7DA]">
              <h3 className="font-serif-accent text-lg font-bold text-[#8B3A3A] flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#8B3A3A]" />
                Edit Member: {editingUser.name}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-[#3A322C]/60 hover:text-[#8B3A3A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#3A322C] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#3A322C] mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                    className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#3A322C] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#3A322C] mb-1">Date of Birth (DOB)</label>
                  <input
                    type="date"
                    value={formData.dob || ''}
                    onChange={(e) => setFormData({...formData, dob: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                  />
                </div>
              </div>

              {/* Extended Profile Details (Area, Work, Education) */}
              <div className="p-3 bg-[#FDFBF7] rounded-xl border border-[#EFE7DA] space-y-3">
                <div className="font-semibold text-xs text-[#8B3A3A] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#8B3A3A]" />
                  <span>Area, Work & Education Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#3A322C] mb-1">Residential Area</label>
                    <input
                      type="text"
                      value={formData.area || ''}
                      onChange={(e) => setFormData({...formData, area: e.target.value})}
                      placeholder="e.g. Ashok Nagar, Hanuman Nagar"
                      className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-white text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-[#3A322C] mb-1">Working?</label>
                      <select
                        value={formData.is_working || ''}
                        onChange={(e) => setFormData({...formData, is_working: e.target.value})}
                        className="w-full px-2.5 py-2 rounded-xl border border-[#EFE7DA] bg-white text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                      >
                        <option value="">-- Select --</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#3A322C] mb-1">Studying?</label>
                      <select
                        value={formData.is_studying || ''}
                        onChange={(e) => setFormData({...formData, is_studying: e.target.value})}
                        className="w-full px-2.5 py-2 rounded-xl border border-[#EFE7DA] bg-white text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                      >
                        <option value="">-- Select --</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#3A322C] mb-1">Occupation (if working)</label>
                    <input
                      type="text"
                      value={formData.occupation || ''}
                      onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                      placeholder="e.g. Information Technology"
                      className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-white text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#3A322C] mb-1">Company Name</label>
                    <input
                      type="text"
                      value={formData.company_name || ''}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      placeholder="e.g. TCS, Reliance"
                      className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-white text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#3A322C] mb-1">Stream of Education</label>
                    <input
                      type="text"
                      value={formData.education_stream || ''}
                      onChange={(e) => setFormData({...formData, education_stream: e.target.value})}
                      placeholder="e.g. Science, Commerce, Arts"
                      className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-white text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#3A322C] mb-1">Study Details / Degree</label>
                    <input
                      type="text"
                      value={formData.study_details || ''}
                      onChange={(e) => setFormData({...formData, study_details: e.target.value})}
                      placeholder="e.g. MCA, BMS, 12th Pass"
                      className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-white text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#3A322C] mb-1">Member Category</label>
                  <select
                    value={formData.member_category}
                    onChange={(e) => setFormData({...formData, member_category: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                  >
                    <option value="satsangi">Satsangi</option>
                    <option value="gunbhavi">Gunbhavi</option>
                    <option value="b2y">B2Y</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#3A322C] mb-1">Role Permission</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                  >
                    <option value="yuvak">Yuvak</option>
                    <option value="karyakar">Karyakar</option>
                    {currentUser?.role === 'admin' && <option value="admin">Admin</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#3A322C] mb-1">Update Password (leave empty to keep current)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Enter new password if changing"
                    className="w-full pl-3 pr-9 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2 text-[#3A322C]/40 hover:text-[#8B3A3A]"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#EFE7DA] text-[#3A322C] hover:bg-[#FDFBF7] font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-[#8B3A3A] hover:bg-[#6E2C2C] text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: BULK IMPORT MEMBERS VIA CSV/EXCEL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#3A322C]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] p-4 sm:p-6 warm-shadow border border-[#EFE7DA] animate-in fade-in zoom-in-95 duration-200 flex flex-col my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE7DA] shrink-0">
              <h3 className="font-serif-accent text-base sm:text-lg font-bold text-[#8B3A3A] flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#8B3A3A]" />
                <span>Bulk Import Members via CSV / Excel</span>
              </h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-[#3A322C]/60 hover:text-[#8B3A3A] p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
              {/* Step 1 & Step 2 Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Step 1: Download Template */}
                <div className="p-3 bg-[#FDFBF7] rounded-xl border border-[#EFE7DA] flex flex-col justify-between space-y-2">
                  <div>
                    <div className="font-semibold text-xs text-[#3A322C]">Step 1: Download Sample CSV Template</div>
                    <div className="text-[11px] text-[#3A322C]/60 leading-snug mt-0.5">
                      Pre-formatted columns: Full Name, Mobile Number, Birthdate, Area, Working?, Studying?, Occupation, Company, Stream, Details
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadSampleCSV}
                    className="w-full sm:w-auto self-start px-3 py-1.5 rounded-lg bg-white border border-[#EFE7DA] hover:bg-[#EFE7DA] text-xs font-semibold text-[#8B3A3A] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV Template</span>
                  </button>
                </div>

                {/* Step 2: Upload CSV */}
                <div className="p-3 bg-[#FDFBF7] rounded-xl border border-[#EFE7DA] flex flex-col justify-between space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#3A322C]">Step 2: Choose CSV File to Upload</label>
                    <div className="text-[11px] text-[#3A322C]/60 leading-snug mt-0.5">
                      Supports Google Form response exports (.csv) and standard member templates.
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelected}
                    className="w-full text-xs text-[#3A322C] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#8B3A3A]/10 file:text-[#8B3A3A] hover:file:bg-[#8B3A3A]/20 cursor-pointer"
                  />
                </div>
              </div>

              {/* Default Password Callout Banner */}
              <div className="p-3 bg-[#E8A33D]/10 rounded-xl border border-[#E8A33D]/30 text-xs text-[#3A322C]">
                <div className="font-bold text-[#D98A2B] mb-0.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D98A2B]" />
                  <span>Default Initial Password Rule:</span>
                </div>
                Any member imported without a password will have their <strong>Phone Number</strong> set as their initial password. You can inform members: <em>"Log in using your registered Phone Number as your password!"</em>
              </div>

              {/* Live Preview Section */}
              {bulkPreviewData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#3A322C]">
                    <span>File Preview ({bulkPreviewData.length} records detected)</span>
                    <span className="text-[11px] text-[#5B8C5B] font-bold">Showing all {bulkPreviewData.length} records</span>
                  </div>

                  {/* Desktop Table View (sm:block) */}
                  <div className="hidden sm:block max-h-72 overflow-y-auto border border-[#EFE7DA] rounded-xl text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[#FDFBF7] text-[#8B3A3A] font-semibold sticky top-0 border-b border-[#EFE7DA] z-10">
                        <tr>
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">Full Name</th>
                          <th className="p-2.5">Phone</th>
                          <th className="p-2.5">Birthdate</th>
                          <th className="p-2.5">Area</th>
                          <th className="p-2.5">Work / Study Details</th>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5">Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DA]">
                        {bulkPreviewData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#FDFBF7]">
                            <td className="p-2.5 text-[#3A322C]/50 font-mono text-[11px]">{idx + 1}</td>
                            <td className="p-2.5 font-semibold text-[#3A322C]">{row.name}</td>
                            <td className="p-2.5 font-mono">{row.phone}</td>
                            <td className="p-2.5 text-[#3A322C]/70">{row.dob || '-'}</td>
                            <td className="p-2.5 text-[#8B3A3A] font-medium">{row.area || '-'}</td>
                            <td className="p-2.5 text-[#3A322C]/80 max-w-xs truncate">
                              {row.is_working === 'Yes' ? (row.occupation || 'Working') : (row.education_stream || row.study_details || '-')}
                            </td>
                            <td className="p-2.5 capitalize font-medium">{row.member_category}</td>
                            <td className="p-2.5 uppercase font-bold text-[10px] text-[#5B8C5B]">{row.role}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List View (< 640px) */}
                  <div className="block sm:hidden max-h-72 overflow-y-auto space-y-2 pr-1">
                    {bulkPreviewData.map((row, idx) => (
                      <div key={idx} className="p-3 bg-[#FDFBF7] rounded-xl border border-[#EFE7DA] text-xs space-y-1.5">
                        <div className="flex items-center justify-between font-bold text-[#3A322C]">
                          <span className="truncate">{idx + 1}. {row.name}</span>
                          {row.area && (
                            <span className="text-[11px] text-[#8B3A3A] shrink-0 font-medium ml-2 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#8B3A3A]" />
                              <span>{row.area}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#3A322C]/70 font-mono">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#3A322C]/50" />
                            <span>{row.phone}</span>
                          </span>
                          {row.dob && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#3A322C]/50" />
                              <span>{row.dob}</span>
                            </span>
                          )}
                        </div>
                        {(row.occupation || row.education_stream || row.study_details) && (
                          <div className="text-[11px] text-[#5B8C5B] font-medium bg-white px-2 py-1.5 rounded-lg border border-[#EFE7DA] flex items-center gap-1.5">
                            {row.is_working === 'Yes' ? (
                              <>
                                <Briefcase className="w-3.5 h-3.5 text-[#5B8C5B] shrink-0" />
                                <span className="truncate">{row.occupation} {row.company_name ? `@ ${row.company_name}` : ''}</span>
                              </>
                            ) : (
                              <>
                                <GraduationCap className="w-3.5 h-3.5 text-[#E8A33D] shrink-0" />
                                <span className="truncate">{row.education_stream || row.study_details}</span>
                              </>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1 text-[10px]">
                          <span className="capitalize font-semibold text-[#3A322C]/70">Category: {row.member_category}</span>
                          <span className="uppercase font-bold text-[#5B8C5B]">Role: {row.role}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Sticky Footer Actions */}
            <div className="pt-3 border-t border-[#EFE7DA] flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#EFE7DA] text-[#3A322C] hover:bg-[#FDFBF7] font-semibold text-xs cursor-pointer active:scale-98"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkUploading || bulkPreviewData.length === 0}
                onClick={handleBulkSubmit}
                className="flex-1 py-2.5 rounded-xl bg-[#5B8C5B] hover:bg-[#4A734A] text-white font-semibold text-xs shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
              >
                {bulkUploading ? 'Importing Members...' : `Import ${bulkPreviewData.length} Members`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
