import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
} from "@/components/ui";
import type { AppRoutePath } from "@/types";

export interface ShellModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  statusLabel?: string;
  actionLabel?: string;
  actionTo?: AppRoutePath;
  children?: ReactNode;
}

export function ShellModuleCard({
  title,
  description,
  icon: Icon,
  statusLabel = "Shell Ready",
  actionLabel,
  actionTo,
  children,
}: ShellModuleCardProps) {
  return (
    <Card interactive className="flex flex-col justify-between">
      <div>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <Badge variant="emerald" dot>
            {statusLabel}
          </Badge>
        </CardHeader>

        <CardContent className="pt-4">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="mt-1.5">{description}</CardDescription>
          {children && <div className="mt-4">{children}</div>}
        </CardContent>
      </div>

      {actionLabel && actionTo && (
        <CardFooter className="bg-[#F8F9FC]/60 rounded-b-2xl">
          <Link to={actionTo} className="w-full">
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              className="justify-between px-1 text-[#0F172A] hover:bg-transparent hover:text-[#6D28D9]"
              rightIcon={<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              {actionLabel}
            </Button>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
