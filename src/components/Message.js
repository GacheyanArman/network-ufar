"use client";

function highlightText(text, query) {
  if (!query || !query.trim()) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));

  return parts.map((part, index) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return <mark key={index} className="tg-highlight">{part}</mark>;
    }
    return part;
  });
}

export default function Message({ message, isOwnMessage, searchQuery = "" }) {
  return (
    <div className={`tg-message ${isOwnMessage ? 'tg-message-own' : 'tg-message-other'}`}>
      <div className="tg-message-bubble">
        <p className="tg-message-text">
          {highlightText(message.content, searchQuery)}
        </p>
        <span className="tg-message-time">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}