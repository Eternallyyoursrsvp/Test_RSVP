import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { X, Upload, FileText } from "lucide-react";

interface FileInputProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  disabled?: boolean;
}

const FileInput: React.FC<FileInputProps> = ({ 
  onFileSelect, 
  accept = ".xlsx, .xls, .csv", 
  multiple = false,
  label = "Upload Excel File",
  disabled = false
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    
    if (!files || files.length === 0) {
      setSelectedFile(null);
      return;
    }
    
    const file = files[0];
    
    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = accept.split(',').map(ext => 
      ext.trim().replace('.', '').toLowerCase()
    );
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: `Please upload a file with one of these extensions: ${accept}`
      });
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      return;
    }
    
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleBrowseClick}
          disabled={disabled}
          className="flex-1"
        >
          <Upload className="mr-2 h-4 w-4" />
          {label}
        </Button>
        <Input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          multiple={multiple}
          className="hidden"
          disabled={disabled}
        />
      </div>
      
      {selectedFile && (
        <div className="flex items-center justify-between bg-gray-50 p-2 rounded border">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium truncate max-w-[200px]">
              {selectedFile.name}
            </span>
            <span className="text-xs text-gray-500">
              ({Math.round(selectedFile.size / 1024)} KB)
            </span>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm"
            onClick={clearSelectedFile}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove file</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileInput;
