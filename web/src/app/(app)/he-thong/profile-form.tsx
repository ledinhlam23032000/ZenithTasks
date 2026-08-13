"use client";

import { useActionState } from "react";
import { Input, Label, Textarea } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { saveClinicProfile, type ClinicConfigState } from "./actions";
import type { ClinicConfig } from "@/lib/clinic-config";

export function ClinicProfileForm({ config }: { config: ClinicConfig }) {
  const [state, action, pending] = useActionState<ClinicConfigState, FormData>(saveClinicProfile, {});
  return (
    <form action={action} className="grid gap-5 md:grid-cols-2">
      <div><Label htmlFor="brandName">Tên thương hiệu</Label><Input id="brandName" name="brandName" defaultValue={config.brandName} required /></div>
      <div><Label htmlFor="legalName">Tên pháp lý</Label><Input id="legalName" name="legalName" defaultValue={config.legalName} required /></div>
      <div><Label htmlFor="hotline">Hotline</Label><Input id="hotline" name="hotline" defaultValue={config.hotline} /></div>
      <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={config.email} /></div>
      <div><Label htmlFor="address">Địa chỉ</Label><Input id="address" name="address" defaultValue={config.address} /></div>
      <div><Label htmlFor="website">Website</Label><Input id="website" name="website" defaultValue={config.website} /></div>
      <div><Label htmlFor="logoUrl">URL logo</Label><Input id="logoUrl" name="logoUrl" defaultValue={config.logoUrl} placeholder="/uploads/logo.png" /></div>
      <div><Label htmlFor="faviconUrl">URL favicon</Label><Input id="faviconUrl" name="faviconUrl" defaultValue={config.faviconUrl} /></div>
      <div><Label htmlFor="primaryColor">Màu chính</Label><Input id="primaryColor" name="primaryColor" type="color" defaultValue={config.primaryColor} className="h-10 p-1" /></div>
      <div><Label htmlFor="secondaryColor">Màu phụ</Label><Input id="secondaryColor" name="secondaryColor" type="color" defaultValue={config.secondaryColor} className="h-10 p-1" /></div>
      <div><Label htmlFor="workingDays">Ngày làm việc</Label><Input id="workingDays" name="workingDays" defaultValue={config.workingDays} /></div>
      <div><Label htmlFor="bookingHours">Khung giờ đặt lịch</Label><Input id="bookingHours" name="bookingHours" defaultValue={config.bookingHours} /></div>
      <div className="md:col-span-2"><Label htmlFor="portalGreeting">Lời chào cổng khách hàng</Label><Textarea id="portalGreeting" name="portalGreeting" defaultValue={config.portalGreeting} /></div>
      <div className="md:col-span-2"><Label htmlFor="privacyPolicy">Chính sách bảo mật ngắn</Label><Textarea id="privacyPolicy" name="privacyPolicy" defaultValue={config.privacyPolicy} /></div>
      <div className="md:col-span-2"><Label htmlFor="serviceCatalog">Danh mục dịch vụ mặc định</Label><Textarea id="serviceCatalog" name="serviceCatalog" defaultValue={config.serviceCatalog} placeholder="Mỗi dòng một dịch vụ" /></div>
      <div className="md:col-span-2"><Label htmlFor="messageTemplates">Mẫu tin nhắn</Label><Textarea id="messageTemplates" name="messageTemplates" defaultValue={config.messageTemplates} /></div>
      <div className="flex items-center gap-3 md:col-span-2">
        <button type="submit" disabled={pending} className={buttonVariants({ size: "lg" })}>{pending ? "Đang lưu…" : "Lưu cấu hình"}</button>
        {state.ok && <span className="text-sm text-emerald-600">Đã lưu cấu hình.</span>}
        {state.error && <span className="text-sm text-rose-600">{state.error}</span>}
      </div>
    </form>
  );
}
