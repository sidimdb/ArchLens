// Hook inside /shared/ instead of /hooks/ — filename should detect it.
import { useState } from 'react';

export function useAuth() {
  const [error, setError] = useState<string | null>(null);
  async function login(email: string, pass: string) {
    if (!email || !pass) {
      setError('missing credentials');
      return;
    }
    setError(null);
  }
  return { login, error };
}
