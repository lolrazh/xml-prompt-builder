
import React, { useState, useEffect } from 'react';
import { XMLElement } from './PromptBuilder';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ElementEditorProps {
  element: XMLElement;
  onUpdate: (element: XMLElement) => void;
}

const ElementEditor: React.FC<ElementEditorProps> = ({ element, onUpdate }) => {
  const [tagName, setTagName] = useState(element.tagName);
  const [content, setContent] = useState(element.content);

  useEffect(() => {
    setTagName(element.tagName);
    setContent(element.content);
  }, [element.id, element.tagName, element.content]);

  const handleTagNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTagName = e.target.value.replace(/\s+/g, '-').toLowerCase();
    setTagName(newTagName);
    onUpdate({
      ...element,
      tagName: newTagName
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onUpdate({
      ...element,
      content: e.target.value
    });
  };

  return (
    <div className="space-y-4 font-mono">
      <div>
        <Label htmlFor="tagName" className="font-black text-black dark:text-white">Tag Name</Label>
        <Input
          id="tagName"
          value={tagName}
          onChange={handleTagNameChange}
          placeholder="Enter tag name"
          className="mt-1 border-2 border-black dark:border-gray-400 rounded-none focus:ring-[#9AE66E] focus:border-[#9AE66E] font-mono"
        />
      </div>
      
      <div>
        <Label htmlFor="content" className="font-black text-black dark:text-white">Content</Label>
        <Textarea
          id="content"
          value={content}
          onChange={handleContentChange}
          placeholder="Enter content (optional)"
          className="mt-1 min-h-[100px] border-2 border-black dark:border-gray-400 rounded-none focus:ring-[#9AE66E] focus:border-[#9AE66E] font-mono"
        />
      </div>
    </div>
  );
};

export default ElementEditor;
