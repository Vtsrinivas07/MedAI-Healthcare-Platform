import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Video, MessageSquare, CheckCircle, XCircle, AlertCircle, RefreshCw, Stethoscope } from 'lucide-react';

const API_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : 'https://medai-healthcare-platform-y8lf.onrender.com';

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchAppointments = async () => {
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/api/doctor/consultations`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.consultations || []);
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Error fetching appointments:', err);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
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
      setAppointments((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status: newStatus } : a))
      );
    } catch (err) {
      console.error('Error updating appointment:', err);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      scheduled: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20',
      completed: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-500/20',
      cancelled: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20',
      'in-progress': 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-500/20',
      pending: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20',
    };
    return styles[status] || styles.scheduled;
  };

  const getStatusIcon = (status) => {
    const icons = { scheduled: AlertCircle, completed: CheckCircle, cancelled: XCircle, 'in-progress': AlertCircle };
    const Icon = icons[status] || icons.scheduled;
    return <Icon className="w-3.5 h-3.5" />;
  };

  const getTypeIcon = (type) => {
    if (!type) return <Stethoscope className="w-3.5 h-3.5" />;
    const t = type.toLowerCase();
    if (t.includes('video')) return <Video className="w-3.5 h-3.5" />;
    if (t.includes('voice') || t.includes('phone')) return <Phone className="w-3.5 h-3.5" />;
    if (t.includes('message') || t.includes('chat')) return <MessageSquare className="w-3.5 h-3.5" />;
    return <Stethoscope className="w-3.5 h-3.5" />;
  };

  const filteredAppointments =
    filter === 'all' ? appointments : appointments.filter((a) => a.status === filter);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#101922]">
      {/* Page Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-[#111418] border-b border-gray-200 dark:border-[#283039] px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Appointments</h1>
              <p className="text-xs text-gray-500 dark:text-[#9dabb9]">Patient appointments booked with you</p>
            </div>
          </div>
          <button
            onClick={fetchAppointments}
            className="p-2 rounded-xl border border-gray-200 dark:border-[#283039] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#283039] transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Filter Tabs */}
        <div className="bg-white dark:bg-[#1b252f] rounded-2xl border border-gray-100 dark:border-[#283039] p-1.5 flex gap-1 overflow-x-auto">
          {['all', 'scheduled', 'in-progress', 'completed', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                filter === s
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-500 dark:text-[#9dabb9] hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {s.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Appointment List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-[#1b252f] border border-gray-100 dark:border-[#283039] rounded-2xl p-5 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-[#283039] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-[#283039] rounded w-1/3" />
                    <div className="h-3 bg-gray-200 dark:bg-[#283039] rounded w-1/4" />
                    <div className="h-3 bg-gray-200 dark:bg-[#283039] rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#1b252f] rounded-2xl border border-gray-100 dark:border-[#283039]">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#283039] flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-900 dark:text-white font-semibold mb-1">No appointments found</p>
            <p className="text-gray-500 dark:text-[#9dabb9] text-sm">
              Appointments booked by patients will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((apt) => (
              <div
                key={apt._id}
                className="bg-white dark:bg-[#1b252f] border border-gray-100 dark:border-[#283039] rounded-2xl p-5 hover:border-primary/30 dark:hover:border-primary/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                        {apt.chief_complaint || 'Appointment'}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(apt.status)}`}>
                        {getStatusIcon(apt.status)}
                        {(apt.status || 'scheduled').replace('-', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-[#9dabb9] mb-2">
                      {apt.specialization || 'General Physician'}
                      {apt.notes ? ` · ${apt.notes.slice(0, 60)}${apt.notes.length > 60 ? '…' : ''}` : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-[#9dabb9]">
                      {apt.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {apt.date}
                        </span>
                      )}
                      {apt.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {apt.time}
                        </span>
                      )}
                      {apt.consultation_type && (
                        <span className="flex items-center gap-1">
                          {getTypeIcon(apt.consultation_type)}
                          {apt.consultation_type}
                        </span>
                      )}
                      {apt.fee && (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          ₹{apt.fee}
                        </span>
                      )}
                    </div>
                  </div>
                  {(apt.status === 'scheduled' || apt.status === 'pending') && (
                    <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                      <button
                        onClick={() => updateStatus(apt._id, 'in-progress')}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-xs font-medium"
                      >
                        Start
                      </button>
                      <button
                        onClick={() => updateStatus(apt._id, 'cancelled')}
                        className="px-3 py-1.5 border border-red-100 dark:border-red-500/20 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition text-xs font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {apt.status === 'in-progress' && (
                    <button
                      onClick={() => updateStatus(apt._id, 'completed')}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-xs font-medium shrink-0"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
