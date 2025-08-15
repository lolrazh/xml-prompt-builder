import React from 'react';
import { Code, Github, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthWithCache } from '@/auth/useAuthWithCache';
import { useNavigate } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import HelpDialog from './HelpDialog';

type HeaderProps = {
  variant?: 'index' | 'account';
};

const Header: React.FC<HeaderProps> = ({ variant = 'index' }) => {
  const { user, signIn, signOut, isLoading, isHydratingFromCache } = useAuthWithCache();
  
  const navigate = useNavigate();

  const onClickAccount = () => navigate('/account');
  const onClickDashboard = () => navigate('/dashboard');

  const signInButtonClassName =
    variant === 'account'
      ? 'flex items-center gap-1 bg-white hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all'
      : 'flex items-center gap-1 bg-[#d2e8c6] hover:bg-[#d2e8c6] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all';

  const dropdownItemClassName =
    variant === 'account'
      ? 'w-full text-left px-3 py-2 hover:bg-[#9AE66E]/30 font-mono text-sm'
      : 'w-full text-left px-3 py-2 focus:outline-none hover:bg-gray-100 font-mono text-sm';

  return (
    <header className="border-b-2 border-black dark:border-gray-700 bg-[#9AE66E] dark:bg-gray-800 shadow-[0_4px_0px_0px_rgba(0,0,0,0.1)]">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-3xl font-black text-black dark:text-white flex items-center gap-2">
          <Code className="h-7 w-7 stroke-[3]" />
          <span>XML Prompt Builder</span>
        </h1>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/lolrazh/xml-prompt-builder"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 w-9 flex items-center justify-center rounded-none hover:bg-[#9AE66E]/30"
          >
            <Github className="h-5 w-5 stroke-[3]" />
          </a>
          <HelpDialog />
          {user ? (
            <>
              <Button
                onClick={onClickDashboard}
                size="sm"
                className="h-9 px-3 bg-white hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
              <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="h-9 w-9 p-0 border-2 border-black bg-white rounded-none overflow-hidden"
                  aria-label="Account"
                >
                  {user.profilePictureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.profilePictureUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    // Pixelated question mark while loading or when no picture
                    <div className="h-full w-full">
                      <div className="h-full w-full bg-white">
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
                      </div>
                    </div>
                  )}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content
                sideOffset={6}
                className="min-w-[180px] bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-100 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-1"
              >
                <DropdownMenu.Item asChild>
                  <button className={dropdownItemClassName} onClick={onClickAccount}>
                    Account Settings
                  </button>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-black/20 dark:bg-white/20 my-1" />
                <DropdownMenu.Item asChild>
                  <button className={dropdownItemClassName} onClick={() => signOut()}>
                    Sign Out
                  </button>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
              </DropdownMenu.Root>
            </>
          ) : (
            <Button onClick={() => (isLoading ? navigate('/auth/login') : signIn())} size="sm" className={signInButtonClassName}>
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;



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

