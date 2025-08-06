import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";

interface OAuthResponse {
  success: boolean;
  provider: "gmail" | "outlook";
  email: string;
  message: string;
}

export default function OAuthCallbackSuccess() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/oauth/callback/:provider");
  const [response, setResponse] = useState<OAuthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Parse the JSON response from the query parameter
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const responseParam = urlParams.get("response");
      
      if (responseParam) {
        const decodedResponse = decodeURIComponent(responseParam);
        const parsedResponse = JSON.parse(decodedResponse) as OAuthResponse;
        setResponse(parsedResponse);
      } else {
        setError("No response data found");
      }
    } catch (err) {
      setError("Failed to parse response data");
      // OAuth callback response error - handled silently
    }
  }, []);

  const handleReturnToSettings = () => {
    setLocation("/settings/event");
  };

  const getProviderName = (provider?: string) => {
    switch (provider) {
      case "gmail":
        return "Google Gmail";
      case "outlook":
        return "Microsoft Outlook";
      default:
        return "Email Service";
    }
  };

  if (error) {
    return (
      <div className="container max-w-md py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Authentication Error</CardTitle>
            <CardDescription>
              There was a problem completing the authentication process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleReturnToSettings} className="w-full">
              Return to Settings
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="container max-w-md py-12">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>
              Processing your authentication response...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-md py-12">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <CardTitle>Authentication Successful</CardTitle>
          </div>
          <CardDescription>
            Your {getProviderName(response.provider)} account has been connected
            successfully.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="text-sm text-muted-foreground mb-1">Connected Account</div>
              <div className="font-medium">{response.email}</div>
            </div>
            <p className="text-sm text-muted-foreground">
              You can now use this account to send emails through your event settings.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleReturnToSettings} className="w-full">
            Return to Event Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}