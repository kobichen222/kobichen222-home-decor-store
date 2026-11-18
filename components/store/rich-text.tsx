import Link from "next/link";
import * as React from "react";

// A deliberately small, safe text format for CMS content: no HTML is ever
// injected. Blank line = paragraph, "## " = heading, "- " = bullet list,
// **bold**, [label](https://link or /path).
function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${keyBase}-${i++}`}>{m[1]}</strong>);
    else {
      const href = m[3];
      out.push(
        href.startsWith("/") ? (
          <Link key={`${keyBase}-${i++}`} href={href} className="font-semibold text-brand underline underline-offset-4">{m[2]}</Link>
        ) : (
          <a key={`${keyBase}-${i++}`} href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline underline-offset-4">{m[2]}</a>
        ),
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={className ?? "space-y-4 text-lg leading-relaxed"}>
      {blocks.map((block, bi) => {
        if (block.startsWith("## ")) return <h2 key={bi} className="pt-2 text-2xl font-bold">{inline(block.slice(3), `h${bi}`)}</h2>;
        if (block.startsWith("### ")) return <h3 key={bi} className="pt-1 text-xl font-bold">{inline(block.slice(4), `h${bi}`)}</h3>;
        const lines = block.split("\n");
        if (lines.every((l) => /^[-•]\s/.test(l))) {
          return (
            <ul key={bi} className="list-disc space-y-1.5 ps-6">
              {lines.map((l, li) => <li key={li}>{inline(l.replace(/^[-•]\s/, ""), `l${bi}-${li}`)}</li>)}
            </ul>
          );
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <React.Fragment key={li}>
                {li > 0 && <br />}
                {inline(l, `p${bi}-${li}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
