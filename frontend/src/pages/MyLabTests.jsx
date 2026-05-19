import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TestTube, Calendar, Clock, CheckCircle, XCircle, AlertCircle,
  ArrowLeft, RefreshCw, FileText, MapPin, Phone, CreditCard,
  ChevronDown, ChevronUp, X
} from 'lucide-react';
import ChatLayout from '../components/ChatLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const STATUS_STYLES = {
  completed:        'bg-green-500/15 text-green-400 border border-green-500/30',
  confirmed:        'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  in_progress:      'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  sample_collected: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
  processing:       'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  pending:          'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  cancelled:        'bg-red-500/15 text-red-400 border border-red-500/30',
};

const STATUS_ICONS = {
  completed:        <CheckCircle className="w-3.5 h-3.5" />,
  cancelled:        <XCircle className="w-3.5 h-3.5" />,
  in_progress:      <AlertCircle className="w-3.5 h-3.5" />,
  sample_collected: <AlertCircle className="w-3.5 h-3.5" />,
  processing:       <RefreshCw className="w-3.5 h-3.5" />,
  pending:          <Clock className="w-3.5 h-3.5" />,
  confirmed:        <CheckCircle className="w-3.5 h-3.5" />,
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch { return dateStr; }
}

function BookingCard({ booking }) {
  const [expanded, setExpanded] = useState(false);
  const status = booking.status || 'pending';
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const statusIcon = STATUS_ICONS[status] || STATUS_ICONS.pending;

  // test_names is an array; fall back gracefully
  const testNames = Array.isArray(booking.test_names) && booking.test_names.length
    ? booking.test_names
    : booking.test_name
      ? [booking.test_name]
      : booking.tests
        ? (Array.isArray(booking.tests) ? booking.tests : [booking.tests])
        : ['Lab Test'];

  const displayName = testNames.join(', ');
  const scheduledDate = booking.scheduled_date || booking.booking_date;
  const paymentStatus = booking.payment_status || 'pending';

  return (
    <div className="bg-card-dark rounded-2xl border border-sidebar-border overflow-hidden hover:border-primary/30 transition-all">
      {/* Main row */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <TestTube className="w-5 h-5 text-purple-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-white font-semibold text-base truncate">{displayName}</h3>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle}`}>
                {statusIcon}
                {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-1">
              {scheduledDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(scheduledDate)}
                </span>
              )}
              {booking.scheduled_time && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {booking.scheduled_time}
                </span>
              )}
              {booking.collection_type && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {booking.collection_type === 'home' ? 'Home Collection' : 'Visit Lab'}
                </span>
              )}
              {booking.total_price != null && (
                <span className="flex items-center gap-1.5 text-green-400 font-medium">
                  <CreditCard className="w-3.5 h-3.5" />
                  ₹{booking.total_price}
                  <span className={`ml-1 text-xs px-1.5 py-0.5 rounded ${
                    paymentStatus === 'paid' ? 'bg-green-500/15 text-green-400' : 'bg-orange-500/15 text-orange-400'
                  }`}>
                    {paymentStatus}
                  </span>
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-sidebar-hover transition shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-sidebar-border px-5 py-4 space-y-3 bg-sidebar-hover/30">
          {testNames.length > 1 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Tests Included</p>
              <div className="flex flex-wrap gap-2">
                {testNames.map((t, i) => (
                  <span key={i} className="px-2.5 py-1 bg-purple-500/10 text-purple-300 rounded-lg text-xs border border-purple-500/20">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {booking.address && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Collection Address</p>
                <p className="text-gray-300 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-500" />
                  {booking.address}
                </p>
              </div>
            )}
            {booking.contact_number && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Contact</p>
                <p className="text-gray-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                  {booking.contact_number}
                </p>
              </div>
            )}
            {booking.booking_date && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Booked On</p>
                <p className="text-gray-300">{formatDate(booking.booking_date)}</p>
              </div>
            )}
            {booking._id && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Booking ID</p>
                <p className="text-gray-400 font-mono text-xs">{booking._id}</p>
              </div>
            )}
          </div>

          {booking.results && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-green-400 text-xs font-semibold uppercase tracking-wide mb-1">Results</p>
              <p className="text-gray-300 text-sm">
                {typeof booking.results === 'string' ? booking.results : JSON.stringify(booking.results, null, 2)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyLabTests() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/api/lab-tests/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data.data || data.bookings || []);
      } else {
        setError('Failed to load lab test bookings.');
      }
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const FILTERS = ['all', 'pending', 'confirmed', 'sample_collected', 'processing', 'completed', 'cancelled'];

  const filtered = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter);

  const counts = {
    total:     bookings.length,
    completed: bookings.filter(b => b.status === 'completed').length,
    upcoming:  bookings.filter(b => ['confirmed', 'pending'].includes(b.status)).length,
    active:    bookings.filter(b => ['in_progress', 'sample_collected', 'processing'].includes(b.status)).length,
  };

  return (
    <ChatLayout>
      <div className="flex-1 overflow-y-auto">
        <main className="w-full max-w-4xl mx-auto py-8 px-4 md:px-8">

          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-white text-3xl font-black mb-1">My Lab Tests</h1>
                <p className="text-gray-400 text-sm">Your lab test bookings and reports</p>
              </div>
              <button
                onClick={fetchBookings}
                className="p-2 rounded-xl border border-sidebar-border text-gray-400 hover:text-white hover:bg-sidebar-hover transition"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Total Booked', value: counts.total,     color: 'text-blue-400' },
              { label: 'Completed',    value: counts.completed, color: 'text-green-400' },
              { label: 'Upcoming',     value: counts.upcoming,  color: 'text-yellow-400' },
              { label: 'In Progress',  value: counts.active,    color: 'text-purple-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-card-dark rounded-xl p-4 text-center border border-sidebar-border">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-gray-400 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <X className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  filter === s
                    ? 'bg-primary text-white'
                    : 'bg-sidebar-hover text-gray-400 hover:text-white border border-sidebar-border'
                }`}
              >
                {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              <p className="text-gray-400 text-sm">Loading your lab tests...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card-dark rounded-2xl p-12 text-center border border-sidebar-border">
              <TestTube className="w-14 h-14 text-gray-600 mx-auto mb-4" />
              <h3 className="text-white font-semibold text-lg mb-2">
                {filter === 'all' ? 'No lab tests booked yet' : `No ${filter.replace(/_/g, ' ')} tests`}
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                {filter === 'all' ? 'Book a lab test to monitor your health metrics' : 'Try a different filter'}
              </p>
              {filter === 'all' && (
                <button
                  onClick={() => navigate('/lab-tests')}
                  className="px-6 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-xl font-semibold transition text-sm"
                >
                  Book a Lab Test
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(booking => (
                <BookingCard key={booking._id} booking={booking} />
              ))}
            </div>
          )}

          {/* Book More */}
          {bookings.length > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={() => navigate('/lab-tests')}
                className="px-8 py-3 bg-primary hover:bg-blue-600 text-white rounded-xl font-semibold transition"
              >
                Book Another Test
              </button>
            </div>
          )}
        </main>
      </div>
    </ChatLayout>
  );
}
