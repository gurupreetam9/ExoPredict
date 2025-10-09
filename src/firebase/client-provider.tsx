
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // Initialize Firebase services only on the client-side, and memoize the result.
  // This ensures that initialization happens only once.
  const firebaseServices = useMemo(() => {
    // Check if we are in a browser environment before initializing
    if (typeof window !== 'undefined') {
      return initializeFirebase();
    }
    return { firebaseApp: null, auth: null, firestore: null };
  }, []);

  return (
    <FirebaseProvider {...firebaseServices}>
        {children}
    </FirebaseProvider>
  );
}
