
import React from 'react';
import PromptBuilder from '../components/PromptBuilder';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-gray-100">XML Prompt Builder</h1>
        <PromptBuilder />
      </div>
    </div>
  );
};

export default Index;
