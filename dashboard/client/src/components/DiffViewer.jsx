// Renders a raw unified diff with git-style coloring: additions green,
// removals rose, hunk headers violet, file headers muted+bold.
export default function DiffViewer({ diff, onFileNodes }) {
  if (!diff) {
    return <div className="state-msg">No diff was stored for this review.</div>;
  }

  const lines = diff.split('\n');
  let currentFile = '';

  const classify = (line) => {
    if (line.startsWith('+++') || line.startsWith('---')) return 'diff-file';
    if (line.startsWith('@@')) return 'diff-hunk';
    if (line.startsWith('diff --git') || line.startsWith('index ')) return 'diff-meta';
    if (line.startsWith('+')) return 'diff-add';
    if (line.startsWith('-')) return 'diff-remove';
    return 'diff-context';
  };

  return (
    <div className="diff-viewer" ref={onFileNodes}>
      <pre>
        {lines.map((line, i) => {
          if (line.startsWith('diff --git ')) {
            const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
            if (match) currentFile = match[2];
          }
          return <div key={i} className={`diff-line ${classify(line)}`} data-diff-file={line.startsWith('diff --git ') ? currentFile : undefined}>
            <span className="diff-gutter">{i + 1}</span>
            <span className="diff-text">{line || ' '}</span>
          </div>;
        })}
      </pre>
    </div>
  );
}
