import React, { useEffect } from 'react';
import { useBetterAuth } from '../auth/useBetterAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Login: React.FC = () => {
  const { isLoading, user, signInWithGoogle, signInWithGitHub } = useBetterAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/', { replace: true, state: { from: location } });
    }
  }, [isLoading, user, navigate, location]);

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEF7CD] dark:bg-gray-900">
        <div className="p-6 border-2 border-black dark:border-gray-700 bg-white dark:bg-gray-800 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-2xl font-black mb-2">Signing you in…</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 font-mono">If this page doesn't redirect, return to the home page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FEF7CD] dark:bg-gray-900">
      <div className="p-8 border-2 border-black dark:border-gray-700 bg-white dark:bg-gray-800 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-md w-full mx-4">
        <h1 className="text-3xl font-black mb-6 text-center">Sign In</h1>
        <div className="space-y-4">
          <Button 
            onClick={signInWithGoogle}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all duration-200"
          >
            Continue with Google
          </Button>
          <Button 
            onClick={signInWithGitHub}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-4 border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all duration-200"
          >
            Continue with GitHub
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;


