"use client";

import Stack from 'react-bootstrap/Stack';
import { Divider } from './Divider';

type BoxHeaderProps = {
  title: string;
  icon?: string;
  children?: React.ReactNode;
};

export default function BoxHeader({ title, icon, children }: BoxHeaderProps) {
  return (
    <>
      <Stack direction="horizontal" className="mb-3" gap={2}>
        {icon && <i className={`bi ${icon} me-1`} />}
        <h5 className="mb-0 me-auto">{title}</h5>
        {children}
      </Stack>
      <Divider />
    </>
  );
}


