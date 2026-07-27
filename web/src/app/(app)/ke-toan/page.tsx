import Link from "next/link";
import { format, addMonths, endOfMonth, isSameMonth } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ArrowDownRight,
  Scale,
  Wallet,
  HandCoins,
  Lock,
  AlertTriangle,
  Users,
} from "lucide-react";
import { requireCap } from "@/lib/auth";
import { userCan } from "@/lib/permissions";
import { getMonthlyAccounting } from "@/lib/accounting";
import { STANDARD_DAYS_DEFAULT } from "@/lib/payroll";
import { ROLE_LABELS } from "@/lib/rbac";
import { formatVND } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { PAYMENT_LABEL } from "@/lib/status";
import { categoryLabel } from "@/lib/finance";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportMenu } from "@/components/ui/export-menu";
import { buttonVariants } from "@/components/ui/button";
import {
  PayAllButton,
  PayStaffButton,
  UndoStaffButton,
  PayCtvButton,
  UndoCtvButton,
  ClosePeriodButton,
  ReopenPeriodButton,
} from "./accounting-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kế toán" };

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; d?: string }>;
}) {
  const user = await requireCap("mod:ke-toan");
  const canPay = userCan(user, "accounting.pay");
  const canClose = userCan(user, "accounting.close");
  const sp = await searchParams;

  const parsed = sp.m ? new Date(`${sp.m}-01T00:00:00`) : new Date();
  const monthDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const standardDays = Math.max(1, Math.min(31, Number(sp.d) || STANDARD_DAYS_DEFAULT));
  const a = await getMonthlyAccounting(monthDate, standardDays);

  const monthKey = a.monthKey;
  const prevMonth = format(addMonths(monthDate, -1), "yyyy-MM");
  const nextMonth = format(addMonths(monthDate, 1), "yyyy-MM");
  // Ngày ghi sổ mặc định: cuối tháng lương, nhưng không vượt quá hôm nay.
  const now = new Date();
  const defaultPayDate = format(isSameMonth(monthDate, now) ? now : endOfMonth(monthDate), "yyyy-MM-dd");

  const unpaidStaff = a.payroll.rows.filter((r) => !r.cashTxId && r.total > 0);
  const unpaidTotal = unpaidStaff.reduce((s, r) => s + r.total, 0);
  const staffRows = a.payroll.rows.filter((r) => r.total > 0 || r.daysWorked > 0);

  // Cảnh báo lệch: phiếu chi lương/hoa hồng nhập tay ở Sổ thu chi mà không gắn với bảng lương.
  const salaryGap = a.cash.salaryPosted - a.salary.paid;
  const ctvGap = a.cash.commissionPosted - a.commission.paid;

  const pnlRows: { label: string; value: number; hint?: string; kind?: "in" | "out" | "total" }[] = [
    { label: "Doanh thu dịch vụ (khách đã trả)", value: a.pnl.serviceRevenue, hint: "Tổng các khoản thu trên hồ sơ điều trị", kind: "in" },
    { label: "Thu khác", value: a.pnl.otherIncome, hint: "Bán sản phẩm, hoàn tiền NCC… (không tính khoản ứng từ doanh thu)", kind: "in" },
    { label: "Chi vận hành", value: -a.pnl.operatingExpense, hint: "Vật tư, mặt bằng, điện nước, marketing…", kind: "out" },
    { label: "Chi lương nhân viên", value: -a.pnl.salaryExpense, hint: `Bảng lương tháng ${format(monthDate, "MM/yyyy")}`, kind: "out" },
    { label: "Hoa hồng cộng tác viên", value: -a.pnl.ctvCommission, hint: "Cộng từ hoa hồng ghi trong từng hồ sơ", kind: "out" },
    { label: "LÃI / LỖ", value: a.pnl.profit, kind: "total" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kế toán"
        description="Gộp doanh thu, thu chi và lương về một bảng kết quả kinh doanh — chốt sổ một lần mỗi tháng."
        icon={<Calculator className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <form method="GET" className="flex items-center gap-2">
              <input
                type="month"
                name="m"
                defaultValue={monthKey}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
              />
              <input
                type="number"
                name="d"
                defaultValue={standardDays}
                min={1}
                max={31}
                title="Ngày công chuẩn/tháng"
                className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm focus:border-brand-400 focus:outline-none"
              />
              <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">Xem</button>
            </form>
            <ExportMenu
              excelHref={`/ke-toan/export?format=xlsx&m=${monthKey}&d=${standardDays}`}
              wordHref={`/ke-toan/export?format=doc&m=${monthKey}&d=${standardDays}`}
            />
            {canClose &&
              (a.closed ? <ReopenPeriodButton month={monthKey} /> : <ClosePeriodButton month={monthKey} standardDays={standardDays} profit={a.pnl.profit} />)}
          </div>
        }
      />

      {/* Điều hướng tháng */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/ke-toan?m=${prevMonth}&d=${standardDays}`} className={buttonVariants({ variant: "secondary", size: "icon" })} aria-label="Tháng trước">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-semibold capitalize text-slate-800">{format(monthDate, "'Tháng' MM/yyyy", { locale: vi })}</span>
        <Link href={`/ke-toan?m=${nextMonth}&d=${standardDays}`} className={buttonVariants({ variant: "secondary", size: "icon" })} aria-label="Tháng sau">
          <ChevronRight className="h-4 w-4" />
        </Link>
        {a.closed && (
          <Badge tone="green">
            <Lock className="h-3 w-3" /> Đã chốt sổ {a.period?.closedAt ? `· ${fmtDate(a.period.closedAt)}` : ""}
            {a.period?.closedBy?.fullName ? ` · ${a.period.closedBy.fullName}` : ""}
          </Badge>
        )}
      </div>

      {a.closed && a.period?.note && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Ghi chú chốt sổ: {a.period.note}</p>
      )}

      {/* Thẻ số liệu chính */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Doanh thu dịch vụ" value={formatVND(a.pnl.serviceRevenue)} sub="Tiền khách đã thanh toán" icon={<TrendingUp className="h-5 w-5" />} tone="green" />
        <StatCard label="Tổng chi" value={formatVND(a.pnl.totalExpense)} sub="Vận hành + lương + hoa hồng" icon={<ArrowDownRight className="h-5 w-5" />} tone="pink" />
        <StatCard
          label="Lãi / Lỗ"
          value={formatVND(a.pnl.profit)}
          sub={`Tỷ suất ${a.pnl.margin}% trên tổng thu`}
          icon={<Scale className="h-5 w-5" />}
          tone={a.pnl.profit >= 0 ? "brand" : "red"}
        />
        <StatCard
          label="Công nợ khách"
          value={formatVND(a.debt.outstanding)}
          sub={`Phát sinh trong tháng ${formatVND(a.debt.newInMonth)}`}
          icon={<Users className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      {/* Bảng kết quả kinh doanh */}
      <Card>
        <CardHeader>
          <CardTitle>Kết quả kinh doanh — {format(monthDate, "MM/yyyy")}</CardTitle>
          <span className="text-xs text-slate-400">Lương &amp; hoa hồng lấy từ bảng lương; các phiếu chi lương trong sổ thu chi không bị cộng thêm lần nữa.</span>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Khoản mục</TH>
                <TH className="text-right">Số tiền</TH>
              </TR>
            </THead>
            <tbody>
              {pnlRows.map((r) => {
                const isTotal = r.kind === "total";
                return (
                  <TR key={r.label} className={isTotal ? "bg-slate-50/70" : undefined}>
                    <TD>
                      <span className={isTotal ? "font-semibold text-slate-900" : "text-slate-700"}>{r.label}</span>
                      {r.hint && <p className="text-xs text-slate-400">{r.hint}</p>}
                    </TD>
                    <TD
                      className={`text-right tabular-nums ${
                        isTotal
                          ? `text-base font-bold ${r.value >= 0 ? "text-emerald-600" : "text-rose-600"}`
                          : r.kind === "in"
                            ? "font-medium text-emerald-600"
                            : "font-medium text-rose-600"
                      }`}
                    >
                      {formatVND(r.value)}
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
          {a.cash.transferIn > 0 && (
            <p className="mt-3 text-xs text-slate-400">
              Ngoài ra có {formatVND(a.cash.transferIn)} “ứng từ doanh thu để chi trả” — chỉ là luân chuyển tiền nên
              không tính vào thu nhập.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Đối chiếu thực thu + chi theo hạng mục */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Đối chiếu thực thu theo hình thức</CardTitle>
            <span className="text-xs text-slate-400">Dùng để khớp tiền mặt tại quầy với sao kê ngân hàng.</span>
          </CardHeader>
          <CardContent className="pt-0">
            {a.revenueByMethod.length === 0 ? (
              <EmptyState title="Chưa có khoản thu nào trong tháng" />
            ) : (
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Hình thức</TH>
                    <TH className="text-center">Số lượt</TH>
                    <TH className="text-right">Số tiền</TH>
                  </TR>
                </THead>
                <tbody>
                  {a.revenueByMethod.map((m) => (
                    <TR key={m.method}>
                      <TD className="font-medium text-slate-700">{PAYMENT_LABEL[m.method]}</TD>
                      <TD className="text-center tabular-nums text-slate-500">{m.count}</TD>
                      <TD className="text-right font-semibold tabular-nums text-emerald-600">{formatVND(m.amount)}</TD>
                    </TR>
                  ))}
                  <TR className="bg-slate-50/70">
                    <TD className="font-semibold text-slate-900">Tổng thực thu</TD>
                    <TD />
                    <TD className="text-right font-bold tabular-nums text-slate-900">{formatVND(a.pnl.serviceRevenue)}</TD>
                  </TR>
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chi theo hạng mục</CardTitle>
            <span className="text-xs text-slate-400">Gồm cả phiếu chi lương / hoa hồng đã ghi sổ.</span>
          </CardHeader>
          <CardContent className="pt-0">
            {a.cash.expenseByCategory.length === 0 ? (
              <EmptyState title="Chưa có khoản chi nào trong tháng" description="Ghi nhận chi phí ở Sổ thu chi." />
            ) : (
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Hạng mục</TH>
                    <TH className="text-right">Số tiền</TH>
                  </TR>
                </THead>
                <tbody>
                  {a.cash.expenseByCategory.map((c) => (
                    <TR key={c.code}>
                      <TD className="font-medium text-slate-700">{categoryLabel(c.code)}</TD>
                      <TD className="text-right font-semibold tabular-nums text-rose-600">{formatVND(c.amount)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
            <p className="mt-3 text-xs text-slate-400">
              <Link href={`/thu-chi?month=${monthKey}`} className="text-brand-600 hover:underline">
                Mở Sổ thu chi tháng này →
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cảnh báo lệch sổ */}
      {(salaryGap !== 0 || ctvGap !== 0) && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Sổ thu chi có phiếu lương/hoa hồng nhập tay chưa khớp bảng lương</p>
            {salaryGap !== 0 && (
              <p className="mt-0.5 text-xs">
                Lương: sổ thu chi ghi {formatVND(a.cash.salaryPosted)} · bảng lương đánh dấu đã chi {formatVND(a.salary.paid)} (lệch{" "}
                {formatVND(Math.abs(salaryGap))}).
              </p>
            )}
            {ctvGap !== 0 && (
              <p className="mt-0.5 text-xs">
                Hoa hồng CTV: sổ thu chi ghi {formatVND(a.cash.commissionPosted)} · đã đánh dấu chi {formatVND(a.commission.paid)} (lệch{" "}
                {formatVND(Math.abs(ctvGap))}).
              </p>
            )}
            <p className="mt-1 text-xs">
              Lãi/Lỗ luôn tính theo <strong>bảng lương</strong> nên không bị cộng trùng. Nên xóa phiếu nhập tay ở Sổ thu
              chi rồi bấm “Chi lương” tại đây để số liệu khớp nhau.
            </p>
          </div>
        </div>
      )}

      {/* Bảng lương + trạng thái chi */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <p className="font-semibold text-slate-800">Chi lương nhân viên — {format(monthDate, "MM/yyyy")}</p>
            <p className="text-xs text-slate-400">
              Phải trả {formatVND(a.salary.payable)} · Đã chi {formatVND(a.salary.paid)} · Còn lại{" "}
              <strong className={a.salary.remaining > 0 ? "text-rose-600" : "text-emerald-600"}>{formatVND(a.salary.remaining)}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/luong?m=${monthKey}&d=${standardDays}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Sửa bảng lương
            </Link>
            {canPay && !a.closed && (
              <PayAllButton month={monthKey} standardDays={standardDays} defaultDate={defaultPayDate} count={unpaidStaff.length} amount={unpaidTotal} />
            )}
          </div>
        </div>
        <CardContent className="overflow-x-auto pt-0">
          {staffRows.length === 0 ? (
            <EmptyState icon={<Wallet className="h-6 w-6" />} title="Chưa có dữ liệu lương tháng này" description="Chấm công và nhập hoa hồng/thưởng ở trang Lương." />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Nhân viên</TH>
                  <TH>Vai trò</TH>
                  <TH className="text-center">Ngày công</TH>
                  <TH className="text-right">Lương cứng</TH>
                  <TH className="text-right">Hoa hồng</TH>
                  <TH className="text-right">Thưởng/ĐC</TH>
                  <TH className="text-right">Phải trả</TH>
                  <TH>Trạng thái</TH>
                  {canPay && !a.closed && <TH />}
                </TR>
              </THead>
              <tbody>
                {staffRows.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <Link href={`/hieu-suat/${r.id}?m=${monthKey}`} className="font-medium text-slate-800 hover:text-brand-600 hover:underline">
                        {r.name}
                      </Link>
                    </TD>
                    <TD className="text-slate-500">{ROLE_LABELS[r.role]}</TD>
                    <TD className="text-center tabular-nums">
                      {r.daysWorked}/{standardDays}
                    </TD>
                    <TD className="text-right tabular-nums">{formatVND(r.baseActual)}</TD>
                    <TD className="text-right tabular-nums text-amber-600">{formatVND(r.commission)}</TD>
                    <TD className="text-right tabular-nums text-slate-600">{formatVND(r.bonus + r.adjustment)}</TD>
                    <TD className="text-right font-semibold tabular-nums text-slate-900">{formatVND(r.total)}</TD>
                    <TD>
                      {r.cashTxId ? (
                        <Badge tone="green">Đã chi{r.paidAt ? ` · ${fmtDate(r.paidAt)}` : ""}</Badge>
                      ) : r.total > 0 ? (
                        <Badge tone="amber">Chưa chi</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TD>
                    {canPay && !a.closed && (
                      <TD className="text-right">
                        {r.cashTxId ? (
                          <UndoStaffButton userId={r.id} name={r.name} month={monthKey} />
                        ) : r.total > 0 ? (
                          <PayStaffButton userId={r.id} name={r.name} month={monthKey} standardDays={standardDays} defaultDate={defaultPayDate} amount={r.total} />
                        ) : null}
                      </TD>
                    )}
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Hoa hồng cộng tác viên */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-accent-500" /> Hoa hồng cộng tác viên — {format(monthDate, "MM/yyyy")}
          </CardTitle>
          <span className="text-xs text-slate-400">
            Phải trả {formatVND(a.commission.payable)} · Đã chi {formatVND(a.commission.paid)} · Còn lại {formatVND(a.commission.remaining)}
          </span>
        </CardHeader>
        <CardContent className="pt-0">
          {a.ctv.length === 0 ? (
            <EmptyState title="Chưa có hoa hồng cộng tác viên" description="Nhập số tiền hoa hồng trong hồ sơ có nguồn khách là Cộng tác viên." />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Cộng tác viên</TH>
                  <TH className="text-right">Phải trả</TH>
                  <TH>Trạng thái</TH>
                  {canPay && !a.closed && <TH />}
                </TR>
              </THead>
              <tbody>
                {a.ctv.map((c) => (
                  <TR key={c.name}>
                    <TD className="font-medium text-slate-800">
                      <Link href={`/cong-tac-vien/${encodeURIComponent(c.name)}`} className="hover:text-brand-600 hover:underline">
                        {c.name}
                      </Link>
                    </TD>
                    <TD className="text-right font-semibold tabular-nums">{formatVND(c.amount)}</TD>
                    <TD>{c.isPaid ? <Badge tone="green">Đã chi</Badge> : <Badge tone="amber">Chưa chi</Badge>}</TD>
                    {canPay && !a.closed && (
                      <TD className="text-right">
                        {c.isPaid ? (
                          <UndoCtvButton name={c.name} month={monthKey} />
                        ) : (
                          <PayCtvButton name={c.name} month={monthKey} standardDays={standardDays} defaultDate={defaultPayDate} amount={c.amount} />
                        )}
                      </TD>
                    )}
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Công nợ phải thu */}
      <Card>
        <CardHeader>
          <CardTitle>Công nợ khách hàng cần thu</CardTitle>
          <span className="text-xs text-slate-400">Tổng còn nợ đến hiện tại: {formatVND(a.debt.outstanding)}</span>
        </CardHeader>
        <CardContent className="pt-0">
          {a.debt.top.length === 0 ? (
            <EmptyState title="Không còn công nợ" description="Tất cả hồ sơ đã thanh toán đủ." />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Khách hàng</TH>
                  <TH>Hồ sơ</TH>
                  <TH className="text-right">Còn nợ</TH>
                </TR>
              </THead>
              <tbody>
                {a.debt.top.map((d) => (
                  <TR key={d.id}>
                    <TD>
                      <Link href={`/khach-hang/${d.customer.id}`} className="font-medium text-slate-800 hover:text-brand-600 hover:underline">
                        {d.customer.fullName}
                      </Link>
                      <p className="text-xs text-slate-400">···{d.customer.phoneLast5}</p>
                    </TD>
                    <TD>
                      <Link href={`/ho-so/${d.id}`} className="text-slate-500 hover:text-brand-600 hover:underline">
                        {d.code}
                      </Link>
                    </TD>
                    <TD className="text-right font-semibold tabular-nums text-rose-600">{formatVND(d.debt)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
