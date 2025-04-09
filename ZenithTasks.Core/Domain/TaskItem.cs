using System;

namespace ZenithTasks.Core.Domain
{
    public class TaskItem // Đặt tên TaskItem để tránh trùng từ khóa 'Task' của C#
    {
        public int TaskId { get; set; }
        public int ObjectiveId { get; set; } // Khóa ngoại liên kết với Objective
        public int? ParentTaskId { get; set; } // Dấu ? cho phép giá trị null, biểu thị task gốc (không có cha)
        public string TaskName { get; set; }
        public string Notes { get; set; }
        public string Status { get; set; } // Ví dụ: "Chưa bắt đầu", "Đang làm", "Hoàn thành"
        public double Progress { get; set; } // Tiến độ từ 0 đến 100 (có thể tính dựa trên task con)

        public TaskItem()
        {
            TaskName = string.Empty;
            Notes = string.Empty;
            Status = "Chưa bắt đầu"; // Mặc định
            Progress = 0;
            // ParentTaskId mặc định là null
        }
    }
}