import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import PaintCanvas from '../src/components/PaintCanvas';
import type { ArtPage, ColoringState, Tool, ColoringMode } from '../src/types';

const art: ArtPage = {
  id: 'gesture-fixture', title: 'Gesture fixture', category: 'Test', difficulty: 'Easy', tags: [], width: 200, height: 200,
  palette: ['#e79062', '#548cff'], transparent: true, description: '',
  regions: [
    { id: 'face', d: 'M20 20H180V180H20Z', label: [45, 45], color: '#e79062', number: 1, name: 'Face', strokeWidth: 4 },
    { id: 'eye', d: 'M80 70H120V100H80Z', label: [100, 85], color: '#548cff', number: 2, name: 'Eye', strokeWidth: 3 },
  ], lines: [], shades: [],
};

function Fixture() {
  const [state, setState] = useState<ColoringState>({ fills: {}, strokes: [], shading: false });
  const [settings, setSettings] = useState<{ tool: Tool; mode: ColoringMode; selectedNumber: number; fitKey: number }>({ tool: 'brush', mode: 'free', selectedNumber: 1, fitKey: 0 });
  const [zoom, setZoom] = useState(1);
  const [picked, setPicked] = useState('');
  Object.assign(window, { __engineFixture: { state, zoom, picked, settings, setSettings: (patch: Partial<typeof settings>) => setSettings(value => ({ ...value, ...patch })), reset: () => { setState({ fills: {}, strokes: [], shading: false }); setSettings(value => ({ ...value, fitKey: value.fitKey + 1 })); } } });
  return <div style={{ width: 350, height: 400 }}><PaintCanvas page={art} state={state} {...settings} color="#e79062" secondaryColor="#4455ff" brushSize={20} opacity={1} guided showNumbers={false} onChange={setState} onPickColor={setPicked} onZoomChange={setZoom} /></div>;
}

createRoot(document.getElementById('fixture-root')!).render(<Fixture />);
