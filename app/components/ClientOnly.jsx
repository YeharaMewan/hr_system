'use client';

import { useEffect, useState } from 'react';

// Component to prevent hydration mismatches caused by browser extensions
export default function ClientOnly({ children, fallback = null }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return fallback;
  }

  return children;
}
