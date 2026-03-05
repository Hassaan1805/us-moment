import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, Video, Volume2, RefreshCw, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

export default function DeviceSettings({ onClose, localStream, peers, onDeviceChange }) {
  const [devices, setDevices] = useState({ audioinput: [], videoinput: [], audiooutput: [] });
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');
  const [previewStream, setPreviewStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(null); // 'mic' | 'camera' | 'speaker'
  const previewRef = useRef(null);
  const sinkSupported = typeof HTMLMediaElement.prototype.setSinkId === 'function';

  // ─── Load available devices ───
  const loadDevices = useCallback(async () => {
    // Request permissions first so labels are populated
    try { await navigator.mediaDevices.getUserMedia({ audio: true, video: true }); } catch (_) {}
    const list = await navigator.mediaDevices.enumerateDevices();
    const grouped = { audioinput: [], videoinput: [], audiooutput: [] };
    list.forEach((d) => { if (grouped[d.kind]) grouped[d.kind].push(d); });
    setDevices(grouped);

    // Set current active device IDs from the live stream
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      const videoTrack = localStream.getVideoTracks()[0];
      if (audioTrack) setSelectedMic(audioTrack.getSettings().deviceId || '');
      if (videoTrack) setSelectedCamera(videoTrack.getSettings().deviceId || '');
    }
  }, [localStream]);

  useEffect(() => {
    loadDevices();
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
  }, [loadDevices]);

  // ─── Live camera preview ───
  useEffect(() => {
    let active = true;
    async function startPreview() {
      if (previewStream) previewStream.getTracks().forEach((t) => t.stop());
      if (!selectedCamera) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedCamera }, width: 320, height: 240 },
          audio: false,
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        setPreviewStream(stream);
        if (previewRef.current) previewRef.current.srcObject = stream;
      } catch (_) {}
    }
    startPreview();
    return () => {
      active = false;
      setPreviewStream((s) => { s?.getTracks().forEach((t) => t.stop()); return null; });
    };
  }, [selectedCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Apply mic change ───
  const applyMic = async () => {
    if (!selectedMic) return;
    setLoading(true);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: selectedMic }, echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      const [newTrack] = newStream.getAudioTracks();
      if (!newTrack) { setLoading(false); return; }

      // Replace in all active peer connections (no reconnect needed)
      Object.values(peers).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
        if (sender) sender.replaceTrack(newTrack).catch(() => {});
      });

      // Build a fresh MediaStream: keep existing video tracks, swap audio
      const videoTracks = localStream ? localStream.getVideoTracks() : [];
      const updatedStream = new MediaStream([...videoTracks, newTrack]);

      // Stop old audio tracks
      if (localStream) localStream.getAudioTracks().forEach((t) => t.stop());

      onDeviceChange?.({ type: 'mic', newStream: updatedStream });
      flashApplied('mic');
    } catch (err) {
      console.error('applyMic failed:', err);
    }
    setLoading(false);
  };

  // ─── Apply camera change ───
  const applyCamera = async () => {
    if (!selectedCamera) return;
    setLoading(true);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedCamera }, width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      const [newTrack] = newStream.getVideoTracks();
      if (!newTrack) { setLoading(false); return; }

      // Replace in all active peer connections
      Object.values(peers).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(newTrack).catch(() => {});
      });

      // Build a fresh MediaStream: keep existing audio tracks, swap video
      const audioTracks = localStream ? localStream.getAudioTracks() : [];
      const updatedStream = new MediaStream([...audioTracks, newTrack]);

      // Stop old video tracks
      if (localStream) localStream.getVideoTracks().forEach((t) => t.stop());

      onDeviceChange?.({ type: 'camera', newStream: updatedStream });
      flashApplied('camera');
    } catch (err) {
      console.error('applyCamera failed:', err);
    }
    setLoading(false);
  };

  // ─── Apply speaker change ───
  const applySpeaker = async () => {
    if (!selectedSpeaker || !sinkSupported) return;
    // setSinkId on all <audio>/<video> elements in the page
    const elements = document.querySelectorAll('audio, video');
    await Promise.all(
      Array.from(elements).map((el) =>
        el.setSinkId(selectedSpeaker).catch(() => {})
      )
    );
    onDeviceChange?.({ type: 'speaker', deviceId: selectedSpeaker });
    flashApplied('speaker');
  };

  const flashApplied = (type) => {
    setApplied(type);
    setTimeout(() => setApplied(null), 2000);
  };

  const labelFor = (d) => d.label || `${d.kind === 'audioinput' ? 'Microphone' : d.kind === 'videoinput' ? 'Camera' : 'Speaker'} ${d.deviceId.slice(0, 5)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Audio &amp; Video Settings</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* ─ Microphone ─ */}
          <DeviceRow
            icon={<Mic className="w-4 h-4" />}
            label="Microphone"
            devices={devices.audioinput}
            selected={selectedMic}
            onChange={setSelectedMic}
            onApply={applyMic}
            loading={loading}
            applied={applied === 'mic'}
            labelFor={labelFor}
          />

          {/* ─ Camera ─ */}
          <DeviceRow
            icon={<Video className="w-4 h-4" />}
            label="Camera"
            devices={devices.videoinput}
            selected={selectedCamera}
            onChange={setSelectedCamera}
            onApply={applyCamera}
            loading={loading}
            applied={applied === 'camera'}
            labelFor={labelFor}
          />

          {/* Camera Preview */}
          {selectedCamera && (
            <div className="ml-6 -mt-2">
              <div className="relative w-full aspect-video max-w-[260px] bg-surface-800 rounded-xl overflow-hidden border border-surface-700">
                <video
                  ref={previewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <div className="absolute top-2 left-2 bg-black/50 text-xs text-white px-2 py-0.5 rounded-full">
                  Preview
                </div>
              </div>
            </div>
          )}

          {/* ─ Speaker / Output ─ */}
          {sinkSupported ? (
            <DeviceRow
              icon={<Volume2 className="w-4 h-4" />}
              label="Speaker / Headphones"
              devices={devices.audiooutput}
              selected={selectedSpeaker}
              onChange={setSelectedSpeaker}
              onApply={applySpeaker}
              loading={loading}
              applied={applied === 'speaker'}
              labelFor={labelFor}
            />
          ) : (
            <div className="flex items-start gap-3 p-3 bg-surface-800/60 rounded-xl border border-surface-700">
              <Volume2 className="w-4 h-4 text-surface-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-surface-300">Speaker / Headphones</p>
                <p className="text-xs text-surface-500 mt-0.5">
                  Output device selection is not supported in this browser. Use Firefox or Chrome for output control.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Refresh devices */}
        <button
          type="button"
          onClick={loadDevices}
          className="mt-6 flex items-center gap-2 text-xs text-surface-400 hover:text-surface-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh device list
        </button>
      </div>
    </div>
  );
}

function DeviceRow({ icon, label, devices, selected, onChange, onApply, loading, applied, labelFor }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-surface-300">
        <span className="text-primary-400">{icon}</span>
        {label}
      </label>
      {/* Select on its own row so long device names never push button outside the modal */}
      <select
        className="w-full bg-surface-800 border border-surface-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
      >
        {devices.length === 0 && (
          <option value="">No devices found</option>
        )}
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {labelFor(d)}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onApply}
        disabled={loading || !selected}
        className={clsx(
          'flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-sm font-medium transition-all',
          applied
            ? 'bg-green-600 text-white'
            : 'bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-40 disabled:cursor-not-allowed'
        )}
      >
        {applied ? (
          <><CheckCircle className="w-4 h-4" /> Applied!</>
        ) : loading ? (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          `Apply ${label}`
        )}
      </button>
    </div>
  );
}
