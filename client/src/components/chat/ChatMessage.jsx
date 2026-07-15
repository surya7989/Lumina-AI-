import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Clock } from 'lucide-react';

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden my-3">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-white/5">
        <span className="text-xs text-gray-400 uppercase">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0 }}
        showLineNumbers
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

export default function ChatMessage({ message, isStreaming = false }) {
  const isUser = message?.role === 'user';

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
          isUser
            ? 'bg-white text-black'
            : 'bg-white/10 text-gray-300'
        }`}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      <div className={`min-w-0 flex flex-col ${isUser ? 'max-w-[min(28rem,72%)] items-end' : 'max-w-[min(40rem,80%)] items-start'}`}>
        <div
          className={`
            rounded-2xl px-3.5 py-2.5 shadow-sm
            ${
              isUser
                ? 'bg-white text-black rounded-tr-sm'
                : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm'
            }
          `}
        >
          {isUser ? (
            <p className="text-sm leading-6 whitespace-pre-wrap">
              {message?.content}
            </p>
          ) : (
            <div className="text-sm leading-6 prose prose-invert prose-p:my-0 prose-ul:my-1.5 prose-ol:my-1.5 max-w-none break-words">
              {isStreaming && !message?.content ? (
                <TypingDots />
              ) : (
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const value = String(children).replace(/\n$/, '');
                      if (!inline && match) {
                        return (
                          <CodeBlock
                            language={match[1]}
                            value={value}
                          />
                        );
                      }
                      return (
                        <code
                          className="px-1.5 py-0.5 rounded-md bg-white/10 text-white text-xs"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    p({ children }) {
                      return <p className="mb-2 last:mb-0 leading-6">{children}</p>;
                    },
                    ul({ children }) {
                      return <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>;
                    },
                    ol({ children }) {
                      return <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>;
                    },
                  }}
                >
                  {message?.content || ''}
                </ReactMarkdown>
              )}
            </div>
          )}
        </div>

        {message?.timestamp && (
          <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end' : ''}`}>
            <Clock className="w-3 h-3 text-gray-600" />
            <span className="text-[10px] text-gray-600">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
