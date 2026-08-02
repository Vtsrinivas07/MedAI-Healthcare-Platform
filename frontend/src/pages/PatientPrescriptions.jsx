import { useState, useEffect, useRef } from 'react';
import { 
  FileText, Calendar, Upload, X, CheckCircle, AlertCircle, Pill,
  TestTube, Activity, Bell, ChevronDown, ChevronUp,
  Bot, Sparkles, RefreshCw, Save, Stethoscope, Utensils, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChatLayout from '../components/ChatLayout';

const API_URL = import.meta.env.VITE_API_URL || 'https://medai-healthcare-platform-y8lf.onrender.com';

// ─── Upload & Parse Modal ────────────────────────────────────────────
function UploadModal({ onClose, onParsed }) {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleParse = async () => {
    if (!file && !text.trim()) {
      setError('Please upload a file or paste prescription text.');
      return;
    }
    setParsing(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const fd = new FormData();
      if (file) fd.append('file', file);
      if (text.trim()) fd.append('prescription_text', text.trim());
      fd.append('save_to_db', 'true');

      const res = await fetch(`${API_URL}/api/prescriptions/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Parse failed');
      onParsed(data.parsed, data.prescription_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1b252f] rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-[#283039]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upload Prescription</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">AI will extract medicines, diagnosis & more</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#283039] text-gray-500 dark:text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' :
              file ? 'border-green-500 bg-green-50 dark:bg-green-500/10' :
              'border-gray-300 dark:border-[#283039] hover:border-blue-400 dark:hover:border-blue-500'
            }`}
          >
            <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf,.txt" onChange={(e) => setFile(e.target.files[0])} />
            {file ? (
              <>
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="font-medium text-green-700 dark:text-green-400">{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="font-medium text-gray-700 dark:text-gray-300">Drop file or click to browse</p>
                <p className="text-xs text-gray-500 mt-1">Supports images, PDF, TXT</p>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-[#283039]" />
            <span className="text-xs text-gray-500">OR paste prescription text</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-[#283039]" />
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Paste prescription text here...&#10;e.g. Dr. Smith, 09/03/2026&#10;Diagnosis: Hypertension&#10;1. Amlodipine 5mg - Once daily - 30 days"
            className="w-full bg-gray-50 dark:bg-[#283039] border border-gray-200 dark:border-[#3d4d5d] rounded-xl p-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          />

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#283039] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#283039] transition-colors text-sm font-medium">
            Cancel
          </button>
          <button
            onClick={handleParse}
            disabled={parsing}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {parsing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {parsing ? 'Analysing...' : 'Parse with AI'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Visual Prescription Card Renderer ─────────────────────────────
function VisualPrescriptionCard({ rawText, parsedData }) {
  if (!rawText && !parsedData) return null;

  const text = rawText || parsedData?.notes || '';

  // Extract doctor name & clinic
  const docMatch = text.match(/(?:Dr\.|Doctor)\s+([A-Za-z\s.]+?)(?:MBBS|MD|Clinic|Patient|Date|Reg|\n|$)/i);
  const doctorName = parsedData?.doctor_name && parsedData.doctor_name !== 'Prescription Document' && parsedData.doctor_name !== 'Self-upload'
    ? parsedData.doctor_name
    : (docMatch ? docMatch[1].trim() : '');

  const clinicMatch = text.match(/([A-Za-z0-9\s&]+(?:Clinic|Hospital|Center|Wellness|Health)[^\n\r|,*])/i);
  const clinic = clinicMatch ? clinicMatch[1].trim() : '';

  // Extract patient & metadata
  const patientMatch = text.match(/(?:Patient|Name)\s*[:-]\s*([A-Za-z\s]+?)(?:Age|Sex|Date|Reg|\n|$)/i);
  const patientName = parsedData?.patient_name || (patientMatch ? patientMatch[1].trim() : '');

  const ageMatch = text.match(/Age\s*[:-]\s*(\d+\s*(?:years|yrs)?)/i);
  const age = ageMatch ? ageMatch[1].trim() : '';

  const dateMatch = text.match(/(?:Date|Dated)\s*[:-]\s*([\d/-]+)/i);
  const dateStr = dateMatch ? dateMatch[1].trim() : '';

  const regMatch = text.match(/(?:Reg|Rx|No)\s*No?\s*[:-]\s*([A-Za-z0-9-]+)/i);
  const regNo = regMatch ? regMatch[1].trim() : '';

  const diagMatch = text.match(/(?:DIAGNOSIS|Diagnosis|Indication|Condition)\s*[:-]\s*([^\n\r|]+)/i);
  const diagnosis = parsedData?.diagnosis && parsedData.diagnosis !== 'Uploaded Prescription' && parsedData.diagnosis !== 'Uploaded prescription'
    ? parsedData.diagnosis
    : (diagMatch ? diagMatch[1].trim() : 'Prescription Review');

  // Parse medicines list cleanly if AI missed them
  let medicines = parsedData?.medicines || [];
  if (medicines.length === 0 && text) {
    const rxParts = text.split(/(?=\d+[.)]\s*[A-Z])/);
    rxParts.forEach(part => {
      const m = part.match(/(?:\d+[.)]\s*)?([A-Za-z0-9\s-]+?\b\d+\s*(?:mg|g|mcg|ml|IU|iu))\s*(.*)/i);
      if (m) {
        const name = m[1].trim();
        const rest = m[2] || '';
        const doseMatch = rest.match(/(?:Dose|Dosage|frequency)\s*[:-]\s*([^|]+)/i);
        const durMatch = rest.match(/Duration\s*[:-]\s*([^|]+)/i);
        const instMatch = rest.match(/(?:Take|Instructions?)\s*[:-]?\s*([^.\n|]+)/i);

        medicines.push({
          name: name,
          dosage: '',
          frequency: doseMatch ? doseMatch[1].trim() : 'As prescribed',
          duration: durMatch ? durMatch[1].trim() : 'As advised',
          instructions: instMatch ? instMatch[0].trim() : rest.replace(/\|/g, ' · ').trim()
        });
      }
    });
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-500/40 p-5 shadow-md dark:shadow-2xl text-gray-900 dark:text-white">
      {/* Visual Header Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 dark:from-blue-900/80 via-indigo-50 dark:via-indigo-900/80 to-slate-50 dark:to-slate-900/90 border border-blue-200 dark:border-blue-400/30 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/30 flex items-center justify-center border border-blue-300 dark:border-blue-400/50 shrink-0">
            <Stethoscope className="w-5 h-5 text-blue-600 dark:text-cyan-300" />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-900 dark:text-white text-base">{doctorName ? `Dr. ${doctorName}` : 'Prescribing Physician'}</h3>
            <p className="text-xs text-blue-600 dark:text-cyan-200 font-semibold">{clinic || 'Medical Clinic & Diagnostic Center'}</p>
          </div>
        </div>

        <div className="text-right text-xs space-y-0.5">
          {dateStr && <p className="font-bold text-blue-600 dark:text-cyan-300">📅 Date: {dateStr}</p>}
          {regNo && <p className="text-[11px] text-gray-500 dark:text-gray-300 font-medium">Reg No: {regNo}</p>}
        </div>
      </div>

      {/* Patient & Diagnosis Information Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {patientName && (
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 flex items-center gap-3 shadow-sm">
            <User className="w-5 h-5 text-purple-500 dark:text-purple-400 shrink-0" />
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Patient Name</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{patientName} {age ? `(Age: ${age})` : ''}</p>
            </div>
          </div>
        )}
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-400/40 flex items-center gap-3 shadow-sm">
          <Activity className="w-5 h-5 text-blue-500 dark:text-blue-300 shrink-0" />
          <div>
            <p className="text-[10px] uppercase font-bold text-blue-500 dark:text-blue-300">Extracted Clinical Diagnosis</p>
            <p className="text-sm font-extrabold text-gray-900 dark:text-white">{diagnosis}</p>
          </div>
        </div>
      </div>

      {/* Visual Prescribed Medicines Cards */}
      {medicines.length > 0 && (
        <div className="space-y-3 pt-1">
          <h4 className="text-xs font-bold text-purple-600 dark:text-purple-300 uppercase tracking-wider flex items-center gap-2">
            <Pill className="w-4 h-4 text-purple-500 dark:text-purple-400" /> Visually Parsed Prescribed Medications ({medicines.length})
          </h4>
          <div className="grid grid-cols-1 gap-2.5">
            {medicines.map((med, i) => (
              <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/90 border border-purple-200 dark:border-purple-400/40 flex flex-wrap items-center justify-between gap-3 shadow-sm hover:border-purple-400 dark:hover:border-purple-300 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-500/30 border border-purple-300 dark:border-purple-400/40 flex items-center justify-center shrink-0">
                    <Pill className="w-4 h-4 text-purple-600 dark:text-purple-200" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-base">{med.name}</p>
                    <div className="flex flex-wrap gap-2 mt-1.5 text-xs">
                      {med.frequency && <span className="px-2.5 py-0.5 rounded-md font-bold bg-blue-100 dark:bg-blue-500/30 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-400/40">🕒 {med.frequency}</span>}
                      {med.duration && <span className="px-2.5 py-0.5 rounded-md font-bold bg-emerald-100 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-400/40">⏱️ {med.duration}</span>}
                    </div>
                  </div>
                </div>

                {med.instructions && (
                  <div className="text-xs text-cyan-700 dark:text-cyan-200 bg-cyan-50 dark:bg-cyan-950/70 px-3 py-2 rounded-lg border border-cyan-200 dark:border-cyan-400/40 font-semibold shadow-sm">
                    💡 {med.instructions}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Parsed Result & Apply Actions ───────────────────────────────────
function ParsedResultModal({ parsed, prescriptionId, onClose, onSaved }) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const navigate = useNavigate();

  const applyReminders = async () => {
    if (!parsed.medicines?.length) return;
    setApplying(true);
    setApplyError(null);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/api/medicine/bulk-reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ medicines: parsed.medicines }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');

      // Store prescription context in localStorage for other pages to read
      localStorage.setItem('activePrescription', JSON.stringify({
        diagnosis: parsed.diagnosis,
        medicines: parsed.medicines,
        lab_tests: parsed.lab_tests || [],
        dietary_advice: parsed.dietary_advice || '',
        notes: parsed.notes || '',
        doctor_name: parsed.doctor_name || '',
        date: parsed.date || new Date().toISOString(),
        prescription_id: prescriptionId,
        applied_at: new Date().toISOString(),
      }));

      setApplied(true);
      onSaved();
    } catch (err) {
      setApplyError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const setContext = async () => {
    // Save to localStorage for health tracking banner
    localStorage.setItem('activePrescription', JSON.stringify({
      diagnosis: parsed.diagnosis,
      medicines: parsed.medicines || [],
      lab_tests: parsed.lab_tests || [],
      dietary_advice: parsed.dietary_advice || '',
      notes: parsed.notes || '',
      doctor_name: parsed.doctor_name || '',
      date: parsed.date || new Date().toISOString(),
      prescription_id: prescriptionId,
      applied_at: new Date().toISOString(),
    }));

    // Also create reminders if medicines are present
    if (parsed.medicines?.length) {
      try {
        const token = localStorage.getItem('authToken');
        await fetch(`${API_URL}/api/medicine/bulk-reminders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ medicines: parsed.medicines }),
        });
      } catch (e) {
        console.error('Reminder creation failed:', e);
      }
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1b252f] rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-[#283039]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Prescription Parsed!</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Review & apply to your health dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#283039] text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Diagnosis */}
          {parsed.diagnosis && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
              <Stethoscope className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Diagnosis</p>
                <p className="text-sm text-gray-900 dark:text-white font-medium mt-1">{parsed.diagnosis}</p>
                {parsed.doctor_name && <p className="text-xs text-gray-500 mt-0.5">Dr. {parsed.doctor_name}</p>}
              </div>
            </div>
          )}

          {/* Medicines */}
          {parsed.medicines?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Pill className="w-4 h-4 text-purple-500" /> Medicines ({parsed.medicines.length})
              </h3>
              <div className="space-y-2">
                {parsed.medicines.map((med, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#283039] border border-gray-100 dark:border-[#3d4d5d]">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <Pill className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{med.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{med.dosage} · {med.frequency} · {med.duration}</p>
                      {med.instructions && <p className="text-xs text-blue-500 mt-0.5">{med.instructions}</p>}
                    </div>
                    <div className="text-xs text-gray-400">{(med.times || []).join(', ')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lab tests */}
          {parsed.lab_tests?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <TestTube className="w-4 h-4 text-orange-500" /> Lab Tests
              </h3>
              <div className="flex flex-wrap gap-2">
                {parsed.lab_tests.map((t, i) => (
                  <span key={i} className="px-3 py-1.5 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 rounded-lg text-xs font-medium border border-orange-200 dark:border-orange-500/20">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Dietary advice */}
          {parsed.dietary_advice && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20">
              <Utensils className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Dietary Advice</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">{parsed.dietary_advice}</p>
              </div>
            </div>
          )}

          {(parsed.notes || parsed.raw_text) && (
            <VisualPrescriptionCard rawText={parsed.notes || parsed.raw_text || ''} parsedData={parsed} />
          )}
        </div>

        {/* Apply Actions */}
        {applied ? (
          <div className="p-6 border-t dark:border-[#283039]">
            <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Applied to your health dashboard!</span>
            </div>
            <div className="grid grid-cols-1 gap-3 mt-4">
              <button onClick={() => navigate('/medicines')} className="py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                <Bell className="w-4 h-4" /> View Reminders
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 border-t dark:border-[#283039] space-y-3">
            {applyError && <p className="text-red-500 text-sm">{applyError}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Apply prescription data across the platform:</p>
            {!parsed.medicines?.length && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                No medicines were extracted. You can still apply the diagnosis and lab tests to your health context.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={applyReminders}
                disabled={applying || !parsed.medicines?.length}
                className="py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {applying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                Add Medicine Reminders
              </button>
              <button
                onClick={setContext}
                className="py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Activity className="w-4 h-4" />
                Apply to Health Context
              </button>
            </div>
            <button onClick={() => navigate(`/chatbot?prescription=${prescriptionId || ''}`)} className="w-full py-3 rounded-xl bg-gray-100 dark:bg-[#283039] hover:bg-gray-200 dark:hover:bg-[#3d4d5d] text-gray-900 dark:text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              <Bot className="w-4 h-4" /> Discuss with AI Chatbot
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function PatientPrescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [parsedResult, setParsedResult] = useState(null);
  const [parsedPrescriptionId, setParsedPrescriptionId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`${API_URL}/api/prescriptions`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setPrescriptions(data.data);
      } else {
        setError(data.detail || data.message || `Error ${response.status}: Failed to fetch prescriptions`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setPrescriptions([]);
        setError(null);
      } else {
        setError(`Network error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleParsed = (parsed, id) => {
    setShowUpload(false);
    setParsedResult(parsed);
    setParsedPrescriptionId(id);
    fetchPrescriptions();
  };

  const handleSaved = () => {
    fetchPrescriptions();
  };

  return (
    <ChatLayout>
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onParsed={handleParsed} />}
      {parsedResult && (
        <ParsedResultModal
          parsed={parsedResult}
          prescriptionId={parsedPrescriptionId}
          onClose={() => setParsedResult(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#101922]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Prescriptions</h1>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20"
            >
              <Upload className="w-4 h-4" />
              Upload Prescription
            </button>
          </div>

          {/* Active Prescription Banner */}
          {(() => {
            const ap = (() => { try { return JSON.parse(localStorage.getItem('activePrescription') || 'null'); } catch { return null; } })();
            if (!ap) return null;
            const medCount = ap.medicines?.length || 0;
            return (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Active Prescription Context</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                    {ap.diagnosis}
                    {medCount > 0
                      ? ` · ${medCount} medicine(s) applied across your health dashboard`
                      : ' · No medicines extracted — upload a clearer prescription to add reminders'}
                  </p>
                </div>
                <button onClick={() => { localStorage.removeItem('activePrescription'); fetchPrescriptions(); }} className="text-gray-400 hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })()}

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading prescriptions...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button onClick={fetchPrescriptions} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Try Again</button>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#1b252f] rounded-2xl shadow-sm border border-gray-100 dark:border-[#283039]">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-[#283039] flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No prescriptions yet</p>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">Upload a prescription to automatically sync medicines, dietary advice & lab tests across your dashboard.</p>
              <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors">
                <Upload className="w-4 h-4" /> Upload Your First Prescription
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {prescriptions.map((prescription, index) => {
                const isExpanded = expandedId === prescription._id || (index === 0 && expandedId === null);
                
                // Dynamically enrich prescription if medicines/diagnosis/doctor were raw
                const enriched = (() => {
                  const p = { ...prescription };
                  const raw = p.notes || p.raw_text || '';

                  if (!p.doctor_name || p.doctor_name === 'Self-upload' || p.doctor_name === 'Prescription Document') {
                    const docMatch = raw.match(/(?:Dr\.|Doctor)\s+([A-Za-z\s.]+?)(?:MBBS|MD|Clinic|Patient|Date|Reg|\n|$)/i);
                    if (docMatch) p.doctor_name = docMatch[1].trim();
                  }

                  if (!p.diagnosis || p.diagnosis === 'Uploaded Prescription' || p.diagnosis === 'Uploaded prescription' || p.diagnosis === 'Extracted from uploaded prescription') {
                    const diagMatch = raw.match(/(?:DIAGNOSIS|Diagnosis|Indication|Condition)\s*[:-]\s*([^\n\r|]+)/i);
                    if (diagMatch) p.diagnosis = diagMatch[1].trim();
                  }

                  if (!p.medicines || p.medicines.length === 0) {
                    const foundMeds = [];
                    const rxParts = raw.split(/(?=\d+[.)]\s*[A-Z])/);
                    rxParts.forEach(part => {
                      const m = part.match(/(?:\d+[.)]\s*)?([A-Za-z0-9\s-]+?\b\d+\s*(?:mg|g|mcg|ml|IU|iu))\s*(.*)/i);
                      if (m) {
                        const name = m[1].trim();
                        const rest = m[2] || '';
                        const doseMatch = rest.match(/(?:Dose|Dosage|frequency)\s*[:-]\s*([^|]+)/i);
                        const durMatch = rest.match(/Duration\s*[:-]\s*([^|]+)/i);
                        const instMatch = rest.match(/(?:Take|Instructions?)\s*[:-]?\s*([^.\n|]+)/i);

                        foundMeds.push({
                          name: name,
                          dosage: '',
                          frequency: doseMatch ? doseMatch[1].trim() : 'As prescribed',
                          duration: durMatch ? durMatch[1].trim() : 'As advised',
                          instructions: instMatch ? instMatch[0].trim() : rest.replace(/\|/g, ' · ').trim()
                        });
                      }
                    });
                    if (foundMeds.length > 0) p.medicines = foundMeds;
                  }

                  return p;
                })();

                return (
                  <div key={enriched._id} className="bg-white dark:bg-[#1b252f] rounded-2xl border border-gray-200 dark:border-[#283039] shadow-md overflow-hidden transition-all">
                    {/* Card header */}
                    <div
                      className="flex flex-wrap items-center justify-between p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1c2127] transition-colors border-b border-gray-100 dark:border-[#283039]"
                      onClick={() => setExpandedId(isExpanded ? 'none' : enriched._id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                          <Stethoscope className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 dark:text-white text-base">
                              {enriched.doctor_name ? `Dr. ${enriched.doctor_name}` : (enriched.filename || 'Uploaded Prescription Document')}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {enriched.source || 'AI Parsed'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-cyan-400" /> {new Date(enriched.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span>•</span>
                            <span className="text-purple-400 font-semibold">{enriched.medicines?.length || 0} medicine(s) extracted</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {enriched.status || 'Active'}
                        </span>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>

                    {/* Expanded extracted details */}
                    {isExpanded && (
                      <div className="p-6 space-y-6 bg-gray-50/50 dark:bg-[#151e27]">

                        {/* Recommended Lab Tests */}
                        {enriched.lab_tests?.length > 0 && (
                          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                                <TestTube className="w-4 h-4" /> Recommended Lab Diagnostic Tests
                              </h4>
                              <button
                                onClick={() => {
                                  const pendingData = {
                                    tests: enriched.lab_tests,
                                    isRequired: true,
                                    disease: enriched.diagnosis || '',
                                    date: new Date().toISOString().split('T')[0],
                                    time: '09:00',
                                  };
                                  localStorage.setItem('pendingLabBooking', JSON.stringify(pendingData));
                                  window.location.href = '/lab-tests';
                                }}
                                className="px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all cursor-pointer shadow"
                              >
                                🧪 Book These Lab Tests
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {enriched.lab_tests.map((t, i) => (
                                <span key={i} className="px-3 py-1.5 bg-sidebar rounded-lg text-xs font-semibold text-orange-300 border border-orange-500/30">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Dietary & Lifestyle Advice */}
                        {enriched.dietary_advice && (
                          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                            <Utensils className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Dietary & Lifestyle Instructions</p>
                              <p className="text-sm text-gray-900 dark:text-white mt-1 leading-relaxed">{enriched.dietary_advice}</p>
                            </div>
                          </div>
                        )}

                        {/* Visual Prescription Card Renderer */}
                        {(enriched.notes || enriched.raw_text) && (
                          <VisualPrescriptionCard rawText={enriched.notes || enriched.raw_text || ''} parsedData={enriched} />
                        )}

                        {/* Comprehensive Action Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-200 dark:border-[#283039]">
                          <button
                            onClick={async () => {
                              const token = localStorage.getItem('authToken');
                              try {
                                const res = await fetch(`${API_URL}/api/medicine/bulk-reminders`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ medicines: enriched.medicines || [] }),
                                });
                                const data = await res.json();
                                localStorage.setItem('activePrescription', JSON.stringify({ ...enriched, applied_at: new Date().toISOString() }));
                                alert(`✅ ${data.created_count || (enriched.medicines?.length || 0)} reminder(s) added! Go to Medicine Reminders to view them.`);
                                fetchPrescriptions();
                              } catch (e) {
                                alert('Failed to add reminders: ' + e.message);
                              }
                            }}
                            className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Bell className="w-4 h-4" /> Add Medicine Reminders
                          </button>

                          <button
                            onClick={() => {
                              const pendingData = {
                                medicines: (enriched.medicines || []).map(m => (typeof m === 'string' ? m : m.name)),
                                disease: enriched.diagnosis || '',
                              };
                              localStorage.setItem('pendingPharmacyOrder', JSON.stringify(pendingData));
                              window.location.href = '/pharmacy';
                            }}
                            className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Pill className="w-4 h-4" /> Order Medicines in Pharmacy
                          </button>

                          <button
                            onClick={() => {
                              localStorage.setItem('activePrescription', JSON.stringify({ ...enriched, applied_at: new Date().toISOString() }));
                              alert('✅ Prescription context applied across your health dashboard!');
                            }}
                            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Activity className="w-4 h-4" /> Apply Context
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ChatLayout>
  );
}