import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Rendert Markdown-Text (Frage-/Lösungstext) mit GitHub-Flavored-Markdown.
 * Unterstützt Tabellen, Code-Blöcke, Listen und Blockquotes; das Styling
 * (inkl. mobiler Scroll-Tabellen) kommt aus `.md-content` in index.css.
 *
 * @param {Object} props
 * @param {string} [props.children]  Markdown-Quelltext. Bei leerem Wert wird nichts gerendert.
 * @param {string} [props.className] Zusätzliche CSS-Klassen für den Wrapper.
 */
export default function MarkdownContent({ children, className = '' }) {
  if (!children) return null;
  return (
    <div className={`md-content text-left ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
