
import React, { useEffect, useState, useRef } from 'react';
import PromptBuilder, { PromptBuilderRef } from '../components/PromptBuilder';
import { PlusCircle, Sparkles, ClipboardPaste, Code, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBetterAuth } from '@/auth/useBetterAuth';
import { useBetterAuthenticatedFetch } from '@/hooks/useBetterAuthenticatedFetch';
import Header from '../components/Header';
import { useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

const Index = () => {
  const { user } = useBetterAuth();
  const authenticatedFetch = useBetterAuthenticatedFetch();
  const location = useLocation();
  const promptBuilderRef = useRef<PromptBuilderRef>(null);
  const [prompts, setPrompts] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [saveName, setSaveName] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetchPrompts = async () => {
      if (!user) return;
      setIsLoadingPrompts(true);
      try {
        const apiBase = import.meta.env.PROD ? 'https://api.xml.soy.run' : '';
        const res = await authenticatedFetch(`${apiBase}/api/prompts`);
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
  }, [user, authenticatedFetch]);

  // Handle prompt loading from navigation state (from Dashboard)
  useEffect(() => {
    const state = location.state as any;
    if (state?.loadPrompt && promptBuilderRef.current) {
      const { id, name, content } = state.loadPrompt;
      
      // Load the prompt content
      promptBuilderRef.current.importFromText(content);
      
      // Set the selected prompt and save name
      setSelectedPrompt({ id, name });
      setSaveName(name);
      
      // Clear the navigation state to prevent reloading on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleNewPrompt = async () => {
    if (!promptBuilderRef.current) {
      console.error('PromptBuilder ref is null');
      return;
    }
    
    setIsCreatingNew(true);
    try {
      const hasContent = promptBuilderRef.current.hasContent();
      
      if (hasContent) {
        // If no name is present, scroll to name input and focus it
        if (!saveName.trim()) {
          const nameInput = document.querySelector('input[placeholder="prompt name"]') as HTMLInputElement;
          if (nameInput) {
            nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameInput.focus();
            nameInput.select();
          }
          setIsCreatingNew(false);
          return;
        }
        
        // Save the current prompt with the existing name
        const xml = promptBuilderRef.current.getCurrentXML();
        
        const apiBase = import.meta.env.PROD ? 'https://api.xml.soy.run' : '';
        const res = await authenticatedFetch(`${apiBase}/api/prompts`, {
          method: 'POST',
          body: JSON.stringify({ name: saveName.trim(), content: xml }),
        });
        
        if (res.ok) {
          const data = await res.json();
          const p = data?.prompt;
          if (p) {
            setPrompts((prev) => {
              const next = [{ id: p.id, name: p.name }, ...prev];
              const seen = new Set<string>();
              return next.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
            });
          }
        }
      }
      
      // Clear the canvas and name input
      promptBuilderRef.current.clearAll();
      setSaveName('');
      setSelectedPrompt(null);
      
    } catch (error) {
      console.error('Error creating new prompt:', error);
      // Even if save fails, still clear to start fresh
      if (promptBuilderRef.current) {
        promptBuilderRef.current.clearAll();
        setSaveName('');
        setSelectedPrompt(null);
      }
    } finally {
      setIsCreatingNew(false);
    }
  };

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
            <div className="mx-8 mt-4 flex justify-end gap-2">
              <Button
                onClick={handleNewPrompt}
                disabled={isCreatingNew}
                size="sm"
                className="flex items-center gap-1 bg-[#9AE66E] py-5 text-md hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                {isCreatingNew ? 'Creating...' : 'New'}
              </Button>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    className="flex items-center gap-2 px-3 py-2 border-2 border-black bg-white rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    aria-label="Open prompt library"
                  >
                    {isLoadingPrompts 
                      ? 'Loading prompts…' 
                      : selectedPrompt 
                        ? selectedPrompt.name || 'Untitled'
                        : 'Your prompts'
                    }
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content sideOffset={6} className="min-w-[260px] max-h-[300px] z-20 mr-16 overflow-y-auto bg-white border-2 border-black rounded-none p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {prompts.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No saved prompts</div>
                  ) : (
                    prompts.map((p) => (
                      <DropdownMenu.Item key={p.id} asChild>
                        <button
                          className="w-full text-left px-3 py-2 hover:bg-[#9AE66E]/30 font-mono text-sm"
                          onClick={async () => {
                            try {
                              const apiBase = import.meta.env.PROD ? 'https://api.xml.soy.run' : '';
                              const res = await authenticatedFetch(`${apiBase}/api/prompts/${p.id}`);
                              if (!res.ok) throw new Error('Failed to fetch prompt');
                              const data = await res.json();
                              const content = String(data?.prompt?.content ?? '');
                              
                              // Use the proper import method that handles parsing
                              if (promptBuilderRef.current) {
                                promptBuilderRef.current.importFromText(content);
                              }
                              
                              // Set the selected prompt and update save name to show selected prompt
                              setSelectedPrompt(p);
                              setSaveName(p.name || 'Untitled');
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
        <div className="relative z-10">
          <PromptBuilder ref={promptBuilderRef} />
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
                    const apiBase = import.meta.env.PROD ? 'https://api.xml.soy.run' : '';
                    const res = await authenticatedFetch(`${apiBase}/api/prompts`, {
                      method: 'POST',
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
