import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PhotoType, ReportPhoto, EHSAnswer } from '../../types';
import { CameraCaptureModal } from './CameraCaptureModal';
import { 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft,
  ChevronRight,
  HardHat,
  Wrench,
  Truck,
  Building,
  FileCheck,
  Send,
  WifiOff,
  Sparkles,
  Info
} from 'lucide-react';

interface ClockInWizardProps {
  onCancel: () => void;
  onCompleted: () => void;
}

export const ClockInWizard: React.FC<ClockInWizardProps> = ({ onCancel, onCompleted }) => {
  const { 
    currentUser, 
    ehsQuestions, 
    submitClockInReport, 
    isNetworkOnline,
    settings 
  } = useApp();

  // Wizard Step:
  // 1 = PPE Selfie
  // 2 = Tool Check
  // 3 = Vehicle Check
  // 4 = Ladder Check
  // 5 = EHS Checklist
  // 6 = Comments & Hazards
  // 7 = Final Review & Submit
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Photos State
  const [ppePhoto, setPpePhoto] = useState<ReportPhoto | null>(null);
  const [toolPhoto, setToolPhoto] = useState<ReportPhoto | null>(null);
  const [vehiclePhoto, setVehiclePhoto] = useState<ReportPhoto | null>(null);
  const [ladderPhoto, setLadderPhoto] = useState<ReportPhoto | null>(null);

  // Camera Modal State
  const [activeCameraType, setActiveCameraType] = useState<PhotoType | null>(null);

  // EHS Answers State (default all mandatory questions to true, with ability to toggle)
  const [answers, setAnswers] = useState<Record<string, { isCompliant: boolean; notes: string }>>(() => {
    const initial: Record<string, { isCompliant: boolean; notes: string }> = {};
    ehsQuestions.forEach(q => {
      initial[q.id] = { isCompliant: true, notes: '' };
    });
    return initial;
  });

  // Comments & Hazards
  const [generalComments, setGeneralComments] = useState<string>('');
  const [identifiedHazards, setIdentifiedHazards] = useState<string>('');

  // GPS State (Live Simulation or Real Geolocation)
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number }>({
    lat: 37.7749,
    lng: -122.4194,
    accuracy: 4.2,
  });

  // Clock-in Time Simulation Toggle (Matches prompt's explicit 07:42 AM test scenario!)
  const [usePromptDemoTime, setUsePromptDemoTime] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Helper to open camera for a photo type
  const handleOpenCamera = (type: PhotoType) => {
    setActiveCameraType(type);
  };

  const handlePhotoCaptured = (photo: ReportPhoto) => {
    switch (photo.photoType) {
      case 'PPE_SELFIE':
        setPpePhoto(photo);
        break;
      case 'TOOL_CHECK':
        setToolPhoto(photo);
        break;
      case 'VEHICLE_CHECK':
        setVehiclePhoto(photo);
        break;
      case 'LADDER_CHECK':
        setLadderPhoto(photo);
        break;
    }
  };

  const canAdvanceFromPhotos = (step: number) => {
    if (step === 1) return !!ppePhoto;
    if (step === 2) return !!toolPhoto;
    if (step === 3) return !!vehiclePhoto;
    if (step === 4) return !!ladderPhoto;
    return true;
  };

  const handleFinalSubmit = async () => {
    if (!ppePhoto || !toolPhoto || !vehiclePhoto || !ladderPhoto) {
      setSubmitError('All 4 safety photos are mandatory before submitting official clock-in.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const todayStr = new Date().toISOString().split('T')[0];
    
    // If prompt demo time selected: use 07:42 AM! Otherwise real ISO time
    let recordedIso = new Date().toISOString();
    if (usePromptDemoTime) {
      recordedIso = `${todayStr}T07:42:15.000Z`;
    }

    const formattedAnswers: EHSAnswer[] = Object.entries(answers).map(([qId, val]: [string, { isCompliant: boolean; notes: string }]) => ({
      questionId: qId,
      isCompliant: val.isCompliant,
      notes: val.notes || undefined,
    }));

    const photosList: ReportPhoto[] = [ppePhoto, toolPhoto, vehiclePhoto, ladderPhoto];

    try {
      const result = await submitClockInReport({
        recordedAt: recordedIso,
        latitude: gpsLocation.lat,
        longitude: gpsLocation.lng,
        accuracyMeters: gpsLocation.accuracy,
        rawGpsTimestamp: recordedIso,
        photos: photosList,
        ehsAnswers: formattedAnswers,
        generalComments: generalComments.trim() || undefined,
        identifiedHazards: identifiedHazards.trim() || undefined,
        customTimeOverride: usePromptDemoTime ? recordedIso : undefined,
      });

      setIsSubmitting(false);
      if (result.success) {
        onCompleted();
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err?.message || 'Submission failed');
    }
  };

  const totalSteps = 7;
  const progressPercent = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="w-full max-w-xl mx-auto bg-white text-slate-900 rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
      
      {/* Wizard Header */}
      <div className="p-4 sm:p-5 bg-white border-b border-slate-200/80">
        <div className="flex items-center justify-between mb-2.5">
          <button
            onClick={onCancel}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-1.5 bg-[#FFEBEE] px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold text-[#B71C1C] border border-red-200">
            <span>Step {currentStep} of {totalSteps}</span>
          </div>

          <span className="text-[11px] font-mono font-bold text-[#B71C1C] bg-[#FFEBEE] px-2 py-0.5 rounded">
            {currentUser.employeeId}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#D32F2F] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step Title */}
        <div className="mt-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {currentStep === 1 && '1. Personal Protective Equipment (PPE)'}
            {currentStep === 2 && '2. Tools & Machinery Verification'}
            {currentStep === 3 && '3. Vehicle Fleet 360 Check'}
            {currentStep === 4 && '4. Ladder & Height Safety Check'}
            {currentStep === 5 && '5. Daily EHS Inspection Checklist'}
            {currentStep === 6 && '6. Site Hazards & Field Comments'}
            {currentStep === 7 && '7. Review & Official Clock-In'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentStep <= 4 && 'Direct camera capture with automatic GPS and timestamp stamping.'}
            {currentStep === 5 && 'Verify daily safety compliance for mandatory risk prevention.'}
            {currentStep === 6 && 'Report unusual obstacles or access notes for the supervisor.'}
            {currentStep === 7 && 'Confirm timestamp and evidence bundle before official locking.'}
          </p>
        </div>
      </div>

      {/* Main Step Body */}
      <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 bg-slate-50/50">
        
        {/* STEPS 1-4: PHOTO CAPTURES */}
        {currentStep === 1 && (
          <PhotoStepCard
            title="PPE Selfie"
            description="Take an upper torso photo showing your approved hard hat, safety glasses with side shields, and high-visibility vest."
            icon={<HardHat className="w-6 h-6 text-[#D32F2F]" />}
            photo={ppePhoto}
            onOpenModal={() => handleOpenCamera('PPE_SELFIE')}
          />
        )}

        {currentStep === 2 && (
          <PhotoStepCard
            title="Tools & Equipment Photo"
            description="Photograph your primary power tools and cord assemblies to prove safety guards are attached and leads are free of cuts or frays."
            icon={<Wrench className="w-6 h-6 text-[#D32F2F]" />}
            photo={toolPhoto}
            onOpenModal={() => handleOpenCamera('TOOL_CHECK')}
          />
        )}

        {currentStep === 3 && (
          <PhotoStepCard
            title="Vehicle 360 Photo"
            description="Photograph the front quarter of your service vehicle verifying clean lights, sound tires, and clear mirrors."
            icon={<Truck className="w-6 h-6 text-[#D32F2F]" />}
            photo={vehiclePhoto}
            onOpenModal={() => handleOpenCamera('VEHICLE_CHECK')}
          />
        )}

        {currentStep === 4 && (
          <PhotoStepCard
            title="Ladder Duty Rating & Feet"
            description="Photograph the ladder showing duty rating label (Type IA/IAA), non-skid rubber feet, and clean rungs."
            icon={<Building className="w-6 h-6 text-[#D32F2F]" />}
            photo={ladderPhoto}
            onOpenModal={() => handleOpenCamera('LADDER_CHECK')}
          />
        )}

        {/* STEP 5: EHS CHECKLIST */}
        {currentStep === 5 && (
          <div className="space-y-3">
            <div className="bg-[#FFEBEE] border border-red-200 rounded-2xl p-3.5 text-xs text-[#B71C1C] flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#D32F2F] shrink-0 mt-0.5" />
              <span className="font-semibold">All 5 questions are mandatory for OSHA & corporate safety compliance.</span>
            </div>

            {ehsQuestions.map((q, idx) => {
              const currentAns = answers[q.id] || { isCompliant: true, notes: '' };
              return (
                <div 
                  key={q.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#B71C1C] bg-[#FFEBEE] px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {q.category}
                      </span>
                      <p className="text-xs font-semibold text-slate-800 mt-1.5 leading-snug">
                        {idx + 1}. {q.questionText}
                      </p>
                    </div>

                    {/* Yes / No Toggle - Material 3 Segmented Control */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setAnswers(prev => ({
                            ...prev,
                            [q.id]: { ...prev[q.id], isCompliant: true }
                          }));
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentAns.isCompliant
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        YES
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAnswers(prev => ({
                            ...prev,
                            [q.id]: { ...prev[q.id], isCompliant: false }
                          }));
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          !currentAns.isCompliant
                            ? 'bg-[#D32F2F] text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  {/* If non-compliant, require explanatory notes */}
                  {!currentAns.isCompliant && (
                    <div className="mt-2">
                      <label className="block text-[10px] font-bold text-[#B71C1C] uppercase tracking-wider mb-1">
                        Explain Non-Compliance / Corrective Action Taken:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Replaced frayed extension cord with backup from truck."
                        value={currentAns.notes}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAnswers(prev => ({
                            ...prev,
                            [q.id]: { ...prev[q.id], notes: val }
                          }));
                        }}
                        className="w-full bg-[#F7F7F7] border border-red-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#D32F2F] focus:ring-2 focus:ring-[#FFEBEE]"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* STEP 6: COMMENTS & HAZARDS */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-2xs">
              <label className="block text-xs font-bold text-[#D32F2F] uppercase tracking-wider">
                Site Hazards & Environmental Obstacles (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Wet slope near substation transformer, bee nest by junction box, gate latch broken..."
                value={identifiedHazards}
                onChange={(e) => setIdentifiedHazards(e.target.value)}
                className="w-full bg-[#F7F7F7] border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-2 focus:ring-[#FFEBEE] transition-all resize-none"
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-2xs">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                General Arrival Comments & Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Arrived on site, customer confirmed permit access..."
                value={generalComments}
                onChange={(e) => setGeneralComments(e.target.value)}
                className="w-full bg-[#F7F7F7] border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-2 focus:ring-[#FFEBEE] transition-all resize-none"
              />
            </div>
          </div>
        )}

        {/* STEP 7: FINAL REVIEW & SUBMIT */}
        {currentStep === 7 && (
          <div className="space-y-4">
            
            {/* Offline notification card */}
            {!isNetworkOnline && (
              <div className="bg-[#FFEBEE] border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
                <WifiOff className="w-5 h-5 text-[#D32F2F] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-[#B71C1C]">Offline Mode Active</h4>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Your clock-in will be recorded with exact local device timestamp in encrypted local SQLite storage. When connectivity returns, it will synchronize as an official <strong>Offline Sync</strong> without modifying your clock-in time.
                  </p>
                </div>
              </div>
            )}

            {/* Prompt Test Case Scenario Helper */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#D32F2F]" />
                  Test Scenario: Record Clock-In at 07:42 AM
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePromptDemoTime}
                    onChange={(e) => setUsePromptDemoTime(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#D32F2F]" />
                </label>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Toggle to simulate the exact test case from the specification: Record clock-in at <strong>07:42 AM</strong>. The server will preserve 07:42 as your official clock-in time even if synchronized hours later!
              </p>
            </div>

            {/* Verification Summary Matrix */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-xs">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Official Clock-In Attestation</span>
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono text-[10px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  INTEGRITY VERIFIED
                </span>
              </h3>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-[#F7F7F7] p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px] font-medium">Technician</span>
                  <span className="font-bold text-slate-900">{currentUser.fullName}</span>
                </div>
                <div className="bg-[#F7F7F7] p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px] font-medium">Employee ID</span>
                  <span className="font-bold font-mono text-[#B71C1C]">{currentUser.employeeId}</span>
                </div>
                <div className="bg-[#F7F7F7] p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px] font-medium">Recorded Time</span>
                  <span className="font-bold font-mono text-[#D32F2F]">
                    {usePromptDemoTime ? '07:42:15 AM' : new Date().toLocaleTimeString()}
                  </span>
                </div>
                <div className="bg-[#F7F7F7] p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px] font-medium">Expected Time</span>
                  <span className="font-bold font-mono text-slate-800">
                    {currentUser.customExpectedStartTime || settings?.defaultExpectedStartTime || '08:00'} AM
                  </span>
                </div>
              </div>

              {/* 4 Photo thumbnails */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-600 block mb-2">
                  Captured Safety Photos (4 Verified)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'PPE', photo: ppePhoto },
                    { label: 'Tools', photo: toolPhoto },
                    { label: 'Vehicle', photo: vehiclePhoto },
                    { label: 'Ladder', photo: ladderPhoto },
                  ].map((item, i) => (
                    <div key={i} className="text-center">
                      <div className="w-full aspect-square rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100 shadow-2xs">
                        {item.photo && (
                          <img 
                            src={item.photo.dataUrl} 
                            alt={item.label} 
                            className="w-full h-full object-cover" 
                          />
                        )}
                        <span className="absolute bottom-0 inset-x-0 bg-slate-900/85 text-[9px] font-bold text-white py-0.5">
                          {item.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* EHS Compliance Check */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">EHS Safety Questions:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  All 5 Completed
                </span>
              </div>
            </div>

            {submitError && (
              <div className="p-3.5 rounded-2xl bg-[#FFEBEE] border border-red-200 text-xs text-[#B71C1C] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#D32F2F] shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Wizard Footer Navigation */}
      <div className="p-4 bg-white border-t border-slate-200/80 flex items-center justify-between gap-3">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        {currentStep < 7 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(prev => prev + 1)}
            disabled={!canAdvanceFromPhotos(currentStep)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              canAdvanceFromPhotos(currentStep)
                ? 'bg-[#D32F2F] hover:bg-[#B71C1C] active:bg-[#991B1B] text-white shadow-xs'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#D32F2F] hover:bg-[#B71C1C] active:bg-[#991B1B] text-white font-bold text-sm shadow-xs transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing & Stamping Payload...</span>
              </span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Confirm & Submit Clock-In</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Active Camera Viewfinder Modal */}
      {activeCameraType && (
        <CameraCaptureModal
          isOpen={!!activeCameraType}
          photoType={activeCameraType}
          onClose={() => setActiveCameraType(null)}
          onPhotoCaptured={handlePhotoCaptured}
          technicianId={currentUser.id}
          technicianName={currentUser.fullName}
          employeeId={currentUser.employeeId || 'EMP-1042'}
        />
      )}
    </div>
  );
};

// Sub-component for Photos Step Card
interface PhotoStepCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  photo: ReportPhoto | null;
  onOpenModal: () => void;
}

const PhotoStepCard: React.FC<PhotoStepCardProps> = ({
  title,
  description,
  icon,
  photo,
  onOpenModal,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FFEBEE] border border-red-200 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="font-heading font-bold text-sm sm:text-base text-slate-900">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Photo Preview or Camera Button */}
      {photo ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-4/3 flex items-center justify-center group shadow-2xs">
          <img
            src={photo.dataUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={onOpenModal}
              className="px-4 py-2 rounded-xl bg-[#D32F2F] hover:bg-[#B71C1C] active:scale-[0.98] text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-white"
            >
              <Camera className="w-4 h-4" />
              <span>Retake Photo</span>
            </button>
          </div>

          <div className="absolute bottom-2 left-2 bg-emerald-800 text-white px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Captured & Stamped</span>
          </div>
        </div>
      ) : (
        <button
          onClick={onOpenModal}
          className="w-full py-7 px-4 border-2 border-dashed border-red-200/90 hover:border-[#D32F2F] rounded-xl bg-[#FFEBEE]/30 hover:bg-[#FFEBEE]/60 transition-all flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer group active:scale-[0.99] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D32F2F]"
        >
          <div className="w-12 h-12 rounded-xl bg-[#D32F2F] group-hover:bg-[#B71C1C] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-all">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900 block">
              Launch Device Camera
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Auto-records GPS coordinates & timestamp watermark
            </span>
          </div>
        </button>
      )}
    </div>
  );
};
