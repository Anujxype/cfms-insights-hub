import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      elements.push(<span key="null" className="text-muted-foreground italic">null</span>);
      return elements;
    }
    if (typeof obj === "boolean") {
      elements.push(
        <span key="bool" className="text-[hsl(280_80%_65%)] font-semibold">{obj.toString()}</span>
      );
      return elements;
    }
    if (typeof obj === "number") {
      elements.push(
        <span key="num" className="text-[hsl(171_80%_50%)] font-medium tabular-nums">{obj}</span>
      );
      return elements;
    }
    if (typeof obj === "string") {
      elements.push(
        <span key="str" className="text-[hsl(210_90%_68%)]">
          "<span className="text-[hsl(210_90%_72%)]">{obj}</span>"
        </span>
      );
      return elements;
    }
    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        elements.push(<span key="empty-arr" className="text-muted-foreground">[]</span>);
        return elements;
      }
      elements.push(<span key="arr-open" className="text-[hsl(45_90%_60%)]">[{"\n"}</span>);
      obj.forEach((item, i) => {
        elements.push(
          <span key={`arr-${i}`}>
            {spaces}  {formatJson(item, indent + 1)}
            {i < obj.length - 1 ? <span className="text-muted-foreground">,</span> : ""}{"\n"}
          </span>
        );
      });
      elements.push(<span key="arr-close" className="text-[hsl(45_90%_60%)]">{spaces}]</span>);
      return elements;
    }
    if (typeof obj === "object") {
      const entries = Object.entries(obj);
      if (entries.length === 0) {
        elements.push(<span key="empty-obj" className="text-muted-foreground">{"{}"}</span>);
        return elements;
      }
      elements.push(<span key="obj-open" className="text-[hsl(45_90%_60%)]">{"{"}{"\n"}</span>);
      entries.forEach(([key, value], i) => {
        elements.push(
          <span key={`obj-${key}`}>
            {spaces}  <span className="text-[hsl(340_82%_65%)]">"{key}"</span><span className="text-muted-foreground">:</span> {formatJson(value, indent + 1)}
            {i < entries.length - 1 ? <span className="text-muted-foreground">,</span> : ""}{"\n"}
          </span>
        );
      });
      elements.push(<span key="obj-close" className="text-[hsl(45_90%_60%)]">{spaces}{"}"}</span>);
      return elements;
    }
    return elements;
  };

  return (
    <motion.div
      className="relative group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Action buttons */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300">
        {/* Copy button */}
        <motion.button
          onClick={handleCopy}
          className={cn(
            "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-300 border backdrop-blur-xl overflow-hidden",
            copied
              ? "bg-success/20 border-success/50 text-success shadow-[0_0_20px_hsl(var(--success)/0.4)]"
              : "bg-primary/10 border-primary/30 text-primary hover:border-primary/60 hover:bg-primary/20 hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          )}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          title="Copy to clipboard"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={copied ? "check" : "copy"}
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </motion.span>
          </AnimatePresence>
          {copied ? "Copied!" : "Copy"}
        </motion.button>

        {/* Download button */}
        <motion.button
          onClick={handleDownload}
          className={cn(
            "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-300 border backdrop-blur-xl overflow-hidden",
            downloaded
              ? "bg-success/20 border-success/50 text-success shadow-[0_0_20px_hsl(var(--success)/0.4)]"
              : "bg-accent/10 border-accent/30 text-accent hover:border-accent/60 hover:bg-accent/20 hover:shadow-[0_0_20px_hsl(var(--accent)/0.3)]"
          )}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          title="Download as .txt"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={downloaded ? "check" : "download"}
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {downloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            </motion.span>
          </AnimatePresence>
          {downloaded ? "Done!" : ".txt"}
        </motion.button>
      </div>

      {/* JSON content */}
      <pre
        className={cn(
          "relative bg-secondary/50 border border-border/60 rounded-xl p-4 pt-12 overflow-auto font-mono text-xs sm:text-sm leading-relaxed max-h-[500px]",
          "hover:border-primary/20 transition-colors duration-500",
          "shadow-inner shadow-black/10",
          className
        )}
      >
        {/* Top accent line */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
        <div className="absolute top-0 left-0 bottom-0 w-px bg-gradient-to-b from-primary/30 via-accent/20 to-transparent" />

        <code className="text-foreground/90">{formatJson(data)}</code>
      </pre>
    </motion.div>
  );
};

export default JsonDisplay;
