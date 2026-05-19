import React, { useState, useEffect } from 'react';
import { Video, Phone, MessageSquare, Calendar, Clock, User, Loader2, RefreshCw, Stethoscope } from 'lucide-react';

const API_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : 'http://localhost:8000';

export default function DoctorConsultations() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/api/doctor/consultations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConsultations(data.consultations || []);
      }
    } catch (err) {
      console.error('Error fetching consultations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${API_URL}/api/doctor/consultations/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      setConsultations((prev) =>
        prev.map((c) => (c._id === id ? { ...c, status: newStatus } : c))
      );
    } catch (err) {
      console.error('Error updating consultation:', err);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      scheduled: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
      'in-progress': 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
      completed: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400',
      cancelled: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
      pending: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
    };
    return styles[status] || styles.scheduled;
  };

  const getTypeIcon = (type) =>
    type === 'video' ? Video : type === 'voice' ? Phone : MessageSquare;

  const filtered =
    filter === 'all'
      ? consultations
      : consultations.filter((c) => c.status === filter);

  const today = new Date().toISOString().split('T')[0];
  const todayCount = consultations.filter((c) => c.date === today).length;
  const inProgressCount = consultations.filter((c) => c.status === 'in-progress').length;
  const completedCount = consultations.filter((c) => c.status === 'completed').length;
  const scheduledCount = consultations.filter((c) => c.status === 'scheduled').length;

  const stats = [
    { label: "Total Consultations", value: consultations.length, color: 'text-gray-900 dark:text-white' },
    { label: 'In Progress', value: inProgressCount, color: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'Completed', value: completedCount, color: 'text-green-600 dark:text-green-400' },
    { label: 'Scheduled', value: scheduledCount, color: 'text-blue-600 dark:text-blue-400' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#101922]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-[#111418] border-b border-gray-200 dark:border-[#283039] px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Video className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Consultations</h1>
              <p className="text-xs text-gray-500 dark:text-[#9dabb9]">Patient consultations assigned to you</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchConsultations}
              className="p-2 rounded-xl border border-gray-200 dark:border-[#283039] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#283039] transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-[#3d4d5d] rounded-xl bg-gray-50 dark:bg-[#283039] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Consultations</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <div key={i} className="bg-white dark:bg-[#1b252f] rounded-2xl border border-gray-100 dark:border-[#283039] p-4">
              <p className="text-xs text-gray-500 dark:text-[#9dabb9]">{s.label}</p>
              {loading ? (
                <div className="h-8 w-12 bg-gray-100 dark:bg-[#283039] rounded animate-pulse mt-1" />
              ) : (
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              )}
            </div>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Loading consultations...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Stethoscope className="w-14 h-14 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-900 dark:text-white font-semibold mb-1">No consultations found</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Consultations booked by patients will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const TypeIcon = getTypeIcon(c.consultation_type);
              return (
                <div
                  key={c._id}
                  className="bg-white dark:bg-[#1b252f] border border-gray-100 dark:border-[#283039] rounded-2xl p-5 hover:border-primary/30 dark:hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center shrink-0">
                      <TypeIcon className="w-6 h-6 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                          {c.chief_complaint || 'Consultation'}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(c.status)}`}>
                          {(c.status || 'scheduled').replace('-', ' ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-[#9dabb9] mb-2">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {c.consultation_type || 'in-person'}
                        </span>
                        {c.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {c.date}
                          </span>
                        )}
                        {c.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {c.time}
                          </span>
                        )}
                        {c.fee && (
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            ₹{c.fee}
                          </span>
                        )}
                      </div>
                      {c.notes && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{c.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                      {c.status === 'scheduled' && (
                        <button
                          onClick={() => updateStatus(c._id, 'in-progress')}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-xs font-medium"
                        >
                          Start
                        </button>
                      )}
                      {c.status === 'in-progress' && (
                        <button
                          onClick={() => updateStatus(c._id, 'completed')}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-xs font-medium"
                        >
                          Complete
                        </button>
                      )}
                      {(c.status === 'scheduled' || c.status === 'in-progress') && (
                        <button
                          onClick={() => updateStatus(c._id, 'cancelled')}
                          className="px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition text-xs font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
