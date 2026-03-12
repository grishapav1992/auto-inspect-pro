import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FileText, Star, LogOut, Settings, ChevronRight } from "lucide-react";
import { MOCK_REPORTS } from "@/types/report";

const Profile = () => {
  const stats = [
    { label: "Отчётов", value: MOCK_REPORTS.length, icon: FileText },
    { label: "Рекомендовано", value: MOCK_REPORTS.filter((r) => r.verdict === "recommended").length, icon: Star },
  ];

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50 px-4 pb-3 pt-12">
        <h1 className="text-lg font-semibold text-foreground">Профиль</h1>
      </header>

      <div className="space-y-3 px-4 pt-4">
        {/* User Card */}
        <Card className="flex items-center gap-4 p-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
              АП
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Алексей Петров</h2>
            <p className="text-xs text-muted-foreground">Эксперт по автоподбору</p>
            <Badge variant="secondary" className="mt-1">PRO</Badge>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-3.5 text-center">
              <stat.icon className="mx-auto h-4 w-4 text-muted-foreground" />
              <p className="mt-1 text-lg font-semibold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Menu */}
        <Card className="divide-y divide-border overflow-hidden">
          {[
            { icon: Settings, label: "Настройки" },
            { icon: LogOut, label: "Выйти" },
          ].map((item) => (
            <button
              key={item.label}
              className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-foreground transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </button>
          ))}
        </Card>
      </div>
    </div>
  );
};

export default Profile;
