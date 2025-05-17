
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash, Plus, Copy, MoveVertical } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ElementEditor from './ElementEditor';
import ElementTree from './ElementTree';

export interface XMLElement {
  id: string;
  tagName: string;
  content: string;
  children: XMLElement[];
  collapsed?: boolean;
}

const PromptBuilder: React.FC = () => {
  const [elements, setElements] = useState<XMLElement[]>([]);
  const [outputXML, setOutputXML] = useState<string>('');
  const [selectedElement, setSelectedElement] = useState<XMLElement | null>(null);

  // Generate XML output whenever elements change
  useEffect(() => {
    const generateXML = (elements: XMLElement[], indentLevel = 0): string => {
      return elements.map(element => {
        const indent = '  '.repeat(indentLevel);
        const hasChildren = element.children && element.children.length > 0;
        const hasContent = element.content.trim().length > 0;
        
        if (!hasChildren && !hasContent) {
          return `${indent}<${element.tagName} />`;
        }
        
        let xml = `${indent}<${element.tagName}>`;
        
        if (hasContent) {
          xml += `\n${indent}  ${element.content}\n${indent}`;
        }
        
        if (hasChildren) {
          const childrenXml = generateXML(element.children, indentLevel + 1);
          xml += hasContent ? childrenXml : `\n${childrenXml}\n${indent}`;
        }
        
        // Ensure closing tag is on its own line
        xml += `</${element.tagName}>`;
        return xml;
      }).join('\n');
    };

    const xml = generateXML(elements);
    setOutputXML(xml);
  }, [elements]);

  const addNewElement = () => {
    const newElement: XMLElement = {
      id: `element-${Date.now()}`,
      tagName: 'new-element',
      content: '',
      children: []
    };
    
    setElements([...elements, newElement]);
  };

  const updateElement = (updatedElement: XMLElement) => {
    const updateElementRecursive = (elements: XMLElement[]): XMLElement[] => {
      return elements.map(el => {
        if (el.id === updatedElement.id) {
          return updatedElement;
        } else if (el.children.length > 0) {
          return {
            ...el,
            children: updateElementRecursive(el.children)
          };
        }
        return el;
      });
    };
    
    const newElements = updateElementRecursive(elements);
    setElements(newElements);
  };

  const deleteElement = (elementId: string) => {
    const deleteElementRecursive = (elements: XMLElement[]): XMLElement[] => {
      return elements.filter(el => {
        if (el.id === elementId) {
          if (selectedElement?.id === elementId) {
            setSelectedElement(null);
          }
          return false;
        }
        
        if (el.children.length > 0) {
          el.children = deleteElementRecursive(el.children);
        }
        
        return true;
      });
    };
    
    const newElements = deleteElementRecursive(elements);
    setElements(newElements);
  };

  const addChildElement = (parentId: string) => {
    const newChild: XMLElement = {
      id: `element-${Date.now()}`,
      tagName: 'child-element',
      content: '',
      children: []
    };
    
    const addChildRecursive = (elements: XMLElement[]): XMLElement[] => {
      return elements.map(el => {
        if (el.id === parentId) {
          return {
            ...el,
            children: [...el.children, newChild],
            collapsed: false
          };
        } else if (el.children.length > 0) {
          return {
            ...el,
            children: addChildRecursive(el.children)
          };
        }
        return el;
      });
    };
    
    const newElements = addChildRecursive(elements);
    setElements(newElements);
  };

  const toggleCollapseElement = (elementId: string) => {
    const toggleCollapseRecursive = (elements: XMLElement[]): XMLElement[] => {
      return elements.map(el => {
        if (el.id === elementId) {
          return {
            ...el,
            collapsed: !el.collapsed
          };
        } else if (el.children.length > 0) {
          return {
            ...el,
            children: toggleCollapseRecursive(el.children)
          };
        }
        return el;
      });
    };
    
    const newElements = toggleCollapseRecursive(elements);
    setElements(newElements);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputXML);
    toast.success("XML copied to clipboard!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] border-2 border-black dark:border-gray-100 rounded-none bg-[#F2FCE2] dark:bg-gray-800">
        <h2 className="text-xl font-bold mb-4 flex justify-between items-center border-b-2 border-black dark:border-gray-100 pb-2">
          <span>Structure Builder</span>
          <Button 
            onClick={addNewElement} 
            size="sm" 
            className="flex items-center gap-1 bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <Plus className="h-4 w-4" /> Add Element
          </Button>
        </h2>
        
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-none border-2 border-black dark:border-gray-100 p-4 min-h-[200px] max-h-[60vh] overflow-y-auto">
          {elements.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No elements yet. Add an element to begin building your prompt.</p>
            </div>
          ) : (
            <ElementTree 
              elements={elements} 
              onElementSelect={setSelectedElement}
              onAddChild={addChildElement}
              onDelete={deleteElement}
              onToggleCollapse={toggleCollapseElement}
              selectedElementId={selectedElement?.id}
            />
          )}
        </div>

        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="grid w-full grid-cols-2 border-2 border-black dark:border-gray-100 rounded-none bg-[#FEF7CD] dark:bg-gray-700">
            <TabsTrigger value="editor" className="data-[state=active]:bg-[#9AE66E] data-[state=active]:text-black rounded-none">Element Editor</TabsTrigger>
            <TabsTrigger value="help" className="data-[state=active]:bg-[#9AE66E] data-[state=active]:text-black rounded-none">Quick Help</TabsTrigger>
          </TabsList>
          <TabsContent value="editor" className="mt-4 border-2 border-black dark:border-gray-100 p-4 bg-white dark:bg-gray-800 rounded-none">
            {selectedElement ? (
              <ElementEditor 
                element={selectedElement} 
                onUpdate={updateElement} 
              />
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>Select an element to edit its properties.</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="help" className="mt-4 border-2 border-black dark:border-gray-100 p-4 bg-white dark:bg-gray-800 rounded-none">
            <div className="space-y-2 text-sm">
              <p><strong>How to use:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Click "Add Element" to create a new XML tag</li>
                <li>Select any element to edit its name and content</li>
                <li>Add child elements to create nested structures</li>
                <li>Toggle elements to collapse/expand them</li>
                <li>Preview your XML on the right panel</li>
                <li>Copy the final XML when you're done</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
      
      <Card className="p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] border-2 border-black dark:border-gray-100 rounded-none bg-[#F2FCE2] dark:bg-gray-800">
        <h2 className="text-xl font-bold mb-4 flex justify-between items-center border-b-2 border-black dark:border-gray-100 pb-2">
          <span>XML Preview</span>
          <Button 
            onClick={copyToClipboard} 
            size="sm" 
            className="flex items-center gap-1 bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <Copy className="h-4 w-4" /> Copy
          </Button>
        </h2>
        <pre className="bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-100 rounded-none p-4 overflow-x-auto whitespace-pre-wrap min-h-[400px] max-h-[70vh] overflow-y-auto font-mono text-sm">
          {outputXML || '<-- Your XML will appear here -->'}
        </pre>
      </Card>
    </div>
  );
};

export default PromptBuilder;
