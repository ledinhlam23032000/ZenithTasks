# Open Questions — ZenithTasks AI Deep Upgrade

| ID | Câu hỏi | Cách kiểm chứng | Trạng thái |
|---|---|---|---|
| Q1 | DeepSeek giữ mục tiêu qua 10–20 lượt nếu context được shaping thế nào? | Multi-turn read-only harness trên staging/live | open |
| Q2 | Model có hiểu yêu cầu dài gồm nhiều mục tiêu và thứ tự ưu tiên không? | Long request cases, compare planner vs expected | open |
| Q3 | Summary có làm mất tên/tháng/số tiền/approval state không? | Golden memory fixtures + regression | open |
| Q4 | Planner có tự kiểm tra dữ liệu trước khi kết luận không? | Tool trace/verified result tests | open |
| Q5 | Writer có tự nhiên hơn khi nhận tool result không? | Blind rubric: conclusion, evidence, next step, tone | open |
| Q6 | Tại sao UI hiện tại chỉ xóa được conversation đang mở? | Page/actions code review và browser test | confirmed limitation |
| Q7 | Xóa conversation có cascade messages và detach approvals đúng không? | Prisma schema + test database deletion test | likely yes; verify |
| Q8 | Có thể nâng model reasoning mà không tăng latency vượt ngưỡng chấp nhận? | timed benchmark on production config | open |
| Q9 | Có nên thêm open-source agent framework? | Architecture review; reject if approval/audit regression | open |
| Q10 | Câu nào người dùng đã đánh dấu không dùng cần xóa cụ thể? | UI selection or explicit conversation IDs | needs precise selection |
