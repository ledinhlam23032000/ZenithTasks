// Riêng cho khu vực cổng khách (`/khach/[token]`) — khi gọi notFound() (token không khớp
// bất kỳ khách nào) sẽ hiện trang NÀY thay vì trang 404 chung của khu vực quản trị (vốn có
// nút "Về trang tổng quan" dẫn tới màn đăng nhập nhân viên — vô nghĩa và gây bối rối với
// khách hàng, người ngoài hệ thống).
export const metadata = { title: "Liên kết không hợp lệ" };

export default function PortalNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-800">Liên kết không hợp lệ</p>
        <p className="mt-2 text-sm text-slate-500">
          Liên kết Quý khách vừa mở không đúng hoặc không còn tồn tại. Vui lòng liên hệ phòng khám
          (0941 567 496) để được cấp lại liên kết xem hồ sơ.
        </p>
      </div>
    </div>
  );
}
