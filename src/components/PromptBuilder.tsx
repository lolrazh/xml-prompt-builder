import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash, Plus, Copy, MoveVertical } from 'lucide-react';
import { toast } from 'sonner';
import { cn, estimateTokenCount, formatTokenCount } from '@/lib/utils';
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
  const [tokenCount, setTokenCount] = useState<number>(0);

  // Generate XML output whenever elements change
  useEffect(() => {
    const generateXML = (elements: XMLElement[], indentLevel = 0): string => {
      return elements.map(element => {
        const indent = '  '.repeat(indentLevel);
        const hasChildren = element.children && element.children.length > 0;
        const hasContent = element.content.trim().length > 0;
        
        // Start with opening tag
        let xml = `${indent}<${element.tagName}>`;
        
        // Add content with proper indentation if exists
        if (hasContent) {
          xml += `\n${indent}  ${element.content}\n${indent}`;
        }
        
        // Add children
        if (hasChildren) {
          const childrenXml = generateXML(element.children, indentLevel + 1);
          if (hasContent) {
            xml += childrenXml;
          } else {
            xml += `\n${childrenXml}\n${indent}`;
          }
        } else if (!hasContent) {
          // Always ensure the closing tag is on a new line
          xml += "\n" + indent;
        }
        
        // Add closing tag
        xml += `</${element.tagName}>`;
        return xml;
      }).join('\n');
    };

    const xml = generateXML(elements);
    setOutputXML(xml);
    setTokenCount(estimateTokenCount(xml));
  }, [elements]);

  // Update selectedElement reference when elements change to prevent stale state
  useEffect(() => {
    if (selectedElement) {
      const findUpdatedElement = (elementsArray: XMLElement[], id: string): XMLElement | null => {
        for (const element of elementsArray) {
          if (element.id === id) {
            return element;
          }
          
          if (element.children.length > 0) {
            const foundChild = findUpdatedElement(element.children, id);
            if (foundChild) return foundChild;
          }
        }
        return null;
      };
      
      const updatedElement = findUpdatedElement(elements, selectedElement.id);
      
      // If the element doesn't exist anymore (e.g., it was deleted), reset selection
      if (!updatedElement) {
        setSelectedElement(null);
      } else if (
          updatedElement.tagName !== selectedElement.tagName || 
          updatedElement.content !== selectedElement.content ||
          JSON.stringify(updatedElement.children) !== JSON.stringify(selectedElement.children)
        ) {
        setSelectedElement(updatedElement);
      }
    }
  }, [elements, selectedElement]);

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
          // Preserve children when updating an element
          return {
            ...updatedElement,
            children: el.children
          };
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
    // Check if the selected element is a child of the element being deleted
    const isChildOfDeleted = (parent: XMLElement): boolean => {
      if (!selectedElement) return false;
      
      // Direct child check
      if (parent.id === elementId && parent.children.some(child => child.id === selectedElement.id)) {
        return true;
      }
      
      // Recursive check for deeper children
      for (const child of parent.children) {
        if (isChildOfDeleted(child)) {
          return true;
        }
      }
      
      return false;
    };
    
    // Check if the selected element itself or any of its parents are being deleted
    const shouldResetSelection = !selectedElement ? false : 
      selectedElement.id === elementId || elements.some(isChildOfDeleted);
    
    const deleteElementRecursive = (elements: XMLElement[]): XMLElement[] => {
      return elements.filter(el => {
        if (el.id === elementId) {
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
    
    // Reset selection if the selected element is being deleted or is a child of deleted
    if (shouldResetSelection) {
      setSelectedElement(null);
    }
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

  // New function to move an element up
  const moveElementUp = (elementId: string) => {
    // Find the element and its parent
    const findElementWithParent = (elements: XMLElement[], parentElements: XMLElement[] | null = null): 
      { element: XMLElement, parentElements: XMLElement[], index: number } | null => {
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].id === elementId) {
          return { element: elements[i], parentElements: parentElements || elements, index: i };
        }
        
        if (elements[i].children.length > 0) {
          const found = findElementWithParent(elements[i].children, elements[i].children);
          if (found) return found;
        }
      }
      return null;
    };
    
    const found = findElementWithParent(elements);
    if (found && found.index > 0) {
      const { parentElements, index } = found;
      const newElements = [...parentElements];
      
      // Swap with the element above
      [newElements[index - 1], newElements[index]] = [newElements[index], newElements[index - 1]];
      
      // Update the entire elements tree
      setElements(updateElementsTree(elements, parentElements, newElements));
    }
  };

  // New function to move an element down
  const moveElementDown = (elementId: string) => {
    // Find the element and its parent
    const findElementWithParent = (elements: XMLElement[], parentElements: XMLElement[] | null = null): 
      { element: XMLElement, parentElements: XMLElement[], index: number } | null => {
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].id === elementId) {
          return { element: elements[i], parentElements: parentElements || elements, index: i };
        }
        
        if (elements[i].children.length > 0) {
          const found = findElementWithParent(elements[i].children, elements[i].children);
          if (found) return found;
        }
      }
      return null;
    };
    
    const found = findElementWithParent(elements);
    if (found && found.index < found.parentElements.length - 1) {
      const { parentElements, index } = found;
      const newElements = [...parentElements];
      
      // Swap with the element below
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
      
      // Update the entire elements tree
      setElements(updateElementsTree(elements, parentElements, newElements));
    }
  };

  // Helper function to update the elements tree
  const updateElementsTree = (
    originalElements: XMLElement[], 
    parentToReplace: XMLElement[], 
    newParentElements: XMLElement[]
  ): XMLElement[] => {
    // If we're replacing the root elements
    if (parentToReplace === elements) {
      return newParentElements;
    }
    
    // Otherwise, we need to find the parent and replace its children
    const replaceElementsRecursive = (elements: XMLElement[]): XMLElement[] => {
      return elements.map(el => {
        if (el.children === parentToReplace) {
          return {
            ...el,
            children: newParentElements
          };
        } else if (el.children.length > 0) {
          return {
            ...el,
            children: replaceElementsRecursive(el.children)
          };
        }
        return el;
      });
    };
    
    return replaceElementsRecursive(originalElements);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputXML);
    toast.success("XML copied to clipboard!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] border-2 border-black dark:border-gray-100 rounded-none bg-[#F2FCE2] dark:bg-gray-800">
        <h2 className="text-xl font-bold mb-4 flex justify-between items-center border-b-2 border-black dark:border-gray-100 pb-2">
          <span className="font-black">Structure Builder</span>
          <Button 
            onClick={addNewElement} 
            size="sm" 
            className="flex items-center gap-1 bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <Plus className="h-4 w-4 stroke-[3]" /> Add Element
          </Button>
        </h2>
        
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-none border-2 border-black dark:border-gray-100 p-4 min-h-[200px] max-h-[60vh] overflow-y-auto font-mono">
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
              onMoveUp={moveElementUp}
              onMoveDown={moveElementDown}
              selectedElementId={selectedElement?.id}
            />
          )}
        </div>

        <div className="border-2 border-black dark:border-gray-100 p-4 bg-white dark:bg-gray-800 rounded-none">
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
        </div>
      </Card>
      
      <Card className="p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] border-2 border-black dark:border-gray-100 rounded-none bg-[#F2FCE2] dark:bg-gray-800">
        <h2 className="text-xl font-bold mb-4 flex justify-between items-center border-b-2 border-black dark:border-gray-100 pb-2">
          <span className="font-black">XML Preview</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono font-medium text-gray-600 dark:text-gray-400">
              ~{formatTokenCount(tokenCount)}
            </span>
            <Button 
              onClick={copyToClipboard} 
              size="sm" 
              className="flex items-center gap-1 bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <Copy className="h-4 w-4 stroke-[3]" /> Copy
            </Button>
          </div>
        </h2>
        <pre className="bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-100 rounded-none p-4 overflow-x-auto whitespace-pre-wrap min-h-[400px] max-h-[70vh] overflow-y-auto font-mono text-sm">
          {outputXML || '<-- Your XML will appear here -->'}
        </pre>
      </Card>
    </div>
  );
};

export default PromptBuilder;
