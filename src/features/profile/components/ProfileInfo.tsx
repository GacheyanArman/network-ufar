"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ProfileInfo({
  email,
  friendsCount,
  followingCount,
  isOwn = false,
}: {
  email?: string | null;
  friendsCount?: number;
  followingCount?: number;
  isOwn?: boolean;
}) {
  const { language } = useLanguage();

  return (
    <>
      {email ? (
        <div className="uf-profile-info-row">
          <span className="uf-inline-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </span>
          <p>{email}</p>
        </div>
      ) : null}

      {friendsCount !== undefined ? (
        isOwn ? (
          <Link href="/friends" className="uf-profile-info-row clickable">
            <span className="uf-inline-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
            <p>{friendsCount} friends</p>
          </Link>
        ) : (
          <div className="uf-profile-info-row">
            <span className="uf-inline-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
            <p>{friendsCount} friends</p>
          </div>
        )
      ) : null}

      {followingCount !== undefined ? (
        isOwn ? (
          <Link href="/friends" className="uf-profile-info-row clickable">
            <span className="uf-inline-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <polyline points="17 11 19 13 23 9"/>
              </svg>
            </span>
            <p>{followingCount} following</p>
          </Link>
        ) : (
          <div className="uf-profile-info-row">
            <span className="uf-inline-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <polyline points="17 11 19 13 23 9"/>
              </svg>
            </span>
            <p>{followingCount} following</p>
          </div>
        )
      ) : null}
    </>
  );
}
