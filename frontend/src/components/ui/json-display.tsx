import * as React from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface JsonDisplayProps {
  data: unknown;
  title?: string;
  className?: string;
  maxHeight?: string;
  showCopyButton?: boolean;
  inline?: boolean; // If true, don't wrap in Card (for use inside markdown)
}

/**
 * Formats JSON with syntax highlighting
 */
function formatJson(json: string): string {
  // Escape HTML first
  let formatted = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Highlight JSON syntax
  formatted = formatted.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      // Check if it's a key (ends with colon)
      if (/":\s*$/.test(match) || /":$/.test(match)) {
        return `<span class="text-primary font-semibold">${match}</span>`;
      }
      // Check if it's a string value
      if (/^"/.test(match)) {
        return `<span class="text-primary/80">${match}</span>`;
      }
      // Check if it's a boolean
      if (/^(true|false)$/.test(match)) {
        return `<span class="text-accent">${match}</span>`;
      }
      // Check if it's null
      if (/^null$/.test(match)) {
        return `<span class="text-muted-foreground italic">${match}</span>`;
      }
      // It's a number
      return `<span class="text-primary/70">${match}</span>`;
    }
  );

  return formatted;
}

export function JsonDisplay({
  data,
  title,
  className,
  maxHeight = "600px",
  showCopyButton = true,
  inline = false,
}: JsonDisplayProps) {
  const [copied, setCopied] = React.useState(false);
  const { toast } = useToast();

  let jsonString: string;
  let formattedHtml: string;

  try {
    jsonString = JSON.stringify(data, null, 2);
    formattedHtml = formatJson(jsonString);
  } catch (error) {
    jsonString = String(data);
    formattedHtml = formatJson(JSON.stringify({ error: "Invalid JSON", data: jsonString }, null, 2));
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "JSON has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  if (inline) {
    // Inline mode: pre tag with copy button inside, no wrapper
    return (
      <div className={cn("relative", className)}>
        {title && (
          <h3 className="text-xl font-medium text-foreground mb-4">{title}</h3>
        )}
        <pre
          className={cn(
            "relative rounded-md bg-background border border-border p-4 overflow-auto",
            "font-mono text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap break-words"
          )}
          style={{ maxHeight }}
        >
          {showCopyButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="sticky top-2 float-right h-8 w-8 text-muted-foreground hover:text-primary z-10 ml-2 mb-2"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
          <span dangerouslySetInnerHTML={{ __html: formattedHtml }} />
        </pre>
      </div>
    );
  }

  // Card mode: wrapped in Card component
  return (
    <Card className={cn("p-8 shadow-sm bg-background border border-border", className)}>
      {(title || showCopyButton) && (
        <div className="flex items-center justify-between mb-6">
          {title && (
            <h3 className="text-xl font-medium text-foreground">{title}</h3>
          )}
          {showCopyButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8 text-muted-foreground hover:text-primary"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      )}
      <div
        className={cn(
          "rounded-md border border-border bg-muted/30 p-4 overflow-auto",
          "font-mono text-sm leading-relaxed"
        )}
        style={{ maxHeight }}
      >
        <pre
          className="text-muted-foreground whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: formattedHtml }}
        />
      </div>
    </Card>
  );
}

// Add displayName for component detection
JsonDisplay.displayName = 'JsonDisplay';
