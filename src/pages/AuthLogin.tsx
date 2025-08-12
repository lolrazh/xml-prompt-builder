import React, { useEffect } from 'react';
import { useAuth } from '@workos-inc/authkit-react';

const AuthLogin: React.FC = () => {
  const { signIn, user } = useAuth();

  useEffect(() => {
    if (!user) {
      // When the provider swaps in the real signIn function, this effect will re-run and redirect
      signIn();
    }
  }, [user, signIn]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FEF7CD] dark:bg-gray-900">
      <div className="p-6 border-2 border-black dark:border-gray-700 bg-white dark:bg-gray-800 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-2xl font-black mb-2">Redirecting to sign in…</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 font-mono">Please wait.</p>
      </div>
    </div>
  );
};

export default AuthLogin;


