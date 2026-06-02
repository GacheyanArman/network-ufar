import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/Layout";
import { Button } from "@/shared/ui/Button";
import type { MaterialItem } from "../server/today-utils";
import { safeMaterialType } from "../server/today-utils";

type MaterialsListProps = {
  materials: MaterialItem[];
  hasCourses: boolean;
  lang: string;
  t: (key: string) => string;
};

export default function MaterialsList({
  materials,
  hasCourses,
  lang,
  t,
}: MaterialsListProps) {
  const visible = materials.slice(0, 3);

  return (
    <section className="dashboard-section" id="today-materials">
      <div className="dash-section-head">
        <h2 className="dash-section-title">
          <UiIcon name="folder" size={20} color="var(--french-gold)" />{" "}
          {t("today.newMaterials")}
        </h2>
        <Link href="/study-materials" className="dash-view-all">
          {t("today.viewAll")}
        </Link>
      </div>

      {visible.length > 0 ? (
        <div className="dash-list">
          {visible.map((m) => (
            <Link
              key={m.id}
              href={`/study-materials`}
              className="dash-link-reset"
            >
              <Card padding="sm" interactive>
                <div className="dash-material-row">
                  <div className="dash-material-icon">
                    <UiIcon name="file-text" size={18} />
                  </div>
                  <div className="dash-material-meta">
                    <div className="dash-material-title">{m.title}</div>
                    <div className="dash-material-sub">
                      <span className="dash-accent">
                        {m.courseCode || "General"}
                      </span>{" "}
                      &bull; {safeMaterialType(m.type, lang)}
                    </div>
                  </div>
                  <UiIcon
                    name="chevron-right"
                    size={18}
                    color="var(--text-muted)"
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card padding="md">
          <EmptyState
            icon="folder"
            title={t("today.noMaterials")}
            description={
              hasCourses
                ? undefined
                : t("today.noCourses") || "You haven\u2019t enrolled in any courses yet"
            }
            action={
              <Link
                href={hasCourses ? "/study-materials" : "/courses?tab=enroll"}
              >
                <Button variant="outline" size="sm">
                  {hasCourses
                    ? t("emptyStates.materials.browse")
                    : t("today.enrollCourses") || "Enroll in courses"}
                </Button>
              </Link>
            }
          />
        </Card>
      )}
    </section>
  );
}
