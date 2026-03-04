import { OutlineData, OutlineNode } from "@/types/models";
import React from "react";

export const OutlineNotes: React.FC<{ data: OutlineData }> = ({ data }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 inline-block">
        {data.title}
      </h2>
      <ul className="space-y-2 pl-0">
        {data.children.map((node, idx) => (
          <OutlineItem key={idx} node={node} />
        ))}
      </ul>
    </div>
  );
};

const OutlineItem: React.FC<{ node: OutlineNode }> = ({ node }) => {
  // Attempt to split bullet (e.g., "I. Point") into marker and content
  // Fallback if no space
  const firstSpaceIndex = node.bullet.indexOf(" ");
  const marker =
    firstSpaceIndex !== -1 ? node.bullet.substring(0, firstSpaceIndex) : "•";
  const content =
    firstSpaceIndex !== -1
      ? node.bullet.substring(firstSpaceIndex + 1)
      : node.bullet;

  return (
    <li className="list-none">
      <div className="py-1 flex items-baseline gap-2">
        <span className="font-semibold text-primary text-sm min-w-[1.5rem] text-right flex-shrink-0">
          {marker}
        </span>
        <span className="text-foreground/80 leading-relaxed text-sm">
          {content}
        </span>
      </div>
      {node.children && node.children.length > 0 && (
        <ul className="pl-6 ml-2 space-y-1 mt-1 border-l border-border/30">
          {node.children.map((child, idx) => (
            <OutlineItem key={idx} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
};
