import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'react-qr-code';

interface WhatsAppQRTestProps {
  eventId: string;
}

export function WhatsAppQRTest({ eventId }: WhatsAppQRTestProps) {
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const { toast } = useToast();

  const handleTestQR = async () => {
    try {
      console.log('🧪 WhatsApp QR Test - Starting');
      setQrDialogOpen(true);
      setQrCodeData(null);
      
      const response = await fetch(`/api/events/${eventId}/communication/whatsapp-webjs/qr`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('🧪 QR Test Response:', result);
      
      if (result.qrCode) {
        console.log('🧪 QR Code received in test component');
        setQrCodeData(result.qrCode);
        toast({
          title: "QR Code Generated",
          description: "Test successful! QR code is working.",
        });
      } else {
        console.log('🧪 No QR code in response');
        toast({
          title: "No QR Code",
          description: result.message || "QR code not available",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('🧪 QR Test Error:', error);
      toast({
        title: "Test Failed",
        description: "QR code test failed",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">🧪 WhatsApp QR Code Test</h3>
        <Button 
          onClick={handleTestQR}
          variant="outline"
          className="bg-yellow-100 border-yellow-300 text-yellow-800"
        >
          Test QR Code Generation
        </Button>
      </div>
      
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>🧪 WhatsApp QR Test</DialogTitle>
            <DialogDescription>
              Testing QR code generation independently
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrCodeData ? (
              <div className="bg-white p-4 rounded-lg border">
                <QRCode 
                  value={qrCodeData} 
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
                <p className="text-muted-foreground">Generating QR code...</p>
              </div>
            )}
            <Button 
              onClick={() => setQrDialogOpen(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}