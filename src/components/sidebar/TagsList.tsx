import React from 'react'
import { Hash } from 'lucide-react'
import { Tag } from '@/types'

interface TagsListProps {
  tags: Tag[]
  selectedTag: string | null
  onSelectTag: (tagName: string | null) => void
}

export const TagsList: React.FC<TagsListProps> = ({
  tags,
  selectedTag,
  onSelectTag,
}) => {
  return (
    <div className="p-2 space-y-1">
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1 py-1 font-semibold uppercase tracking-wider">
        <span>Vault Tags</span>
        {selectedTag && (
          <button
            onClick={() => onSelectTag(null)}
            className="text-[10px] text-purple-400 hover:text-purple-300 lowercase"
          >
            clear filter
          </button>
        )}
      </div>

      {tags.length === 0 ? (
        <div className="text-xs text-zinc-500 py-3 text-center">
          No tags found. Add `#tag` in any note to categorize your knowledge.
        </div>
      ) : (
        <div className="space-y-0.5">
          {tags.map(tag => {
            const isSelected = selectedTag === tag.name
            return (
              <button
                key={tag.id}
                onClick={() => onSelectTag(isSelected ? null : tag.name)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors ${
                  isSelected
                    ? 'bg-purple-900/60 text-purple-200 border border-purple-700/50'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Hash size={13} className={isSelected ? 'text-purple-400' : 'text-zinc-500'} />
                  <span className="truncate">{tag.name}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800/80 rounded-full text-zinc-400">
                  {tag.count || 1}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
