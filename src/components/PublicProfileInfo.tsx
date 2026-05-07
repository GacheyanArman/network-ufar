"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { getGenderLabel, getRelationshipStatusLabel } from "@/lib/profile-utils";

type PublicProfileInfoProps = {
  email: string;
  friendsCount: number;
  communitiesCount: number;
  photosCount: number;
  gender?: string | null;
  relationshipStatus?: string | null;
  birthDate?: Date | null;
};

export default function PublicProfileInfo({
  email,
  friendsCount,
  communitiesCount,
  photosCount,
  gender,
  relationshipStatus,
  birthDate
}: PublicProfileInfoProps) {
  const { language } = useLanguage();

  return (
    <div className="public-profile-info">
      <div>
        <span>✉️</span>
        <p>{email}</p>
      </div>

      {gender ? (
        <div>
          <span>👤</span>
          <p>{getGenderLabel(gender, language)}</p>
        </div>
      ) : null}

      {relationshipStatus ? (
        <div>
          <span>❤️</span>
          <p>{getRelationshipStatusLabel(relationshipStatus, language)}</p>
        </div>
      ) : null}

      {birthDate ? (
        <div>
          <span>🎂</span>
          <p>{new Date(birthDate).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
          })}</p>
        </div>
      ) : null}

      <div>
        <span>👥</span>
        <p>{friendsCount} friends</p>
      </div>

      <div>
        <span>🤝</span>
        <p>{communitiesCount} communities</p>
      </div>

      <div>
        <span>🖼️</span>
        <p>{photosCount} public photos</p>
      </div>
    </div>
  );
}
