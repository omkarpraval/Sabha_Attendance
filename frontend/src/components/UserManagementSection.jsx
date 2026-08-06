import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Pencil, CheckCircle2, AlertCircle, Eye, EyeOff, Lock, User, Phone, Mail, Calendar, Shield, Sparkles, X, Trash2, UploadCloud, FileSpreadsheet, Download, Cake } from 'lucide-react';
import { apiFetch } from '../api';

export default function UserManagementSection({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Notification status
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    role: 'user'
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
      "Name,Phone,Email,Date of Birth,Category,Role\n" +
      "Ramesh Patel,9876543210,ramesh@gmail.com,1990-05-15,satsangi,user\n" +
      "Suresh Shah,9876543211,suresh@gmail.com,1985-08-20,goon_bhavi,user\n" +
      "Mahesh Joshi,9876543212,mahesh@gmail.com,1992-12-10,satsangi,karyakar\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_members_import_template.csv");
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

      const parsedUsers = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        if (cols.length < 2) continue;

        const name = cols[0] || '';
        const phone = cols[1] || '';
        const email = cols[2] || '';
        const dob = cols[3] || '';
        const category = (cols[4] || 'satsangi').toLowerCase();
        const role = (cols[5] || 'user').toLowerCase();

        if (name && phone) {
          parsedUsers.push({
            name,
            phone,
            email: email || null,
            dob: dob || null,
            member_category: category === 'goon_bhavi' ? 'goon_bhavi' : 'satsangi',
            role: role === 'karyakar' ? 'karyakar' : role === 'admin' ? 'admin' : 'user',
            password: null
          });
        }
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
      role: 'user'
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
      role: user.role || 'user'
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

    setActionLoading(true);

    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(formData)
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
      role: formData.role
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

  // Filtering
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.phone && u.phone.includes(searchQuery)) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesCategory = categoryFilter === 'all' || u.member_category === categoryFilter;

    return matchesSearch && matchesRole && matchesCategory;
  });

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
            Search members, assign Satsangi / Goon Bhavi status, update details, or manage roles
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

      {/* Error / Success Notifications */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-[#C1554A]/10 border border-[#C1554A]/30 text-[#C1554A] text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-[#C1554A] hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-xl bg-[#5B8C5B]/10 border border-[#5B8C5B]/30 text-[#5B8C5B] text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-[#5B8C5B] hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#3A322C]/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
          >
            <option value="all">All Roles ({users.length})</option>
            <option value="user">User / Member ({users.filter(u => u.role === 'user').length})</option>
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
            <option value="satsangi">Satsangi ({users.filter(u => u.member_category === 'satsangi').length})</option>
            <option value="goon_bhavi">Goon Bhavi ({users.filter(u => u.member_category === 'goon_bhavi').length})</option>
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
                  <tr className="bg-[#FDFBF7] border-b border-[#EFE7DA] text-[#8B3A3A] font-semibold">
                    <th className="p-3">MEMBER NAME</th>
                    <th className="p-3">PHONE</th>
                    <th className="p-3">DATE OF BIRTH</th>
                    <th className="p-3">CATEGORY</th>
                    <th className="p-3">ROLE</th>
                    <th className="p-3">STREAK / TOTAL</th>
                    <th className="p-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE7DA]">
                  {paginatedUsers.map((u) => (
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
                        {u.member_category === 'goon_bhavi' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#2D8A8A]/10 text-[#2D8A8A] border border-[#2D8A8A]/20">
                            <Sparkles className="w-3 h-3" /> Goon Bhavi
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
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-[#3A322C]/80">
                        <span className="font-semibold">{u.current_streak}</span> streak ({u.lifetime_count} total)
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
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
                  ))}
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
      )}      {/* Modal 1: ADD NEW MEMBER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#3A322C]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 warm-shadow border border-[#EFE7DA] animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#EFE7DA]">
              <h3 className="font-serif-accent text-lg font-bold text-[#8B3A3A] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#E8A33D]" />
                Add New Member
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
                    onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#3A322C] mb-1">Member Category</label>
                  <select
                    value={formData.member_category}
                    onChange={(e) => setFormData({...formData, member_category: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                  >
                    <option value="satsangi">Satsangi</option>
                    <option value="goon_bhavi">Goon Bhavi</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#3A322C] mb-1">Role Permission</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                  >
                    <option value="user">User / Member</option>
                    <option value="karyakar">Karyakar</option>
                    {currentUser?.role === 'admin' && <option value="admin">Admin</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#3A322C] mb-1">Initial Password (to share with member)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Set password for account"
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
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 warm-shadow border border-[#EFE7DA] animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#3A322C] mb-1">Member Category</label>
                  <select
                    value={formData.member_category}
                    onChange={(e) => setFormData({...formData, member_category: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                  >
                    <option value="satsangi">Satsangi</option>
                    <option value="goon_bhavi">Goon Bhavi</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#3A322C] mb-1">Role Permission</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-[#EFE7DA] bg-[#FDFBF7] text-xs text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
                  >
                    <option value="user">User / Member</option>
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
        <div className="fixed inset-0 z-50 bg-[#3A322C]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 warm-shadow border border-[#EFE7DA] animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#EFE7DA]">
              <h3 className="font-serif-accent text-lg font-bold text-[#8B3A3A] flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#8B3A3A]" />
                Bulk Import Members via CSV
              </h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-[#3A322C]/60 hover:text-[#8B3A3A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Download Template */}
            <div className="p-3 bg-[#FDFBF7] rounded-xl border border-[#EFE7DA] flex items-center justify-between">
              <div>
                <div className="font-semibold text-xs text-[#3A322C]">Step 1: Download Sample CSV Template</div>
                <div className="text-[11px] text-[#3A322C]/60">Pre-formatted columns: Name, Phone, Email, DOB, Category, Role</div>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleCSV}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#EFE7DA] hover:bg-[#EFE7DA] text-xs font-semibold text-[#8B3A3A] flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </button>
            </div>

            {/* Step 2: Upload CSV */}
            <div>
              <label className="block text-xs font-semibold text-[#3A322C] mb-1">Step 2: Choose CSV File to Upload</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelected}
                className="w-full text-xs text-[#3A322C] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#8B3A3A]/10 file:text-[#8B3A3A] hover:file:bg-[#8B3A3A]/20 cursor-pointer"
              />
            </div>

            {/* Password Callout Banner */}
            <div className="p-3 bg-[#E8A33D]/10 rounded-xl border border-[#E8A33D]/30 text-xs text-[#3A322C]">
              <div className="font-bold text-[#D98A2B] mb-0.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D98A2B]" />
                <span>Default Initial Password Rule:</span>
              </div>
              Any member imported without a password will have their <strong>Phone Number</strong> set as their initial password. You can inform members: <em>"Log in using your registered Phone Number as your password!"</em>
            </div>

            {/* Live Preview Table */}
            {bulkPreviewData.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-[#3A322C] mb-1.5">
                  <span>File Preview ({bulkPreviewData.length} records detected)</span>
                  <span className="text-[11px] text-[#5B8C5B] font-bold">First 5 rows shown</span>
                </div>
                <div className="max-h-40 overflow-y-auto border border-[#EFE7DA] rounded-xl text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-[#FDFBF7] text-[#8B3A3A] font-semibold sticky top-0">
                      <tr>
                        <th className="p-2">Name</th>
                        <th className="p-2">Phone</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE7DA]">
                      {bulkPreviewData.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#FDFBF7]">
                          <td className="p-2 font-medium">{row.name}</td>
                          <td className="p-2 font-mono">{row.phone}</td>
                          <td className="p-2 capitalize">{row.member_category}</td>
                          <td className="p-2 uppercase font-semibold text-[10px]">{row.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#EFE7DA] text-[#3A322C] hover:bg-[#FDFBF7] font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkUploading || bulkPreviewData.length === 0}
                onClick={handleBulkSubmit}
                className="flex-1 py-2.5 rounded-xl bg-[#5B8C5B] hover:bg-[#4A734A] text-white font-semibold text-xs shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
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
