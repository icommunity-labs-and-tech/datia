'use client';

import './Box.css';
import GlassCard from './GlassCard';

export default function Box({ children }: { children: React.ReactNode }) {
  return <GlassCard variant="box">{children}</GlassCard>;
}