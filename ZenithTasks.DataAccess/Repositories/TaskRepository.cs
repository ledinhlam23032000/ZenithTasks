#nullable enable // Bật kiểm tra nullability
using PersonalProjectManager.Models;
using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics; // Cho Debug

namespace ZenithTasks.DataAccess.Repositories
{
    /// <summary>
    /// Repository chịu trách nhiệm truy cập dữ liệu cho thực thể TaskItem.
    /// </summary>
    public class TaskRepository
    {
        /// <summary>
        /// Thêm một TaskItem mới vào cơ sở dữ liệu.
        /// </summary>
        /// <param name="task">Đối tượng TaskItem cần thêm.</param>
        /// <returns>True nếu thêm thành công và TaskId được cập nhật, False nếu thất bại.</returns>
        public bool AddTask(TaskItem task)
        {
            if (task == null)
            {
                Debug.WriteLine("[TaskRepository] Error: Attempted to add a null task.");
                return false;
            }

            string query = @"
                INSERT INTO Tasks (ObjectiveId, ParentTaskId, TaskName, Notes, Status, Progress)
                VALUES (@ObjectiveId, @ParentTaskId, @TaskName, @Notes, @Status, @Progress);";

            var parameters = new Dictionary<string, object?>
            {
                { "@ObjectiveId", task.ObjectiveId },
                // Sử dụng DBNull.Value nếu ParentTaskId là null
                { "@ParentTaskId", task.ParentTaskId.HasValue ? (object)task.ParentTaskId.Value : DBNull.Value },
                { "@TaskName", task.TaskName },
                { "@Notes", string.IsNullOrWhiteSpace(task.Notes) ? DBNull.Value : task.Notes }, // Lưu DBNull nếu Notes trống
                { "@Status", task.Status },
                { "@Progress", Math.Clamp(task.Progress, 0.0, 100.0) } // Đảm bảo progress 0-100
            };

            int affectedRows = DatabaseHelper.ExecuteNonQuery(query, parameters);
            if (affectedRows > 0)
            {
                object? lastId = DatabaseHelper.ExecuteScalar("SELECT last_insert_rowid();");
                if (lastId != null && lastId != DBNull.Value)
                {
                    try
                    {
                        task.TaskId = Convert.ToInt32(lastId);
                        Debug.WriteLine($"[TaskRepository] Task '{task.TaskName}' added successfully with ID: {task.TaskId}.");
                        return true;
                    }
                    catch (FormatException ex)
                    {
                        Debug.WriteLine($"[TaskRepository] Error converting last_insert_rowid '{lastId}' to int: {ex.Message}");
                        return false;
                    }
                }
                else
                {
                    Debug.WriteLine("[TaskRepository] Warning: Added task but could not retrieve last insert rowid.");
                    return false;
                }
            }
            else
            {
                Debug.WriteLine($"[TaskRepository] Error adding task '{task.TaskName}'. ExecuteNonQuery returned {affectedRows}.");
                return false;
            }
        }

        /// <summary>
        /// Lấy TaskItem theo ID.
        /// </summary>
        /// <param name="taskId">ID của TaskItem.</param>
        /// <returns>Đối tượng TaskItem hoặc null nếu không tìm thấy hoặc có lỗi.</returns>
        public TaskItem? GetTaskById(int taskId)
        {
            if (taskId <= 0) return null;

            string query = "SELECT * FROM Tasks WHERE TaskId = @TaskId;";
            var parameters = new Dictionary<string, object?> { { "@TaskId", taskId } };
            DataTable dataTable = DatabaseHelper.GetDataTable(query, parameters);

            if (dataTable != null && dataTable.Rows.Count > 0)
            {
                return MapDataRowToTaskItem(dataTable.Rows[0]);
            }
            // Không cần log ở đây vì trường hợp không tìm thấy là bình thường
            // Debug.WriteLine($"[TaskRepository] Task with ID {taskId} not found.");
            return null;
        }

        /// <summary>
        /// Lấy các Task gốc (không có ParentTaskId) của một Objective, sắp xếp theo TaskId tăng dần.
        /// </summary>
        /// <param name="objectiveId">ID của Objective.</param>
        /// <returns>Danh sách các TaskItem. Trả về danh sách rỗng nếu có lỗi.</returns>
        public List<TaskItem> GetRootTasksByObjectiveId(int objectiveId)
        {
            if (objectiveId <= 0) return new List<TaskItem>();

            var tasks = new List<TaskItem>();
            // Thêm điều kiện IS NULL rõ ràng cho ParentTaskId
            string query = "SELECT * FROM Tasks WHERE ObjectiveId = @ObjectiveId AND ParentTaskId IS NULL ORDER BY TaskId ASC;";
            var parameters = new Dictionary<string, object?> { { "@ObjectiveId", objectiveId } };
            DataTable dataTable = DatabaseHelper.GetDataTable(query, parameters);

            if (dataTable != null)
            {
                foreach (DataRow row in dataTable.Rows)
                {
                    TaskItem? task = MapDataRowToTaskItem(row);
                    if (task != null) { tasks.Add(task); }
                }
            }
            // DatabaseHelper.GetDataTable đã log lỗi
            return tasks;
        }

        /// <summary>
        /// Lấy các Task con trực tiếp của một Task cha, sắp xếp theo TaskId tăng dần.
        /// </summary>
        /// <param name="parentTaskId">ID của Task cha.</param>
        /// <returns>Danh sách các TaskItem. Trả về danh sách rỗng nếu có lỗi.</returns>
        public List<TaskItem> GetSubTasksByParentTaskId(int parentTaskId)
        {
            if (parentTaskId <= 0) return new List<TaskItem>();

            var subTasks = new List<TaskItem>();
            string query = "SELECT * FROM Tasks WHERE ParentTaskId = @ParentTaskId ORDER BY TaskId ASC;";
            var parameters = new Dictionary<string, object?> { { "@ParentTaskId", parentTaskId } };
            DataTable dataTable = DatabaseHelper.GetDataTable(query, parameters);

            if (dataTable != null)
            {
                foreach (DataRow row in dataTable.Rows)
                {
                    TaskItem? task = MapDataRowToTaskItem(row);
                    if (task != null) { subTasks.Add(task); }
                }
            }
            // DatabaseHelper.GetDataTable đã log lỗi
            return subTasks;
        }

        /// <summary>
        /// Cập nhật các thông tin của TaskItem (trừ Status và Progress).
        /// </summary>
        /// <param name="task">Đối tượng TaskItem với thông tin cập nhật.</param>
        /// <returns>True nếu cập nhật thành công, False nếu thất bại.</returns>
        public bool UpdateTask(TaskItem task)
        {
            if (task == null || task.TaskId <= 0)
            {
                Debug.WriteLine("[TaskRepository] Error: Attempted to update a null or invalid task.");
                return false;
            }

            // Chỉ cập nhật các trường được phép thay đổi qua hàm này
            string query = @"
                UPDATE Tasks
                SET ObjectiveId = @ObjectiveId,
                    ParentTaskId = @ParentTaskId,
                    TaskName = @TaskName,
                    Notes = @Notes
                WHERE TaskId = @TaskId;";

            var parameters = new Dictionary<string, object?>
            {
                { "@ObjectiveId", task.ObjectiveId },
                { "@ParentTaskId", task.ParentTaskId.HasValue ? (object)task.ParentTaskId.Value : DBNull.Value },
                { "@TaskName", task.TaskName },
                { "@Notes", string.IsNullOrWhiteSpace(task.Notes) ? DBNull.Value : task.Notes },
                { "@TaskId", task.TaskId }
            };

            int affectedRows = DatabaseHelper.ExecuteNonQuery(query, parameters);
            if (affectedRows == 0)
            {
                Debug.WriteLine($"[TaskRepository] Warning: UpdateTask did not affect any rows for Task ID {task.TaskId}. Task might not exist or data was unchanged.");
            }
            else if (affectedRows > 0)
            {
                Debug.WriteLine($"[TaskRepository] Task ID {task.TaskId} details updated successfully.");
            }
            // Lỗi (< 0) đã được log bởi DatabaseHelper
            return affectedRows > 0;
        }

        /// <summary>
        /// Cập nhật chỉ cột Status của một TaskItem.
        /// </summary>
        /// <param name="taskId">ID của TaskItem.</param>
        /// <param name="status">Giá trị Status mới.</param>
        /// <returns>True nếu cập nhật thành công, False nếu thất bại.</returns>
        public bool UpdateTaskStatus(int taskId, string status)
        {
            if (taskId <= 0) return false;

            string query = "UPDATE Tasks SET Status = @Status WHERE TaskId = @TaskId;";
            var parameters = new Dictionary<string, object?>
            {
                { "@Status", status },
                { "@TaskId", taskId }
            };

            int affectedRows = DatabaseHelper.ExecuteNonQuery(query, parameters);
            if (affectedRows == 0)
            {
                Debug.WriteLine($"[TaskRepository] Warning: UpdateTaskStatus did not affect any rows for Task ID {taskId}. Task might not exist.");
            }
            else if (affectedRows > 0)
            {
                Debug.WriteLine($"[TaskRepository] Status for Task ID {taskId} updated successfully.");
            }
            // Lỗi (< 0) đã được log bởi DatabaseHelper
            return affectedRows > 0;
        }

        /// <summary>
        /// Cập nhật chỉ cột Progress của một TaskItem.
        /// </summary>
        /// <param name="taskId">ID của TaskItem.</param>
        /// <param name="progress">Giá trị Progress mới (sẽ được giới hạn trong khoảng 0-100).</param>
        /// <returns>True nếu cập nhật thành công, False nếu thất bại.</returns>
        public bool UpdateTaskProgress(int taskId, double progress)
        {
            if (taskId <= 0) return false;

            string query = "UPDATE Tasks SET Progress = @Progress WHERE TaskId = @TaskId;";
            var parameters = new Dictionary<string, object?>
            {
                { "@Progress", Math.Clamp(progress, 0.0, 100.0) }, // Giới hạn 0-100
                { "@TaskId", taskId }
            };

            int affectedRows = DatabaseHelper.ExecuteNonQuery(query, parameters);
            if (affectedRows == 0)
            {
                Debug.WriteLine($"[TaskRepository] Warning: UpdateTaskProgress did not affect any rows for Task ID {taskId}. Task might not exist.");
            }
            else if (affectedRows > 0)
            {
                // Giảm bớt log thành công cho hàm này vì nó được gọi thường xuyên bởi đệ quy
                // Debug.WriteLine($"[TaskRepository] Progress for Task ID {taskId} updated successfully.");
            }
            // Lỗi (< 0) đã được log bởi DatabaseHelper
            return affectedRows > 0;
        }

        /// <summary>
        /// Xóa một TaskItem khỏi cơ sở dữ liệu.
        /// Lưu ý: Các Task con sẽ bị xóa theo nếu CSDL có ràng buộc CASCADE.
        /// </summary>
        /// <param name="taskId">ID của TaskItem cần xóa.</param>
        /// <returns>True nếu xóa thành công, False nếu thất bại.</returns>
        public bool DeleteTask(int taskId)
        {
            if (taskId <= 0) return false;

            string query = "DELETE FROM Tasks WHERE TaskId = @TaskId;";
            var parameters = new Dictionary<string, object?> { { "@TaskId", taskId } };
            int affectedRows = DatabaseHelper.ExecuteNonQuery(query, parameters);

            if (affectedRows == 0)
            {
                Debug.WriteLine($"[TaskRepository] Warning: DeleteTask did not affect any rows for Task ID {taskId}. Task might not exist.");
            }
            else if (affectedRows > 0)
            {
                Debug.WriteLine($"[TaskRepository] Task ID {taskId} deleted successfully.");
            }
            // Lỗi (< 0) đã được log bởi DatabaseHelper

            return affectedRows > 0;
        }

        /// <summary>
        /// Ánh xạ một DataRow từ bảng Tasks thành đối tượng TaskItem.
        /// </summary>
        /// <param name="row">DataRow cần ánh xạ.</param>
        /// <returns>Đối tượng TaskItem hoặc null nếu có lỗi ánh xạ.</returns>
        private TaskItem? MapDataRowToTaskItem(DataRow row)
        {
            try
            {
                if (row == null || !row.Table.Columns.Contains("TaskId") || row["TaskId"] == DBNull.Value)
                {
                    Debug.WriteLine("[TaskRepository] Error mapping DataRow: Row is null or TaskId is missing/DBNull.");
                    return null;
                }
                int taskId = Convert.ToInt32(row["TaskId"]);

                double progress = 0.0;
                if (row.Table.Columns.Contains("Progress") && row["Progress"] != DBNull.Value)
                {
                    try { progress = Convert.ToDouble(row["Progress"]); }
                    catch (FormatException ex)
                    {
                        Debug.WriteLine($"[TaskRepository] Warning: Could not parse Progress '{row["Progress"]}' for Task ID {taskId}. Using 0. Error: {ex.Message}");
                    }
                }

                // Xử lý ParentTaskId nullable
                int? parentTaskId = null;
                if (row.Table.Columns.Contains("ParentTaskId") && row["ParentTaskId"] != DBNull.Value)
                {
                    try { parentTaskId = Convert.ToInt32(row["ParentTaskId"]); }
                    catch (FormatException ex)
                    {
                        Debug.WriteLine($"[TaskRepository] Warning: Could not parse ParentTaskId '{row["ParentTaskId"]}' for Task ID {taskId}. Treating as null. Error: {ex.Message}");
                    }
                }

                TaskItem task = new TaskItem
                {
                    TaskId = taskId,
                    ObjectiveId = row.Field<int?>("ObjectiveId") ?? 0, // Giả sử ObjectiveId không null
                    ParentTaskId = parentTaskId,
                    TaskName = row.Field<string>("TaskName") ?? string.Empty,
                    Notes = row.Field<string>("Notes") ?? string.Empty,
                    Status = row.Field<string>("Status") ?? "Chưa bắt đầu", // Mặc định nếu Status null/trống
                    Progress = Math.Clamp(progress, 0.0, 100.0) // Đảm bảo progress 0-100
                };

                // Chuẩn hóa Status về các giá trị cố định nếu cần
                if (string.IsNullOrWhiteSpace(task.Status)) task.Status = "Chưa bắt đầu";


                return task;
            }
            catch (Exception ex)
            {
                object? taskIdObj = null;
                try { taskIdObj = row?.Field<object>("TaskId"); } catch { /* Ignore */ }
                Debug.WriteLine($"[TaskRepository] Error mapping DataRow to TaskItem (ID attempt: {taskIdObj ?? "N/A"}): {ex.Message}\nStackTrace: {ex.StackTrace}");
                return null;
            }
        }
    }
}
#nullable restore