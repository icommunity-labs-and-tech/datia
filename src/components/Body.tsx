'use client';

import Stack from 'react-bootstrap/Stack';

export default function PageBody({ children }: { children: React.ReactNode }) {
  return (
    <Stack gap={3} className='mt-4'>
      {/* {Array.isArray(children) ? (
        children.map((child, index) => <Box key={index}>{child}</Box>)
      ) : (
        <Box>{children}</Box>
      )} */}

      {Array.isArray(children) ? children : children}
    </Stack>
  );
}
