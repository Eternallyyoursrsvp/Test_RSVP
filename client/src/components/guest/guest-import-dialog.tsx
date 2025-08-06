import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FileInput from "@/components/ui/file-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileText, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { post } from "@/lib/api-utils";

interface GuestImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  onSuccess: () => void;
}

export default function GuestImportDialog({
  isOpen,
  onClose,
  eventId,
  onSuccess,
}: GuestImportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    // Reset the import result when a new file is selected
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Please select an Excel file to import.",
      });
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch('/api/events/' + eventId + '/guests/import', {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error('Import failed: ' + response.statusText);
      }

      const data = await response.json();
      
      setImportResult({
        success: true,
        message: data.message,
        count: data.guests.length,
      });

      toast({
        title: "Import successful",
        description: data.message,
      });

      // Notify parent component of success
      onSuccess();
    } catch (error) {
      // Import error - handled silently
      console.error('Import error:', error);
      
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred during import",
      });

      toast({
        variant: "destructive",
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import guests",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    // Reset state when dialog is closed
    setSelectedFile(null);
    setImportResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Guest List</DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx) with your guest list. The file should include columns for
            first name, last name, email, and phone number.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <FileInput
            onFileSelect={handleFileSelect}
            accept=".xlsx, .xls"
            label="Select Excel File"
            disabled={importing}
          />

          {importResult && (
            <Alert variant={importResult.success ? "default" : "destructive"}>
              {importResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {importResult.success ? "Import successful" : "Import failed"}
              </AlertTitle>
              <AlertDescription>
                {importResult.message}
                {importResult.count !== undefined && (
                  <span className="block mt-1">
                    {importResult.count} guests imported successfully.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-muted rounded-md p-4">
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Template format
            </h4>
            <p className="text-xs text-muted-foreground">
              Your Excel file should have the following columns:
            </p>
            <ul className="text-xs text-muted-foreground list-disc list-inside mt-1">
              <li>First Name (required)</li>
              <li>Last Name (required)</li>
              <li>Email</li>
              <li>Phone</li>
              <li>Address</li>
              <li>Is Family (Yes/No)</li>
              <li>Relationship</li>
              <li>RSVP Status (pending, confirmed, declined)</li>
              <li>Plus One Allowed (Yes/No)</li>
              <li>Plus One Name</li>
              <li>Number of Children</li>
              <li>Children Names</li>
              <li>Dietary Restrictions</li>
              <li>Table Assignment</li>
              <li>Gift Tracking</li>
              <li>Notes</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex space-x-2 justify-end">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!selectedFile || importing}
            className="gold-gradient"
          >
            {importing ? "Importing..." : "Import Guests"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
