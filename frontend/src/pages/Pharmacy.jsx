import { useState, useEffect, useRef } from 'react';
import { 
  Search, ShoppingCart, Plus, Minus, X, Phone, Upload, Package, 
  Pill, Heart, Activity, Leaf, Thermometer, Stethoscope, 
  Shield, Baby, Eye, Bone, Brain, Filter, ChevronDown, Check,
  Truck, Zap, Clock
} from 'lucide-react';
import ChatLayout from '../components/ChatLayout';
import api from '../services/api';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Health Categories
const HEALTH_CATEGORIES = [
  { id: 'medicines', name: 'Medicines', icon: Pill, color: 'blue' },
  { id: 'vitamins', name: 'Vitamins & Supplements', icon: Leaf, color: 'green' },
  { id: 'medical_devices', name: 'Medical Devices', icon: Stethoscope, color: 'purple' },
  { id: 'diet_nutrition', name: 'Diet & Nutrition', icon: Heart, color: 'red' },
  { id: 'fitness', name: 'Fitness & Wellness', icon: Activity, color: 'orange' },
  { id: 'personal_care', name: 'Personal Care', icon: Shield, color: 'pink' },
  { id: 'baby_care', name: 'Baby Care', icon: Baby, color: 'cyan' },
  { id: 'ayurveda', name: 'Ayurveda & Herbs', icon: Leaf, color: 'emerald' },
];

// Health Concerns
const HEALTH_CONCERNS = [
  { id: 'diabetes', name: 'Diabetes Care', icon: Thermometer },
  { id: 'heart', name: 'Heart Health', icon: Heart },
  { id: 'immunity', name: 'Immunity Boosters', icon: Shield },
  { id: 'bone', name: 'Bone & Joint', icon: Bone },
  { id: 'mental', name: 'Mental Wellness', icon: Brain },
  { id: 'eye', name: 'Eye Care', icon: Eye },
];

export default function Pharmacy() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('browse');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedConcern, setSelectedConcern] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPrescriptionUpload, setShowPrescriptionUpload] = useState(false);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({
    address: '',
    city: '',
    pincode: '',
    phone: '',
    deliveryOption: 'express',
    paymentMethod: 'cod'
  });
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeTab, setStripeTab] = useState('card');
  const [cardForm, setCardForm] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [upiId, setUpiId] = useState('');
  const [isProcessingStripe, setIsProcessingStripe] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, [selectedCategory, search]);

  useEffect(() => {
    try {
      const pendingRaw = localStorage.getItem('pendingPharmacyOrder');
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        localStorage.removeItem('pendingPharmacyOrder');

        if (pending?.medicines && Array.isArray(pending.medicines)) {
          const autoCart = pending.medicines.map((mName, idx) => ({
            _id: `rec-med-${idx}-${Date.now()}`,
            name: typeof mName === 'string' ? mName : (mName?.name || 'Prescription Medicine'),
            price: 199 + idx * 100,
            quantity: 1,
            category: 'medicines',
            requires_prescription: false,
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

          setCheckoutForm({
            address: uLoc || '123A, Indhra Nagar, Main Road',
            phone: uPhone || '9874563210',
            city: uCity || 'Srikakulam',
            pincode: uPin || '532001',
            deliveryOption: 'express',
            paymentMethod: 'cod',
          });
          setShowCheckout(true);
        }
      }
    } catch (e) {
      console.error('Error handling pending pharmacy order:', e);
    }
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/orders/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (search) params.append('search', search);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`${API_BASE_URL}/api/products?${params}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setProducts(data.data);
      } else {
        setError(data.detail || data.message || 'Failed to fetch products');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setProducts([]);
        setError(null);
      } else {
        setError(`Network error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item._id === product._id);
    if (existing) {
      setCart(cart.map(item => 
        item._id === product._id ? {...item, quantity: item.quantity + 1} : item
      ));
    } else {
      setCart([...cart, {...product, quantity: 1}]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item._id === productId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? {...item, quantity: newQuantity} : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item._id !== productId));
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const requiresPrescription = () => {
    return cart.some(item => item.requires_prescription);
  };

  const handlePrescriptionUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPrescriptionFile(file);
    }
  };

  const handleCheckout = async () => {
    if (requiresPrescription() && !prescriptionFile) {
      setShowPrescriptionUpload(true);
      return;
    }
    
    setShowCheckout(true);
  };

  const placeOrder = async () => {
    try {
      const token = localStorage.getItem('authToken');

      if (!token) {
        alert('You are not logged in. Please log in to place an order.');
        return;
      }

      if (!checkoutForm.address.trim()) {
        alert('Please enter your delivery address.');
        return;
      }
      if (!checkoutForm.city.trim()) {
        alert('Please enter your city.');
        return;
      }
      if (!checkoutForm.pincode.trim()) {
        alert('Please enter your pincode.');
        return;
      }
      if (!checkoutForm.phone.trim()) {
        alert('Please enter your phone number.');
        return;
      }

      const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const formatted2Hours = twoHoursLater.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' });

      const expectedDeliveryText = (checkoutForm.deliveryOption || 'express') === 'express'
        ? `Today within 2 Hours (by ${formatted2Hours})`
        : `Tomorrow, ${tomorrowStr} by 5:00 PM`;

      const orderData = {
        items: cart.map((item, idx) => ({
          product_id: String(item._id || item.id || `med-item-${idx}`),
          product_name: String(item.name || item.product_name || 'Prescription Medicine'),
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 199
        })),
        total_amount: Number(getTotalAmount()),
        shipping_address: {
          address: checkoutForm.address || 'Govinda Nagar',
          city: checkoutForm.city || 'Srikakulam',
          pincode: checkoutForm.pincode || '532001',
          phone: checkoutForm.phone || '9874563210'
        },
        delivery_option: checkoutForm.deliveryOption || 'express',
        expected_delivery: expectedDeliveryText,
        payment_method: checkoutForm.paymentMethod || 'cod',
        requires_prescription: Boolean(requiresPrescription())
      };
      
      const response = await api.post('/api/orders/', orderData);
      const data = response.data;

      if (data?.success !== false) {
        if (prescriptionFile && data?.order_id) {
          const formData = new FormData();
          formData.append('order_id', data.order_id);
          formData.append('file', prescriptionFile);
          await api.post('/api/orders/upload-prescription', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
        
        alert(`🎉 Order placed successfully! Order Number: ${data?.order_number || 'ORD' + Date.now()}`);
        // Notify chatbot bubble that an order was placed so reminders unlock
        window.dispatchEvent(new CustomEvent('pharmacyOrderPlaced'));
        setCart([]);
        setShowCheckout(false);
        setShowCart(false);
        setShowStripeModal(false);
        setPrescriptionFile(null);
        setCardForm({ name: '', number: '', expiry: '', cvv: '' });
        setUpiId('');
        fetchOrders();
        setActiveTab('orders');
      } else {
        let errStr = data?.detail || data?.message || data?.error || 'Unknown error';
        if (Array.isArray(data?.detail)) errStr = data.detail.map(e => e.msg || JSON.stringify(e)).join(', ');
        alert('Failed to place order: ' + errStr);
      }
    } catch (error) {
      console.error('Order error:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        return;
      }
      const msg = error.response?.data?.detail || error.response?.data?.message || error.message || 'Unknown error';
      alert('Error placing order: ' + msg);
    }
  };

  const filteredProducts = selectedConcern
    ? products.filter(p => p.health_concern === selectedConcern)
    : products;

  return (
    <ChatLayout>
      <div className="flex-1 overflow-y-auto bg-background-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">MedAI Pharmacy</h1>
              <p className="text-muted">Order medicines, supplements & health products</p>
            </div>
            <div className="flex items-center gap-4">
              <a 
                href="tel:+911234567890"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Phone className="w-5 h-5" />
                <span className="hidden sm:inline">Call to Order</span>
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

          {/* Top Tab Navigation Bar */}
          <div className="flex items-center gap-3 mb-6 border-b border-sidebar-border pb-3">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'browse'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-sidebar text-muted hover:text-white border border-sidebar-border'
              }`}
            >
              <Package className="w-4 h-4" /> Browse Medicines & Products
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'orders'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-sidebar text-muted hover:text-white border border-sidebar-border'
              }`}
            >
              <ShoppingCart className="w-4 h-4" /> Order History
              {orders.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  {orders.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'orders' ? (
            <div className="bg-sidebar rounded-xl border border-sidebar-border p-6 shadow-lg mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Package className="w-6 h-6 text-primary" />
                    Pharmacy Order History
                  </h2>
                  <p className="text-sm text-muted mt-1">Track medicine delivery status, order details, and payment receipts</p>
                </div>
                <button
                  onClick={fetchOrders}
                  className="px-3 py-1.5 rounded-lg bg-sidebar-hover hover:bg-sidebar-border text-cyan-300 text-xs font-semibold transition-all border border-sidebar-border cursor-pointer"
                >
                  🔄 Refresh Orders
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-sidebar-border rounded-xl">
                  <Package className="w-12 h-12 text-muted mx-auto mb-3" />
                  <p className="text-white font-semibold mb-1">No Pharmacy Orders Yet</p>
                  <p className="text-muted text-xs mb-4">Order your prescribed or recommended medicines directly from the AI Chatbot or browse available healthcare products.</p>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-all cursor-pointer"
                  >
                    Browse Medicines
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((ord) => (
                    <div key={ord._id} className="bg-sidebar-hover rounded-xl p-5 border border-sidebar-border flex flex-col gap-3 hover:border-primary/50 transition-all">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sidebar-border/60 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-cyan-300 font-bold">
                              Order #{ord.order_number || ord._id?.slice(-8)}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                              ord.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                              ord.status === 'shipped' || ord.status === 'processing' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                              ord.status === 'delivered' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                              'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                            }`}>
                              {ord.status || 'Processing'}
                            </span>
                            {(ord.delivery_option === 'express' || !ord.delivery_option) ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-cyan-300 fill-cyan-300" /> Express Quick Delivery
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                                <Truck className="w-3 h-3" /> Standard Delivery
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs">
                            <span className="text-gray-400">
                              Ordered on: {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Today'}
                            </span>
                            <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              <Clock className="w-3.5 h-3.5" /> Expected: {ord.expected_delivery || 'Today within 2 Hours (Quick Delivery)'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-extrabold text-primary">₹{ord.total_amount || 0}</p>
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg mt-1 inline-flex items-center gap-1 border ${
                            ord.payment_method === 'online' || ord.payment_status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}>
                            {ord.payment_method === 'online' || ord.payment_status === 'paid' ? '💳 Online Payment (Stripe / UPI)' : '💵 Cash on Delivery'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 py-1">
                        <p className="text-xs font-semibold text-gray-400">Order Items:</p>
                        <div className="flex flex-wrap gap-2">
                          {(ord.items || []).map((item, idx) => (
                            <span key={idx} className="text-xs px-2.5 py-1 bg-sidebar rounded border border-sidebar-border text-white">
                              {item.product_name || item.name} x {item.quantity || 1} — ₹{(item.price || 0) * (item.quantity || 1)}
                            </span>
                          ))}
                        </div>
                      </div>

                      {ord.shipping_address && (
                        <div className="text-xs text-muted bg-sidebar/50 p-2.5 rounded border border-sidebar-border/40 flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <strong>Delivery Address:</strong> {ord.shipping_address.address}, {ord.shipping_address.city} {ord.shipping_address.pincode} · Phone: {ord.shipping_address.phone}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input
                    type="text"
                    placeholder="Search for medicines, supplements, health products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

          {/* Categories */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Shop by Category
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedCategory === 'all'
                    ? 'border-primary bg-primary/10'
                    : 'border-sidebar-border bg-sidebar hover:border-primary/50'
                }`}
              >
                <Filter className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-gray-900 dark:text-white font-semibold text-sm">All Products</p>
              </button>
              {HEALTH_CATEGORIES.map(cat => {
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
                    <p className="text-gray-900 dark:text-white font-semibold text-sm">{cat.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Health Concerns */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Shop by Health Concerns
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedConcern(null)}
                className={`px-4 py-2 rounded-full transition-all ${
                  selectedConcern === null
                    ? 'bg-primary text-white'
                    : 'bg-sidebar border border-sidebar-border text-muted hover:border-primary'
                }`}
              >
                All
              </button>
              {HEALTH_CONCERNS.map(concern => {
                const Icon = concern.icon;
                return (
                  <button
                    key={concern.id}
                    onClick={() => setSelectedConcern(concern.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                      selectedConcern === concern.id
                        ? 'bg-primary text-white'
                        : 'bg-sidebar border border-sidebar-border text-muted hover:border-primary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {concern.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Products */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-muted">Loading products...</p>
            </div>
          ) : error ? (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 text-center">
              <p className="text-red-400">{error}</p>
              <button 
                onClick={fetchProducts}
                className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted" />
              <p className="text-muted text-lg">
                {search || selectedConcern ? 'No products match your search.' : 'No products available.'}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-muted">{filteredProducts.length} products found</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map(product => (
                  <div key={product._id} className="bg-sidebar rounded-lg border border-sidebar-border p-5 hover:border-primary transition-all">
                    <div className="mb-4">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-40 object-cover rounded" />
                      ) : (
                        <div className="w-full h-40 bg-sidebar-hover rounded flex items-center justify-center">
                          <Package className="w-12 h-12 text-muted" />
                        </div>
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <h3 className="text-white font-semibold mb-1 line-clamp-2">{product.name}</h3>
                      {product.manufacturer && (
                        <p className="text-muted text-xs">{product.manufacturer}</p>
                      )}
                    </div>
                    
                    {product.description && (
                      <p className="text-muted text-sm mb-3 line-clamp-2">{product.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 mb-3">
                      {product.original_price && (
                        <span className="text-muted text-sm line-through">₹{product.original_price}</span>
                      )}
                      <span className="text-2xl font-bold text-primary">₹{product.price}</span>
                    </div>
                    
                    {product.requires_prescription && (
                      <div className="mb-3 px-2 py-1 bg-orange-900/20 border border-orange-800 rounded text-orange-400 text-xs inline-flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Prescription Required
                      </div>
                    )}
                    
                    <button
                      onClick={() => addToCart(product)}
                      className="w-full bg-primary text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </button>
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
                  Shopping Cart ({cart.length})
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
                  <p className="text-muted text-sm text-center">Add products to your cart to see them here</p>
                </div>
              ) : (
                <div>
                  <div className="p-6 space-y-4">
                    {cart.map(item => (
                      <div key={item._id} className="bg-sidebar-hover rounded-lg p-4 border border-sidebar-border">
                        <div className="flex gap-4">
                          <div className="w-16 h-16 bg-sidebar rounded flex-shrink-0 flex items-center justify-center">
                            <Package className="w-8 h-8 text-muted" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium mb-1 line-clamp-2">{item.name}</h4>
                            {item.manufacturer && (
                              <p className="text-muted text-xs mb-2">{item.manufacturer}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-primary font-bold">₹{item.price}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQuantity(item._id, -1)}
                                  className="w-8 h-8 rounded bg-sidebar border border-sidebar-border flex items-center justify-center hover:bg-primary hover:border-primary transition-colors"
                                >
                                  <Minus className="w-4 h-4 text-white" />
                                </button>
                                <span className="w-8 text-center text-white font-medium">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item._id, 1)}
                                  className="w-8 h-8 rounded bg-sidebar border border-sidebar-border flex items-center justify-center hover:bg-primary hover:border-primary transition-colors"
                                >
                                  <Plus className="w-4 h-4 text-white" />
                                </button>
                              </div>
                            </div>
                            {item.requires_prescription && (
                              <div className="mt-2 px-2 py-1 bg-orange-900/20 border border-orange-800 rounded text-orange-400 text-xs inline-flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Prescription Required
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeFromCart(item._id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {requiresPrescription() && !prescriptionFile && (
                      <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-4">
                        <p className="text-orange-400 text-sm font-medium mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Prescription Required
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
                      <div className="flex justify-between text-muted">
                        <span>Subtotal</span>
                        <span>₹{getTotalAmount()}</span>
                      </div>
                      <div className="flex justify-between text-muted">
                        <span>Delivery</span>
                        <span className="text-green-500">FREE</span>
                      </div>
                      <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-sidebar-border">
                        <span>Total</span>
                        <span className="text-primary">₹{getTotalAmount()}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleCheckout}
                      className="w-full bg-primary text-white py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                </div>
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
                  Please upload a valid prescription from a registered medical practitioner.
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handlePrescriptionUpload}
                  className="hidden"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
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

        {/* Checkout Modal */}
        {showCheckout && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-sidebar rounded-2xl border border-sidebar-border max-w-2xl w-full max-h-[90vh] flex flex-col my-auto shadow-2xl overflow-hidden text-left">
              {/* Modal Header */}
              <div className="p-5 border-b border-sidebar-border flex items-center justify-between bg-sidebar shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" /> Pharmacy Order Checkout
                  </h3>
                  <p className="text-xs text-muted mt-0.5">Confirm delivery address, quick delivery option & payment method</p>
                </div>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="p-2 hover:bg-sidebar-hover text-muted hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 max-h-[calc(90vh-140px)]">
                {/* Delivery Option Selection */}
                <div>
                  <h4 className="text-white text-sm font-semibold mb-2.5 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-cyan-400" /> Choose Delivery Option
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setCheckoutForm({ ...checkoutForm, deliveryOption: 'express' })}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        checkoutForm.deliveryOption === 'express'
                          ? 'border-cyan-500 bg-cyan-500/10 text-white shadow-lg ring-1 ring-cyan-500'
                          : 'border-sidebar-border bg-sidebar-hover text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                          <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" /> ⚡ Express Quick Delivery
                        </span>
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-extrabold border border-cyan-500/30">
                          2 HOURS
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300">Fast local pharmacy dispatch direct to your doorstep.</p>
                      <div className="mt-2.5 pt-2 border-t border-cyan-500/20 flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        Expected Today within 2 Hours
                      </div>
                    </div>

                    <div
                      onClick={() => setCheckoutForm({ ...checkoutForm, deliveryOption: 'standard' })}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        checkoutForm.deliveryOption === 'standard'
                          ? 'border-cyan-500 bg-cyan-500/10 text-white shadow-lg ring-1 ring-cyan-500'
                          : 'border-sidebar-border bg-sidebar-hover text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-blue-300 flex items-center gap-1">
                          <Truck className="w-4 h-4 text-blue-400" /> 🚚 Standard Courier
                        </span>
                        <span className="text-[10px] bg-green-500/20 text-green-300 px-2 py-0.5 rounded font-extrabold border border-green-500/30">
                          FREE
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300">Standard shipment from central regional warehouse.</p>
                      <div className="mt-2.5 pt-2 border-t border-sidebar-border flex items-center gap-1.5 text-xs text-blue-400 font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        Expected Tomorrow by 5:00 PM
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-white text-sm font-semibold">Delivery Address</h4>
                    <button
                      type="button"
                      onClick={() => setCheckoutForm({
                        ...checkoutForm,
                        address: '123A, Indhra Nagar, Main Road',
                        city: 'Srikakulam',
                        pincode: '532001',
                        phone: '9874563210'
                      })}
                      className="text-xs text-cyan-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      ⚡ Auto-fill Sample Address
                    </button>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="e.g. 123A, Indhra Nagar, Main Road"
                      value={checkoutForm.address}
                      onChange={(e) => setCheckoutForm({...checkoutForm, address: e.target.value})}
                      className="w-full px-4 py-3 bg-sidebar-hover border border-sidebar-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="e.g. Srikakulam"
                        value={checkoutForm.city}
                        onChange={(e) => setCheckoutForm({...checkoutForm, city: e.target.value})}
                        className="w-full px-4 py-3 bg-sidebar-hover border border-sidebar-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                      <input
                        type="text"
                        placeholder="e.g. 532001"
                        value={checkoutForm.pincode}
                        onChange={(e) => setCheckoutForm({...checkoutForm, pincode: e.target.value})}
                        className="w-full px-4 py-3 bg-sidebar-hover border border-sidebar-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>
                    <input
                      type="tel"
                      placeholder="e.g. 9874563210"
                      value={checkoutForm.phone}
                      onChange={(e) => setCheckoutForm({...checkoutForm, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-sidebar-hover border border-sidebar-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <h4 className="text-white text-sm font-semibold mb-2.5">Payment Method</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCheckoutForm({ ...checkoutForm, paymentMethod: 'cod' })}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        checkoutForm.paymentMethod === 'cod'
                          ? 'border-cyan-500 bg-cyan-500/10 text-white font-semibold shadow-md'
                          : 'border-sidebar-border bg-sidebar-hover text-muted hover:border-gray-500'
                      }`}
                    >
                      <p className="text-xs font-bold text-white">💵 Cash on Delivery</p>
                      <p className="text-[10px] text-gray-400 mt-1">Pay when order arrives</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutForm({ ...checkoutForm, paymentMethod: 'online' })}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        checkoutForm.paymentMethod === 'online'
                          ? 'border-cyan-500 bg-cyan-500/10 text-white font-semibold shadow-md'
                          : 'border-sidebar-border bg-sidebar-hover text-muted hover:border-gray-500'
                      }`}
                    >
                      <p className="text-xs font-bold text-emerald-400">💳 Online Payment (UPI/Card)</p>
                      <p className="text-[10px] text-gray-400 mt-1">Instant digital checkout</p>
                    </button>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-sidebar-hover rounded-xl p-4 border border-sidebar-border">
                  <h4 className="text-white text-sm font-semibold mb-2 flex items-center justify-between">
                    <span>Order Summary ({cart.length} items)</span>
                    <span className="text-xs text-emerald-400 font-normal">
                      {checkoutForm.deliveryOption === 'express' ? '⚡ Quick 2-Hour Delivery' : '🚚 Standard Shipping'}
                    </span>
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {cart.map(item => (
                      <div key={item._id} className="flex justify-between items-center py-1 border-b border-sidebar-border/40 last:border-0">
                        <span className="text-gray-300">{item.name} x {item.quantity}</span>
                        <span className="text-white font-bold">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-sidebar-border flex justify-between items-center font-bold text-sm">
                      <span className="text-white">Total Amount</span>
                      <span className="text-primary text-base">₹{getTotalAmount()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Fixed Footer */}
              <div className="p-4 sm:p-5 border-t border-sidebar-border bg-sidebar shrink-0">
                <button
                  onClick={() => {
                    if (!checkoutForm.address || !checkoutForm.city || !checkoutForm.pincode || !checkoutForm.phone) return;
                    if (checkoutForm.paymentMethod === 'online') {
                      setShowStripeModal(true);
                    } else {
                      placeOrder();
                    }
                  }}
                  disabled={!checkoutForm.address || !checkoutForm.city || !checkoutForm.pincode || !checkoutForm.phone}
                  className="w-full bg-primary text-white py-3.5 rounded-xl hover:bg-blue-600 transition-colors font-bold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  {checkoutForm.paymentMethod === 'online'
                    ? `Pay Online — ₹${getTotalAmount()} (${checkoutForm.deliveryOption === 'express' ? 'Express 2-Hr' : 'Standard'})`
                    : `Place Order — ₹${getTotalAmount()} (${checkoutForm.deliveryOption === 'express' ? 'Express 2-Hr' : 'Standard'})`
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Stripe-style Online Payment Modal ── */}
        {showStripeModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-[#0f1923] rounded-2xl border border-sidebar-border max-w-md w-full shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-sidebar-border bg-[#131f2e]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16v2H4zm0 4h16v2H4zm0 4h10v2H4zm0 4h7v2H4z"/></svg>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Secure Payment</p>
                    <p className="text-muted text-[10px]">256-bit SSL encrypted</p>
                  </div>
                </div>
                <button onClick={() => setShowStripeModal(false)} className="p-2 text-muted hover:text-white hover:bg-sidebar-hover rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Amount Banner */}
              <div className="mx-6 mt-5 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                <span className="text-sm text-gray-300 font-medium">Amount to Pay</span>
                <span className="text-xl font-extrabold text-primary">₹{getTotalAmount()}</span>
              </div>

              {/* Tab selector */}
              <div className="flex gap-2 mx-6 mt-4">
                <button
                  onClick={() => setStripeTab('card')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${stripeTab === 'card' ? 'bg-primary text-white shadow-lg' : 'bg-sidebar-hover text-muted hover:text-white border border-sidebar-border'}`}
                >
                  💳 Debit / Credit Card
                </button>
                <button
                  onClick={() => setStripeTab('upi')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${stripeTab === 'upi' ? 'bg-primary text-white shadow-lg' : 'bg-sidebar-hover text-muted hover:text-white border border-sidebar-border'}`}
                >
                  📲 UPI
                </button>
              </div>

              <div className="px-6 pb-6 mt-4 space-y-3">
                {stripeTab === 'card' ? (
                  <>
                    <div>
                      <label className="block text-xs text-muted font-semibold mb-1.5 uppercase tracking-wide">Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="Name on card"
                        value={cardForm.name}
                        onChange={e => setCardForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-4 py-3 bg-sidebar-hover border border-sidebar-border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted font-semibold mb-1.5 uppercase tracking-wide">Card Number</label>
                      <input
                        type="text"
                        placeholder="1234  5678  9012  3456"
                        maxLength={19}
                        value={cardForm.number}
                        onChange={e => {
                          const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                          const formatted = raw.match(/.{1,4}/g)?.join('  ') || raw;
                          setCardForm(p => ({ ...p, number: formatted }));
                        }}
                        className="w-full px-4 py-3 bg-sidebar-hover border border-sidebar-border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono tracking-widest"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-muted font-semibold mb-1.5 uppercase tracking-wide">Expiry</label>
                        <input
                          type="text"
                          placeholder="MM / YY"
                          maxLength={7}
                          value={cardForm.expiry}
                          onChange={e => {
                            let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                            if (val.length > 2) val = val.slice(0, 2) + ' / ' + val.slice(2);
                            setCardForm(p => ({ ...p, expiry: val }));
                          }}
                          className="w-full px-4 py-3 bg-sidebar-hover border border-sidebar-border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted font-semibold mb-1.5 uppercase tracking-wide">CVV</label>
                        <input
                          type="password"
                          placeholder="•••"
                          maxLength={4}
                          value={cardForm.cvv}
                          onChange={e => setCardForm(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                          className="w-full px-4 py-3 bg-sidebar-hover border border-sidebar-border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                      </div>
                    </div>
                    {/* Card brand logos */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-muted">Accepted:</span>
                      {['VISA', 'MC', 'AMEX', 'RuPay'].map(b => (
                        <span key={b} className="text-[10px] font-bold px-2 py-0.5 rounded bg-sidebar-hover border border-sidebar-border text-gray-300">{b}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs text-muted font-semibold mb-1.5 uppercase tracking-wide">UPI ID</label>
                      <input
                        type="text"
                        placeholder="yourname@upi or phone@paytm"
                        value={upiId}
                        onChange={e => setUpiId(e.target.value)}
                        className="w-full px-4 py-3 bg-sidebar-hover border border-sidebar-border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {['@okaxis', '@ybl', '@paytm', '@upi', '@okhdfcbank'].map(handle => (
                        <button
                          key={handle}
                          type="button"
                          onClick={() => {
                            const base = upiId.split('@')[0] || 'user';
                            setUpiId(base + handle);
                          }}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-sidebar-hover border border-sidebar-border text-cyan-300 hover:border-primary hover:text-primary transition-colors"
                        >
                          {handle}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                      <span>🔒</span>
                      <span>Your UPI app will open to confirm the payment of <strong>₹{getTotalAmount()}</strong></span>
                    </div>
                  </>
                )}

                <button
                  onClick={async () => {
                    // Validate inputs
                    if (stripeTab === 'card') {
                      if (!cardForm.name.trim() || cardForm.number.replace(/\s/g, '').length < 16 || !cardForm.expiry || cardForm.cvv.length < 3) {
                        alert('Please fill in all card details correctly.');
                        return;
                      }
                    } else {
                      if (!upiId.includes('@')) {
                        alert('Please enter a valid UPI ID (e.g. name@upi).');
                        return;
                      }
                    }
                    setIsProcessingStripe(true);
                    // Simulate payment processing delay
                    await new Promise(r => setTimeout(r, 1800));
                    setIsProcessingStripe(false);
                    await placeOrder();
                  }}
                  disabled={isProcessingStripe}
                  className="w-full mt-2 py-3.5 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isProcessingStripe ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Pay ₹{getTotalAmount()} Securely
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] text-muted mt-1">
                  🔒 Your payment info is encrypted and never stored on our servers.
                </p>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
    </ChatLayout>
  );
}
