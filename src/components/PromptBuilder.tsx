import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ResponsiveButton } from '@/components/ui/responsive-button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash, Plus, Copy, MoveVertical, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn, estimateTokenCount, formatTokenCount } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import ElementEditor from './ElementEditor';
import XMLTreeContainer from './XMLTreeContainer';
import { looseParseXML } from '@/lib/loose-xml';

export interface XMLElement {
  id: string;
  tagName: string;
  content: string;
  children: XMLElement[];
  collapsed?: boolean;
  isVisible?: boolean;
}

const PromptBuilder: React.FC = () => {
  const STORAGE_KEY = 'xmlpb_elements_v1';
  const isMobile = useIsMobile();

  const [elements, setElements] = useState<XMLElement[]>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as XMLElement[];
      if (parsed && Array.isArray((parsed as any).elements)) return (parsed as any).elements as XMLElement[];
      return [];
    } catch {
      return [];
    }
  });
  const [outputXML, setOutputXML] = useState<string>('');
  const [selectedElement, setSelectedElement] = useState<XMLElement | null>(null);
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [rawInput, setRawInput] = useState<string>('');
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);


  const importFromText = async (text: string) => {
    try {
      const parsed = looseParseXML(text);
      setElements(parsed);
      setSelectedElement(null);
      setRawInput('');
      toast.success('Imported!');
    } catch (err: any) {
      setRawInput(text);
      toast.error(err?.message || 'Parse error');
    }
  };

  const isLikelyTextFile = (file: File): boolean => {
    const allowedTypes = [
      'text/plain',
      'text/xml',
      'application/xml',
      'application/xhtml+xml',
      'application/rss+xml',
      'application/atom+xml',
      'application/x-plist',
      'image/svg+xml',
    ];
    if (allowedTypes.includes(file.type)) return true;
    const name = file.name.toLowerCase();
    return (
      name.endsWith('.xml') ||
      name.endsWith('.txt') ||
      name.endsWith('.html') ||
      name.endsWith('.htm') ||
      name.endsWith('.svg') ||
      name.endsWith('.rss') ||
      name.endsWith('.atom') ||
      name.endsWith('.plist')
    );
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!isLikelyTextFile(file)) {
      toast.error('Unsupported file type. Please select a text or XML file.');
      return;
    }
    try {
      const text = await file.text();
      await importFromText(text);
    } catch (e) {
      toast.error('Failed to read the file.');
    }
  };

  const onClickImport = () => {
    if (elements.length > 0) {
      const proceed = window.confirm('Importing will replace the current structure. Continue?');
      if (!proceed) return;
    }
    fileInputRef.current?.click();
  };

  const onFileInputChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    await handleFiles(e.target.files);
    // reset value to allow re-uploading the same file
    if (e.target) e.target.value = '';
  };

  const onDrop: React.DragEventHandler<HTMLPreElement> = async (e) => {
    if (elements.length > 0) return; // Only active when empty per requirement
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const items = e.dataTransfer?.files || null;
    await handleFiles(items);
  };

  const onDragOver: React.DragEventHandler<HTMLPreElement> = (e) => {
    if (elements.length > 0) return; // Only active when empty per requirement
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const onDragEnter: React.DragEventHandler<HTMLPreElement> = (e) => {
    if (elements.length > 0) return; // Only active when empty per requirement
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const onDragLeave: React.DragEventHandler<HTMLPreElement> = (e) => {
    if (elements.length > 0) return; // Only active when empty per requirement
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  // Generate XML output whenever elements change
  useEffect(() => {
    const generateXML = (elements: XMLElement[], indentLevel = 0): string => {
      return elements
        .filter(element => element.isVisible !== false)
        .map(element => {
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

  // Persist elements to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
    } catch {
      // ignore storage errors (quota, privacy mode, etc.)
    }
  }, [elements]);

  useEffect(() => {
    const previewEl = document.getElementById('xml-preview');

    const handlePaste = (e: ClipboardEvent) => {
      if (elements.length) return;
      e.preventDefault();

      const text = e.clipboardData?.getData('text') ?? '';
      try {
        const parsed = looseParseXML(text);
        setElements(parsed);
        setSelectedElement(null);
        setRawInput('');
        toast.success('Imported!');
      } catch (err: any) {
        setRawInput(text);
        toast.error(err.message || 'Parse error');
      }
    };

    if (previewEl) {
      previewEl.addEventListener('paste', handlePaste);
    }

    return () => {
      if (previewEl) {
        previewEl.removeEventListener('paste', handlePaste);
      }
    };
  }, [elements, rawInput]);

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
      children: [],
      isVisible: true
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
      children: [],
      isVisible: true
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

  const toggleVisibilityElement = (elementId: string) => {
    const toggleVisibilityRecursive = (elements: XMLElement[]): XMLElement[] => {
      return elements.map(el => {
        if (el.id === elementId) {
          return {
            ...el,
            isVisible: !el.isVisible
          };
        } else if (el.children.length > 0) {
          return {
            ...el,
            children: toggleVisibilityRecursive(el.children)
          };
        }
        return el;
      });
    };
    
    const newElements = toggleVisibilityRecursive(elements);
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

  const clearAll = () => {
    setElements([]);
    setSelectedElement(null);
    setRawInput('');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <Card className="p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] border-2 border-black dark:border-gray-100 rounded-none bg-[#F2FCE2] dark:bg-gray-800">
        <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold mb-4 flex justify-between items-center border-b-2 border-black dark:border-gray-100 pb-2`}>
          <span className="font-black">Structure Builder</span>
          <div className={cn("flex items-center", isMobile ? "gap-1" : "gap-2")}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.txt,.html,.htm,.svg,.rss,.atom,.plist"
              className="hidden"
              onChange={onFileInputChange}
            />
            <ResponsiveButton
              onClick={onClickImport}
              size="sm"
              icon={<Upload className="h-4 w-4 stroke-[3]" />}
              text="Import"
              className="bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
            />
            <ResponsiveButton
              onClick={clearAll}
              size="sm"
              disabled={!elements.length}
              icon={<Trash className="h-4 w-4 stroke-[3]" />}
              text="Clear"
              className="bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
            />
            <ResponsiveButton 
              onClick={addNewElement} 
              size="sm" 
              icon={<Plus className="h-4 w-4 stroke-[3]" />}
              text="Add Element"
              className="bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
            />
          </div>
        </h2>
        
        <div className={cn(
          "mb-6 bg-white dark:bg-gray-800 rounded-none border-2 border-black dark:border-gray-100 p-4 min-h-[200px] max-h-[60vh] overflow-y-auto font-mono",
          elements.length === 0 && "flex items-center justify-center"
        )}>
          {elements.length === 0 ? (
            <div className="text-center text-gray-400 text-sm">
              <p className={isMobile ? 'text-xs' : 'text-sm'}>No elements yet. Add an element to begin building your prompt.</p>
            </div>
          ) : (
            <XMLTreeContainer 
              elements={elements} 
              onElementsChange={setElements}
              onElementSelect={setSelectedElement}
              onAddChild={addChildElement}
              onDelete={deleteElement}
              onToggleCollapse={toggleCollapseElement}
              onToggleVisibility={toggleVisibilityElement}
              onMoveUp={moveElementUp}
              onMoveDown={moveElementDown}
              selectedElementId={selectedElement?.id}
            />
          )}
        </div>

        <div className={cn(
          "border-2 border-black dark:border-gray-100 p-4 bg-white dark:bg-gray-800 rounded-none min-h-[160px]",
          !selectedElement && "flex items-center justify-center"
        )}>
          {selectedElement ? (
            <ElementEditor 
              element={selectedElement} 
              onUpdate={updateElement} 
            />
          ) : (
            <div className="text-center text-gray-400">
              <p className={`font-mono ${isMobile ? 'text-xs' : 'text-sm'}`}>Select an element to edit its properties.</p>
            </div>
          )}
        </div>
      </Card>
      
      <Card className="p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] border-2 border-black dark:border-gray-100 rounded-none bg-[#F2FCE2] dark:bg-gray-800">
        <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold mb-4 flex justify-between items-center border-b-2 border-black dark:border-gray-100 pb-2`}>
          <span className="font-black">XML Preview</span>
          <div className={cn("flex items-center", isMobile ? "gap-1" : "gap-3")}>
            <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-mono font-bold text-gray-600 dark:text-gray-400 pr-1`}>
              ~{formatTokenCount(tokenCount)}
            </span>
            <ResponsiveButton 
              onClick={copyToClipboard} 
              size="sm" 
              icon={<Copy className="h-4 w-4 stroke-[3]" />}
              text="Copy"
              className="bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
            />
          </div>
        </h2>
        <pre
          id="xml-preview"
          contentEditable={elements.length === 0}
          suppressContentEditableWarning
          data-placeholder="Paste XML here."
          className={cn(
            `relative w-full min-h-[400px] max-h-[70vh] overflow-y-auto whitespace-pre-wrap font-mono ${isMobile ? 'text-xs' : 'text-sm'} bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-100 rounded-none p-4`,
            elements.length === 0 ? "cursor-text" : "select-text",
            elements.length === 0 && !rawInput && "flex items-center justify-center",
            elements.length === 0 && isDragActive && "border-dashed bg-[#F2FCE2]"
          )}
          onInput={(e) => {
            if (elements.length) return;
            setRawInput((e.target as HTMLElement).innerText);
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
        >
          {elements.length === 0 ? (rawInput || (isDragActive ? 'Drop file to import…' : '')) : outputXML}
        </pre>
      </Card>
    </div>
  );
};

export default PromptBuilder;
