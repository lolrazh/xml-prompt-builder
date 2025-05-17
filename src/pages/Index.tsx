
import React from 'react';
import PromptBuilder from '../components/PromptBuilder';

const Index = () => {
  return (
    <div className="min-h-screen bg-[#FEF7CD] dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-black text-center mb-8 text-[#333] dark:text-gray-100 border-4 border-black dark:border-gray-100 p-4 bg-[#9AE66E] dark:bg-[#76B947] inline-block mx-auto rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)]">XML Prompt Builder</h1>
        <PromptBuilder />
      </div>
    </div>
  );
};

export default Index;
