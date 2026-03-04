import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import React from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 flex flex-col items-center text-center shadow-lg border-destructive/20">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>

            <h1 className="text-2xl font-serif text-foreground mb-3">
              Something went wrong
            </h1>

            <p className="text-muted-foreground mb-8 line-clamp-3">
              We've encountered an unexpected error.
              {process.env.NODE_ENV === "development" && this.state.error && (
                <span className="block mt-2 font-mono text-xs text-left bg-muted p-2 rounded w-full overflow-hidden text-ellipsis">
                  {this.state.error.message}
                </span>
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <Button
                onClick={this.handleReload}
                className="flex-1 flex items-center gap-2"
                size="lg"
              >
                <RefreshCcw className="w-4 h-4" />
                Reload Page
              </Button>
              <Button
                variant="outline"
                className="flex-1 flex items-center gap-2"
                size="lg"
                asChild
              >
                <a href="/">
                  <Home className="w-4 h-4" />
                  Go Home
                </a>
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
