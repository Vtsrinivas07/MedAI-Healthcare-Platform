import { useState, useEffect, useRef } from 'react';
import { 
  TestTube, Calendar, MapPin, Search, ShoppingCart, Phone, Upload, 
  Package, User, Activity, Heart, Brain, Eye, Bone, Filter, X, Check,
  Clock, FileText, Microscope, Scan, Zap, Shield, Users, Baby, Sparkles,
  Building2, Home, Building
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ChatLayout from '../components/ChatLayout';
import api from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function PrescriptionTestsBanner() {
  const [ap, setAp] = useState(null);
  useEffect(() => {
    try { setAp(JSON.parse(localStorage.getItem('activePrescription') || 'null')); } catch (err) { setAp(null); }
  }, []);
  if (!ap || !ap.lab_tests?.length) return null;
  return (
    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20 flex flex-wrap items-start gap-3">
      <Sparkles className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold dark:text-white text-gray-900">Prescribed Lab Tests</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {ap.lab_tests.map((t, i) => (
            <span key={i} className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-300 rounded-lg text-xs font-medium">{t}</span>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">From: {ap.diagnosis} · Dr. {ap.doctor_name || 'your doctor'}</p>
      </div>
      <Link to="/prescriptions" className="text-xs text-blue-400 hover:underline flex-shrink-0">View Prescription</Link>
    </div>
  );
}

// Test Categories
const TEST_CATEGORIES = [
  { id: 'packages', name: 'Full Body Packages', icon: Package, color: 'blue' },
  { id: 'women', name: 'For Women', icon: Users, color: 'pink' },
  { id: 'men', name: 'For Men', icon: User, color: 'indigo' },
  { id: 'xray_scans', name: 'X-Rays & Scans', icon: Scan, color: 'purple' },
  { id: 'lifestyle', name: 'Lifestyle Checkups', icon: Activity, color: 'green' },
  { id: 'special', name: 'Special Tests', icon: Zap, color: 'yellow' },
];

// Body Systems Filter (consolidated from Health Concerns and Organs)
const BODY_SYSTEMS = [
  { id: 'heart', name: 'Heart', icon: Heart },
  { id: 'liver', name: 'Liver', icon: Activity },
  { id: 'kidney', name: 'Kidney', icon: Activity },
  { id: 'thyroid', name: 'Thyroid', icon: Shield },
  { id: 'lungs', name: 'Lungs', icon: Activity },
  { id: 'brain', name: 'Brain', icon: Brain },
  { id: 'eyes', name: 'Eyes', icon: Eye },
  { id: 'bones', name: 'Bones', icon: Bone },
  { id: 'diabetes', name: 'Diabetes', icon: Activity },
];

// Partner Diagnostic Centers & Hospitals
const DIAGNOSTIC_CENTERS = [
  {
    id: 'center-1',
    name: 'MedAI Central Diagnostic & Imaging Center',
    address: 'Plot No 138/A, Govinda Nagar Colony, Near Old Bus Stand Road',
    city: 'Srikakulam',
    timing: '07:00 AM - 09:00 PM',
    facilities: 'X-Ray, CT Scan, MRI, Blood & Pathology Lab, ECG, Ultrasound',
    badge: 'Partner Center (Recommended)'
  },
  {
    id: 'center-2',
    name: 'Apollo Diagnostic Lab & Scans',
    address: 'Door No. 12-4, Hospital Road, Opp. District Hospital',
    city: 'Srikakulam',
    timing: '06:30 AM - 08:30 PM',
    facilities: 'Digital X-Ray, Pathology, 2D Echo, Thyroid & Lipid Profile',
    badge: 'NABL Accredited'
  },
  {
    id: 'center-3',
    name: 'Lifecare Advanced Scans & Laboratory',
    address: 'Near Central Circle, College Road',
    city: 'Srikakulam',
    timing: '07:00 AM - 09:00 PM',
    facilities: 'High Resolution CT, MRI, Blood Diagnostics, Mammography',
    badge: 'Fast Reports (Same Day)'
  },
  {
    id: 'center-4',
    name: 'CityCare Multispecialty Hospital Lab',
    address: 'Sector 4, Visakha Main Road',
    city: 'Srikakulam',
    timing: '24 Hours Open',
    facilities: '24/7 Emergency Scans, Cardiac Markers, Comprehensive Labs',
    badge: '24/7 Hospital Facility'
  }
];

export default function LabTests() {
  const [tests, setTests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showReportUpload, setShowReportUpload] = useState(false);
  const [showPrescriptionUpload, setShowPrescriptionUpload] = useState(false);
  const [reportFile, setReportFile] = useState(null);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('browse');
  const [bookingForm, setBookingForm] = useState({
    scheduled_date: '',
    scheduled_time: '',
    booking_type: 'center', // 'center' (Diagnostic center/hospital visit) or 'home' (Home collection)
    selected_center_id: 'center-1',
    custom_center_name: '',
    address: '',
    city: 'Srikakulam',
    pincode: '',
    phone: '',
    notes: '',
    payment_method: 'cod'
  });
  const reportInputRef = useRef(null);
  const prescriptionInputRef = useRef(null);

  useEffect(() => {
    fetchTests();
    fetchBookings();
  }, [selectedCategory, search]);

  useEffect(() => {
    try {
      const pendingRaw = localStorage.getItem('pendingLabBooking');
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        localStorage.removeItem('pendingLabBooking');

        if (pending?.tests && Array.isArray(pending.tests)) {
          const autoCart = pending.tests.map((tName, idx) => ({
            _id: `rec-${idx}-${Date.now()}`,
            name: typeof tName === 'string' ? tName : (tName?.name || 'Lab Diagnostic Test'),
            price: 499 + idx * 200,
            test_count: 1,
            fasting_required: false,
            home_collection: true,
          }));
          setCart(autoCart);

          const userStr = localStorage.getItem('user');
          const profStr = localStorage.getItem('userProfile');
          let uLoc = '', uPhone = '', uCity = '', uPin = '';
          try {
            if (userStr) {
              const u = JSON.parse(userStr);
              uLoc = u.location || '';
              uPhone = u.mobile || u.phone || '';
            }
            if (profStr) {
              const p = JSON.parse(profStr);
              uLoc = p.location || uLoc;
              uPhone = p.mobile || p.phone || uPhone;
              uCity = p.city || '';
              uPin = p.pincode || '';
            }
          } catch (err) {
            console.warn(err);
          }

          const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          setBookingForm({
            scheduled_date: pending.date || tomorrow,
            scheduled_time: pending.time || '09:00',
            booking_type: 'center',
            selected_center_id: 'center-1',
            custom_center_name: '',
            address: uLoc || '',
            phone: uPhone || '',
            city: uCity || 'Srikakulam',
            pincode: uPin || '',
            payment_method: 'cod',
            notes: pending.disease ? `Auto-recommended for ${pending.disease}` : 'Recommended from Chatbot diagnostic care plan.',
          });
          setShowBookingForm(true);
        }
      }
    } catch (e) {
      console.error('Error handling pending lab booking:', e);
    }
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (search) params.append('search', search);
      
      const response = await fetch(`${API_BASE_URL}/api/lab-tests/tests?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setTests(data.data);
      } else {
        setError(data.detail || data.message || 'Failed to fetch lab tests');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`${API_BASE_URL}/api/lab-tests/bookings`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      if (data.success) setBookings(data.data);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setBookings([]);
      }
    }
  };

  const addToCart = (test) => {
    if (!cart.find(t => t._id === test._id)) {
      setCart([...cart, test]);
    }
  };

  const removeFromCart = (testId) => {
    setCart(cart.filter(t => t._id !== testId));
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, test) => sum + test.price, 0);
  };

  const handleReportUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReportFile(file);
    }
  };

  const handlePrescriptionUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPrescriptionFile(file);
    }
  };

  const uploadLabReport = async () => {
    if (!reportFile) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('file', reportFile);
      formData.append('title', 'Lab Report');
      
      const response = await fetch(`${API_BASE_URL}/api/lab-tests/upload-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Lab report uploaded successfully!');
        setShowReportUpload(false);
        setReportFile(null);
      } else {
        alert('Failed to upload report: ' + (data.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading report: ' + error.message);
    }
  };

  const bookTests = async () => {
    if (cart.length === 0) {
      alert('Please add tests to cart');
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('You are not logged in. Please log in to book tests.');
      return;
    }

    if (!bookingForm.scheduled_date) {
      alert('Please select an appointment date.');
      return;
    }

    let finalCenterName = '';
    let finalCenterAddress = '';

    if (bookingForm.booking_type === 'center') {
      if (bookingForm.selected_center_id === 'custom') {
        if (!bookingForm.custom_center_name?.trim()) {
          alert('Please enter your preferred clinic or hospital name.');
          return;
        }
        finalCenterName = bookingForm.custom_center_name.trim();
        finalCenterAddress = bookingForm.address.trim() || 'Selected Healthcare Facility';
      } else {
        const foundCenter = DIAGNOSTIC_CENTERS.find(c => c.id === bookingForm.selected_center_id) || DIAGNOSTIC_CENTERS[0];
        finalCenterName = foundCenter.name;
        finalCenterAddress = `${foundCenter.address}, ${foundCenter.city}`;
      }
    } else {
      if (!bookingForm.address?.trim()) {
        alert('Please enter your home address for sample collection.');
        return;
      }
    }

    if (!bookingForm.phone?.trim()) {
      alert('Please enter your contact phone number.');
      return;
    }
    
    try {
      const bookingData = {
        test_ids: cart.map(t => String(t._id)),
        test_names: cart.map(t => t.name),
        total_price: getTotalAmount(),
        scheduled_date: bookingForm.scheduled_date,
        scheduled_time: bookingForm.scheduled_time || '09:00',
        booking_type: bookingForm.booking_type,
        center_name: finalCenterName,
        center_address: finalCenterAddress,
        address: bookingForm.booking_type === 'center' ? `${finalCenterName} (${finalCenterAddress})` : bookingForm.address,
        city: bookingForm.city || 'Srikakulam',
        pincode: bookingForm.pincode,
        phone: bookingForm.phone,
        notes: bookingForm.notes,
        payment_method: bookingForm.payment_method || 'cod',
        payment_status: bookingForm.payment_method === 'online' ? 'paid' : 'pending',
        status: 'pending'
      };
      
      const response = await api.post('/api/lab-tests/bookings', bookingData);
      const data = response.data;

      if (data?.success !== false) {
        // Upload prescription if available
        if (prescriptionFile && data?.booking_id) {
          const formData = new FormData();
          formData.append('booking_id', data.booking_id);
          formData.append('file', prescriptionFile);
          await api.post('/api/lab-tests/upload-prescription', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
        
        alert(`🎉 Appointment Confirmed! Booking ID: ${data?.booking_id || 'BK' + Date.now()}`);
        setCart([]);
        setShowBookingForm(false);
        setShowCart(false);
        setPrescriptionFile(null);
        setBookingForm({
          scheduled_date: '',
          scheduled_time: '',
          booking_type: 'center',
          selected_center_id: 'center-1',
          custom_center_name: '',
          address: '',
          city: 'Srikakulam',
          pincode: '',
          phone: '',
          notes: ''
        });
        fetchBookings();
        setActiveTab('orders');
      } else {
        let errStr = data?.detail || data?.message || data?.error || 'Unknown error';
        if (Array.isArray(data?.detail)) errStr = data.detail.map(e => e.msg || JSON.stringify(e)).join(', ');
        alert('Failed to book tests: ' + errStr);
      }
    } catch (error) {
      console.error('Booking error:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        return;
      }
      const msg = error.response?.data?.detail || error.response?.data?.message || error.message || 'Unknown error';
      alert('Error booking tests: ' + msg);
    }
  };

  const filteredTests = tests.filter(test => {
    if (selectedSystem && test.health_concern !== selectedSystem && test.organ !== selectedSystem) return false;
    return true;
  });

  return (
    <ChatLayout>
      <div className="flex-1 overflow-y-auto bg-background-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PrescriptionTestsBanner />
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Lab Tests & Diagnostics</h1>
              <p className="text-muted">Book tests, upload reports, track your health</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowReportUpload(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span className="hidden sm:inline">Upload Report</span>
              </button>
              <a 
                href="tel:+911234567890"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Phone className="w-5 h-5" />
                <span className="hidden sm:inline">Book via Call</span>
              </a>
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Top Tab Navigation: Browse Tests vs Order & Booking History */}
          <div className="flex items-center gap-3 mb-6 border-b border-sidebar-border pb-3">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'browse'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-sidebar text-muted hover:text-white border border-sidebar-border'
              }`}
            >
              <TestTube className="w-4 h-4" /> Browse & Book Tests
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'orders'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-sidebar text-muted hover:text-white border border-sidebar-border'
              }`}
            >
              <FileText className="w-4 h-4" /> Order & Booking History
              {bookings.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  {bookings.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'orders' ? (
            <div className="bg-sidebar rounded-xl border border-sidebar-border p-6 shadow-lg mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary" />
                    Lab Tests Order & Booking History
                  </h2>
                  <p className="text-sm text-muted mt-1">Track slot schedules, sample collection status, and payment details</p>
                </div>
                <button
                  onClick={fetchBookings}
                  className="px-3 py-1.5 rounded-lg bg-sidebar-hover hover:bg-sidebar-border text-cyan-300 text-xs font-semibold transition-all border border-sidebar-border"
                >
                  🔄 Refresh History
                </button>
              </div>

              {bookings.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-sidebar-border rounded-xl">
                  <Package className="w-12 h-12 text-muted mx-auto mb-3" />
                  <p className="text-white font-semibold mb-1">No Lab Test Orders Yet</p>
                  <p className="text-muted text-xs mb-4">Book your recommended lab tests from the AI Chatbot or browse available packages.</p>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-all"
                  >
                    Browse Available Tests
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking._id} className="bg-sidebar-hover rounded-xl p-5 border border-sidebar-border flex flex-col gap-3 hover:border-primary/50 transition-all">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sidebar-border/60 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-cyan-300 font-bold">
                              ID: #{booking._id?.slice(-8)}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                              booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                              booking.status === 'confirmed' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                              booking.status === 'completed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                              'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                            }`}>
                              {booking.status || 'Scheduled'}
                            </span>
                            {booking.booking_type === 'home' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <Home className="w-3 h-3" /> Home Collection
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                <Building2 className="w-3 h-3" /> Hospital / Lab Visit
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-white text-base mt-2">
                            {booking.test_names?.join(', ') || 'Lab Diagnostic Screening'}
                          </h3>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-extrabold text-primary">₹{booking.total_price || 0}</p>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded mt-1 inline-block ${
                            booking.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-orange-500/20 text-orange-300'
                          }`}>
                            {booking.payment_status === 'paid' ? '💳 PAID ONLINE' : '💵 CASH ON COLLECTION'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-300 pt-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span><strong>Date:</strong> {booking.scheduled_date ? new Date(booking.scheduled_date).toLocaleDateString() : 'Tomorrow'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span><strong>Slot Time:</strong> {booking.scheduled_time || '09:00 AM'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {booking.booking_type === 'home' ? (
                            <Home className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                          )}
                          <span className="truncate">
                            <strong>{booking.booking_type === 'home' ? 'Home Address:' : 'Center/Hospital:'}</strong> {booking.center_name ? `${booking.center_name}` : (booking.address || 'MedAI Central Diagnostic Center')}
                          </span>
                        </div>
                      </div>

                      {booking.notes && (
                        <p className="text-xs text-muted italic bg-sidebar/50 p-2 rounded border border-sidebar-border/40">
                          Note: {booking.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">

          {/* Categories */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TestTube className="w-5 h-5 text-primary" />
              Test Categories
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedCategory === 'all'
                    ? 'border-primary bg-primary/10'
                    : 'border-sidebar-border bg-sidebar hover:border-primary/50'
                }`}
              >
                <Filter className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-gray-900 dark:text-white font-medium text-sm">All Tests</p>
              </button>
              {TEST_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedCategory === cat.id
                        ? 'border-primary bg-primary/10'
                        : 'border-sidebar-border bg-sidebar hover:border-primary/50'
                    }`}
                  >
                    <Icon className={`w-8 h-8 mx-auto mb-2 text-${cat.color}-500`} />
                    <p className="text-gray-900 dark:text-white font-medium text-sm">{cat.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body Systems Filter */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Filter by Body System
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedSystem(null)}
                className={`px-4 py-2 rounded-full transition-all ${
                  selectedSystem === null
                    ? 'bg-primary text-white'
                    : 'bg-sidebar border border-sidebar-border text-muted hover:border-primary'
                }`}
              >
                All
              </button>
              {BODY_SYSTEMS.map(system => {
                const Icon = system.icon;
                return (
                  <button
                    key={system.id}
                    onClick={() => setSelectedSystem(system.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                      selectedSystem === system.id
                        ? 'bg-primary text-white'
                        : 'bg-sidebar border border-sidebar-border text-muted hover:border-primary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {system.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tests */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-muted">Loading tests...</p>
            </div>
          ) : error ? (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 text-center">
              <p className="text-red-400">{error}</p>
              <button 
                onClick={fetchTests}
                className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="text-center py-12">
              <TestTube className="w-16 h-16 mx-auto mb-4 text-muted" />
              <p className="text-muted text-lg">
                {search || selectedSystem ? 'No tests match your filters.' : 'No tests available.'}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-muted">{filteredTests.length} tests found</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTests.map(test => (
                  <div key={test._id} className="bg-sidebar rounded-lg border border-sidebar-border p-5 hover:border-primary transition-all">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <TestTube className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold mb-1 line-clamp-2">{test.name}</h3>
                        {test.test_count && (
                          <p className="text-muted text-xs">{test.test_count} tests included</p>
                        )}
                      </div>
                    </div>
                    
                    {test.description && (
                      <p className="text-muted text-sm mb-4 line-clamp-3">{test.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 mb-4">
                      {test.fasting_required && (
                        <span className="px-2 py-1 bg-orange-900/20 border border-orange-800 rounded text-orange-400 text-xs">
                          Fasting Required
                        </span>
                      )}
                      {test.home_collection && (
                        <span className="px-2 py-1 bg-green-900/20 border border-green-800 rounded text-green-400 text-xs">
                          Home Collection
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        {test.original_price && (
                          <span className="text-muted text-sm line-through block">₹{test.original_price}</span>
                        )}
                        <span className="text-2xl font-bold text-primary">₹{test.price}</span>
                      </div>
                      <button
                        onClick={() => addToCart(test)}
                        disabled={cart.find(t => t._id === test._id)}
                        className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {cart.find(t => t._id === test._id) ? 'Added' : 'Add'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Bookings */}
          {bookings.length > 0 && (
            <div className="mt-12 bg-sidebar rounded-lg border border-sidebar-border p-6">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                My Bookings
              </h2>
              <div className="space-y-4">
                {bookings.map(booking => (
                  <div key={booking._id} className="bg-sidebar-hover rounded-lg p-4 border border-sidebar-border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold dark:text-white text-gray-900">
                          {booking.test_names?.join(', ') || 'Lab Tests'}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(booking.scheduled_date).toLocaleDateString()}
                          </span>
                          {booking.scheduled_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {booking.scheduled_time}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400' :
                        booking.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-800 text-green-700 dark:text-green-400' :
                        booking.status === 'completed' ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400' :
                        'bg-sidebar border border-sidebar-border text-muted'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-primary">₹{booking.total_price}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

        {/* Cart Sidebar */}
        {showCart && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setShowCart(false)}>
            <div 
              className="w-full max-w-md bg-sidebar h-full overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6" />
                  Test Cart ({cart.length})
                </h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 hover:bg-sidebar-hover rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <ShoppingCart className="w-16 h-16 text-muted mb-4" />
                  <p className="text-white font-semibold mb-2">Your cart is empty</p>
                  <p className="text-muted text-sm text-center">Add tests to your cart to book them</p>
                </div>
              ) : (
                <>
                  <div className="p-6 space-y-4">
                    {cart.map(test => (
                      <div key={test._id} className="bg-sidebar-hover rounded-lg p-4 border border-sidebar-border">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 rounded bg-primary/10 flex-shrink-0 flex items-center justify-center">
                            <TestTube className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium mb-1 line-clamp-2">{test.name}</h4>
                            {test.test_count && (
                              <p className="text-muted text-xs mb-2">{test.test_count} tests</p>
                            )}
                            <span className="text-primary font-bold">₹{test.price}</span>
                          </div>
                          <button
                            onClick={() => removeFromCart(test._id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {cart.some(t => t.requires_prescription) && !prescriptionFile && (
                      <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-4">
                        <p className="text-orange-400 text-sm font-medium mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Prescription Required for some tests
                        </p>
                        <button
                          onClick={() => setShowPrescriptionUpload(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Prescription
                        </button>
                      </div>
                    )}

                    {prescriptionFile && (
                      <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                        <p className="text-green-400 text-sm font-medium flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          Prescription uploaded: {prescriptionFile.name}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-6 border-t border-sidebar-border bg-sidebar-hover">
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-white font-bold text-lg">
                        <span>Total Amount</span>
                        <span className="text-primary">₹{getTotalAmount()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowCart(false);
                        setShowBookingForm(true);
                      }}
                      className="w-full bg-primary text-white py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      Proceed to Book
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Prescription Upload Modal */}
        {showPrescriptionUpload && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-sidebar rounded-lg border border-sidebar-border max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold dark:text-white text-gray-900">Upload Prescription</h3>
                <button
                  onClick={() => setShowPrescriptionUpload(false)}
                  className="p-2 hover:bg-sidebar-hover rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-muted text-sm mb-4">
                  Upload a valid prescription from a registered medical practitioner.
                </p>
                
                <input
                  ref={prescriptionInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handlePrescriptionUpload}
                  className="hidden"
                />
                
                <button
                  onClick={() => prescriptionInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-sidebar-border rounded-lg p-8 hover:border-primary transition-colors flex flex-col items-center gap-3"
                >
                  <Upload className="w-12 h-12 text-primary" />
                  <div>
                    <p className="text-white font-medium">Click to upload prescription</p>
                    <p className="text-muted text-sm">Supports JPG, PNG, PDF (Max 5MB)</p>
                  </div>
                </button>

                {prescriptionFile && (
                  <div className="mt-4 p-4 bg-green-900/20 border border-green-800 rounded-lg">
                    <p className="text-green-400 text-sm flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      {prescriptionFile.name}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowPrescriptionUpload(false)}
                disabled={!prescriptionFile}
                className="w-full bg-primary text-white py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Report Upload Modal */}
        {showReportUpload && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-sidebar rounded-lg border border-sidebar-border max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold dark:text-white text-gray-900">Upload Lab Report</h3>
                <button
                  onClick={() => setShowReportUpload(false)}
                  className="p-2 hover:bg-sidebar-hover rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-muted text-sm mb-4">
                  Upload your lab test reports to keep track of your health records.
                </p>
                
                <input
                  ref={reportInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleReportUpload}
                  className="hidden"
                />
                
                <button
                  onClick={() => reportInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-sidebar-border rounded-lg p-8 hover:border-primary transition-colors flex flex-col items-center gap-3"
                >
                  <FileText className="w-12 h-12 text-primary" />
                  <div>
                    <p className="text-white font-medium">Click to upload report</p>
                    <p className="text-muted text-sm">Supports JPG, PNG, PDF (Max 10MB)</p>
                  </div>
                </button>

                {reportFile && (
                  <div className="mt-4 p-4 bg-green-900/20 border border-green-800 rounded-lg">
                    <p className="text-green-400 text-sm flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      {reportFile.name}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={uploadLabReport}
                disabled={!reportFile}
                className="w-full bg-primary text-white py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload Report
              </button>
            </div>
          </div>
        )}

        {/* Booking Form Modal */}
        {showBookingForm && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-sidebar rounded-2xl border border-sidebar-border max-w-2xl w-full max-h-[90vh] flex flex-col my-auto shadow-2xl overflow-hidden text-left">
              {/* Modal Header */}
              <div className="p-5 border-b border-sidebar-border flex items-center justify-between bg-sidebar shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <TestTube className="w-5 h-5 text-primary" /> Book Lab Tests & Diagnostics
                  </h3>
                  <p className="text-xs text-muted mt-0.5">Select appointment location, date, time & preferred clinic/lab center</p>
                </div>
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="p-2 hover:bg-sidebar-hover text-muted hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 max-h-[calc(90vh-140px)]">
                {/* Selected Tests Summary */}
                <div className="bg-sidebar-hover rounded-xl p-4 border border-sidebar-border">
                  <h4 className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" /> Selected Tests & Scans ({cart.length})
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {cart.map(test => (
                      <div key={test._id} className="flex justify-between items-center py-1 border-b border-sidebar-border/40 last:border-0">
                        <span className="text-gray-300 font-medium">{test.name}</span>
                        <span className="text-white font-bold">₹{test.price}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-sidebar-border flex justify-between items-center font-bold text-sm">
                      <span className="text-white">Total Booking Amount</span>
                      <span className="text-primary text-base">₹{getTotalAmount()}</span>
                    </div>
                  </div>
                </div>

                {/* Facility / Visit Type Toggle */}
                <div>
                  <h4 className="text-white text-sm font-semibold mb-2.5 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cyan-400" /> Appointment Facility Type
                  </h4>
                  <div className="flex rounded-xl p-1 bg-sidebar-hover border border-sidebar-border gap-1">
                    <button
                      type="button"
                      onClick={() => setBookingForm({ ...bookingForm, booking_type: 'center' })}
                      className={`flex-1 py-3 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        bookingForm.booking_type === 'center'
                          ? 'bg-primary text-white shadow-md'
                          : 'text-muted hover:text-white'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-cyan-300" />
                      🏥 Clinic / Hospital / Lab Visit
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingForm({ ...bookingForm, booking_type: 'home' })}
                      className={`flex-1 py-3 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        bookingForm.booking_type === 'home'
                          ? 'bg-primary text-white shadow-md'
                          : 'text-muted hover:text-white'
                      }`}
                    >
                      <Home className="w-4 h-4 text-emerald-300" />
                      🏠 Home Sample Collection
                    </button>
                  </div>
                </div>

                {/* Center Selection OR Home Collection Address */}
                {bookingForm.booking_type === 'center' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white text-sm font-semibold flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-cyan-400" /> Select Partner Diagnostic Center / Hospital
                      </h4>
                      <span className="text-[11px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-medium">
                        Walk-in Appointment Available
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {DIAGNOSTIC_CENTERS.map(center => (
                        <div
                          key={center.id}
                          onClick={() => setBookingForm({ ...bookingForm, selected_center_id: center.id })}
                          className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                            bookingForm.selected_center_id === center.id
                              ? 'border-cyan-500 bg-cyan-500/10 text-white shadow-lg ring-1 ring-cyan-500'
                              : 'border-sidebar-border bg-sidebar-hover text-gray-300 hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white flex items-center gap-1.5">
                                  <Building2 className="w-4 h-4 text-cyan-400 shrink-0" /> {center.name}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-primary/20 text-cyan-300 border border-cyan-500/30">
                                  {center.badge}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-500 shrink-0" /> {center.address}, {center.city}
                              </p>
                              <p className="text-[11px] text-cyan-300/80 mt-1.5 font-medium">
                                🔬 Facilities: {center.facilities}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[11px] text-emerald-400 font-semibold block">{center.timing}</span>
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-2 ml-auto ${
                                bookingForm.selected_center_id === center.id ? 'bg-cyan-500 border-cyan-500 text-black' : 'border-gray-600'
                              }`}>
                                {bookingForm.selected_center_id === center.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Custom Clinic Selection */}
                      <div
                        onClick={() => setBookingForm({ ...bookingForm, selected_center_id: 'custom' })}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          bookingForm.selected_center_id === 'custom'
                            ? 'border-cyan-500 bg-cyan-500/10 text-white ring-1 ring-cyan-500'
                            : 'border-sidebar-border bg-sidebar-hover text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-white flex items-center gap-2">
                            <Building className="w-4 h-4 text-orange-400" /> Custom Clinic / Other Preferred Hospital
                          </span>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            bookingForm.selected_center_id === 'custom' ? 'bg-cyan-500 border-cyan-500 text-black' : 'border-gray-600'
                          }`}>
                            {bookingForm.selected_center_id === 'custom' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                        {bookingForm.selected_center_id === 'custom' && (
                          <div className="mt-3 space-y-2">
                            <input
                              type="text"
                              placeholder="Enter Clinic or Hospital Name"
                              value={bookingForm.custom_center_name}
                              onChange={(e) => setBookingForm({ ...bookingForm, custom_center_name: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <input
                              type="text"
                              placeholder="Hospital / Clinic Address & City"
                              value={bookingForm.address}
                              onChange={(e) => setBookingForm({ ...bookingForm, address: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                      <Home className="w-4 h-4 text-emerald-400" /> Home Sample Collection Address
                    </h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="House / Flat No, Street Address"
                        value={bookingForm.address}
                        onChange={(e) => setBookingForm({...bookingForm, address: e.target.value})}
                        className="w-full px-4 py-3 bg-sidebar-hover border border-sidebar-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="City"
                          value={bookingForm.city}
                          onChange={(e) => setBookingForm({...bookingForm, city: e.target.value})}
                          className="w-full px-4 py-3 bg-sidebar-hover border border-sidebar-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Pincode"
                          value={bookingForm.pincode}
                          onChange={(e) => setBookingForm({...bookingForm, pincode: e.target.value})}
                          className="w-full px-4 py-3 bg-sidebar-hover border border-sidebar-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Appointment Date & Time */}
                <div>
                  <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" /> Select Appointment Date & Slot
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-400 mb-1 block">Preferred Date</label>
                      <input
                        type="date"
                        value={bookingForm.scheduled_date}
                        onChange={(e) => setBookingForm({...bookingForm, scheduled_date: e.target.value})}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2.5 bg-sidebar-hover border border-sidebar-border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 mb-1 block">Preferred Slot Time</label>
                      <input
                        type="time"
                        value={bookingForm.scheduled_time}
                        onChange={(e) => setBookingForm({...bookingForm, scheduled_time: e.target.value})}
                        className="w-full px-4 py-2.5 bg-sidebar-hover border border-sidebar-border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Phone & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Contact Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9874563210"
                      value={bookingForm.phone}
                      onChange={(e) => setBookingForm({...bookingForm, phone: e.target.value})}
                      className="w-full px-4 py-2.5 bg-sidebar-hover border border-sidebar-border rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Doctor / Special Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="Fasting status, Doctor reference..."
                      value={bookingForm.notes}
                      onChange={(e) => setBookingForm({...bookingForm, notes: e.target.value})}
                      className="w-full px-4 py-2.5 bg-sidebar-hover border border-sidebar-border rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div>
                  <h4 className="text-white text-sm font-semibold mb-2.5">Payment Method</h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setBookingForm({ ...bookingForm, payment_method: 'at_center' })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        (bookingForm.payment_method || 'at_center') === 'at_center'
                          ? 'border-cyan-500 bg-cyan-500/10 text-white font-semibold shadow-md'
                          : 'border-sidebar-border bg-sidebar-hover text-muted hover:border-gray-500'
                      }`}
                    >
                      <p className="text-xs font-bold text-cyan-300">🏥 Pay at Center</p>
                      <p className="text-[10px] text-gray-400 mt-1">Pay on appointment visit</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingForm({ ...bookingForm, payment_method: 'cod' })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        bookingForm.payment_method === 'cod'
                          ? 'border-cyan-500 bg-cyan-500/10 text-white font-semibold shadow-md'
                          : 'border-sidebar-border bg-sidebar-hover text-muted hover:border-gray-500'
                      }`}
                    >
                      <p className="text-xs font-bold text-white">💵 Cash on Collection</p>
                      <p className="text-[10px] text-gray-400 mt-1">Pay phlebotomist/agent</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingForm({ ...bookingForm, payment_method: 'online' })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        bookingForm.payment_method === 'online'
                          ? 'border-cyan-500 bg-cyan-500/10 text-white font-semibold shadow-md'
                          : 'border-sidebar-border bg-sidebar-hover text-muted hover:border-gray-500'
                      }`}
                    >
                      <p className="text-xs font-bold text-emerald-400">💳 Online Payment</p>
                      <p className="text-[10px] text-gray-400 mt-1">Instant UPI / Card</p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Fixed Footer */}
              <div className="p-4 sm:p-5 border-t border-sidebar-border bg-sidebar shrink-0">
                <button
                  onClick={bookTests}
                  disabled={!bookingForm.scheduled_date || !bookingForm.phone}
                  className="w-full bg-primary text-white py-3.5 rounded-xl hover:bg-blue-600 transition-colors font-bold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Confirm Appointment Booking — ₹{getTotalAmount()}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </ChatLayout>
  );
}
