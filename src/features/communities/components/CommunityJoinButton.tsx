"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  cancelJoinRequest,
  joinCommunity,
} from "@/features/communities/server/actions";
import UiIcon from "@/shared/ui/UiIcon";

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
  const sizeClass = size === "sm" ? "uf-join-btn-sm" : "";

  async function submit(formData: FormData) {
    startTransition(async () => {
      await joinCommunity(formData);
      setAskPrivate(false);
      setMessage("");
    });
  }

  if (state === "owner" || state === "member") {
    return (
      <>
        <Link
          href={`/communities/${communityId}`}
          className={`btn ${state === "owner" ? "btn-primary" : "btn-secondary"} ${sizeClass} ${className}`}
        >
          {state === "owner" ? "Open group" : "Open"}
        </Link>
        <style jsx>{joinButtonCss}</style>
      </>
    );
  }

  if (state === "pending") {
    return (
      <>
        <form
          action={(fd) =>
            startTransition(async () => {
              await cancelJoinRequest(fd);
            })
          }
        >
          <input type="hidden" name="communityId" value={communityId} />
          <button
            className={`btn btn-secondary ${sizeClass} ${className}`}
            type="submit"
            disabled={isPending}
            title="Cancel request"
          >
            <UiIcon name="clock" size={16} />
            <span className="uf-join-icon-gap">
              {isPending ? "..." : "Request sent"}
            </span>
          </button>
        </form>
        <style jsx>{joinButtonCss}</style>
      </>
    );
  }

  if (isPrivate) {
    if (askPrivate) {
      return (
        <>
          <form action={(fd) => submit(fd)} className="uf-private-join-form">
            <input type="hidden" name="communityId" value={communityId} />
            <input
              type="text"
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Short intro (optional)"
              maxLength={500}
              className="uf-private-join-input"
            />
            <button
              type="submit"
              className={`btn btn-primary ${sizeClass} ${className}`}
              disabled={isPending}
            >
              {isPending ? "..." : "Send"}
            </button>
            <button
              type="button"
              className={`btn btn-secondary ${sizeClass} ${className}`}
              onClick={() => setAskPrivate(false)}
            >
              Cancel
            </button>
          </form>
          <style jsx>{joinButtonCss}</style>
        </>
      );
    }

    return (
      <>
        <button
          className={`btn btn-primary ${sizeClass} ${className}`}
          type="button"
          onClick={() => setAskPrivate(true)}
        >
          Ask to join
        </button>
        <style jsx>{joinButtonCss}</style>
      </>
    );
  }

  return (
    <>
      <form action={(fd) => submit(fd)}>
        <input type="hidden" name="communityId" value={communityId} />
        <button
          type="submit"
          className={`btn btn-primary ${sizeClass} ${className}`}
          disabled={isPending}
        >
          {isPending ? "Joining..." : "Join group"}
        </button>
      </form>
      <style jsx>{joinButtonCss}</style>
    </>
  );
}

const joinButtonCss = `
  :global(.uf-join-btn-sm) {
    min-height: 36px;
    padding: 0 14px;
    font-size: 14px;
  }

  .uf-join-icon-gap {
    margin-left: 6px;
  }

  .uf-private-join-form {
    display: grid;
    grid-template-columns: minmax(170px, 1fr) auto auto;
    gap: 8px;
    align-items: center;
    width: 100%;
  }

  .uf-private-join-input {
    min-height: 36px;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 0 10px;
    font-size: 13px;
    outline: none;
    background: var(--bg-main);
    color: var(--text-primary);
  }

  @media (max-width: 640px) {
    .uf-private-join-form {
      grid-template-columns: 1fr;
    }
  }
`;
