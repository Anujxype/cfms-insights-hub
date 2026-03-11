import { useState } from "react";
import { cn } from "@/lib/utils";
import { Copy, Check, Download } from "lucide-react";

interface JsonDisplayProps {
  data: unknown;
  className?: string;
}

const JsonDisplay = ({ data, className }: JsonDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const getPlainText = (obj: unknown): string => {
    return JSON.stringify(obj, null, 2);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getPlainText(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = getPlainText(data);
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const text = getPlainText(data);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cfms-response-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const formatJson = (obj: unknown, indent = 0): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    const spaces = "  ".repeat(indent);

    if (obj === null) {
      elements.push(<span key="null" className="text-muted-foreground">null</span>);
      return elements;
    }
    if (typeof obj === "boolean") {
      elements.push(<span key="bool" className="text-warning">{obj.toString()}</span>);
      return elements;
    }
    if (typeof obj === "number") {
      elements.push(<span key="num" className="text-success">{obj}</span>);
      return elements;
    }
    if (typeof obj === "string") {
      elements.push(<span key="str" className="text-primary">"{obj}"</span>);
      return elements;
    }
    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        elements.push(<span key="empty-arr">[]</span>);
        return elements;
      }
      elements.push(<span key="arr-open">[{"\n"}</span>);
      obj.forEach((item, i) => {
        elements.push(
          <span key={`arr-${i}`}>
            {spaces}  {formatJson(item, indent + 1)}
            {i < obj.length - 1 ? "," : ""}{"\n"}
          </span>
        );
      });
      elements.push(<span key="arr-close">{spaces}]</span>);
      return elements;
    }
    if (typeof obj === "object") {
      const entries = Object.entries(obj);
      if (entries.length === 0) {
        elements.push(<span key="empty-obj">{"{}"}</span>);
        return elements;
      }
      elements.push(<span key="obj-open">{"{"}{"\n"}</span>);
      entries.forEach(([key, value], i) => {
        elements.push(
          <span key={`obj-${key}`}>
            {spaces}  <span className="text-destructive">"{key}"</span>: {formatJson(value, indent + 1)}
            {i < entries.length - 1 ? "," : ""}{"\n"}
          </span>
        );
      });
      elements.push(<span key="obj-close">{spaces}{"}"}</span>);
      return elements;
    }
    return elements;
  };

  return (
    <div className="relative group">
      {/* Action buttons */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border",
            copied
              ? "bg-success/15 border-success/30 text-success scale-105"
              : "bg-background/80 backdrop-blur-sm border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 active:scale-95"
          )}
          title="Copy to clipboard"
        >
          <span className={cn("transition-transform duration-300", copied && "animate-scale-in")}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </span>
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={handleDownload}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border",
            downloaded
              ? "bg-success/15 border-success/30 text-success scale-105"
              : "bg-background/80 backdrop-blur-sm border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 active:scale-95"
          )}
          title="Download as .txt"
        >
          <span className={cn("transition-transform duration-300", downloaded && "animate-scale-in")}>
            {downloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
          </span>
          {downloaded ? "Done!" : ".txt"}
        </button>
      </div>

      <pre
        className={cn(
          "bg-secondary/50 border border-border rounded-lg p-4 pt-10 overflow-auto font-mono text-xs sm:text-sm leading-relaxed max-h-[500px]",
          className
        )}
      >
        <code className="text-foreground">{formatJson(data)}</code>
      </pre>
    </div>
  );
};

export default JsonDisplay;
