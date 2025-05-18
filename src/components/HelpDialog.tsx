
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const HelpDialog: React.FC = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 rounded-none hover:bg-[#9AE66E]/30"
        >
          <HelpCircle className="h-6 w-6 stroke-[3]" />
        </Button>
      </DialogTrigger>
      <DialogContent className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-[#F2FCE2]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">How to Use XML Prompt Builder</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm mt-2">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpDialog;
