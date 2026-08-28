"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  Bot,
  CheckSquare,
  Users,
  Calendar,
  FileText,
  DollarSign,
  Sparkles,
  Command,
  ArrowRight,
  ShieldAlert,
  Zap,
} from "lucide-react";

type WorkspaceItem = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type Props = {
  workspaces?: WorkspaceItem[];
  userRole?: string;
};

type PaletteAction = {
  id: string;
  title: string;
  category: "WORKSPACE" | "ACTION" | "AI_PROMPT" | "NAVIGATION";
  description?: string;
  icon: React.ReactNode;
  href?: string;
  onSelect?: () => void;
  badge?: string;
};

export function V2CommandPalette({ workspaces = [], userRole }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Global Keybinding Listener: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const actions: PaletteAction[] = useMemo(() => {
    const list: PaletteAction[] = [
      // Quick Navigation
      {
        id: "nav-internal",
        title: "Workspace: Phòng khám Nội Bộ",
        category: "WORKSPACE",
        description: "Hệ thống vận hành phòng khám & hồ sơ điều trị",
        icon: <Building2 className="h-4 w-4 text-emerald-600" />,
        href: "/dashboard",
        badge: "INTERNAL",
      },
      {
        id: "nav-ai-assistant",
        title: "Mở Trợ Lý AI Điều Hành",
        category: "NAVIGATION",
        description: "Chat trực tiếp với AI trợ lý theo ngữ cảnh",
        icon: <Bot className="h-4 w-4 text-violet-600" />,
        href: "/tro-ly",
        badge: "AI",
      },
      {
        id: "nav-projects",
        title: "Quản Lý Công Ty & Đơn Vị (V2)",
        category: "NAVIGATION",
        description: "Danh sách toàn bộ công ty con, chi nhánh và dự án",
        icon: <Building2 className="h-4 w-4 text-indigo-600" />,
        href: "/du-an",
        badge: "HQ",
      },
    ];

    // Global Admin Extra Controls
    if (userRole === "ADMIN") {
      list.push(
        {
          id: "nav-global-ai",
          title: "Bảng Điều Khiển AI Tổng (Control Plane)",
          category: "NAVIGATION",
          description: "Giám sát sức khỏe toàn bộ AI Agents, Job Queue và Audit",
          icon: <Sparkles className="h-4 w-4 text-violet-600" />,
          href: "/he-thong/ai-tong",
          badge: "ADMIN",
        },
        {
          id: "nav-cross-org-approvals",
          title: "Trung Tâm Phê Duyệt Hệ Thống",
          category: "NAVIGATION",
          description: "Duyệt đề nghị thanh toán, cơ chế lương và đề xuất",
          icon: <ShieldAlert className="h-4 w-4 text-amber-600" />,
          href: "/phe-duyet",
          badge: "APPROVAL",
        }
      );
    }

    // Projects Workspace Switcher items
    workspaces.forEach((p) => {
      list.push({
        id: `workspace-${p.id}`,
        title: `Chuyển sang: ${p.name}`,
        category: "WORKSPACE",
        description: `Mã: ${p.code} · Trạng thái: ${p.status}`,
        icon: <Building2 className="h-4 w-4 text-brand-600" />,
        href: `/du-an/${p.id}`,
        badge: p.code,
      });
    });

    // Quick Actions
    list.push(
      {
        id: "act-create-task",
        title: "Tạo Công Việc / Task Mới",
        category: "ACTION",
        description: "Giao việc nhanh cho nhân sự hoặc bộ phận",
        icon: <CheckSquare className="h-4 w-4 text-blue-600" />,
        href: "/ke-hoach",
      },
      {
        id: "act-payment-req",
        title: "Lập Đề Nghị Thanh Toán",
        category: "ACTION",
        description: "Gửi đề nghị chi tiền qua cổng phê duyệt",
        icon: <DollarSign className="h-4 w-4 text-emerald-600" />,
        href: "/thu-chi",
      },
      {
        id: "act-payroll-export",
        title: "Xem Bảng Lương & Hoa Hồng",
        category: "ACTION",
        description: "Đối soát thu nhập, công nhật và thưởng",
        icon: <FileText className="h-4 w-4 text-amber-600" />,
        href: "/luong",
      }
    );

    // AI Quick Inquiries
    list.push(
      {
        id: "ai-kpi-summary",
        title: "Hỏi AI: Tổng hợp KPI toàn hệ sinh thái",
        category: "AI_PROMPT",
        description: "Xem nhanh doanh thu, số khách và tiến độ task giữa các đơn vị",
        icon: <Sparkles className="h-4 w-4 text-violet-600" />,
        href: "/tro-ly?q=Tong+hop+KPI+toan+he+sinh+thai",
        badge: "L1 READ",
      },
      {
        id: "ai-health-check",
        title: "Hỏi AI: Kiểm tra sức khỏe hệ thống & AI Jobs",
        category: "AI_PROMPT",
        description: "Kiểm tra hàng đợi ZAiJob và heartbeat các agent",
        icon: <Zap className="h-4 w-4 text-amber-600" />,
        href: "/tro-ly?q=Kiem+tra+tinh+trang+suc+khoe+AI+va+hang+doi+job",
        badge: "L1 READ",
      }
    );

    return list;
  }, [workspaces, userRole]);

  // Filtered items based on user search
  const filteredActions = useMemo(() => {
    if (!search.trim()) return actions;
    const term = search.toLowerCase();
    return actions.filter(
      (a) =>
        a.title.toLowerCase().includes(term) ||
        a.description?.toLowerCase().includes(term) ||
        a.badge?.toLowerCase().includes(term)
    );
  }, [actions, search]);

  const handleSelect = (action: PaletteAction) => {
    setIsOpen(false);
    setSearch("");
    if (action.onSelect) action.onSelect();
    if (action.href) router.push(action.href);
  };

  // Keyboard navigation within the palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        handleSelect(filteredActions[selectedIndex]);
      }
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition shadow-sm"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Tìm kiếm nhanh / Chuyển đơn vị...</span>
        <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 shadow-2xs">
          Ctrl K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-xs p-4 sm:p-6 md:p-20 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-slate-100 px-4 py-3.5">
          <Search className="h-5 w-5 text-violet-600" />
          <input
            autoFocus
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Gõ tên đơn vị, tác vụ, hoặc lệnh AI (VD: 'Chi nhánh', 'Bảng lương', 'KPI')..."
            className="w-full bg-transparent px-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-mono font-bold text-slate-500">
            ESC
          </kbd>
        </div>

        {/* Action List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Không tìm thấy lệnh hoặc đơn vị nào khớp với “{search}”.
            </div>
          ) : (
            filteredActions.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 transition ${
                    isSelected
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? "text-white" : "text-slate-900"}`}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className={`text-xs truncate ${isSelected ? "text-violet-100" : "text-slate-500"}`}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isSelected && <ArrowRight className="h-4 w-4 text-white" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Di chuyển</span>
            <span>↵ Chọn</span>
            <span>ESC Đóng</span>
          </div>
          <span>ZenithTasks Universal Command Center</span>
        </div>
      </div>
    </div>
  );
}
