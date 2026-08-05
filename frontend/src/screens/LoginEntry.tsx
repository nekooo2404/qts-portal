'use client';

import { AuthProvider } from '../auth/AuthContext';
import AuthGateway from '../components/portal/AuthGateway';

export default function LoginEntry() {
  return (
    <AuthProvider>
      <AuthGateway />
    </AuthProvider>
  );
}
