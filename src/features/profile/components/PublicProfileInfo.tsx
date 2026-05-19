"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { getGenderLabel, getRelationshipStatusLabel } from "@/features/profile/server/utils";

type PublicProfileInfoProps = {
  email: string;
  friendsCount: number;
  communitiesCount: number;
  photosCount: number;
};

export default function PublicProfileInfo({
  email,
  friendsCount,
  communitiesCount,
  photosCount
}: PublicProfileInfoProps) {
  const { language } = useLanguage();

  return (
    <div className="public-profile-info">
      <div>
        <span>✉️</span>
        <p>{email}</p>
      </div>



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
