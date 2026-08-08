import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Navigation, AlertCircle, CheckCircle2, QrCode, Upload, RefreshCw, Image as ImageIcon } from 'lucide-react';

export default function QRScannerModal({ onClose, onScanSuccess, activeEvent }) {
  const [geoError, setGeoError] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(true);
  const [currentCoords, setCurrentCoords] = useState(null);

  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  const html5QrCodeRef = useRef(null);
  const isStartingRef = useRef(false);
  const currentCoordsRef = useRef(null);

  useEffect(() => {
    // Acquire real browser geolocation
    if (navigator.geolocation) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          currentCoordsRef.current = coords;
          setCurrentCoords(coords);
          setGettingLocation(false);
          setGeoError(null);
        },
        (error) => {
          console.warn("Geolocation permission error:", error.message);
          setGeoError("Location permission is needed for GPS geofence verification.");
          setGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGeoError("Geolocation is not supported by your browser.");
      setGettingLocation(false);
    }

    // Delay camera start slightly to ensure DOM element #reader is mounted
    const timer = setTimeout(() => {
      startCameraScanner();
    }, 150);

    return () => {
      clearTimeout(timer);
      stopCameraScanner();
    };
  }, []);

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        // quiet cleanup
      }
    }
    isStartingRef.current = false;
    setIsScanning(false);
  };

  const startCameraScanner = async (cameraId = null) => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setCameraError(null);

    const readerElem = document.getElementById("reader");
    if (!readerElem) {
      isStartingRef.current = false;
      return;
    }

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("reader");
      } else if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      // Pre-check getUserMedia with 3.5s timeout promise race
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const testStreamPromise = navigator.mediaDevices.getUserMedia({ video: true });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Camera stream timed out")), 3500)
        );

        const stream = await Promise.race([testStreamPromise, timeoutPromise]);
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(track => track.stop());
        }
      }

      const devices = await Html5Qrcode.getCameras().catch(() => []);
      setCameras(devices);

      let config = { fps: 10, qrbox: { width: 220, height: 220 } };

      if (devices && devices.length > 0) {
        const targetCameraId = cameraId || devices[devices.length - 1]?.id || devices[0]?.id;
        setSelectedCameraId(targetCameraId);
        await html5QrCodeRef.current.start(
          targetCameraId,
          config,
          (decodedText) => {
            stopCameraScanner();
            handleQRScanned(decodedText);
          },
          () => {}
        );
      } else {
        await html5QrCodeRef.current.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            stopCameraScanner();
            handleQRScanned(decodedText);
          },
          () => {}
        );
      }
      setIsScanning(true);
    } catch (err) {
      setCameraError("Webcam is unavailable or locked by another app. Choose a QR Image File or enter reference code below.");
      setIsScanning(false);
    } finally {
      isStartingRef.current = false;
    }
  };

  const formatCameraLabel = (camera, index, allCameras) => {
    const label = (camera.label || '').toLowerCase();
    
    const isFront = label.includes('front') || label.includes('user') || label.includes('selfie') || label.includes('facing front');
    const isBack = label.includes('back') || label.includes('environment') || label.includes('rear') || label.includes('facing back');

    if (isFront) {
      const frontCameras = allCameras.filter(c => (c.label || '').toLowerCase().match(/front|user|selfie|facing front/));
      const frontIndex = frontCameras.findIndex(c => c.id === camera.id);
      return frontCameras.length > 1 ? `📷 Front Camera ${frontIndex + 1}` : '📷 Front Camera';
    }

    if (isBack) {
      const backCameras = allCameras.filter(c => (c.label || '').toLowerCase().match(/back|environment|rear|facing back/));
      const backIndex = backCameras.findIndex(c => c.id === camera.id);
      return backCameras.length > 1 ? `📷 Back Camera ${backIndex + 1}` : '📷 Back Camera';
    }

    return camera.label || `📷 Camera ${index + 1}`;
  };

  const handleSwitchCamera = (e) => {
    const newCamId = e.target.value;
    setSelectedCameraId(newCamId);
    stopCameraScanner().then(() => {
      startCameraScanner(newCamId);
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const fileScanner = new Html5Qrcode("file-reader-temp");
      const decodedText = await fileScanner.scanFile(file, true);
      fileScanner.clear();
      handleQRScanned(decodedText);
    } catch (err) {
      alert("Could not detect a valid QR code from the selected image. Please choose another image file.");
    }
  };

  const handleQRScanned = (qrText) => {
    // Haptic vibration feedback on mobile devices
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate([100]); } catch (e) {}
    }

    // Read from currentCoordsRef to prevent React stale closure issues
    const coords = currentCoordsRef.current || currentCoords;
    
    if (!coords) {
      // Fallback to active event venue coordinates if available
      if (activeEvent?.venue_latitude && activeEvent?.venue_longitude) {
        onScanSuccess(qrText, activeEvent.venue_latitude, activeEvent.venue_longitude);
        return;
      }
      alert("GPS location is acquiring. Please make sure location services are enabled on your device.");
      return;
    }
    onScanSuccess(qrText, coords.latitude, coords.longitude);
  };

  const handleSimulateScan = (qrRef, isFarAway = false) => {
    stopCameraScanner();
    let lat, lng;
    if (isFarAway) {
      lat = (activeEvent?.venue_latitude || 23.0225) + 0.045;
      lng = (activeEvent?.venue_longitude || 72.5714) + 0.045;
    } else {
      lat = activeEvent?.venue_latitude || 23.0225;
      lng = activeEvent?.venue_longitude || 72.5714;
    }
    onScanSuccess(qrRef, lat, lng);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#3A322C]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 warm-shadow border border-[#EFE7DA] relative space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#3A322C]/60 hover:text-[#8B3A3A] rounded-full hover:bg-[#FDFBF7] transition-colors cursor-pointer"
          title="Close Scanner"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#E8A33D]/10 text-[#E8A33D] mb-2">
            <Camera className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="font-serif-accent text-xl font-bold text-[#8B3A3A]">
            Scan Sabha Venue QR Code
          </h3>
          <p className="text-xs text-[#3A322C]/70">
            Hold camera steady over the venue's QR code poster or upload an image
          </p>
        </div>

        {/* Location Status Indicator */}
        <div className="px-3 py-2 rounded-xl bg-[#FDFBF7] border border-[#EFE7DA] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Navigation className={`w-4 h-4 ${(currentCoordsRef.current || currentCoords) ? 'text-[#5B8C5B]' : 'text-[#E8A33D] animate-spin'}`} />
            <span className="font-semibold text-[#3A322C]">
              {gettingLocation && !(currentCoordsRef.current || currentCoords) ? 'Acquiring GPS location...' : (currentCoordsRef.current || currentCoords) ? 'GPS Location Locked' : 'GPS Location Not Detected'}
            </span>
          </div>
          {(currentCoordsRef.current || currentCoords) && (
            <span className="text-[11px] font-mono text-[#5B8C5B]">
              {(currentCoordsRef.current || currentCoords).latitude.toFixed(4)}, {(currentCoordsRef.current || currentCoords).longitude.toFixed(4)}
            </span>
          )}
        </div>

        {geoError && (
          <div className="p-3 rounded-xl bg-[#FFF2CC] border border-[#D9B166] text-[#3A322C] text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#E8A33D] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Location Access Note</span>
              <span>{geoError}</span>
            </div>
          </div>
        )}

        {/* Camera Selector Dropdown if multiple devices */}
        {cameras.length > 1 && (
          <div className="flex items-center justify-between text-xs bg-[#FDFBF7] p-2 rounded-xl border border-[#EFE7DA]">
            <span className="font-semibold text-[#3A322C]">Select Camera:</span>
            <select
              value={selectedCameraId}
              onChange={handleSwitchCamera}
              className="p-1.5 rounded-lg border border-[#EFE7DA] bg-white text-xs font-medium text-[#3A322C] focus:outline-none focus:border-[#E8A33D]"
            >
              {cameras.map((c, idx) => (
                <option key={c.id} value={c.id}>
                  {formatCameraLabel(c, idx, cameras)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Permanent Reader DOM Element & Camera Error Container */}
        <div className="bg-[#FDFBF7] rounded-xl border border-[#EFE7DA] overflow-hidden p-2 flex flex-col items-center justify-center relative min-h-[160px]">
          <div id="reader" className="w-full text-xs text-[#3A322C]"></div>

          {cameraError && (
            <div className="p-4 text-center space-y-2.5">
              <AlertCircle className="w-7 h-7 text-[#E8A33D] mx-auto" />
              <div className="text-xs text-[#3A322C]/80 font-medium">{cameraError}</div>
              <button
                type="button"
                onClick={() => startCameraScanner()}
                className="bg-[#8B3A3A] hover:bg-[#6E2C2C] text-white font-semibold text-xs py-1.5 px-3 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* File Upload / Image Scan Option */}
        <div className="bg-[#FDFBF7] p-3 rounded-xl border border-[#EFE7DA] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#3A322C] flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-[#8B3A3A]" />
              <span>Scan QR from Image File</span>
            </span>
            <label className="bg-[#8B3A3A] hover:bg-[#6E2C2C] text-white font-semibold text-xs py-1.5 px-3 rounded-lg cursor-pointer flex items-center gap-1 transition-colors shadow-2xs">
              <Upload className="w-3.5 h-3.5" /> Select Image
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          <div id="file-reader-temp" className="hidden"></div>
        </div>

        {/* Geofence Testing Options (Simulated Scans) */}
        <div className="bg-[#FDFBF7] p-3 rounded-xl border border-[#EFE7DA]">
          <div className="text-[11px] font-semibold text-[#8B3A3A] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5" />
            <span>Geofence Testing Options (Simulated Scans):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleSimulateScan(activeEvent?.qr_code_reference || 'venue_central_mandir', false)}
              className="bg-white hover:bg-[#5B8C5B] hover:text-white text-[#5B8C5B] border border-[#5B8C5B]/40 font-medium py-2 px-3 rounded-lg text-left transition-colors flex items-center justify-between cursor-pointer"
            >
              <div>
                <span className="font-semibold block">Scan AT Venue</span>
                <span className="text-[10px] opacity-80">Inside geofence radius</span>
              </div>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            </button>

            <button
              onClick={() => handleSimulateScan(activeEvent?.qr_code_reference || 'venue_central_mandir', true)}
              className="bg-white hover:bg-[#C1554A] hover:text-white text-[#C1554A] border border-[#C1554A]/40 font-medium py-2 px-3 rounded-lg text-left transition-colors flex items-center justify-between cursor-pointer"
            >
              <div>
                <span className="font-semibold block">Scan FAR AWAY</span>
                <span className="text-[10px] opacity-80">5.0 km outside radius</span>
              </div>
              <AlertCircle className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
