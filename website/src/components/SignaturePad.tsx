import { useRef, useState } from 'react';

interface Props {
  onConfirm: (svgPath: string) => void;
  onCancel: () => void;
  width?: number;
  height?: number;
}

// Captures a hand-drawn signature as an SVG path string ("M x y L x y ...")
// — the exact same wire format the mobile app's PanResponder-based signature
// capture already produces (frontend/src/components/SignatureModal.tsx), so
// finalizePrescription() accepts it with zero backend/data-model changes.
export default function SignaturePad({ onConfirm, onCancel, width = 560, height = 220 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const drawing = useRef(false);

  const getPoint = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    drawing.current = true;
    const { x, y } = getPoint(e);
    setCurrentPath(`M ${x.toFixed(1)} ${y.toFixed(1)}`);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing.current) return;
    const { x, y } = getPoint(e);
    setCurrentPath((p) => `${p} L ${x.toFixed(1)} ${y.toFixed(1)}`);
  };

  const handlePointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setPaths((prev) => [...prev, currentPath]);
    setCurrentPath('');
  };

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
  };

  const handleConfirm = () => {
    const combined = paths.join(' ');
    if (!combined.trim()) return;
    onConfirm(combined);
  };

  return (
    <div>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-secondary)', touchAction: 'none', cursor: 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {paths.map((d, i) => (
          <path key={i} d={d} stroke="var(--color-text)" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {currentPath && (
          <path d={currentPath} stroke="var(--color-text)" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button type="button" className="secondary-btn" onClick={handleClear}>Clear</button>
        <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>
        <button type="button" className="primary-btn" disabled={paths.length === 0} onClick={handleConfirm}>
          Use signature
        </button>
      </div>
    </div>
  );
}
