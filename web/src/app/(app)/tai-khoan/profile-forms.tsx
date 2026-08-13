"use client";

import { useRef, useState } from "react";
import { LoaderCircle, CheckCircle2, Camera, Save } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Input, Label } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { compressImage } from "@/lib/compress-image";
import { useFormAction } from "@/lib/use-form-action";
import { updateMyProfile, updateMyAvatar, changePassword } from "@/lib/account-actions";

function Saved({ nonce, ok }: { nonce?: number; ok?: boolean }) {
  if (!ok && !nonce) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
      <CheckCircle2 className="h-4 w-4" /> Đã lưu
    </span>
  );
}

export function AvatarUploader({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useFormAction(updateMyAvatar, () => {
    setPreview(null);
    formRef.current?.reset();
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("avatar");
    if (file instanceof File && file.size > 0) {
      setBusy(true);
      try {
        fd.set("avatar", await compressImage(file));
      } finally {
        setBusy(false);
      }
    }
    action(fd);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex items-center gap-5">
      <Avatar name={name} src={preview ?? avatarUrl} className="h-20 w-20 text-2xl" />
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          name="avatar"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <Camera className="h-4 w-4" /> Chọn ảnh
          </button>
          <button type="submit" disabled={pending || busy || !preview} className={buttonVariants({ size: "sm" })}>
            {(pending || busy) && <LoaderCircle className="h-4 w-4 animate-spin" />} {busy ? "Đang nén…" : "Lưu ảnh"}
          </button>
          <Saved ok={state.ok} nonce={state.nonce} />
        </div>
        <p className="text-xs text-slate-400">Ảnh JPG, PNG, WEBP hoặc ảnh từ điện thoại · tự nén cho nhẹ · tối đa 8MB.</p>
        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      </div>
    </form>
  );
}

export function ProfileInfoForm({ fullName, phone }: { fullName: string; phone: string }) {
  const [state, action, pending] = useFormAction(updateMyProfile);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="p-fullName">Họ và tên *</Label>
          <Input id="p-fullName" name="fullName" defaultValue={fullName} required />
        </div>
        <div>
          <Label htmlFor="p-phone">Số điện thoại nội bộ</Label>
          <Input id="p-phone" name="phone" inputMode="tel" defaultValue={phone} placeholder="09xx xxx xxx" />
        </div>
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="flex items-center justify-end gap-3">
        <Saved ok={state.ok} nonce={state.nonce} />
        <button type="submit" disabled={pending} className={buttonVariants()}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu thông tin
        </button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useFormAction(changePassword, () => formRef.current?.reset());

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="ch-current">Mật khẩu hiện tại</Label>
          <Input id="ch-current" name="current" type="password" autoComplete="current-password" required />
        </div>
        <div>
          <Label htmlFor="ch-next">Mật khẩu mới</Label>
          <Input id="ch-next" name="next" type="password" autoComplete="new-password" placeholder="Tối thiểu 12 ký tự" required />
        </div>
        <div>
          <Label htmlFor="ch-confirm">Xác nhận mật khẩu mới</Label>
          <Input id="ch-confirm" name="confirm" type="password" autoComplete="new-password" required />
        </div>
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="flex items-center justify-end gap-3">
        {state.ok && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Đã đổi mật khẩu
          </span>
        )}
        <button type="submit" disabled={pending} className={buttonVariants()}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Đổi mật khẩu
        </button>
      </div>
    </form>
  );
}
