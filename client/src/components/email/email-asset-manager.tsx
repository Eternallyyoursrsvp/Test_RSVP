import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { post, del } from "@/lib/api-utils";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, UploadCloud, Image, Trash2, Copy } from "lucide-react";

interface EmailAssetManagerProps {
  eventId: number;
}

type EmailAsset = {
  id: number;
  name: string;
  type: string;
  url: string;
  width?: number;
  height?: number;
  altText?: string;
  tags?: string;
  createdAt: string;
};

export default function EmailAssetManager({ eventId }: EmailAssetManagerProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState("image");
  const [assetTags, setAssetTags] = useState("");
  const [altText, setAltText] = useState("");
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<EmailAsset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<EmailAsset | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [filter, setFilter] = useState("all");

  // Fetch assets
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['/api/events', eventId, 'email-assets'],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/email-assets`);
      if (!res.ok) throw new Error('Failed to fetch assets');
      return res.json();
    }
  });

  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: number) => 
      del(`/api/events/${eventId}/email-assets/${assetId}`).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Asset deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'email-assets'] });
      setShowDeleteConfirm(false);
      setAssetToDelete(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete asset", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!assetName) {
        setAssetName(file.name.split('.')[0]);
      }
      if (!altText) {
        setAltText(file.name.split('.')[0]);
      }
    }
  };

  const uploadAsset = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', assetName || selectedFile.name);
      formData.append('type', assetType);
      formData.append('altText', altText || assetName || selectedFile.name);
      formData.append('tags', assetTags);

      const response = await fetch(`/api/events/${eventId}/email-assets`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload asset');
      }

      const result = await response.json();
      
      toast({ title: "Asset uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'email-assets'] });
      
      // Reset form
      setSelectedFile(null);
      setAssetName("");
      setAssetType("image");
      setAssetTags("");
      setAltText("");
      
      // Reset file input
      const fileInput = document.getElementById('asset-file') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      toast({ 
        title: "Upload failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (asset: EmailAsset) => {
    setAssetToDelete(asset);
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    if (assetToDelete) {
      deleteAssetMutation.mutate(assetToDelete.id);
    }
  };

  const viewAssetDetails = (asset: EmailAsset) => {
    setSelectedAsset(asset);
    setShowAssetDetails(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({ title: "Copied to clipboard" });
      },
      (err) => {
        toast({ 
          title: "Failed to copy", 
          description: "Could not copy text to clipboard",
          variant: "destructive" 
        });
      }
    );
  };

  const filteredAssets = () => {
    if (!assetsData?.assets) return [];
    if (filter === "all") return assetsData.assets;
    return assetsData.assets.filter((asset: EmailAsset) => asset.type === filter);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Email Assets</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload New Asset</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="asset-file">File</Label>
                <Input 
                  id="asset-file" 
                  type="file" 
                  onChange={handleFileChange} 
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="asset-name">Asset Name</Label>
                <Input
                  id="asset-name"
                  placeholder="E.g., Wedding Logo"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="asset-type">Asset Type</Label>
                <select
                  id="asset-type"
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                >
                  <option value="image">Image</option>
                  <option value="logo">Logo</option>
                  <option value="banner">Banner</option>
                  <option value="background">Background</option>
                  <option value="icon">Icon</option>
                </select>
              </div>
              <div>
                <Label htmlFor="asset-alt">Alt Text</Label>
                <Input
                  id="asset-alt"
                  placeholder="Descriptive text for screen readers"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="asset-tags">Tags (comma separated)</Label>
              <Input
                id="asset-tags"
                placeholder="E.g., logo, header, wedding"
                value={assetTags}
                onChange={(e) => setAssetTags(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={uploadAsset} 
            disabled={!selectedFile || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Uploading...
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" /> 
                Upload Asset
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <div className="mt-8">
        <Tabs defaultValue="all" onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All Assets</TabsTrigger>
            <TabsTrigger value="image">Images</TabsTrigger>
            <TabsTrigger value="logo">Logos</TabsTrigger>
            <TabsTrigger value="banner">Banners</TabsTrigger>
            <TabsTrigger value="background">Backgrounds</TabsTrigger>
          </TabsList>
          
          <TabsContent value={filter}>
            {filteredAssets().length === 0 ? (
              <div className="text-center py-8">
                <Image className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold">No assets found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filter === "all" 
                    ? "Get started by uploading an asset." 
                    : `No ${filter} assets found. Upload some from the panel above.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                {filteredAssets().map((asset: EmailAsset) => (
                  <Card key={asset.id} className="overflow-hidden">
                    <div className="aspect-square overflow-hidden bg-gray-100 relative group">
                      {asset.type === 'image' || asset.type === 'logo' || asset.type === 'banner' || asset.type === 'background' ? (
                        <img
                          src={asset.url}
                          alt={asset.altText || asset.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Error+Loading+Image';
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Image className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="bg-white"
                            onClick={() => viewAssetDetails(asset)}
                          >
                            <Image className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="bg-white text-red-500"
                            onClick={() => confirmDelete(asset)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm truncate">{asset.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{asset.type}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Asset details dialog */}
      <Dialog open={showAssetDetails} onOpenChange={setShowAssetDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asset Details</DialogTitle>
            <DialogDescription>
              View and copy asset information
            </DialogDescription>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              {selectedAsset.type === 'image' || selectedAsset.type === 'logo' || selectedAsset.type === 'banner' || selectedAsset.type === 'background' ? (
                <img
                  src={selectedAsset.url}
                  alt={selectedAsset.altText || selectedAsset.name}
                  className="max-h-[200px] mx-auto"
                />
              ) : (
                <div className="flex items-center justify-center h-[200px] bg-gray-100">
                  <Image className="h-16 w-16 text-gray-400" />
                </div>
              )}
              
              <div className="space-y-2">
                <div>
                  <Label>Asset Name</Label>
                  <div className="flex items-center mt-1">
                    <Input value={selectedAsset.name} readOnly />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2"
                      onClick={() => copyToClipboard(selectedAsset.name)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label>URL</Label>
                  <div className="flex items-center mt-1">
                    <Input value={selectedAsset.url} readOnly />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2"
                      onClick={() => copyToClipboard(selectedAsset.url)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Input value={selectedAsset.type} readOnly className="mt-1" />
                  </div>
                  <div>
                    <Label>Uploaded</Label>
                    <Input 
                      value={new Date(selectedAsset.createdAt).toLocaleDateString()} 
                      readOnly 
                      className="mt-1" 
                    />
                  </div>
                </div>
                
                {selectedAsset.tags && (
                  <div>
                    <Label>Tags</Label>
                    <Input value={selectedAsset.tags} readOnly className="mt-1" />
                  </div>
                )}
                
                {selectedAsset.altText && (
                  <div>
                    <Label>Alt Text</Label>
                    <Input value={selectedAsset.altText} readOnly className="mt-1" />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssetDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this asset? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {assetToDelete && (
            <div className="my-4">
              <p className="font-medium">{assetToDelete.name}</p>
              {(assetToDelete.type === 'image' || assetToDelete.type === 'logo' || assetToDelete.type === 'banner' || assetToDelete.type === 'background') && (
                <img
                  src={assetToDelete.url}
                  alt={assetToDelete.altText || assetToDelete.name}
                  className="mt-2 max-h-[100px]"
                />
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteAssetMutation.isPending}
            >
              {deleteAssetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}