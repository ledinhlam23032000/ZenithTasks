using System;

namespace ZenithTasks.Core.Domain
{
    public class Objective
    {
        public int ObjectiveId { get; set; }
        public int ProjectId { get; set; } // Khóa ngoại liên kết với Project
        public string ObjectiveName { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public double Progress { get; set; } // Tiến độ từ 0 đến 100

        public Objective()
        {
            ObjectiveName = string.Empty;
            StartDate = DateTime.Now;
            EndDate = DateTime.Now.AddDays(7);
            Progress = 0; // Mặc định tiến độ là 0%
        }
    }
}