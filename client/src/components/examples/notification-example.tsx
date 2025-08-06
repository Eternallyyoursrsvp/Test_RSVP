/**
 * Example component showcasing the notification utility
 * This demonstrates patterns for using the standardized notification system
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotification } from "@/lib/notification-utils";

export default function NotificationExample() {
  const notification = useNotification();
  
  const showSuccessNotification = () => {
    notification.success({
      title: "Success!",
      description: "This is a success notification example."
    });
  };
  
  const showErrorNotification = () => {
    notification.error({
      title: "Error!",
      description: "This is an error notification example."
    });
  };
  
  const showWarningNotification = () => {
    notification.warning({
      title: "Warning!",
      description: "This is a warning notification example."
    });
  };
  
  const showInfoNotification = () => {
    notification.info({
      title: "Information",
      description: "This is an informational notification example."
    });
  };
  
  const showCustomNotification = () => {
    notification.notify({
      title: "Custom Notification",
      description: "This is a custom notification with longer duration and action.",
      duration: 8000,
      action: (
        <Button variant="outline" size="sm" onClick={() => {}}>
          Action
        </Button>
      )
    });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Notifications</CardTitle>
          <CardDescription>
            Standardized notification types for common user feedback scenarios.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Button onClick={showSuccessNotification} variant="outline" className="border-green-200 bg-green-50 hover:bg-green-100 text-green-700">
            Success
          </Button>
          <Button onClick={showErrorNotification} variant="outline" className="border-red-200 bg-red-50 hover:bg-red-100 text-red-700">
            Error
          </Button>
          <Button onClick={showWarningNotification} variant="outline" className="border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-700">
            Warning
          </Button>
          <Button onClick={showInfoNotification} variant="outline" className="border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700">
            Info
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Advanced Notification</CardTitle>
          <CardDescription>
            Customizable notification with actions and extended duration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <Button onClick={showCustomNotification} className="w-full sm:w-auto">
              Show Custom Notification
            </Button>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          <p>
            Custom notifications can include action buttons, longer durations, and can be styled
            differently based on the use case.
          </p>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Integration with API Operations</CardTitle>
          <CardDescription>
            The notification system is integrated with API operations for automatic feedback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            When using the standardized API utilities, notifications are automatically triggered
            for success and error states, ensuring consistent user feedback throughout the application.
          </p>
          <pre className="bg-muted p-4 rounded-md text-xs overflow-auto">
{`// Example of API operation with automatic notification
const { mutate, isPending } = useMutation({
  mutationFn: async (data) => {
    return await post("/api/resource", data);
  },
  onSuccess: () => {
    // Notification automatically shown
    queryClient.invalidateQueries(["/api/resource"]);
  },
  onError: (error) => {
    // Error notification automatically shown with details
  }
});`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}