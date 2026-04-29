"use client";

export default function Message({ message, isOwnMessage }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
      marginBottom: '12px',
      width: '100%'
    }}>
      <div style={{
        maxWidth: '75%',
        padding: '10px 14px',
        borderRadius: isOwnMessage ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
        background: isOwnMessage ? '#0b3aa8' : '#f1f5f9',
        color: isOwnMessage ? '#ffffff' : '#0f172a',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        fontSize: '0.95rem',
        lineHeight: '1.4'
      }}>
        {message.content}
      </div>
      
      <span style={{
        fontSize: '0.75rem',
        color: '#94a3b8',
        marginTop: '4px',
        marginRight: isOwnMessage ? '4px' : '0',
        marginLeft: isOwnMessage ? '0' : '4px'
      }}>
        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}