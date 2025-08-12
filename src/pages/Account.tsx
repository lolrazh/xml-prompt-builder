import React from 'react';
import { useAuthWithCache } from '@/auth/useAuthWithCache';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-3 gap-4 py-2 border-b border-black/20 dark:border-white/20">
    <div className="font-bold">{label}</div>
    <div className="col-span-2 break-all font-mono text-sm">{value ?? '—'}</div>
  </div>
);

const Account: React.FC = () => {
  const { user, signIn, signOut, isLoading, isHydratingFromCache } = useAuthWithCache();
  const navigate = useNavigate();
  const onClickAccount = () => navigate('/account');

  const signInMethods = Array.isArray((user as any)?.authMethods)
    ? (user as any).authMethods.map((m: any) => m.type).join(', ')
    : undefined;

  if (!user && !isLoading) {
    return (
      <div className="min-h-screen bg-[#FEF7CD] dark:bg-gray-900 flex flex-col">
        <Header variant="account" />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-10">
            <div className="max-w-2xl mx-auto p-6 border-2 border-black dark:border-gray-100 bg-[#F2FCE2] dark:bg-gray-800 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black">Account Settings</h1>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => navigate('/')}
                    className="bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    Go Home
                  </Button>
                </div>
              </div>
              <p className="mb-4">You need to sign in to view your account.</p>
              <Button
                onClick={() => (isLoading ? navigate('/auth/login') : signIn())}
                className="bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Sign In
              </Button>
            </div>
          </div>
        </main>
        <footer className="border-t-2 border-black dark:border-gray-700 mt-16 py-6 bg-[#F2FCE2] dark:bg-gray-900">
          <div className="container mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Created with ♥ for prompt engineers and AI enthusiasts
              {" - "}
              <a
                href="https://github.com/lolrazh"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:underline"
              >
                by @lolrazh
              </a>
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FEF7CD] dark:bg-gray-900 flex flex-col">
      <Header variant="account" />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-2xl mx-auto p-6 border-2 border-black dark:border-gray-100 bg-[#F2FCE2] dark:bg-gray-800 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-black">Account Settings</h1>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate('/')}
                  className="bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  Back
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 border-2 border-black bg-white overflow-hidden">
                {user?.profilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.profilePictureUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full grid grid-cols-8 grid-rows-8">
                    {Array.from({ length: 64 }).map((_, i) => {
                      const row = Math.floor(i / 8);
                      const col = i % 8;
                      const on = QUESTION_MASK[row][col];
                      return (
                        // eslint-disable-next-line react/no-array-index-key
                        <div key={i} className={on ? 'bg-gray-800' : 'bg-transparent'} style={{ imageRendering: 'pixelated' as any }} />
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xl font-black">{user?.firstName || user?.lastName ? `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() : user?.email ?? 'User'}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 font-mono">{user?.email}</div>
              </div>
            </div>

            <div>
              <Row label="User ID" value={user?.id} />
              <Row label="Email" value={user?.email} />
              <Row label="Verified" value={String(user?.emailVerified ?? false)} />
              <Row label="Created" value={user?.createdAt ? new Date(user.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined} />
              <Row label="Updated" value={user?.updatedAt ? new Date(user.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined} />
              {/* <Row label="Sign-in Method" value={signInMethods ?? 'Unknown'} /> */}
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t-2 border-black dark:border-gray-700 mt-16 py-6 bg-[#F2FCE2] dark:bg-gray-900">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Created with ♥ for prompt engineers and AI enthusiasts
            {" - "}
            <a
              href="https://github.com/lolrazh"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
            >
              by @lolrazh
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Account;


const QUESTION_MASK: boolean[][] = [
  [false, true,  true,  true,  true,  true,  false, false],
  [true,  false, false, false, false, true,  false, false],
  [false, false, false, true,  true,  true,  false, false],
  [false, false, true,  false, false, true,  false, false],
  [false, false, true,  true,  true,  false, false, false],
  [false, false, false, false, true,  false, false, false],
  [false, false, false, false, true,  false, false, false],
  [false, false, false, false, true,  false, false, false],
];

