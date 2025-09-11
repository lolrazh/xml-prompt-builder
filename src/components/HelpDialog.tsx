
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const HelpDialog: React.FC = () => {
  const isMobile = useIsMobile();
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 rounded-none hover:bg-[#9AE66E]/30"
          title="Help"
        >
          <HelpCircle className={isMobile ? "h-5 w-5 stroke-[3]" : "h-7 w-7 stroke-[3]"} />
        </Button>
      </DialogTrigger>
      <DialogContent className="border-2 border-black dark:border-gray-100 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] bg-[#F2FCE2] dark:bg-gray-800">
        <DialogHeader className="border-b-2 border-black dark:border-gray-100 pb-2 mb-2">
          <DialogTitle className={`${isMobile ? 'text-lg' : 'text-xl'} font-black`}>How to Use XML Prompt Builder</DialogTitle>
        </DialogHeader>
        <div className={`space-y-4 ${isMobile ? 'text-xs' : 'text-sm'} mt-2`}>
          <div>
            <p className="font-bold mb-1">Getting Started:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Click "Add Element" to create a new XML tag</li>
              <li>Select any element to edit its name and content</li>
              <li>Add child elements to create nested structures</li>
            </ul>
          </div>
          
          <div>
            <p className="font-bold mb-1">Managing Elements:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Toggle elements to collapse/expand them</li>
              <li>Use the up/down arrows to rearrange elements</li>
              <li>Child elements will stay within their parent when rearranged</li>
            </ul>
          </div>
          
          <div>
            <p className="font-bold mb-1">Preview & Export:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Preview your XML on the right panel</li>
              <li>Copy the final XML when you're done</li>
            </ul>
          </div>
          {/* Import section hidden for now */}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpDialog;
