# Brief — Vòng đời CTV và nhân viên

- Updated: 2026-08-23 GMT+7
- Goal: Đình chỉ/xóa mềm CTV hoặc nhân viên không làm mất dữ liệu; cho phép chuyển đổi CTV ↔ nhân viên bằng cùng tài khoản/định danh; nhân viên có thể là người giới thiệu khách.
- Scope: Schema additive, server actions, UI quản trị CTV/Nhân sự, liên kết collaboratorId, trạng thái active/suspended/archived, audit, regression tests, CI và merge master.
- Out of scope: Không xóa dữ liệu production, không tự tính lại hoa hồng, không tự cấp quyền ngoài quyết định của ADMIN, không tự áp BOM vật tư.
- Safety: Migration chỉ additive; trước production cần backup, migrate deploy và smoke test.
