import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import { Card } from "@/shared/ui/Card";

type QuickActionsProps = {
  t: (key: string) => string;
};

const ACTIONS = [
  { icon: "graduation", href: "/courses", label: "Open courses" },
  { icon: "message-circle", href: "/feed", label: "Write a post" },
  { icon: "help", href: "/feed?tab=questions", label: "Ask classmates" },
  { icon: "users", href: "/communities", label: "Join a group" },
  { icon: "upload", href: "/study-materials", label: "Upload notes" },
] as const;

export default function QuickActions({ t }: QuickActionsProps) {
  void t;
  return (
    <div className="dashboard-quick-actions" id="today-quick-actions">
      {ACTIONS.map((action) => (
        <Link key={action.href} href={action.href} className="dash-link-reset">
          <Card padding="sm" interactive className="dash-quick-action">
            <div className="dash-quick-action-icon">
              <UiIcon name={action.icon} size={18} />
            </div>
            <span className="dash-quick-action-label">{action.label}</span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
