import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // min-w-0: Card nằm trong lưới/flex (vd `grid lg:grid-cols-2`) mặc định có
        // min-width:auto → nếu bên trong có bảng rộng (Table cuộn ngang riêng), cả
        // Card sẽ bị ép giãn theo bề rộng nội dung thay vì cuộn gọn bên trong, tràn
        // ngang trên mobile. min-w-0 không ảnh hưởng gì khi Card KHÔNG nằm trong
        // lưới/flex (giá trị mặc định vốn coi như 0 trong luồng khối bình thường).
        "min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold text-slate-800", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-slate-500", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pb-4 sm:px-5 sm:pb-5", className)} {...props} />;
}
