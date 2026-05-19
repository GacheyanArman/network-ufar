"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { getGenderLabel, getRelationshipStatusLabel } from "@/features/profile/server/utils";

type ProfileAboutInfoProps = {
  gender?: string | null;
  relationshipStatus?: string | null;
};

export default function ProfileAboutInfo({ gender, relationshipStatus }: ProfileAboutInfoProps) {
  const { language, t } = useLanguage();

  return (
    <>
      <div className="uf-info-block">
        <span>{t("profile.gender")}</span>
        <strong>{gender ? getGenderLabel(gender, language) : t("profile.genderOptions.prefer_not_to_say")}</strong>
      </div>
      <div className="uf-info-block">
        <span>{t("profile.relationshipStatus")}</span>
        <strong>{relationshipStatus ? getRelationshipStatusLabel(relationshipStatus, language) : t("profile.relationshipOptions.prefer_not_to_say")}</strong>
      </div>
    </>
  );
}
