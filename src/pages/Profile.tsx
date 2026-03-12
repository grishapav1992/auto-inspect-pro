import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FileText, Star, LogOut, Settings, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { MOCK_REPORTS } from "@/types/report";

const Profile = () => {
  const stats = [
    { label: "Отчётов", value: MOCK_REPORTS.length, icon: FileText },
    { label: "Рекомендовано", value: MOCK_REPORTS.filter((r) => r.verdict === "recommended").length, icon: Star },
  ];

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-background/80 backdrop-blur-xl px-4 pb-4 pt-12">
        <h1 className="text-2xl font-extrabold text-foreground">Профиль</h1>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 px-4"
      >
        {/* User Card */}
        <Card className="flex items-center gap-4 border-border/60 p-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
              АП
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-base font-bold text-foreground">Алексей Петров</h2>
            <p className="text-xs text-muted-foreground">Эксперт по автоподбору</p>
            <Badge variant="secondary" className="mt-1 text-[10px]">PRO</Badge>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-border/60 p-4 text-center">
              <stat.icon className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-1 text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Menu */}
        <Card className="divide-y divide-border border-border/60">
          {[
            { icon: Settings, label: "Настройки" },
            { icon: LogOut, label: "Выйти" },
          ].map((item) => (
            <button
              key={item.label}
              className="flex w-full items-center justify-between p-4 text-sm text-foreground transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </button>
          ))}
        </Card>
      </motion.div>
    </div>
  );
};

export default Profile;
