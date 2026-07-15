import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  MessageSquare,
  Pencil,
  Trash2,
  ChevronLeft,
} from 'lucide-react';

function ChatItem({ chat, active, onSelect, onRename, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);

  const handleRename = () => {
    onRename(chat.id, editTitle);
    setIsEditing(false);
  };

  return (
    <div
      className={`
        group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer
        transition-all duration-200
        ${
          active
            ? 'bg-white/10 border border-white/20'
            : 'hover:bg-white/5 border border-transparent'
        }
      `}
      onClick={() => onSelect(chat.id)}
    >
      <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-500" />

      {isEditing ? (
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          className="flex-1 bg-transparent text-sm text-gray-200 focus:outline-none border-b border-white"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-sm text-gray-300 truncate">
          {chat.title}
        </span>
      )}

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
            setEditTitle(chat.title);
          }}
          className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/5"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(chat.id);
          }}
          className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function ChatSidebar({
  chats = [],
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  isOpen,
  onToggle,
}) {
  const [search, setSearch] = useState('');

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <button
        onClick={onToggle}
        className="lg:hidden fixed bottom-4 left-4 z-30 p-3 rounded-xl bg-white text-black"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`
              fixed lg:relative z-30 h-full
              w-72 flex-shrink-0
              bg-gray-900/95 backdrop-blur-xl border-r border-white/10
              lg:translate-x-0
            `}
          >
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-white/10">
                <button
                  onClick={onNewChat}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </button>
              </div>

              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search chats..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {filteredChats.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    {search ? 'No chats found' : 'No chats yet. Start a new one!'}
                  </p>
                ) : (
                  filteredChats.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      active={chat.id === activeChatId}
                      onSelect={onSelectChat}
                      onRename={onRenameChat}
                      onDelete={onDeleteChat}
                    />
                  ))
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
