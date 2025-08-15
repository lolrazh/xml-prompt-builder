import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash, Plus, Copy, MoveVertical, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { cn, estimateTokenCount, formatTokenCount } from '@/lib/utils';
import ElementEditor from './ElementEditor';
import ElementTree from './ElementTree';
import { looseParseXML } from '@/lib/loose-xml';

export interface XMLElement {
  id: string;
  tagName: string;
  content: string;
  children: XMLElement[];
  collapsed?: boolean;
  isVisible?: boolean;
}

export interface PromptBuilderRef {
  clearAll: () => void;
  hasContent: () => boolean;
  getCurrentXML: () => string;
  importFromText: (text: string) => void;
}

const PromptBuilder = forwardRef<PromptBuilderRef>((props, ref) => {
  const STORAGE_KEYS = {
    elements: 'xmlPromptBuilder.elements',
    rawInput: 'xmlPromptBuilder.rawInput',
  } as const;

  const [elements, setElements] = useState<XMLElement[]>([]);
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

  // Hydrate from localStorage on first load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.elements);
      if (saved) {
        const parsed = JSON.parse(saved);
        const hydrate = (nodes: any[]): XMLElement[] => {
          if (!Array.isArray(nodes)) return [];
          const mapNode = (n: any): XMLElement => ({
            id: typeof n?.id === 'string' ? n.id : `element-${Date.now()}-${Math.random()}`,
            tagName: typeof n?.tagName === 'string' ? n.tagName : 'element',
            content: typeof n?.content === 'string' ? n.content : '',
            children: Array.isArray(n?.children) ? n.children.map(mapNode) : [],
            collapsed: typeof n?.collapsed === 'boolean' ? n.collapsed : undefined,
            isVisible: typeof n?.isVisible === 'boolean' ? n.isVisible : true,
          });
          return nodes.map(mapNode);
        };
        const hydrated = hydrate(parsed);
        if (hydrated.length > 0) {
          setElements(hydrated);
          return; // prefer restored structure over raw input
        }
      }
      const savedRaw = localStorage.getItem(STORAGE_KEYS.rawInput);
      if (savedRaw) {
        setRawInput(savedRaw);
      }
    } catch {
      // ignore restore errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Persist elements
    try {
      if (elements.length > 0) {
        localStorage.setItem(STORAGE_KEYS.elements, JSON.stringify(elements));
        localStorage.removeItem(STORAGE_KEYS.rawInput);
      } else {
        localStorage.removeItem(STORAGE_KEYS.elements);
      }
    } catch {
      // ignore storage errors
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

  // Persist raw input when builder is empty
  useEffect(() => {
    if (elements.length === 0) {
      try {
        if (rawInput && rawInput.length > 0) {
          localStorage.setItem(STORAGE_KEYS.rawInput, rawInput);
        } else {
          localStorage.removeItem(STORAGE_KEYS.rawInput);
        }
      } catch {
        // ignore storage errors
      }
    }
  }, [rawInput, elements.length]);

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

  const exportToFile = () => {
    const text = elements.length === 0 ? rawInput : outputXML;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompt.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Exported to prompt.txt');
  };

  const clearAll = () => {
    setElements([]);
    setSelectedElement(null);
    setRawInput('');
    try {
      localStorage.removeItem(STORAGE_KEYS.elements);
      localStorage.removeItem(STORAGE_KEYS.rawInput);
    } catch {
      // ignore storage errors
    }
  };

  const hasContent = () => {
    return elements.length > 0 || rawInput.length > 0;
  };

  const getCurrentXML = () => {
    const previewEl = document.getElementById('xml-preview');
    return previewEl ? previewEl.textContent || '' : '';
  };

  useImperativeHandle(ref, () => ({
    clearAll,
    hasContent,
    getCurrentXML,
    importFromText
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] border-2 border-black dark:border-gray-100 rounded-none bg-[#F2FCE2] dark:bg-gray-800">
        <h2 className="text-xl font-bold mb-4 flex justify-between items-center border-b-2 border-black dark:border-gray-100 pb-2">
          <span className="font-black">Structure Builder</span>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.txt,.html,.htm,.svg,.rss,.atom,.plist"
              className="hidden"
              onChange={onFileInputChange}
            />
            <Button
              onClick={onClickImport}
              size="sm"
              className="flex items-center gap-1 bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <Upload className="h-4 w-4 stroke-[3]" /> import
            </Button>
            <Button
              onClick={clearAll}
              size="sm"
              disabled={!elements.length}
              className="flex items-center gap-1 bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <Trash className="h-4 w-4 stroke-[3]" /> clear
            </Button>
            <Button 
              onClick={addNewElement} 
              size="sm" 
              className="flex items-center gap-1 bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <Plus className="h-4 w-4 stroke-[3]" /> add element
            </Button>
          </div>
        </h2>
        
        <div className={cn(
          "mb-6 bg-white dark:bg-gray-800 rounded-none border-2 border-black dark:border-gray-100 p-4 min-h-[200px] max-h-[60vh] overflow-y-auto font-mono",
          elements.length === 0 && "flex items-center justify-center"
        )}>
          {elements.length === 0 ? (
            <div className="text-center text-gray-400 text-sm">
              <p>No elements yet. Add an element to begin building your prompt.</p>
            </div>
          ) : (
            <ElementTree 
              elements={elements} 
              onElementSelect={setSelectedElement}
              onAddChild={addChildElement}
              onDelete={deleteElement}
              onToggleCollapse={toggleCollapseElement}
              onToggleVisibility={toggleVisibilityElement} // Add this line
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
              <p className="font-mono text-sm">Select an element to edit its properties.</p>
            </div>
          )}
        </div>
      </Card>
      
      <Card className="p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] border-2 border-black dark:border-gray-100 rounded-none bg-[#F2FCE2] dark:bg-gray-800">
        <h2 className="text-xl font-bold mb-4 flex justify-between items-center border-b-2 border-black dark:border-gray-100 pb-2">
          <span className="font-black">XML Preview</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono font-bold text-gray-600 dark:text-gray-400 pr-1">
              ~{formatTokenCount(tokenCount)}
            </span>
            <Button 
              onClick={exportToFile}
              size="sm"
              disabled={(elements.length === 0 ? (rawInput.trim().length === 0) : (outputXML.trim().length === 0))}
              className="flex items-center gap-1 bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <Download className="h-4 w-4 stroke-[3]" /> Export
            </Button>
            <Button 
              onClick={copyToClipboard} 
              size="sm" 
              className="flex items-center gap-1 bg-[#9AE66E] hover:bg-[#76B947] text-black font-bold border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <Copy className="h-4 w-4 stroke-[3]" /> Copy
            </Button>
          </div>
        </h2>
        <pre
          id="xml-preview"
          contentEditable={elements.length === 0}
          suppressContentEditableWarning
          data-placeholder="Paste XML here."
          className={cn(
            "relative w-full min-h-[400px] max-h-[70vh] overflow-y-auto whitespace-pre-wrap font-mono text-sm bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-100 rounded-none p-4",
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
});

PromptBuilder.displayName = 'PromptBuilder';

export default PromptBuilder;
