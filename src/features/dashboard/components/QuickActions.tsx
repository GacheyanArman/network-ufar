import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import { Card } from "@/shared/ui/Card";

type QuickActionsProps = {
  t: (key: string) => string;
};

const ACTIONS = [
  { icon: "plus-circle", href: "/calendar",                labelKey: "today.addDeadline" },
  { icon: "calendar",    href: "/schedule",                labelKey: "today.openSchedule" },
  { icon: "message-circle", href: "/feed?tab=questions",   labelKey: "today.askClassmates" },
  { icon: "upload",      href: "/study-materials",         labelKey: "today.uploadNotes" },
  { icon: "users",       href: "/study-groups",            labelKey: "today.findStudyGroup" },
] as const;

export default function QuickActions({ t }: QuickActionsProps) {
  return (
    <div className="dashboard-quick-actions" id="today-quick-actions">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="dash-link-reset"
        >
          <Card padding="sm" interactive className="dash-quick-action">
            <div className="dash-quick-action-icon">
              <UiIcon name={action.icon} size={18} />
            </div>
            <span className="dash-quick-action-label">
              {t(action.labelKey)}
            </span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
