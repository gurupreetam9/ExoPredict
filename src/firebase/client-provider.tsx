
'use client';

import React, { useEffect, type ReactNode } from 'react';
import { FirebaseProvider, useFirebase } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

function FirebaseInitializer({ children }: { children: ReactNode }) {
  const { setFirebaseServices } = useFirebase();

  useEffect(() => {
    // This effect runs only on the client, after the initial render.
    // This is the guaranteed safe place to initialize Firebase.
    const services = initializeFirebase();
    setFirebaseServices(services);
  }, [setFirebaseServices]);

  return <>{children}</>;
}


export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  return (
    <FirebaseProvider>
        <FirebaseInitializer>
            {children}
        </FirebaseInitializer>
    </FirebaseProvider>
  );
}
