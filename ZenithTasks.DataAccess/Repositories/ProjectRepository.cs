#nullable enable // Bật kiểm tra nullability
using PersonalProjectManager.Models;
using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics; // Cho Debug

namespace ZenithTasks.DataAccess.Repositories
{
    /// <summary>
    /// Repository chịu trách nhiệm truy cập dữ liệu cho thực thể Project.
    /// </summary>
    public class ProjectRepository
    {
        /// <summary>
        /// Thêm một Project mới vào cơ sở dữ liệu.
        /// </summary>
        /// <param name="project">Đối tượng Project cần thêm.</param>
        /// <returns>True nếu thêm thành công và ProjectId được cập nhật, False nếu thất bại.</returns>
        public bool AddProject(Project project)
        {
            if (project == null)
            {
                Debug.WriteLine("[ProjectRepository] Error: Attempted to add a null project.");
                return false;
            }

            string query = @"
                INSERT INTO Projects (ProjectName, Owner, StartDate, EndDate, Resources, Status)
                VALUES (@ProjectName, @Owner, @StartDate, @EndDate, @Resources, @Status);";

            var parameters = new Dictionary<string, object?>
            {
                { "@ProjectName", project.ProjectName },
                { "@Owner", string.IsNullOrWhiteSpace(project.Owner) ? DBNull.Value : project.Owner }, // Lưu DBNull nếu Owner trống
                { "@StartDate", DatabaseHelper.ToSqliteDateTimeString(project.StartDate) },
                { "@EndDate", DatabaseHelper.ToSqliteDateTimeString(project.EndDate) },
                { "@Resources", string.IsNullOrWhiteSpace(project.Resources) ? DBNull.Value : project.Resources }, // Lưu DBNull nếu Resources trống
                { "@Status", project.Status }
            };

            int affectedRows = DatabaseHelper.ExecuteNonQuery(query, parameters);
            if (affectedRows > 0)
            {
                object? lastId = DatabaseHelper.ExecuteScalar("SELECT last_insert_rowid();");
                if (lastId != null && lastId != DBNull.Value)
                {
                    try
                    {
                        project.ProjectId = Convert.ToInt32(lastId);
                        Debug.WriteLine($"[ProjectRepository] Project '{project.ProjectName}' added successfully with ID: {project.ProjectId}.");
                        return true;
                    }
                    catch (FormatException ex)
                    {
                        Debug.WriteLine($"[ProjectRepository] Error converting last_insert_rowid '{lastId}' to int: {ex.Message}");
                        return false; // Lỗi không mong muốn khi convert ID
                    }
                }
                else
                {
                    Debug.WriteLine("[ProjectRepository] Warning: Added project but could not retrieve last insert rowid.");
                    return false; // Không lấy được ID sau khi thêm
                }
            }
            else
            {
                Debug.WriteLine($"[ProjectRepository] Error adding project '{project.ProjectName}'. ExecuteNonQuery returned {affectedRows}.");
                return false;
            }
        }

        /// <summary>
        /// Lấy Project theo ID.
        /// </summary>
        /// <param name="projectId">ID của Project.</param>
        /// <returns>Đối tượng Project hoặc null nếu không tìm thấy hoặc có lỗi.</returns>
        public Project? GetProjectById(int projectId)
        {
            if (projectId <= 0) return null;

            string query = "SELECT * FROM Projects WHERE ProjectId = @ProjectId;";
            var parameters = new Dictionary<string, object?> { { "@ProjectId", projectId } };
            DataTable dataTable = DatabaseHelper.GetDataTable(query, parameters);

            if (dataTable != null && dataTable.Rows.Count > 0)
            {
                return MapDataRowToProject(dataTable.Rows[0]);
            }

            Debug.WriteLine($"[ProjectRepository] Project with ID {projectId} not found.");
            return null;
        }

        /// <summary>
        /// Lấy tất cả các Project, sắp xếp theo ngày bắt đầu giảm dần.
        /// </summary>
        /// <returns>Danh sách các Project. Trả về danh sách rỗng nếu có lỗi.</returns>
        public List<Project> GetAllProjects()
        {
            List<Project> projects = new List<Project>();
            string query = "SELECT * FROM Projects ORDER BY StartDate DESC;";
            DataTable dataTable = DatabaseHelper.GetDataTable(query); // Không cần parameters

            if (dataTable != null)
            {
                foreach (DataRow row in dataTable.Rows)
                {
                    Project? project = MapDataRowToProject(row);
                    if (project != null)
                    {
                        projects.Add(project);
                    }
                    // MapDataRowToProject đã tự log lỗi nếu có
                }
            }
            // DatabaseHelper.GetDataTable đã tự log lỗi nếu có
            return projects;
        }

        /// <summary>
        /// Cập nhật thông tin một Project hiện có.
        /// </summary>
        /// <param name="project">Đối tượng Project với thông tin cập nhật.</param>
        /// <returns>True nếu cập nhật thành công, False nếu thất bại.</returns>
        public bool UpdateProject(Project project)
        {
            if (project == null || project.ProjectId <= 0)
            {
                Debug.WriteLine("[ProjectRepository] Error: Attempted to update a null or invalid project.");
                return false;
            }

            string query = @"
                UPDATE Projects
                SET ProjectName = @ProjectName,
                    Owner = @Owner,
                    StartDate = @StartDate,
                    EndDate = @EndDate,
                    Resources = @Resources,
                    Status = @Status
                WHERE ProjectId = @ProjectId;";

            var parameters = new Dictionary<string, object?>
            {
                { "@ProjectName", project.ProjectName },
                { "@Owner", string.IsNullOrWhiteSpace(project.Owner) ? DBNull.Value : project.Owner },
                { "@StartDate", DatabaseHelper.ToSqliteDateTimeString(project.StartDate) },
                { "@EndDate", DatabaseHelper.ToSqliteDateTimeString(project.EndDate) },
                { "@Resources", string.IsNullOrWhiteSpace(project.Resources) ? DBNull.Value : project.Resources },
                { "@Status", project.Status },
                { "@ProjectId", project.ProjectId }
            };

            int affectedRows = DatabaseHelper.ExecuteNonQuery(query, parameters);
            if (affectedRows == 0)
            {
                Debug.WriteLine($"[ProjectRepository] Warning: UpdateProject did not affect any rows for Project ID {project.ProjectId}. Project might not exist or data was unchanged.");
            }
            else if (affectedRows > 0)
            {
                Debug.WriteLine($"[ProjectRepository] Project ID {project.ProjectId} updated successfully.");
            }
            // Nếu affectedRows < 0 là lỗi, DatabaseHelper đã log

            return affectedRows > 0;
        }

        /// <summary>
        /// Xóa một Project khỏi cơ sở dữ liệu.
        /// Lưu ý: Các Objective và Task liên quan sẽ bị xóa theo nếu CSDL có ràng buộc CASCADE.
        /// </summary>
        /// <param name="projectId">ID của Project cần xóa.</param>
        /// <returns>True nếu xóa thành công, False nếu thất bại.</returns>
        public bool DeleteProject(int projectId)
        {
            if (projectId <= 0) return false;

            string query = "DELETE FROM Projects WHERE ProjectId = @ProjectId;";
            var parameters = new Dictionary<string, object?> { { "@ProjectId", projectId } };
            int affectedRows = DatabaseHelper.ExecuteNonQuery(query, parameters);

            if (affectedRows == 0)
            {
                Debug.WriteLine($"[ProjectRepository] Warning: DeleteProject did not affect any rows for Project ID {projectId}. Project might not exist.");
            }
            else if (affectedRows > 0)
            {
                Debug.WriteLine($"[ProjectRepository] Project ID {projectId} deleted successfully.");
            }
            // Nếu affectedRows < 0 là lỗi, DatabaseHelper đã log

            return affectedRows > 0;
        }

        /// <summary>
        /// Ánh xạ một DataRow từ bảng Projects thành đối tượng Project.
        /// </summary>
        /// <param name="row">DataRow cần ánh xạ.</param>
        /// <returns>Đối tượng Project hoặc null nếu có lỗi ánh xạ.</returns>
        private Project? MapDataRowToProject(DataRow row)
        {
            try
            {
                // Kiểm tra các cột thiết yếu tồn tại và không phải DBNull trước khi truy cập
                if (row == null || !row.Table.Columns.Contains("ProjectId") || row["ProjectId"] == DBNull.Value)
                {
                    Debug.WriteLine("[ProjectRepository] Error mapping DataRow: Row is null or ProjectId is missing/DBNull.");
                    return null;
                }

                int projectId = Convert.ToInt32(row["ProjectId"]);

                // Sử dụng helper để parse DateTime một cách an toàn
                DateTime startDate = DatabaseHelper.ParseSqliteDateTimeString(row.Field<string>("StartDate"), DateTime.MinValue);
                DateTime endDate = DatabaseHelper.ParseSqliteDateTimeString(row.Field<string>("EndDate"), DateTime.MinValue);

                Project project = new Project
                {
                    ProjectId = projectId,
                    // Dùng Field<T?> để lấy giá trị nullable và ?? để gán mặc định
                    ProjectName = row.Field<string>("ProjectName") ?? string.Empty,
                    Owner = row.Field<string>("Owner") ?? string.Empty,
                    StartDate = startDate,
                    EndDate = endDate,
                    Resources = row.Field<string>("Resources") ?? string.Empty,
                    Status = row.Field<string>("Status") ?? string.Empty
                };
                return project;
            }
            catch (Exception ex)
            {
                // Log lỗi chi tiết hơn, bao gồm cả ID (nếu có thể lấy)
                object? projectIdObj = null;
                try { projectIdObj = row?.Field<object>("ProjectId"); } catch { /* Ignore */ }
                Debug.WriteLine($"[ProjectRepository] Error mapping DataRow to Project (ID attempt: {projectIdObj ?? "N/A"}): {ex.Message}\nStackTrace: {ex.StackTrace}");
                return null; // Trả về null nếu có lỗi nghiêm trọng khi map
            }
        }
    }
}
#nullable restore