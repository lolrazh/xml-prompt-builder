
import React, { useEffect, useState } from 'react';
import PromptBuilder from '../components/PromptBuilder';
import { PlusCircle, Sparkles, ClipboardPaste, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthWithCache } from '@/auth/useAuthWithCache';
import Header from '../components/Header';
 
import { useAuth } from '@workos-inc/authkit-react';
import { ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

const Index = () => {
  const { user } = useAuthWithCache();
  const { getAccessToken } = useAuth();
  const [prompts, setPrompts] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [saveName, setSaveName] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPrompts = async () => {
      if (!user) return;
      setIsLoadingPrompts(true);
      try {
        const token = await getAccessToken();
        if (!token) {
          setPrompts([]);
          return;
        }
        const apiBase = import.meta.env.PROD ? 'https://backend.soyrun.workers.dev' : '';
        const res = await fetch(`${apiBase}/api/prompts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load prompts');
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.prompts)
          ? data.prompts
          : [];
        setPrompts(list.map((p: any) => ({ id: String(p.id), name: String(p.name ?? '') })));
      } catch {
        setPrompts([]);
      } finally {
        setIsLoadingPrompts(false);
      }
    };
    fetchPrompts();
  }, [user, getAccessToken]);
  // Header handles navigation internally

  return (
    <div className="min-h-screen bg-[#FEF7CD] dark:bg-gray-900 flex flex-col">
      <Header variant="index" />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-10">
        {/* Landing Page Content */}
        <div className="mb-16 text-center">
          <h2 className="text-5xl font-black mb-6 leading-tight text-black dark:text-white">
            Build <span className="text-[#76B947]">XML Prompts</span> Visually
          </h2>
          <p className="text-xl max-w-3xl mx-auto text-gray-700 dark:text-gray-300 mb-10">
            Create structured XML prompts for AI systems without the hassle of manual formatting.
            Perfect for prompt engineers and AI enthusiasts.
          </p>
          
          <div className={`grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto ${user ? 'hidden' : ''}`}>
            <div className="p-4 border-2 border-black rounded-none bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center">
              <PlusCircle className="h-10 w-10 mb-3 stroke-[2.5] text-[#76B947]" />
              <h3 className="text-xl font-bold mb-2">Create Elements</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add XML tags and nest them to create complex hierarchies easily
              </p>
            </div>
            
            <div className="p-4 border-2 border-black rounded-none bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center">
              <Sparkles className="h-10 w-10 mb-3 stroke-[2.5] text-[#76B947]" />
              <h3 className="text-xl font-bold mb-2">Format Automatically</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Let the tool handle indentation, nesting, and proper XML formatting
              </p>
            </div>

            <div className="p-4 border-2 border-black rounded-none bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center">
              <ClipboardPaste className="h-10 w-10 mb-3 stroke-[2.5] text-[#76B947]" />
              <h3 className="text-xl font-bold mb-2">Import XML</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Paste an existing XML prompt and edit it visually in seconds
              </p>
            </div>
            
            <div className="p-4 border-2 border-black rounded-none bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center">
              <Code className="h-10 w-10 mb-3 stroke-[2.5] text-[#76B947]" />
              <h3 className="text-xl font-bold mb-2">Copy & Use</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Copy perfectly structured XML prompts for use in your AI applications
              </p>
            </div>
          </div>
          {user && (
            <div className="max-w-5xl mx-auto mt-4 flex justify-end">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    className="flex items-center gap-2 px-3 py-2 border-2 border-black bg-white rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    aria-label="Open prompt library"
                  >
                    {isLoadingPrompts ? 'Loading prompts…' : 'Your prompts'}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content sideOffset={6} className="min-w-[260px] max-h-[300px] overflow-y-auto bg-white border-2 border-black rounded-none p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {prompts.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No saved prompts</div>
                  ) : (
                    prompts.map((p) => (
                      <DropdownMenu.Item key={p.id} asChild>
                        <button
                          className="w-full text-left px-3 py-2 hover:bg-[#9AE66E]/30 font-mono text-sm"
                          onClick={async () => {
                            try {
                              const token = await getAccessToken();
                              if (!token) {
                                return;
                              }
                              const apiBase = import.meta.env.PROD ? 'https://backend.soyrun.workers.dev' : '';
                              const res = await fetch(`${apiBase}/api/prompts/${p.id}`, {
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              if (!res.ok) throw new Error('Failed to fetch prompt');
                              const data = await res.json();
                              const content = String(data?.prompt?.content ?? '');
                              // import into builder by pasting to rawInput area
                              const previewEl = document.getElementById('xml-preview');
                              if (previewEl) {
                                previewEl.innerText = content;
                                const event = new Event('input', { bubbles: true });
                                previewEl.dispatchEvent(event);
                              }
                            } catch {}
                          }}
                        >
                          {p.name || 'Untitled'}
                        </button>
                      </DropdownMenu.Item>
                    ))
                  )}
                 </DropdownMenu.Content>
              </DropdownMenu.Root>
            </div>
          )}
        </div>

        {/* Prompt Builder Component */}
        <div className="relative">
          <PromptBuilder />
          {user && (
            <div className="mt-6 flex items-center gap-2 justify-end">
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="prompt name"
                className="px-2 py-1 border-2 border-black bg-white rounded-none font-mono text-md"
              />
              <Button
                size="sm"
                disabled={isSaving || !saveName.trim()}
                className="flex items-center gap-1 bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    const previewEl = document.getElementById('xml-preview');
                    const xml = previewEl ? previewEl.textContent || '' : '';
                    const token = await getAccessToken();
                    if (!token) {
                      return;
                    }
                    const apiBase = import.meta.env.PROD ? 'https://backend.soyrun.workers.dev' : '';
                    const res = await fetch(`${apiBase}/api/prompts`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ name: saveName.trim(), content: xml }),
                    });
                    if (!res.ok) throw new Error('Failed to save');
                    const data = await res.json();
                    const p = data?.prompt;
                    if (p) {
                      setPrompts((prev) => {
                        const next = [{ id: p.id, name: p.name }, ...prev];
                        const seen = new Set<string>();
                        return next.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
                      });
                    }
                  } catch {}
                  finally { setIsSaving(false); }
                }}
              >
                Save
              </Button>
            </div>
          )}
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

export default Index;
