import React, { useState, useEffect } from 'react';
import ChatLayout from '../components/ChatLayout';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, Bell, Package, MessageCircle, X, Plus, Trash2, Pill, FileText, Sparkles } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://medai-healthcare-platform-y8lf.onrender.com';

function PrescriptionBanner() {
  const [ap, setAp] = useState(null);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try { setAp(JSON.parse(localStorage.getItem('activePrescription') || 'null')); } catch (err) { setAp(null); }
  }, []);

  if (!ap || !ap.medicines?.length) return null;

  const addReminders = async () => {
    if (!ap.medicines?.length) return;
    setApplying(true);
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${API_BASE_URL}/api/medicine/bulk-reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ medicines: ap.medicines }),
      });
      setDone(true);
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="mx-4 md:mx-8 mt-6 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">Prescription: {ap.diagnosis}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{ap.medicines?.length || 0} medicines prescribed by {ap.doctor_name || 'your doctor'}</p>
        </div>
      </div>
      {done ? (
        <span className="text-xs font-semibold text-green-500">✓ Reminders Added</span>
      ) : (
        <button onClick={addReminders} disabled={applying} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors disabled:opacity-60">
          <Bell className="w-3.5 h-3.5" />
          {applying ? 'Adding...' : `Add ${ap.medicines?.length || 0} Reminders`}
        </button>
      )}
      <Link to="/prescriptions" className="text-xs text-blue-500 hover:underline flex-shrink-0">View Prescription</Link>
    </div>
  );
}

const TIME_PERIODS = [
  { id: 'morning', label: 'Morning', time: '6:00 AM - 12:00 PM', icon: '🌅', startHour: 6, endHour: 12 },
  { id: 'afternoon', label: 'Afternoon', time: '12:00 PM - 6:00 PM', icon: '🌞', startHour: 12, endHour: 18 },
  { id: 'evening', label: 'Evening', time: '6:00 PM - 9:00 PM', icon: '🌆', startHour: 18, endHour: 21 },
  { id: 'night', label: 'Night', time: '9:00 PM - 6:00 AM', icon: '🌙', startHour: 21, endHour: 30 },
];

function ScheduleTimeline({ reminders = [], loading = false, onRefresh }) {
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [prefillName, setPrefillName] = useState('');
  const [takenIds, setTakenIds] = useState(new Set());

  // Load today's taken logs once on mount
  useEffect(() => {
    const fetchTodayLogs = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/medicine/logs/today`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTakenIds(new Set(data.taken_reminder_ids || []));
        }
      } catch {}
    };
    fetchTodayLogs();
  }, []);

  const handleToggleTaken = async (reminderId, currentlyTaken) => {
    const newStatus = currentlyTaken ? 'untaken' : 'taken';
    // Optimistic update
    setTakenIds(prev => {
      const next = new Set(prev);
      if (newStatus === 'taken') next.add(reminderId);
      else next.delete(reminderId);
      return next;
    });
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${API_BASE_URL}/api/medicine/log`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminder_id: reminderId,
          user_id: '',
          taken_at: new Date().toISOString(),
          status: newStatus,
          notes: '',
        }),
      });
    } catch {}
  };

  const handleAddReminder = (name = '') => {
    setPrefillName(name);
    setShowAddModal(true);
  };

  const handleReminderAdded = () => {
    setShowAddModal(false);
    setPrefillName('');
    if (onRefresh) onRefresh();
  };

  // Helper function to categorize medicine by time period
  const categorizeMedicinesByPeriod = () => {
    const periods = {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
    };

    reminders.forEach((reminder) => {
      reminder.times.forEach((timeStr) => {
        // Parse time string like "08:30:00"
        const [hourStr] = timeStr.split(':');
        const hour = parseInt(hourStr, 10);

        // Find the appropriate time period
        let period = 'morning';
        if (hour >= 21 || hour < 6) {
          period = 'night';
        } else if (hour >= 18) {
          period = 'evening';
        } else if (hour >= 12) {
          period = 'afternoon';
        }

        // Format time for display
        const displayTime = new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });

        periods[period].push({
          id: `${reminder._id}-${timeStr}`,
          reminderId: reminder._id,
          name: reminder.medicine_name,
          dose: reminder.dosage,
          time: displayTime,
          taken: false,
          frequency: reminder.frequency,
          notes: reminder.notes,
          startDate: reminder.start_date,
          endDate: reminder.end_date,
        });
      });
    });

    return periods;
  };

  const medicines = categorizeMedicinesByPeriod();

  if (loading) {
    return (
      <div className="lg:col-span-2">
        <div className="bg-card-dark rounded-xl border border-sidebar-border shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your medicine schedule...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lg:col-span-2">
        <div className="bg-card-dark rounded-xl border border-red-500/50 shadow-sm p-8 text-center">
          <p className="text-red-400 mb-4">⚠️ {error}</p>
          <button 
            onClick={onRefresh}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="lg:col-span-2">
      <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-sidebar-border shadow-sm">
        <div className="sticky top-0 z-10 bg-white dark:bg-card-dark rounded-t-xl border-b border-gray-200 dark:border-sidebar-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Today&apos;s Schedule</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{today}</p>
            </div>
            <button
              onClick={() => handleAddReminder()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Add Reminder
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {TIME_PERIODS.map((period) => (
            <TimePeriodCard
              key={period.id}
              period={period}
              medicines={medicines[period.id]}
              onDelete={onRefresh}
              takenIds={takenIds}
              onToggleTaken={handleToggleTaken}
            />
          ))}

          {reminders.length === 0 && (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Reminders Set</p>
              <p className="text-gray-500 dark:text-gray-400">You don&apos;t have any medicine reminders scheduled yet.</p>
              <button 
                onClick={handleAddReminder}
                className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
              >
                Add Reminder
              </button>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddReminderModal 
          onClose={() => { setShowAddModal(false); setPrefillName(''); }} 
          onSuccess={handleReminderAdded}
          prefillName={prefillName}
        />
      )}
    </div>
  );
}

function TimePeriodCard({ period, medicines, onDelete, takenIds, onToggleTaken }) {
  if (!medicines || medicines.length === 0) return null;
  return (
    <div className="relative">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{period.icon}</span>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">{period.label}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{period.time}</p>
        </div>
      </div>
      <div className="space-y-3 pl-12">
        {medicines.map((med) => (
          <MedicineCard
            key={med.id}
            medicine={med}
            onDelete={onDelete}
            taken={takenIds?.has(med.reminderId)}
            onToggleTaken={onToggleTaken}
          />
        ))}
      </div>
    </div>
  );
}

function MedicineCard({ medicine, onDelete, taken = false, onToggleTaken }) {
  const [deleting, setDeleting] = useState(false);

  const handleMark = () => {
    if (onToggleTaken) onToggleTaken(medicine.reminderId, taken);
  };

  const handleDelete = async () => {
    if (!medicine.reminderId) return;
    if (!window.confirm(`Remove "${medicine.name}" reminder?`)) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/medicine/reminders/${medicine.reminderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok && onDelete) onDelete();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Course info
  const now = new Date();
  const endDate = medicine.endDate ? new Date(medicine.endDate) : null;
  const daysLeft = endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : null;
  const courseExpired = daysLeft !== null && daysLeft < 0;

  const courseBadge = courseExpired
    ? { label: 'Course ended', color: 'bg-red-500/20 text-red-400' }
    : daysLeft !== null && daysLeft <= 3
    ? { label: `⚠️ ${daysLeft}d left`, color: 'bg-orange-500/20 text-orange-400' }
    : daysLeft !== null
    ? { label: `${daysLeft}d left`, color: 'bg-cyan-500/10 text-cyan-400' }
    : { label: 'Ongoing', color: 'bg-gray-500/20 text-gray-400' };

  return (
    <div className={`relative rounded-lg border p-4 transition-all ${
      taken
        ? 'bg-green-500/10 border-green-500/50'
        : courseExpired
        ? 'bg-red-500/5 border-red-500/30 opacity-70'
        : 'bg-card-dark border-sidebar-border'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className={`font-bold text-lg ${taken ? 'line-through text-gray-400' : 'dark:text-white text-gray-900'}`}>
              {medicine.name}
            </h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">
              {medicine.dose}
            </span>
            {/* Course duration badge */}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${courseBadge.color}`}>
              {courseBadge.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{medicine.time}</span>
            </div>
            {medicine.frequency && (
              <span className="text-xs">• {medicine.frequency.replace(/_/g, ' ')}</span>
            )}
          </div>
          {medicine.notes && (
            <p className="text-xs text-gray-500 mt-2">💡 {medicine.notes}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all disabled:opacity-40"
            title="Delete reminder"
          >
            {deleting
              ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              : <Trash2 className="w-3.5 h-3.5" />
            }
          </button>
          {/* Mark taken button */}
          <button
            onClick={handleMark}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
              taken
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                : 'bg-sidebar-hover text-gray-400 hover:bg-primary hover:text-white'
            }`}
            title={taken ? 'Mark as not taken' : 'Mark as taken'}
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AdherenceScoreCard({ reminders = [] }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token || reminders.length === 0) return;
        const res = await fetch(`${API_BASE_URL}/api/medicine/logs?days=7`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(Array.isArray(data) ? data : (data?.data || []));
        }
      } catch {}
    };
    fetchLogs();
  }, [reminders]);

  // Calculate real adherence from logs vs expected doses this week
  const totalWeeklyDoses = reminders.reduce((sum, r) => sum + (r.times?.length || 1) * 7, 0);
  const takenCount = logs.filter(l => l.status === 'taken').length;
  const percentage = totalWeeklyDoses > 0
    ? Math.round(Math.min((takenCount / totalWeeklyDoses) * 100, 100))
    : 0;
  const statusLabel = percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : percentage >= 30 ? 'Fair' : reminders.length > 0 ? 'Just Started' : 'No Data';
  const statusColor = percentage >= 80 ? 'text-green-400' : percentage >= 60 ? 'text-blue-400' : percentage >= 30 ? 'text-yellow-400' : 'text-gray-400';

  return (
    <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-sidebar-border shadow-sm p-6">
      <h3 className="font-bold text-gray-900 dark:text-white mb-1">Adherence Score</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">Based on doses marked as taken this week</p>
      <div className="flex flex-col items-center justify-center">
        <div
          className="w-44 h-44 rounded-full relative flex items-center justify-center"
          style={{ background: `conic-gradient(#137fec ${percentage}%, #e5e7eb 0)` }}
        >
          <div className="bg-gray-50 dark:bg-background-dark rounded-full w-32 h-32 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{percentage}%</span>
            <span className={`text-xs font-semibold uppercase tracking-wide mt-1 ${statusColor}`}>{statusLabel}</span>
          </div>
        </div>
        <p className="text-center text-sm text-gray-600 dark:text-gray-300 mt-5 px-2">
          {reminders.length > 0 ? (
            totalWeeklyDoses > 0 && takenCount > 0
              ? <><strong className="text-gray-900 dark:text-white">{takenCount}</strong> of <strong className="text-gray-900 dark:text-white">{totalWeeklyDoses}</strong> expected weekly doses marked taken.</>
              : <>You have <strong className="text-gray-900 dark:text-white">{reminders.length}</strong> active medicine{reminders.length !== 1 ? 's' : ''}. Mark doses as taken to track your score.</>
          ) : 'Add reminders to start tracking your medication adherence.'}
        </p>
      </div>
    </div>
  );
}

function UpcomingRefillsCard({ reminders = [] }) {
  const navigate = useNavigate();

  const now = new Date();

  // Build refill list:
  // - If end_date exists and is within 14 days → "expiring soon"
  // - If no end_date → show as "ongoing", allow reorder
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const refills = reminders.map(r => {
    const hasEnd = r.end_date && new Date(r.end_date) >= now;
    const daysLeft = hasEnd
      ? Math.ceil((new Date(r.end_date) - now) / (1000 * 60 * 60 * 24))
      : null;
    const startedDaysAgo = r.start_date
      ? Math.floor((now - new Date(r.start_date)) / (1000 * 60 * 60 * 24))
      : null;
    return {
      name: r.medicine_name,
      dosage: r.dosage,
      daysLeft,
      startedDaysAgo,
      urgent: daysLeft !== null && daysLeft <= 3,
      expiringSoon: daysLeft !== null && new Date(r.end_date) <= in14Days,
      ongoing: !hasEnd,
    };
  }).sort((a, b) => {
    // Urgent first, then expiring, then ongoing
    if (a.urgent && !b.urgent) return -1;
    if (!a.urgent && b.urgent) return 1;
    if (a.daysLeft !== null && b.daysLeft === null) return -1;
    if (a.daysLeft === null && b.daysLeft !== null) return 1;
    return (a.daysLeft ?? 999) - (b.daysLeft ?? 999);
  });

  return (
    <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-sidebar-border shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white">Upcoming Refills</h3>
        <button
          onClick={() => navigate('/pharmacy')}
          className="text-xs text-primary hover:text-blue-400 font-semibold transition-colors"
        >
          Order Medicines
        </button>
      </div>

      {refills.length === 0 ? (
        <div className="text-center py-8">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No active medicines</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Add reminders to track refills</p>
        </div>
      ) : (
        <div className="space-y-3">
          {refills.slice(0, 5).map((item) => (
            <div
              key={item.name}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                item.urgent
                  ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                  : item.expiringSoon
                  ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30'
                  : 'bg-gray-50 dark:bg-sidebar-hover/50 border-gray-200 dark:border-sidebar-border'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                  item.urgent ? 'bg-red-100 dark:bg-red-500/20 text-red-500' :
                  item.expiringSoon ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-500' :
                  'bg-primary/10 text-primary'
                }`}>
                  <Package className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                  <p className={`text-xs font-medium ${
                    item.urgent ? 'text-red-500 dark:text-red-400' :
                    item.expiringSoon ? 'text-yellow-500 dark:text-yellow-400' :
                    'text-gray-500 dark:text-gray-400'
                  }`}>
                    {item.daysLeft !== null
                      ? item.urgent
                        ? `⚠️ ${item.daysLeft} day${item.daysLeft !== 1 ? 's' : ''} left`
                        : `${item.daysLeft} days left`
                      : item.startedDaysAgo !== null && item.startedDaysAgo >= 0
                      ? `Started ${item.startedDaysAgo === 0 ? 'today' : `${item.startedDaysAgo}d ago`} · ongoing`
                      : 'Ongoing'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/pharmacy', { state: { searchQuery: item.name } })}
                className="text-xs bg-white dark:bg-card-dark border border-gray-200 dark:border-sidebar-border px-2 py-1 rounded font-semibold text-gray-600 dark:text-gray-200 hover:text-primary hover:border-primary transition-colors shrink-0 ml-2"
              >
                Reorder
              </button>
            </div>
          ))}
          {refills.length > 5 && (
            <p className="text-xs text-center text-gray-400 mt-2">+{refills.length - 5} more medicines</p>
          )}
        </div>
      )}
    </div>
  );
}

function NeedAssistanceCard() {
  return (
    <div className="bg-gradient-to-br from-primary to-blue-600 rounded-xl shadow-md p-6 text-white relative overflow-hidden">
      <MessageCircle className="absolute -bottom-4 -right-4 w-24 h-24 opacity-10 rotate-12" />
      <h3 className="font-bold text-lg mb-2 relative z-10">Need Assistance?</h3>
      <p className="text-blue-100 text-sm mb-4 relative z-10">
        Our AI assistant can help you reschedule doses or answer medication questions.
      </p>
      <Link
        to="/chat"
        className="relative z-10 inline-flex bg-white text-blue-700 text-sm font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
      >
        Chat with MedAI
      </Link>
    </div>
  );
}

function AddReminderModal({ onClose, onSuccess, prefillName = '' }) {
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [courseDays, setCourseDays] = useState('7');          // preset selector
  const [formData, setFormData] = useState({
    medicine_name: prefillName || '',
    dosage: '',
    frequency: 'daily',
    times: ['08:00'],
    start_date: today,
    end_date: (() => {
      const d = new Date(); d.setDate(d.getDate() + 7);
      return d.toISOString().split('T')[0];
    })(),
    notes: ''
  });

  // When preset changes, recalculate end_date from start_date
  const applyPreset = (days, startDate) => {
    if (days === 'ongoing') {
      setFormData(prev => ({ ...prev, end_date: '' }));
      return;
    }
    const d = new Date(startDate || formData.start_date);
    d.setDate(d.getDate() + parseInt(days));
    setFormData(prev => ({ ...prev, end_date: d.toISOString().split('T')[0] }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'start_date' && courseDays !== 'ongoing' && courseDays !== 'custom') {
      applyPreset(courseDays, value);
    }
  };

  const handleCoursePreset = (days) => {
    setCourseDays(days);
    applyPreset(days, formData.start_date);
  };

  const handleTimeChange = (index, value) => {
    const newTimes = [...formData.times];
    newTimes[index] = value;
    setFormData(prev => ({ ...prev, times: newTimes }));
  };

  const addTimeSlot = () => {
    setFormData(prev => ({ ...prev, times: [...prev.times, '12:00'] }));
  };

  const removeTimeSlot = (index) => {
    setFormData(prev => ({
      ...prev,
      times: prev.times.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const formattedTimes = formData.times.filter(t => t).map(t => `${t}:00`);
      const payload = { ...formData, times: formattedTimes };
      const response = await fetch(`${API_BASE_URL}/api/medicine/reminders`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create reminder');
      }
      onSuccess();
    } catch (err) {
      alert(err.message || 'Failed to create reminder');
    } finally {
      setLoading(false);
    }
  };

  const COURSE_PRESETS = [
    { label: '3 days', value: '3' },
    { label: '5 days', value: '5' },
    { label: '7 days', value: '7' },
    { label: '10 days', value: '10' },
    { label: '14 days', value: '14' },
    { label: '30 days', value: '30' },
    { label: 'Ongoing', value: 'ongoing' },
    { label: 'Custom', value: 'custom' },
  ];

  const daysRemaining = formData.end_date
    ? Math.ceil((new Date(formData.end_date) - new Date(formData.start_date)) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-sidebar-border max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-card-dark border-b border-gray-200 dark:border-sidebar-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Medicine Reminder</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-sidebar-hover rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Medicine Name + Dosage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Medicine Name *</label>
              <input type="text" name="medicine_name" value={formData.medicine_name} onChange={handleChange} required
                className="w-full px-4 py-2 bg-gray-50 dark:bg-sidebar rounded-lg border border-gray-300 dark:border-sidebar-border text-gray-900 dark:text-white focus:border-primary focus:outline-none"
                placeholder="e.g., Aspirin" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dosage *</label>
              <input type="text" name="dosage" value={formData.dosage} onChange={handleChange} required
                className="w-full px-4 py-2 bg-gray-50 dark:bg-sidebar rounded-lg border border-gray-300 dark:border-sidebar-border text-gray-900 dark:text-white focus:border-primary focus:outline-none"
                placeholder="e.g., 500mg" />
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Frequency *</label>
            <select name="frequency" value={formData.frequency} onChange={handleChange} required
              className="w-full px-4 py-2 bg-gray-50 dark:bg-sidebar rounded-lg border border-gray-300 dark:border-sidebar-border text-gray-900 dark:text-white focus:border-primary focus:outline-none">
              <option value="once_daily">Once Daily</option>
              <option value="daily">Daily</option>
              <option value="twice_daily">Twice Daily</option>
              <option value="three_times_daily">Three Times Daily</option>
              <option value="weekly">Weekly</option>
              <option value="as_needed">As Needed</option>
            </select>
          </div>

          {/* Reminder Times */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reminder Times *</label>
            {formData.times.map((time, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input type="time" value={time} onChange={(e) => handleTimeChange(index, e.target.value)} required
                  className="flex-1 px-4 py-2 bg-gray-50 dark:bg-sidebar rounded-lg border border-gray-300 dark:border-sidebar-border text-gray-900 dark:text-white focus:border-primary focus:outline-none" />
                {formData.times.length > 1 && (
                  <button type="button" onClick={() => removeTimeSlot(index)}
                    className="px-3 py-2 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addTimeSlot} className="mt-1 flex items-center gap-2 text-sm text-primary hover:text-blue-600">
              <Plus className="w-4 h-4" /> Add another time
            </button>
          </div>

          {/* Course Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Course Duration
              {daysRemaining !== null && (
                <span className="ml-2 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} course
                </span>
              )}
              {courseDays === 'ongoing' && (
                <span className="ml-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Ongoing (no end date)
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {COURSE_PRESETS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleCoursePreset(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    courseDays === p.value
                      ? 'bg-primary text-white border-primary shadow'
                      : 'bg-gray-50 dark:bg-sidebar-hover text-gray-600 dark:text-gray-300 border-gray-300 dark:border-sidebar-border hover:border-primary hover:text-primary'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Start Date + End Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date *</label>
              <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required
                className="w-full px-4 py-2 bg-gray-50 dark:bg-sidebar rounded-lg border border-gray-300 dark:border-sidebar-border text-gray-900 dark:text-white focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date {courseDays === 'ongoing' ? '(None — Ongoing)' : '*'}
              </label>
              <input type="date" name="end_date" value={formData.end_date}
                onChange={(e) => { setCourseDays('custom'); handleChange(e); }}
                disabled={courseDays === 'ongoing'}
                className={`w-full px-4 py-2 bg-gray-50 dark:bg-sidebar rounded-lg border border-gray-300 dark:border-sidebar-border text-gray-900 dark:text-white focus:border-primary focus:outline-none ${courseDays === 'ongoing' ? 'opacity-40 cursor-not-allowed' : ''}`} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes (Optional)</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-sidebar rounded-lg border border-gray-300 dark:border-sidebar-border text-gray-900 dark:text-white focus:border-primary focus:outline-none"
              placeholder="e.g., Take after meals, avoid dairy..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-6 py-2 bg-gray-100 dark:bg-sidebar-hover text-gray-700 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-sidebar-hover/80 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold">
              {loading ? 'Creating...' : `Create Reminder${daysRemaining ? ` (${daysRemaining}d)` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MedicineReminder() {
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [justAddedInfo, setJustAddedInfo] = useState(null);

  useEffect(() => {
    // Check if we were redirected here after adding reminders from chatbot
    try {
      const flag = JSON.parse(localStorage.getItem('remindersJustAdded') || 'null');
      if (flag && Date.now() - flag.at < 30000) {
        setJustAddedInfo(flag);
        localStorage.removeItem('remindersJustAdded');
      }
    } catch {}
    loadReminders();
  }, []);

  const loadReminders = async () => {
    setRemindersLoading(true);
    setLoadError(null);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) { setRemindersLoading(false); return; }
      const res = await fetch(`${API_BASE_URL}/api/medicine/reminders?active_only=true`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReminders(Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []));
      } else {
        const err = await res.json().catch(() => ({}));
        setLoadError(err?.detail || err?.message || `Error ${res.status}`);
      }
    } catch (err) {
      console.error('Error fetching reminders:', err);
      setLoadError(err.message || 'Network error');
    } finally {
      setRemindersLoading(false);
    }
  };

  return (
    <ChatLayout>
      <div className="flex-1 overflow-y-auto">
        <PrescriptionBanner />

        {/* Success banner after chatbot redirect */}
        {justAddedInfo && (
          <div className="mx-4 md:mx-8 mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-300">
                  ✅ {justAddedInfo.count} AI-suggested reminder{justAddedInfo.count !== 1 ? 's' : ''} added!
                </p>
                {justAddedInfo.names?.length > 0 && (
                  <p className="text-xs text-emerald-400/80 mt-0.5">
                    {justAddedInfo.names.slice(0, 3).join(', ')}{justAddedInfo.names.length > 3 ? ` +${justAddedInfo.names.length - 3} more` : ''}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  You can now customise times, dosage and frequency below, or add your own.
                </p>
              </div>
            </div>
            <button onClick={() => setJustAddedInfo(null)} className="text-emerald-400 hover:text-white transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loadError && (
          <div className="mx-4 md:mx-8 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-3">
            <p className="text-sm text-red-400">⚠️ Failed to load reminders: {loadError}</p>
            <button onClick={loadReminders} className="text-xs font-bold text-red-300 hover:text-white underline">Retry</button>
          </div>
        )}

        <main className="flex-1 w-full max-w-7xl mx-auto py-8 px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <ScheduleTimeline reminders={reminders} loading={remindersLoading} onRefresh={loadReminders} />
            <div className="space-y-6">
              <AdherenceScoreCard reminders={reminders} />
              <UpcomingRefillsCard reminders={reminders} />
              <NeedAssistanceCard />
            </div>
          </div>
        </main>
      </div>
    </ChatLayout>
  );
}
