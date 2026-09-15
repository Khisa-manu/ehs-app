import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  QrCode, 
  ExternalLink, 
  CheckCircle2, 
  Copy, 
  X, 
  Sparkles,
  Info,
  Terminal,
  ShieldCheck,
  Check,
  FileJson,
  AlertCircle,
  Code
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface ApkInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MANIFEST_CONTENT = {
  id: "/",
  name: "Spectrum Engineering EHS",
  short_name: "Spectrum EHS",
  description: "Spectrum Engineering EHS field technician clock-in and safety incident reporting with offline sync",
  lang: "en-US",
  theme_color: "#0f172a",
  background_color: "#0f172a",
  display: "standalone",
  orientation: "portrait-primary",
  start_url: "/",
  scope: "/",
  categories: ["business", "productivity", "utilities"],
  icons: [
    {
      src: "/pwa-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any"
    },
    {
      src: "/pwa-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any"
    },
    {
      src: "/pwa-maskable-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable"
    }
  ]
};

export const ApkInstallModal: React.FC<ApkInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'instant' | 'apk' | 'capacitor' | 'kotlin'>('kotlin');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedManifest, setCopiedManifest] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [showManifestCode, setShowManifestCode] = useState(false);
  const [selectedKotlinFile, setSelectedKotlinFile] = useState<'main' | 'clock' | 'ehs' | 'db'>('main');

  if (!isOpen) return null;

  // Use the current origin or the canonical preview URL
  const appUrl = typeof window !== 'undefined' 
    ? (window.location.origin.includes('localhost') 
        ? 'https://ais-pre-a4obr4cnezdry2uul53q2x-260867469001.europe-west2.run.app' 
        : window.location.origin)
    : 'https://ais-pre-a4obr4cnezdry2uul53q2x-260867469001.europe-west2.run.app';

  const manifestJsonStr = JSON.stringify(MANIFEST_CONTENT, null, 2);
  const pwaBuilderUrl = `https://www.pwabuilder.com/report?site=${encodeURIComponent(appUrl)}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleCopyManifest = () => {
    navigator.clipboard.writeText(manifestJsonStr);
    setCopiedManifest(true);
    setTimeout(() => setCopiedManifest(false), 2500);
  };

  const handleDownloadManifest = () => {
    const blob = new Blob([manifestJsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manifest.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyCommand = () => {
    const cmd = `git clone <repo> && npm install && npm run build && npx @capacitor/cli init "FieldPulse" "com.fieldpulse.app" --web-dir dist && npx cap add android && npx cap open android`;
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2500);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(appUrl)}&color=0f172a&bgcolor=ffffff&margin=8`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Launch & Install on Android
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Install as a standalone native-feeling Android app or package an APK
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('instant')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'instant'
                ? 'border-amber-500 text-amber-900 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            1. Instant Android WebAPK (100% Offline)
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'apk'
                ? 'border-amber-500 text-amber-900 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Download className="w-4 h-4 text-sky-500" />
            2. PWABuilder / Manifest & APK
          </button>
          <button
            onClick={() => setActiveTab('capacitor')}
            className={`flex items-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'capacitor'
                ? 'border-amber-500 text-amber-900 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-500" />
            3. Android Studio
          </button>
          <button
            onClick={() => setActiveTab('kotlin')}
            className={`flex items-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'kotlin'
                ? 'border-amber-500 text-amber-900 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Code className="w-4 h-4 text-purple-600" />
            4. Native Kotlin (Compose)
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeTab === 'instant' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900">
                  <span className="font-semibold text-sm block mb-1">
                    No External APK Generator Needed on Modern Android
                  </span>
                  On any Android device (Google Pixel, Samsung Galaxy, Motorola, Xiaomi, etc.), 
                  Google Chrome automatically compiles and installs this app as an authentic <strong>Android WebAPK</strong>. 
                  It receives a native launcher icon in your App Drawer and runs in its own process 100% offline!
                </div>
              </div>

              {/* Action area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 mb-2">
                    <img 
                      src={qrCodeUrl} 
                      alt="Scan to launch on Android" 
                      className="w-36 h-36 object-contain"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-amber-600" /> Scan with Phone Camera
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Opens directly in Chrome on your Android phone
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      How to Launch on Phone
                    </h3>
                    <ol className="space-y-2 text-xs text-slate-700 list-decimal list-inside">
                      <li className="pl-1">
                        Scan the QR code or open the link in Chrome on Android.
                      </li>
                      <li className="pl-1">
                        Tap <strong>&ldquo;Add Spectrum EHS to Home screen&rdquo;</strong> or menu <span className="font-semibold">(&#8942;) &rarr; &ldquo;Install app&rdquo;</span>.
                      </li>
                      <li className="pl-1">
                        Android compiles and installs the native <strong>Spectrum Engineering EHS</strong> icon.
                      </li>
                      <li className="pl-1">
                        Tap it to launch like any native APK!
                      </li>
                    </ol>
                  </div>

                  {isInstallable && (
                    <button
                      onClick={install}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      Install to Device Right Now
                    </button>
                  )}

                  {isInstalled && (
                    <div className="py-2 px-3 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-lg text-center">
                      App is currently running in installed standalone mode!
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      onClick={handleCopyUrl}
                      className="w-full py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs text-slate-700 font-medium flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      {copiedUrl ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">URL Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          Copy Direct App URL
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-xs text-slate-700">
                  <strong>Full Offline Resilience:</strong> Caches all interfaces, live camera viewfinders, GPS sensors, and offline queues so technicians can clock in inside cell dead zones without interruption.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'apk' && (
            <div className="space-y-4">
              {/* Why "no manifest" happened explanation */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <span className="font-semibold text-sm block">
                    Why PWABuilder says &ldquo;No Manifest&rdquo; on Preview URLs
                  </span>
                  <p>
                    External tools like Microsoft PWABuilder run web scrapers that cannot bypass Google Cloud authentication on private preview container URLs (<code>ais-dev-...</code> or <code>ais-pre-...</code>).
                  </p>
                  <p className="text-amber-800">
                    The manifest is fully configured at <code>/manifest.json</code> and <code>/manifest.webmanifest</code>. You can provide it directly to PWABuilder using either option below:
                  </p>
                </div>
              </div>

              {/* Action Buttons for Manifest */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleDownloadManifest}
                  className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <FileJson className="w-4 h-4 text-amber-400" />
                  <span>Download manifest.json</span>
                </button>

                <button
                  onClick={handleCopyManifest}
                  className="py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {copiedManifest ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">Manifest JSON Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copy Manifest JSON</span>
                    </>
                  )}
                </button>
              </div>

              {/* PWABuilder Instructions */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700">
                <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                  <span>How to generate APK in PWABuilder:</span>
                  <button
                    onClick={() => setShowManifestCode(!showManifestCode)}
                    className="text-xs font-normal text-sky-600 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                    {showManifestCode ? 'Hide Manifest' : 'View Manifest'}
                  </button>
                </h3>

                {showManifestCode && (
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
                    {manifestJsonStr}
                  </pre>
                )}

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                      1
                    </span>
                    <div>
                      Click <strong>&ldquo;Copy Manifest JSON&rdquo;</strong> above.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                      2
                    </span>
                    <div>
                      Open PWABuilder. If it asks for manifest, paste the JSON or choose <strong>&ldquo;Edit / Paste Manifest&rdquo;</strong>.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                      3
                    </span>
                    <div>
                      Click <strong>&ldquo;Package for Stores&rdquo; &rarr; Android &rarr; &ldquo;Download Package&rdquo;</strong> to receive your signed <code>.apk</code> or <code>.aab</code>.
                    </div>
                  </div>
                </div>
              </div>

              <a
                href={pwaBuilderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                Open PWABuilder
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {/* Quick CLI Alternative */}
              <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 space-y-1">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-600" />
                  Google Bubblewrap CLI (Official Google Tool for Instant APK)
                </span>
                <p className="text-[11px] text-slate-500">
                  You can also generate an APK directly via terminal:
                </p>
                <div className="p-2 bg-slate-900 text-amber-300 rounded font-mono text-[10.5px]">
                  npx @bubblewrap/cli build
                </div>
              </div>
            </div>
          )}

          {activeTab === 'capacitor' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700">
                <span className="font-semibold text-sm text-slate-900 block mb-1">
                  Build APK via Capacitor & Android Studio (For Developers)
                </span>
                If you prefer to compile an APK binary directly using Android Studio and the Android SDK, you can export this codebase (via Settings &rarr; Export to GitHub/ZIP) and compile it in 2 minutes:
              </div>

              <div className="relative bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto">
                <div className="text-slate-400 mb-1"># 1. Export project & install Capacitor</div>
                <div className="text-amber-400">npm install @capacitor/core @capacitor/android</div>
                <div className="text-slate-400 my-1"># 2. Build web bundle & initialize Android project</div>
                <div className="text-emerald-400">npm run build</div>
                <div className="text-amber-400">npx cap init &quot;FieldPulse&quot; &quot;com.fieldpulse.app&quot; --web-dir dist</div>
                <div className="text-amber-400">npx cap add android</div>
                <div className="text-slate-400 my-1"># 3. Open in Android Studio and click &quot;Build APK&quot;</div>
                <div className="text-sky-400">npx cap open android</div>

                <button
                  onClick={handleCopyCommand}
                  className="absolute top-3 right-3 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                >
                  {copiedCommand ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Commands
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-500">
                In Android Studio, select <strong>Build &rarr; Build Bundle(s) / APK(s) &rarr; Build APK(s)</strong> to generate the standalone signed or debug <code>app-debug.apk</code>.
              </p>
            </div>
          )}

          {activeTab === 'kotlin' && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-3">
                <Code className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs text-purple-950 space-y-1">
                  <span className="font-semibold text-sm block">
                    Complete Native Kotlin & Jetpack Compose Source Code
                  </span>
                  <p>
                    All native Kotlin source files, Room SQLite database entities, DAOs, ViewModel, and Jetpack Compose screens have been created in the <code>android/</code> directory of this repository.
                  </p>
                </div>
              </div>

              {/* File selector pills */}
              <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setSelectedKotlinFile('main')}
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                    selectedKotlinFile === 'main'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  MainActivity.kt
                </button>
                <button
                  onClick={() => setSelectedKotlinFile('clock')}
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                    selectedKotlinFile === 'clock'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ClockInScreen.kt
                </button>
                <button
                  onClick={() => setSelectedKotlinFile('ehs')}
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                    selectedKotlinFile === 'ehs'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  EHSReportScreen.kt
                </button>
                <button
                  onClick={() => setSelectedKotlinFile('db')}
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                    selectedKotlinFile === 'db'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  FieldPulseDatabase.kt (Room)
                </button>
              </div>

              {/* Code Preview Box */}
              <div className="relative bg-slate-950 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56 border border-slate-800">
                {selectedKotlinFile === 'main' && (
                  <pre className="text-emerald-400">
{`package com.fieldpulse.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.material3.*
import com.fieldpulse.app.ui.FieldPulseViewModel
import com.fieldpulse.app.ui.screens.*

class MainActivity : ComponentActivity() {
    private val viewModel: FieldPulseViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            FieldPulseTheme {
                // Jetpack Compose Navigation & Scaffold
            }
        }
    }
}`}
                  </pre>
                )}

                {selectedKotlinFile === 'clock' && (
                  <pre className="text-amber-300">
{`package com.fieldpulse.app.ui.screens

@Composable
fun ClockInScreen(viewModel: FieldPulseViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    
    // Large Digital Shift Clock & Geofence Verification Lock
    Button(
        onClick = {
            if (uiState.isClockedIn) viewModel.clockOut()
            else viewModel.clockIn()
        },
        colors = ButtonDefaults.buttonColors(
            containerColor = if (uiState.isClockedIn) Rose600 else Amber500
        )
    ) {
        Text(if (uiState.isClockedIn) "CLOCK OUT" else "CLOCK IN NOW")
    }
}`}
                  </pre>
                )}

                {selectedKotlinFile === 'ehs' && (
                  <pre className="text-sky-300">
{`package com.fieldpulse.app.ui.screens

@Composable
fun EHSReportScreen(viewModel: FieldPulseViewModel) {
    // EHS Safety Observation Form with Risk Severity chips:
    // Low, Medium, High, Critical Stop-Work
    // CameraX site photo attachment and Room SQLite offline queue
}`}
                  </pre>
                )}

                {selectedKotlinFile === 'db' && (
                  <pre className="text-purple-300">
{`@Database(entities = [ClockRecord::class, EHSIncident::class], version = 1)
abstract class FieldPulseDatabase : RoomDatabase() {
    abstract fun clockRecordDao(): ClockRecordDao
    abstract fun ehsIncidentDao(): EHSIncidentDao
}`}
                  </pre>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <span className="font-semibold text-slate-900 block">
                  How to use this Kotlin code:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11.5px]">
                  <li>
                    <strong>In Android Studio:</strong> Click Settings &rarr; Export to GitHub/ZIP, open the <code>android/</code> folder, and click <em>Run</em>.
                  </li>
                  <li>
                    <strong>In Google AI Studio:</strong> Create a <em>New Applet</em>, pick the <em>Android</em> template, and paste these Kotlin files directly into your workspace.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>PWA & WebAPK Ready &bull; Offline Storage Enabled</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
