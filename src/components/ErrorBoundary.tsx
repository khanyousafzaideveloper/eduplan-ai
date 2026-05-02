import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Uncaught Error]", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="inline-flex h-16 w-16 rounded-full bg-destructive/10 items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
              <p className="text-muted-foreground">
                An unexpected error occurred. We've been notified and are looking into it.
              </p>
            </div>
            {this.state.error && (
              <pre className="p-4 bg-muted rounded-lg text-xs text-left overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <Button 
              className="w-full"
              onClick={() => window.location.href = "/"}
            >
              Back to Home
            </Button>
          </div>
        </div>
      );
    }

    return this.children;
  }
}

export default ErrorBoundary;
