import ReactMarkdown from "react-markdown";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface Props {
  content: string;
  section?: "all" | "lesson" | "worksheet" | "activities";
  className?: string;
}

function extractSection(md: string, headingKeywords: string[]): string {
  if (!md) return "";
  const lines = md.split("\n");
  let capture = false;
  const out: string[] = [];
  for (const line of lines) {
    const isH2 = /^##\s+/.test(line);
    if (isH2) {
      const lower = line.toLowerCase();
      const matches = headingKeywords.some((k) => lower.includes(k));
      if (matches) {
        capture = true;
        out.push(line);
        continue;
      }
      if (capture) break;
    }
    if (capture) out.push(line);
  }
  return out.join("\n").trim();
}

export const LessonOutput = forwardRef<HTMLDivElement, Props>(({ content, section = "all", className }, ref) => {
  let display = content;
  if (section === "lesson") display = extractSection(content, ["lesson plan"]);
  else if (section === "worksheet") display = extractSection(content, ["worksheet"]);
  else if (section === "activities") display = extractSection(content, ["activities", "games"]);

  if (!display.trim()) {
    return (
      <div className="text-sm text-muted-foreground italic py-8 text-center">
        This section will appear here once the lesson is generated.
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "prose prose-sm md:prose-base max-w-none",
        "prose-headings:font-bold prose-headings:text-foreground",
        "prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border",
        "prose-h3:text-lg prose-h3:mt-6 prose-h3:text-primary",
        "prose-p:text-foreground prose-p:leading-relaxed",
        "prose-strong:text-foreground prose-strong:font-semibold",
        "prose-li:text-foreground prose-li:my-1",
        "prose-ul:my-3 prose-ol:my-3",
        "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-accent prose-code:before:content-none prose-code:after:content-none",
        "prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:not-italic",
        "dark:prose-invert",
        className,
      )}
    >
      <ReactMarkdown>{display}</ReactMarkdown>
    </div>
  );
});
LessonOutput.displayName = "LessonOutput";