"use client";

import { useState, useTransition } from "react";
import {
  cancelJoinRequest,
  joinCommunity,
  leaveCommunity,
} from "@/app/actions/community";
import UiIcon from "@/components/UiIcon";

export type JoinState = "member" | "owner" | "guest" | "pending";

type Props = {
  communityId: string;
  isPrivate: boolean;
  state: JoinState;
  size?: "sm" | "md";
  className?: string;
};

export default function CommunityJoinButton({
  communityId,
  isPrivate,
  state,
  size = "md",
  className = "",
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [askPrivate, setAskPrivate] = useState(false);
  const [message, setMessage] = useState("");

  const baseStyle: React.CSSProperties =
    size === "sm"
      ? { minHeight: "36px", padding: "0 14px", fontSize: "14px" }
      : {};

  async function submit(formData: FormData) {
    startTransition(async () => {
      await joinCommunity(formData);
      setAskPrivate(false);
      setMessage("");
    });
  }

  if (state === "owner") {
    return (
      <button
        className={`btn btn-secondary ${className}`}
        style={baseStyle}
        disabled
      >
        Owner
      </button>
    );
  }

  if (state === "member") {
    return (
      <form
        action={(fd) =>
          startTransition(async () => {
            await leaveCommunity(fd);
          })
        }
      >
        <input type="hidden" name="communityId" value={communityId} />
        <button
          className={`btn btn-secondary ${className}`}
          style={baseStyle}
          type="submit"
          disabled={isPending}
        >
          {isPending ? "..." : "Leave"}
        </button>
      </form>
    );
  }

  if (state === "pending") {
    return (
      <form
        action={(fd) =>
          startTransition(async () => {
            await cancelJoinRequest(fd);
          })
        }
      >
        <input type="hidden" name="communityId" value={communityId} />
        <button
          className={`btn btn-secondary ${className}`}
          style={baseStyle}
          type="submit"
          disabled={isPending}
          title="Cancel request"
        >
          <UiIcon name="clock" size={16} />
          <span style={{ marginLeft: 6 }}>Pending</span>
        </button>
      </form>
    );
  }

  // guest → join or request
  if (isPrivate) {
    if (askPrivate) {
      return (
        <form
          action={(fd) => submit(fd)}
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <input type="hidden" name="communityId" value={communityId} />
          <input
            type="text"
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Why do you want to join? (optional)"
            maxLength={500}
            style={{
              minHeight: 36,
              padding: "0 12px",
              border: "1px solid var(--border-color)",
              borderRadius: 10,
              fontSize: 14,
              minWidth: 220,
            }}
          />
          <button
            type="submit"
            className={`btn btn-primary ${className}`}
            style={baseStyle}
            disabled={isPending}
          >
            {isPending ? "..." : "Send"}
          </button>
          <button
            type="button"
            className={`btn btn-secondary ${className}`}
            style={baseStyle}
            onClick={() => setAskPrivate(false)}
          >
            Cancel
          </button>
        </form>
      );
    }

    return (
      <button
        className={`btn btn-primary ${className}`}
        style={baseStyle}
        type="button"
        onClick={() => setAskPrivate(true)}
      >
        Request to join
      </button>
    );
  }

  return (
    <form action={(fd) => submit(fd)}>
      <input type="hidden" name="communityId" value={communityId} />
      <button
        type="submit"
        className={`btn btn-primary ${className}`}
        style={baseStyle}
        disabled={isPending}
      >
        {isPending ? "Joining..." : "Join"}
      </button>
    </form>
  );
}
