"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { getGenderLabel, getRelationshipStatusLabel } from "@/lib/profile-utils";

type ProfileInfoProps = {
  gender?: string | null;
  relationshipStatus?: string | null;
  email?: string | null;
  birthDate?: Date | null;
  friendsCount?: number;
  followingCount?: number;
};

export default function ProfileInfo({ gender, relationshipStatus, email, birthDate, friendsCount, followingCount }: ProfileInfoProps) {
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

      <div className="uf-profile-info-row">
        <span className="uf-inline-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </span>
        <p>{getGenderLabel(gender, language)}</p>
      </div>

      <div className="uf-profile-info-row">
        <span className="uf-inline-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </span>
        <p>{getRelationshipStatusLabel(relationshipStatus, language)}</p>
      </div>

      {birthDate ? (
        <div className="uf-profile-info-row">
          <span className="uf-inline-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </span>
          <p>{new Date(birthDate).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
          })}</p>
        </div>
      ) : null}

      {friendsCount !== undefined ? (
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
      ) : null}

      {followingCount !== undefined ? (
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
      ) : null}
    </>
  );
}
