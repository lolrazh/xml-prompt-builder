import React, { useEffect } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Login: React.FC = () => {
  const { isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        navigate('/', { replace: true, state: { from: location } });
      }
    }
  }, [isLoading, user, navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FEF7CD] dark:bg-gray-900">
      <div className="p-6 border-2 border-black dark:border-gray-700 bg-white dark:bg-gray-800 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-2xl font-black mb-2">Signing you in…</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 font-mono">If this page doesn’t redirect, return to the home page.</p>
      </div>
    </div>
  );
};

export default Login;


