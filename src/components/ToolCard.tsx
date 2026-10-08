import React from 'react';
import { ToolDef } from '../types';
import { IconResolver } from './IconResolver';
import { ArrowUpRight } from 'lucide-react';

interface ToolCardProps {
  tool: ToolDef;
  onSelect: (tool: ToolDef) => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(tool)}
      className="group relative flex flex-col text-left p-5 rounded-2xl bg-white border border-neutral-200/80 hover:border-neutral-300 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
    >
      {/* Top row with icon & optional badge */}
      <div className="flex items-center justify-between w-full mb-3.5">
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105`}
        >
          <IconResolver name={tool.iconName} className="w-5 h-5" />
        </div>

        <div className="flex items-center gap-1.5">
          {tool.badge && (
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-rose-50 text-rose-600 border border-rose-200/50">
              {tool.badge}
            </span>
          )}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-300 group-hover:text-neutral-700 transition-colors">
            <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Title & Description */}
      <h3 className="font-semibold text-neutral-900 text-base mb-1.5 group-hover:text-neutral-950 transition-colors">
        {tool.title}
      </h3>
      <p className="text-xs leading-relaxed text-neutral-500 line-clamp-2">
        {tool.shortDesc}
      </p>
    </button>
  );
};
