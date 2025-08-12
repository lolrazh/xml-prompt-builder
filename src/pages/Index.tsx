
import React from 'react';
import PromptBuilder from '../components/PromptBuilder';
import { PlusCircle, Sparkles, ClipboardPaste, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthWithCache } from '@/auth/useAuthWithCache';
import Header from '../components/Header';

const Index = () => {
  const { user } = useAuthWithCache();
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
        </div>

        {/* Prompt Builder Component */}
        <PromptBuilder />
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
