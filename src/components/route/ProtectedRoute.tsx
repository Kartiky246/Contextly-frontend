import { SignedIn, SignedOut } from '@clerk/clerk-react';
import type { JSX } from 'react';
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/" replace /> 
      </SignedOut>
    </>
  );
}
