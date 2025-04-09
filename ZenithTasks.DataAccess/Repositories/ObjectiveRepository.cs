#nullable enable // Bật kiểm tra nullability
using PersonalProjectManager.Models;
using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics; // Cho Debug

namespace ZenithTasks.DataAccess.Repositories
{
    /// <summary>
    /// Repository chịu trách nhiệm truy cập dữ liệu cho thực thể Objective.
    /// </summary>
    public class ObjectiveRepository
    {
        /// <summary>
        /// Thêm một Objective mới vào cơ sở dữ liệu.
        /// </summary>
        /// <param name="objective">Đối tượng Objective cần thêm.</param>
        /// <returns>True nếu thêm thành công và ObjectiveId được cập nhật, False nếu thất bại.</returns>
        public bool AddObjective(Objective objective)
        {
            if (objective == null)
            {
                Debug.WriteLine("[ObjectiveRepository] Error: Attempted to add a null objective.");
                return false;
            }

            string query = @"
                INSERT INTO Objectives (ProjectId, ObjectiveName, StartDate, EndDate, Progress)
                VALUES (@ProjectId, @ObjectiveName, @StartDate, @EndDate, @Progress);";

            var parameters = new Dictionary<string, object?>
            {
                { "@ProjectId", objective.ProjectId },
                { "@ObjectiveName", objective.ObjectiveName },
                { "@StartDate", DatabaseHelper.ToSqliteDateTimeString(objective.StartDate) },
                { "@EndDate", DatabaseHelper.ToSqliteDateTimeString(objective.EndDate) },
                { "@Progress", Math.Clamp(objective.Progress, 0.0, 100.0) } // Đảm bảo progress trong khoảng 0-100
            };

            int affectedRows = DatabaseHelper.ExecuteNonQuery(query, parameters);
            if (affectedRows > 0)
            {
                object? lastId = DatabaseHelper.ExecuteScalar("SELECT last_insert_rowid();");
                if (lastId != null && lastId != DBNull.Value)
                {
                    try
                    {
                        objective.ObjectiveId = Convert.ToInt32(lastId);
                        Debug.WriteLine($"[ObjectiveRepository] Objective '{objective.ObjectiveName}' added successfully with ID: {objective.ObjectiveId}.");
                        return true;
                    }
                    catch (FormatException ex)
                    {
                        Debug.WriteLine($"[ObjectiveRepository] Error converting last_insert_rowid '{lastId}' to int: {ex.Message}");
                        return false;
                    }
                }
                else
                {
                    Debug.WriteLine("[ObjectiveRepository] Warning: Added objective but could not retrieve last insert rowid.");
                    return false;
                }
            }
            else
            {
                Debug.WriteLine($"[ObjectiveRepository] Error adding objective '{objective.ObjectiveName}'. ExecuteNonQuery returned {affectedRows}.");
                return false;
            }
        }

        /// <summary>
        /// Lấy Objective theo ID.
        /// </summary>
        /// <param name="objectiveId">ID của Objective.</param>
        /// <returns>Đối tượng Objective hoặc null nếu không tìm thấy hoặc có lỗi.</returns>
        public Objective? GetObjectiveById(int objectiveId)
        {
            if (objectiveId <= 0) return null;

            string query = "SELECT * FROM Objectives WHERE ObjectiveId = @ObjectiveId;";
            var parameters = new Dictionary<string, object?> { { "@ObjectiveId", objectiveId } };
            DataTable dataTable = DatabaseHelper.GetDataTable(query, parameters);

            if (dataTable != null && dataTable.Rows.Count > 0)
            {
                return MapDataRowToObjective(dataTable.Rows[0]);
            }

            Debug.WriteLine($"[ObjectiveRepository] Objective with ID {objectiveId} not found.");
            return null;
        }

        /// <summary>
        /// Lấy danh sách Objectives của một Project, sắp xếp theo ngày bắt đầu tăng dần.
        /// </summary>
        /// <param name="projectId">ID của Project.</param>
        /// <returns>Danh sách các Objective. Trả về danh sách rỗng nếu có lỗi.</returns>
        public List<Objective> GetObjectivesByProjectId(int projectId)
        {
            if (projectId <= 0) return new List<Objective>();

            var objectives = new List<Objective>();
            string query = "SELECT * FROM Objectives WHERE ProjectId = @ProjectId ORDER BY StartDate ASC;";
            var parameters = new Dictionary<string, object?> { { "@ProjectId", projectId } };
            DataTable dataTable = DatabaseHelper.GetDataTable(query, parameters);

            if (dataTable != null)
            {
                foreach (DataRow row in dataTable.Rows)
                {
                    Objective? objective = MapDataRowToObjective(row);
                    if (objective != null) { objectives.Add(objective); }
                }
            }
            // DatabaseHelper.GetDataTable đã log lỗi nếu có

            return objectives;
        }

        /// <summary>
        /// Cập nhật thông tin một Objective hiện có.
        /// </summary>
        /// <param name="objective">Đối tượng Objective với thông tin cập nhật.</param>
        /// <returns>True nếu cập nhật thành công, False nếu thất bại.</returns>
        public bool UpdateObjective(Objective objective)
        {
            if (objective == null || objective.ObjectiveId <= 0)
            {
                Debug.WriteLine("[ObjectiveRepository] Error: Attempted to update a null or invalid objective.");
                return false;
            }

            string query = @"
                UPDATE Objectives
                SET ProjectId = @ProjectId,
                    ObjectiveName = @ObjectiveName,
                    StartDate = @StartDate,
                    EndDate = @EndDate,
                    Progress = @Progress
                WHERE ObjectiveId = @ObjectiveId;";

            var parameters = new Dictionary<string, object?>
            {
                { "@ProjectId", objective.ProjectId },
                { "@ObjectiveName", objective.ObjectiveName },
                { "@StartDate", DatabaseHelper.ToSqliteDateTimeString(objective.StartDate) },
                { "@EndDate", DatabaseHelper.ToSqliteDateTimeString(objective.EndDate) },
                { "@Progress", Math.Clamp(objective.Progress, 0.0, 100.0) }, // Đảm bảo progress 0-100
                { "@ObjectiveId", objective.ObjectiveId }
            };

            int affectedRows = DatabaseHelper.ExecuteNonQuery(query, parameters);
            if (affectedRows == 0)
            {
                Debug.WriteLine($"[ObjectiveRepository] Warning: UpdateObjective did not affect any rows for Objective ID {objective.ObjectiveId}. Objective might not exist or data was unchanged.");
            }
            else if (affectedRows > 0)
            {
                Debug.WriteLine($"[ObjectiveRepository] Objective ID {objective.ObjectiveId} updated successfully.");
            }
            // Lỗi (< 0) đã được log bởi DatabaseHelper

            return affectedRows > 0;
        }

        /// <summary>
        /// Cập nhật chỉ cột Progress của một Objective.
        /// </summary>
        /// <param name="objectiveId">ID của Objective cần cập nhật.</param>
        /// <param name="progress">Giá trị Progress mới (sẽ được giới hạn trong khoảng 0-100).</param>
        /// <returns>True nếu cập nhật thành công, False nếu thất bại.</returns>
        public bool UpdateObjectiveProgress(int objectiveId, double progress)
        {
            if (objectiveId <= 0) return false;

            string query = "UPDATE Objectives SET Progress = @Progress WHERE ObjectiveId = @ObjectiveId;";
            var parameters = new Dictionary<string, object?>
            {
                { "@Progress", Math.Clamp(progress, 0.0, 100.0) }, // Giới hạn progress 0-100
                { "@ObjectiveId", objectiveId }
            };

            int affectedRows = DatabaseHelper.ExecuteNonQuery(query, parameters);
            if (affectedRows == 0)
            {
                Debug.WriteLine($"[ObjectiveRepository] Warning: UpdateObjectiveProgress did not affect any rows for Objective ID {objectiveId}. Objective might not exist.");
            }
            else if (affectedRows > 0)
            {
                Debug.WriteLine($"[ObjectiveRepository] Progress for Objective ID {objectiveId} updated successfully.");
            }
            // Lỗi (< 0) đã được log bởi DatabaseHelper

            return affectedRows > 0;
        }

        /// <summary>
        /// Xóa một Objective khỏi cơ sở dữ liệu.
        /// Lưu ý: Các Task liên quan sẽ bị xóa theo nếu CSDL có ràng buộc CASCADE.
        /// </summary>
        /// <param name="objectiveId">ID của Objective cần xóa.</param>
        /// <returns>True nếu xóa thành công, False nếu thất bại.</returns>
        public bool DeleteObjective(int objectiveId)
        {
            if (objectiveId <= 0) return false;

            string query = "DELETE FROM Objectives WHERE ObjectiveId = @ObjectiveId;";
            var parameters = new Dictionary<string, object?> { { "@ObjectiveId", objectiveId } };
            int affectedRows = DatabaseHelper.ExecuteNonQuery(query, parameters);

            if (affectedRows == 0)
            {
                Debug.WriteLine($"[ObjectiveRepository] Warning: DeleteObjective did not affect any rows for Objective ID {objectiveId}. Objective might not exist.");
            }
            else if (affectedRows > 0)
            {
                Debug.WriteLine($"[ObjectiveRepository] Objective ID {objectiveId} deleted successfully.");
            }
            // Lỗi (< 0) đã được log bởi DatabaseHelper

            return affectedRows > 0;
        }

        /// <summary>
        /// Ánh xạ một DataRow từ bảng Objectives thành đối tượng Objective.
        /// </summary>
        /// <param name="row">DataRow cần ánh xạ.</param>
        /// <returns>Đối tượng Objective hoặc null nếu có lỗi ánh xạ.</returns>
        private Objective? MapDataRowToObjective(DataRow row)
        {
            try
            {
                // Kiểm tra các cột thiết yếu
                if (row == null || !row.Table.Columns.Contains("ObjectiveId") || row["ObjectiveId"] == DBNull.Value)
                {
                    Debug.WriteLine("[ObjectiveRepository] Error mapping DataRow: Row is null or ObjectiveId is missing/DBNull.");
                    return null;
                }
                int objectiveId = Convert.ToInt32(row["ObjectiveId"]);

                DateTime startDate = DatabaseHelper.ParseSqliteDateTimeString(row.Field<string>("StartDate"), DateTime.MinValue);
                DateTime endDate = DatabaseHelper.ParseSqliteDateTimeString(row.Field<string>("EndDate"), DateTime.MinValue);

                double progress = 0.0;
                if (row.Table.Columns.Contains("Progress") && row["Progress"] != DBNull.Value)
                {
                    // Thêm try-catch nhỏ cho việc parse double
                    try { progress = Convert.ToDouble(row["Progress"]); }
                    catch (FormatException ex)
                    {
                        Debug.WriteLine($"[ObjectiveRepository] Warning: Could not parse Progress '{row["Progress"]}' for Objective ID {objectiveId}. Using 0. Error: {ex.Message}");
                    }
                }


                Objective objective = new Objective
                {
                    ObjectiveId = objectiveId,
                    ProjectId = row.Field<int?>("ProjectId") ?? 0, // Giả sử ProjectId luôn tồn tại và không null
                    ObjectiveName = row.Field<string>("ObjectiveName") ?? string.Empty,
                    StartDate = startDate,
                    EndDate = endDate,
                    Progress = Math.Clamp(progress, 0.0, 100.0) // Đảm bảo progress trong khoảng 0-100
                };
                return objective;
            }
            catch (Exception ex)
            {
                object? objectiveIdObj = null;
                try { objectiveIdObj = row?.Field<object>("ObjectiveId"); } catch { /* Ignore */ }
                Debug.WriteLine($"[ObjectiveRepository] Error mapping DataRow to Objective (ID attempt: {objectiveIdObj ?? "N/A"}): {ex.Message}\nStackTrace: {ex.StackTrace}");
                return null;
            }
        }
    }
}
#nullable restore