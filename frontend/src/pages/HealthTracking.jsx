import { useState, useEffect } from 'react';
import { 
    Activity, Heart, Droplets, Moon, TrendingUp, Weight, ThermometerSun, 
    Plus, AlertCircle, CheckCircle, ArrowUp, ArrowDown, Minus,
    Smile, Frown, Meh, Zap, Sparkles, Stethoscope, TestTube, FileEdit, User, ShieldAlert, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

function PrescriptionHealthBanner() {
  const [ap, setAp] = useState(null);
  useEffect(() => {
    try { setAp(JSON.parse(localStorage.getItem('activePrescription') || 'null')); } catch (e) { /* ignore */ }
  }, []);
  if (!ap) return null;
  return (
    <div className="mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 dark:border-blue-500/20 flex flex-wrap items-start gap-3">
      <Sparkles className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Active Health Condition: {ap.diagnosis}</p>
        <div className="flex flex-wrap gap-3 mt-2">
          {ap.medicines?.slice(0, 3).map((m, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-white/5 border border-blue-200 dark:border-white/10 text-xs text-blue-700 dark:text-gray-300">
              <Stethoscope className="w-3 h-3" />{m.name} {m.dosage}
            </span>
          ))}
          {ap.lab_tests?.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-xs text-orange-700 dark:text-orange-300">
              <TestTube className="w-3 h-3" />{ap.lab_tests.join(', ')}
            </span>
          )}
        </div>
      </div>
      <Link to="/prescriptions" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0">Prescription</Link>
    </div>
  );
}
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { healthAPI } from '../services/api';
import ChatLayout from '../components/ChatLayout';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://medai-healthcare-platform-y8lf.onrender.com';

export default function HealthTracking() {
    const [showAddLog, setShowAddLog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [healthLogs, setHealthLogs] = useState([]);
    const [saveStatus, setSaveStatus] = useState(''); // 'success' | 'error' | ''

    useEffect(() => {
        fetchHealthLogs();
    }, []);

    const fetchHealthLogs = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE_URL}/api/health/logs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHealthLogs(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Error fetching logs:', e);
        }
    };

    const [formData, setFormData] = useState({
        // 1. Baseline Personal Information
        age: '',
        sex: 'male',
        height: '',
        weight: '',
        ethnicity: 'asian',

        // 2. Daily Physiological Metrics
        bloodPressureSystolic: '',
        bloodPressureDiastolic: '',
        bloodSugar: '',
        glucoseType: 'fasting',
        heartRate: '',
        temperature: '',
        oxygenLevel: '',

        // 3. Lifestyle and Habits
        exercise: '',
        sleep: '',
        waterIntake: '',
        mood: 'good',
        painLevel: '1',

        // 4. Medical Background
        medicationSchedule: '',
        chronicConditions: '',
        allergies: '',
        notes: ''
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Calculate BMI
    const calculateBMI = () => {
        const hInMeters = parseFloat(formData.height) / 100;
        const wInKg = parseFloat(formData.weight);
        if (hInMeters > 0 && wInKg > 0) {
            const bmi = (wInKg / (hInMeters * hInMeters)).toFixed(1);
            let category = 'Normal';
            if (bmi < 18.5) category = 'Underweight';
            else if (bmi >= 25 && bmi < 30) category = 'Overweight';
            else if (bmi >= 30) category = 'Obese';
            return { bmi, category };
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const vitalSigns = {
                blood_pressure_systolic: formData.bloodPressureSystolic ? parseInt(formData.bloodPressureSystolic) : null,
                blood_pressure_diastolic: formData.bloodPressureDiastolic ? parseInt(formData.bloodPressureDiastolic) : null,
                blood_sugar: formData.bloodSugar ? parseFloat(formData.bloodSugar) : null,
                heart_rate: formData.heartRate ? parseInt(formData.heartRate) : null,
                weight: formData.weight ? parseFloat(formData.weight) : null,
                height: formData.height ? parseFloat(formData.height) : null,
                temperature: formData.temperature ? parseFloat(formData.temperature) : null,
                oxygen_saturation: formData.oxygenLevel ? parseInt(formData.oxygenLevel) : null,
                age: formData.age ? parseInt(formData.age) : null,
                sex: formData.sex,
                ethnicity: formData.ethnicity,
                glucose_type: formData.glucoseType,
                exercise_minutes: formData.exercise ? parseInt(formData.exercise) : null,
                sleep_hours: formData.sleep ? parseFloat(formData.sleep) : null,
                water_intake_ml: formData.waterIntake ? parseInt(formData.waterIntake) : null,
                pain_level: formData.painLevel ? parseInt(formData.painLevel) : null,
                medication_schedule: formData.medicationSchedule || null,
                chronic_conditions: formData.chronicConditions || null,
                allergies: formData.allergies || null
            };

            const logData = {
                vital_signs: vitalSigns,
                symptoms: [],
                mood: formData.mood || null,
                notes: formData.notes || null
            };

            await healthAPI.addHealthLog(logData);
            await fetchHealthLogs();
            
            setShowAddLog(false);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus(''), 4000);
        } catch (error) {
            console.error('Error saving health log:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(''), 4000);
        } finally {
            setLoading(false);
        }
    };

    const logsDesc = [...healthLogs].sort((a, b) => (a.date < b.date ? 1 : -1));
    const latestLog = logsDesc[0];

    const formatDate = (d) => {
        if (!d) return '';
        const s = typeof d === 'string' ? d : String(d);
        return s.slice(5, 10);
    };

    // Graph Data
    const bloodPressureData = logsDesc.slice(0, 14).reverse()
        .map(log => ({
            date: formatDate(log.date),
            systolic: log.vital_signs?.blood_pressure_systolic,
            diastolic: log.vital_signs?.blood_pressure_diastolic,
        }))
        .filter(d => d.systolic);

    const bloodSugarData = logsDesc.slice(0, 14).reverse()
        .map(log => ({
            date: formatDate(log.date),
            value: log.vital_signs?.blood_sugar,
        }))
        .filter(d => d.value);

    const weightData = logsDesc.slice(0, 14).reverse()
        .map(log => ({
            date: formatDate(log.date),
            value: log.vital_signs?.weight,
        }))
        .filter(d => d.value);

    const heartRateData = logsDesc.slice(0, 14).reverse()
        .map(log => ({
            date: formatDate(log.date),
            heart_rate: log.vital_signs?.heart_rate,
            spo2: log.vital_signs?.oxygen_saturation,
        }))
        .filter(d => d.heart_rate || d.spo2);

    const vitalsCards = [
        {
            icon: Heart,
            label: 'Blood Pressure',
            value: latestLog?.vital_signs?.blood_pressure_systolic
                ? `${latestLog.vital_signs.blood_pressure_systolic}/${latestLog.vital_signs.blood_pressure_diastolic}`
                : '-',
            unit: 'mmHg',
            status: latestLog?.vital_signs?.blood_pressure_systolic ? 'tracked' : 'no data',
            color: 'text-red-500',
            bgColor: 'bg-red-900/20'
        },
        {
            icon: Droplets,
            label: 'Blood Sugar',
            value: latestLog?.vital_signs?.blood_sugar ? Math.round(latestLog.vital_signs.blood_sugar) : '-',
            unit: 'mg/dL',
            status: latestLog?.vital_signs?.blood_sugar ? 'tracked' : 'no data',
            color: 'text-blue-500',
            bgColor: 'bg-blue-900/20'
        },
        {
            icon: Weight,
            label: 'Weight',
            value: latestLog?.vital_signs?.weight ?? '-',
            unit: 'kg',
            status: latestLog?.vital_signs?.weight ? 'tracked' : 'no data',
            color: 'text-purple-500',
            bgColor: 'bg-purple-900/20'
        },
        {
            icon: ThermometerSun,
            label: 'Temperature',
            value: latestLog?.vital_signs?.temperature ?? '-',
            unit: '°F',
            status: latestLog?.vital_signs?.temperature ? 'tracked' : 'no data',
            color: 'text-orange-500',
            bgColor: 'bg-orange-900/20'
        },
        {
            icon: Activity,
            label: 'Heart Rate',
            value: latestLog?.vital_signs?.heart_rate ?? '-',
            unit: 'bpm',
            status: latestLog?.vital_signs?.heart_rate ? 'tracked' : 'no data',
            color: 'text-pink-500',
            bgColor: 'bg-pink-900/20'
        },
        {
            icon: Moon,
            label: 'SpO2 Oxygen',
            value: latestLog?.vital_signs?.oxygen_saturation ?? '-',
            unit: '%',
            status: latestLog?.vital_signs?.oxygen_saturation ? 'tracked' : 'no data',
            color: 'text-indigo-500',
            bgColor: 'bg-indigo-900/20'
        },
    ];

    const bmiInfo = calculateBMI();

    return (
        <ChatLayout>
            <div className="w-full h-full overflow-y-auto bg-background-dark">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white dark:bg-sidebar border-b border-gray-200 dark:border-sidebar-border px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Activity className="w-6 h-6 text-primary" />
                                Comprehensive Patient Health Tracking
                            </h1>
                            <p className="text-sm text-muted mt-1">Track physiological vitals, baseline metrics, habits, and clinical trends</p>
                        </div>
                        <button
                            onClick={() => setShowAddLog(!showAddLog)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all cursor-pointer"
                        >
                            <FileEdit className="w-5 h-5" />
                            {showAddLog ? 'Close Form' : '📝 Fill Patient Health & Vitals Details'}
                        </button>
                    </div>
                </div>

                <PrescriptionHealthBanner />

                {/* Save status toast */}
                {saveStatus === 'success' && (
                    <div className="mx-6 mt-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-medium">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        Patient health log saved successfully! All metrics and graphs have been updated.
                    </div>
                )}
                {saveStatus === 'error' && (
                    <div className="mx-6 mt-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Failed to save health entry. Please check your network and try again.
                    </div>
                )}

                <div className="p-6 space-y-6">
                    {/* Add Patient Details Form Modal / Section */}
                    {showAddLog && (
                        <div className="bg-sidebar border border-primary/40 rounded-2xl p-6 shadow-2xl space-y-6">
                            <div className="flex items-center justify-between border-b border-sidebar-border pb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <FileEdit className="w-6 h-6 text-primary" />
                                        Enter Patient Health & Vitals Details
                                    </h2>
                                    <p className="text-xs text-muted mt-1">Fill baseline info, physiological metrics, lifestyle habits, and medical background</p>
                                </div>
                                <span className="px-3 py-1 bg-primary/20 border border-primary/30 rounded-full text-xs text-cyan-300 font-bold">
                                    Clinical Entry Form
                                </span>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* CATEGORY 1: Baseline Personal Information */}
                                <div className="bg-sidebar-hover/60 border border-sidebar-border rounded-xl p-5 space-y-4">
                                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                                        <User className="w-4 h-4" /> 1. Baseline Personal Information
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1">Age (Years)</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 35"
                                                value={formData.age}
                                                onChange={(e) => handleInputChange('age', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1">Sex</label>
                                            <select
                                                value={formData.sex}
                                                onChange={(e) => handleInputChange('sex', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white focus:outline-none focus:border-primary text-sm"
                                            >
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1">Height (cm)</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 175"
                                                value={formData.height}
                                                onChange={(e) => handleInputChange('height', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1">Weight (kg)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                placeholder="e.g. 70.5"
                                                value={formData.weight}
                                                onChange={(e) => handleInputChange('weight', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
                                            />
                                        </div>
                                    </div>
                                    {bmiInfo && (
                                        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-3 text-xs text-white">
                                            <TrendingUp className="w-4 h-4 text-cyan-400" />
                                            <span><strong>Calculated BMI:</strong> {bmiInfo.bmi} kg/m² ({bmiInfo.category})</span>
                                        </div>
                                    )}
                                </div>

                                {/* CATEGORY 2: Daily Physiological Metrics */}
                                <div className="bg-sidebar-hover/60 border border-sidebar-border rounded-xl p-5 space-y-4">
                                    <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                                        <Heart className="w-4 h-4" /> 2. Daily Physiological Metrics
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1">Blood Pressure (mmHg)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="Systolic (120)"
                                                    value={formData.bloodPressureSystolic}
                                                    onChange={(e) => handleInputChange('bloodPressureSystolic', e.target.value)}
                                                    className="flex-1 px-3 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Diastolic (80)"
                                                    value={formData.bloodPressureDiastolic}
                                                    onChange={(e) => handleInputChange('bloodPressureDiastolic', e.target.value)}
                                                    className="flex-1 px-3 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1">Blood Glucose (mg/dL)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="e.g. 95"
                                                    value={formData.bloodSugar}
                                                    onChange={(e) => handleInputChange('bloodSugar', e.target.value)}
                                                    className="flex-1 px-3 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
                                                />
                                                <select
                                                    value={formData.glucoseType}
                                                    onChange={(e) => handleInputChange('glucoseType', e.target.value)}
                                                    className="w-32 px-2 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white text-xs focus:outline-none focus:border-primary"
                                                >
                                                    <option value="fasting">Fasting</option>
                                                    <option value="post_meal">Post-Meal</option>
                                                    <option value="random">Random</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1">Resting Heart Rate (bpm)</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 72"
                                                value={formData.heartRate}
                                                onChange={(e) => handleInputChange('heartRate', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1">SpO2 Oxygen Level (%)</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 98"
                                                value={formData.oxygenLevel}
                                                onChange={(e) => handleInputChange('oxygenLevel', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1">Body Temperature (°F)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                placeholder="e.g. 98.6"
                                                value={formData.temperature}
                                                onChange={(e) => handleInputChange('temperature', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* CATEGORY 3: Lifestyle & Habits */}
                                <div className="bg-sidebar-hover/60 border border-sidebar-border rounded-xl p-5 space-y-4">
                                    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                        <Activity className="w-4 h-4" /> 3. Lifestyle & Habits
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1">Workout Duration (mins)</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 45"
                                                value={formData.exercise}
                                                onChange={(e) => handleInputChange('exercise', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1">Sleep Duration (hours)</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                placeholder="e.g. 7.5"
                                                value={formData.sleep}
                                                onChange={(e) => handleInputChange('sleep', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1">Water Hydration (mL)</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 2500"
                                                value={formData.waterIntake}
                                                onChange={(e) => handleInputChange('waterIntake', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1">Pain / Discomfort (1-10)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="10"
                                                placeholder="1 (No pain) - 10 (Severe)"
                                                value={formData.painLevel}
                                                onChange={(e) => handleInputChange('painLevel', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* CATEGORY 4: Medical Background */}
                                <div className="bg-sidebar-hover/60 border border-sidebar-border rounded-xl p-5 space-y-4">
                                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4" /> 4. Medical Background & History
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1">Medication Schedule</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Metformin 500mg (2x/day)"
                                                value={formData.medicationSchedule}
                                                onChange={(e) => handleInputChange('medicationSchedule', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1">Chronic Conditions</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Hypertension, Asthma"
                                                value={formData.chronicConditions}
                                                onChange={(e) => handleInputChange('chronicConditions', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1">Allergies & Reactions</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Penicillin, Dust"
                                                value={formData.allergies}
                                                onChange={(e) => handleInputChange('allergies', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-sidebar border border-sidebar-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-3 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50 cursor-pointer"
                                    >
                                        {loading ? 'Saving Patient Metrics...' : 'Save & Render Dynamic Graphs'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddLog(false)}
                                        className="px-6 py-3 bg-sidebar-hover border border-sidebar-border text-gray-300 hover:text-white font-semibold rounded-xl transition-all cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Vitals Summary Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {vitalsCards.map((vital, index) => (
                            <div
                                key={index}
                                className="bg-sidebar border border-sidebar-border rounded-xl p-5 hover:border-primary/50 transition-all shadow-md"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`p-2.5 rounded-lg ${vital.bgColor}`}>
                                        <vital.icon className={`w-5 h-5 ${vital.color}`} />
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                        vital.status === 'tracked' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-400'
                                    }`}>
                                        {vital.status}
                                    </span>
                                </div>
                                <h3 className="text-xs font-semibold text-muted mb-1">{vital.label}</h3>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-extrabold text-white">{vital.value}</span>
                                    <span className="text-xs text-muted">{vital.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Dynamic Trend Charts Grid */}
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Blood Pressure Chart */}
                        <div className="bg-sidebar border border-sidebar-border rounded-xl p-6 shadow-md">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <Heart className="w-5 h-5 text-red-400" />
                                    Blood Pressure Trend (mmHg)
                                </h2>
                                <span className="text-xs text-muted">Systolic / Diastolic</span>
                            </div>
                            {bloodPressureData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[220px] text-muted border border-dashed border-sidebar-border rounded-xl">
                                    <Heart className="w-10 h-10 mb-2 text-muted" />
                                    <p className="text-sm font-semibold">No Blood Pressure Data</p>
                                    <p className="text-xs text-muted mt-1">Click &quot;Fill Patient Health &amp; Vitals Details&quot; to plot your graph</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={bloodPressureData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                                        <YAxis stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                                        <Line type="monotone" dataKey="systolic" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444', r: 4 }} name="Systolic" />
                                        <Line type="monotone" dataKey="diastolic" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} name="Diastolic" />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Blood Glucose Chart */}
                        <div className="bg-sidebar border border-sidebar-border rounded-xl p-6 shadow-md">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <Droplets className="w-5 h-5 text-blue-400" />
                                    Blood Glucose Trend (mg/dL)
                                </h2>
                                <span className="text-xs text-muted">Fasting / Post-Meal</span>
                            </div>
                            {bloodSugarData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[220px] text-muted border border-dashed border-sidebar-border rounded-xl">
                                    <Droplets className="w-10 h-10 mb-2 text-muted" />
                                    <p className="text-sm font-semibold">No Blood Sugar Data</p>
                                    <p className="text-xs text-muted mt-1">Enter your glucose readings to render your chart</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={bloodSugarData}>
                                        <defs>
                                            <linearGradient id="colorSugar" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                                        <YAxis stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                                        <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorSugar)" name="Glucose (mg/dL)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Weight Progress Chart */}
                        <div className="bg-sidebar border border-sidebar-border rounded-xl p-6 shadow-md">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <Weight className="w-5 h-5 text-purple-400" />
                                    Weight & BMI Progress (kg)
                                </h2>
                                <span className="text-xs text-muted">Body Weight Trend</span>
                            </div>
                            {weightData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[220px] text-muted border border-dashed border-sidebar-border rounded-xl">
                                    <Weight className="w-10 h-10 mb-2 text-muted" />
                                    <p className="text-sm font-semibold">No Weight History</p>
                                    <p className="text-xs text-muted mt-1">Log weight to track BMI and body composition</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={weightData}>
                                        <defs>
                                            <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                                        <YAxis stroke="#9CA3AF" style={{ fontSize: '11px' }} domain={['auto', 'auto']} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                                        <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorWeight)" name="Weight (kg)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Heart Rate & SpO2 Chart */}
                        <div className="bg-sidebar border border-sidebar-border rounded-xl p-6 shadow-md">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-pink-400" />
                                    Heart Rate & SpO2 Saturation
                                </h2>
                                <span className="text-xs text-muted">BPM & Oxygen %</span>
                            </div>
                            {heartRateData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[220px] text-muted border border-dashed border-sidebar-border rounded-xl">
                                    <Activity className="w-10 h-10 mb-2 text-muted" />
                                    <p className="text-sm font-semibold">No Cardiovascular Data</p>
                                    <p className="text-xs text-muted mt-1">Log heart rate and oxygen levels to monitor vitals</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={heartRateData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                                        <YAxis stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                                        <Line type="monotone" dataKey="heart_rate" stroke="#EC4899" strokeWidth={2} dot={{ fill: '#EC4899', r: 4 }} name="Heart Rate (bpm)" />
                                        <Line type="monotone" dataKey="spo2" stroke="#6366F1" strokeWidth={2} dot={{ fill: '#6366F1', r: 4 }} name="SpO2 (%)" />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Patient Health Summary Banner */}
                    <div className="bg-sidebar border border-sidebar-border rounded-2xl p-6 shadow-md">
                        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-primary" />
                            Clinical Tracking Overview & Baseline Summary
                        </h2>
                        <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-300">
                            <div className="space-y-1 bg-sidebar-hover p-4 rounded-xl border border-sidebar-border">
                                <p className="text-xs text-muted uppercase font-bold">Total Patient Logs</p>
                                <p className="text-2xl font-bold text-white">{healthLogs.length} Entries</p>
                                <p className="text-xs text-muted mt-1">
                                    {latestLog ? `Latest update on: ${formatDate(latestLog.date)}` : 'Click "Fill Patient Health Details" to begin.'}
                                </p>
                            </div>
                            <div className="space-y-1 bg-sidebar-hover p-4 rounded-xl border border-sidebar-border">
                                <p className="text-xs text-muted uppercase font-bold">Cardiovascular Baseline</p>
                                <p className="text-lg font-bold text-white">
                                    {latestLog?.vital_signs?.blood_pressure_systolic ? `${latestLog.vital_signs.blood_pressure_systolic}/${latestLog.vital_signs.blood_pressure_diastolic} mmHg` : 'Not Set'}
                                </p>
                                <p className="text-xs text-muted mt-1">
                                    Resting HR: {latestLog?.vital_signs?.heart_rate ? `${latestLog.vital_signs.heart_rate} bpm` : '--'}
                                </p>
                            </div>
                            <div className="space-y-1 bg-sidebar-hover p-4 rounded-xl border border-sidebar-border">
                                <p className="text-xs text-muted uppercase font-bold">Active Medical Flags</p>
                                <p className="text-xs font-semibold text-cyan-300 mt-1">
                                    Conditions: {latestLog?.vital_signs?.chronic_conditions || 'None logged'}
                                </p>
                                <p className="text-xs text-orange-400 mt-1">
                                    Allergies: {latestLog?.vital_signs?.allergies || 'None logged'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ChatLayout>
    );
}
