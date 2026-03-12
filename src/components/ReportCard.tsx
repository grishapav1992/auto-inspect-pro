import { CarReport } from "@/types/report";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Calendar, Gauge, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const verdictConfig = {
  recommended: { label: "Рекомендован", className: "bg-success text-success-foreground" },
  not_recommended: { label: "Не рекомендован", className: "bg-destructive text-destructive-foreground" },
  with_reservations: { label: "С оговорками", className: "bg-warning text-warning-foreground" },
};

interface Props {
  report: CarReport;
  index: number;
}

const ReportCard = ({ report, index }: Props) => {
  const navigate = useNavigate();
  const verdict = verdictConfig[report.verdict];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <Card
        onClick={() => navigate(`/report/${report.id}`)}
        className="cursor-pointer overflow-hidden border-border/60 bg-card p-4 transition-all active:scale-[0.98] hover:shadow-md"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                {report.brand} {report.model}
              </h3>
              <Badge className={`${verdict.className} text-[10px] font-semibold px-2 py-0.5 border-0`}>
                {verdict.label}
              </Badge>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-muted-foreground">
              <span className="flex items-center gap-1 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                {report.year}
              </span>
              <span className="flex items-center gap-1 text-xs">
                <Gauge className="h-3.5 w-3.5" />
                {report.mileage.toLocaleString("ru-RU")} км
              </span>
              <span className="flex items-center gap-1 text-xs">
                <Car className="h-3.5 w-3.5" />
                {report.color}
              </span>
            </div>

            <p className="mt-2 text-sm font-semibold text-foreground">
              {report.price.toLocaleString("ru-RU")} ₽
            </p>
          </div>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground/50" />
        </div>
      </Card>
    </motion.div>
  );
};

export default ReportCard;
