"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Message from "./Message";

interface MessageType {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: Date;
}

interface MessagesClientProps {
  initialHistory: MessageType[];
  currentUserId: string;
  selectedUserId: string;
  selectedGroupId?: string;
}

export default function MessagesClient({
  initialHistory,
  currentUserId,
  selectedUserId,
  selectedGroupId = "",
}: MessagesClientProps) {
  const [messages, setMessages] = useState<MessageType[]>(initialHistory);
  const [isPolling, setIsPolling] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if ((!selectedUserId && !selectedGroupId) || !isPolling) return;

    const pollMessages = async () => {
      try {
        const lastMessageId = messages[messages.length - 1]?.id || "";
        const url = selectedGroupId
          ? `/api/messages/poll?groupId=${selectedGroupId}&lastMessageId=${lastMessageId}`
          : `/api/messages/poll?userId=${selectedUserId}&lastMessageId=${lastMessageId}`;

        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map(m => m.id));
              const newMessages = data.messages.filter((m: MessageType) => !existingIds.has(m.id));
              return [...prev, ...newMessages];
            });
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    // Poll every 3 seconds
    const interval = setInterval(pollMessages, 3000);

    return () => clearInterval(interval);
  }, [selectedUserId, selectedGroupId, messages, isPolling]);

  // Reset messages when selected user/group changes
  useEffect(() => {
    setMessages(initialHistory);
  }, [selectedUserId, selectedGroupId, initialHistory]);

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "16px",
        }}
      >
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            isOwnMessage={message.senderId === currentUserId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </>
  );
}
