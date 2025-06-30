import ReactMarkdown from "react-markdown";

export function MessageText({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        code: ({ children, ...props }) => (
          <code
            className="bg-muted text-foreground px-2 py-1 rounded text-xs font-mono border"
            {...props}
          >
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-3 border font-mono">
            {children}
          </pre>
        ),
        p: ({ children }) => (
          <p className="mb-3 leading-relaxed font-mono">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-outside mb-3 space-y-1 ml-4 font-mono">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside mb-3 space-y-1 ml-4 font-mono">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="mb-1 font-mono">{children}</li>,
        h1: ({ children }) => (
          <h1 className="text-[1.875rem] font-semibold mb-4 text-foreground border-b border-border pb-2 tracking-tight font-mono">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-[1.45rem] font-semibold mb-3 text-muted-foreground tracking-tight font-mono">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mb-2 text-foreground font-mono">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-base font-semibold mb-2 text-foreground font-mono">
            {children}
          </h4>
        ),
        strong: ({ children }) => (
          <strong className="font-bold text-foreground font-mono">
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em className="italic text-muted-foreground font-mono">{children}</em>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary pl-4 italic mb-3 text-muted-foreground bg-muted/30 py-2 rounded-r font-mono">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="border-border my-4" />,
        a: ({ children, href }) => (
          <a
            href={href}
            className="text-primary hover:text-primary/80 underline transition-colors duration-200 font-mono"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
