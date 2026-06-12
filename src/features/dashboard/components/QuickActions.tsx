import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import { Card } from "@/shared/ui/Card";

type QuickActionsProps = {
  t: (key: string) => string;
};

const ACTIONS = [
  { icon: "help", href: "/feed?filter=questions", label: "Ask classmates" },
  { icon: "upload", href: "/study-materials", label: "Upload material" },
  { icon: "users", href: "/communities?tab=my", label: "Open my groups" },
  { icon: "message-circle", href: "/messages", label: "Check messages" },
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
