'use client';

import './BoxStretched.css';
import GlassCard from './GlassCard';

export default function BoxStretched({ children }: { children: React.ReactNode }) {
  return <GlassCard variant="header">{children}</GlassCard>;
}