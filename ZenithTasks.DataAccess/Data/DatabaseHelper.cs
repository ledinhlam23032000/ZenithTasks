#nullable enable // Bật kiểm tra nullability
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SQLite; // Đảm bảo đã cài đặt System.Data.SQLite
using System.Diagnostics; // Cho Debug.WriteLine
using System.Globalization; // Cho CultureInfo
using System.IO; // Cần cho Path và File
using System.Linq; // Cho LINQ (để log parameters)

namespace ZenithTasks.DataAccess.Data
{
    /// <summary>
    /// Lớp tĩnh cung cấp các phương thức tiện ích để tương tác với cơ sở dữ liệu SQLite.
    /// Bao gồm khởi tạo, lấy chuỗi kết nối và thực thi các loại truy vấn khác nhau.
    /// </summary>
    public static class DatabaseHelper
    {
        private static string? _databaseFile; // Biến lưu đường dẫn file DB
        private static readonly object _initLock = new object(); // Lock để đảm bảo InitializeDatabase chỉ chạy một lần
        private static bool _isInitialized = false;

        /// <summary>
        /// Khởi tạo kết nối và tạo database/bảng nếu chưa tồn tại.
        /// Phải được gọi một lần khi ứng dụng khởi động. Đảm bảo thread-safe.
        /// </summary>
        public static void InitializeDatabase()
        {
            // Chỉ thực hiện khởi tạo nếu chưa được gọi
            if (_isInitialized) return;

            lock (_initLock)
            {
                // Kiểm tra lại sau khi vào lock để tránh race condition
                if (_isInitialized) return;

                Debug.WriteLine("--- Database Initialization Started ---");

                try
                {
                    // Xác định đường dẫn lưu file database (ví dụ: trong thư mục LocalAppData)
                    string appDataFolder = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                    // Sử dụng tên công ty/nhà phát triển để tránh xung đột
                    string companyFolder = Path.Combine(appDataFolder, "YourCompanyName"); // Thay "YourCompanyName"
                    string appFolder = Path.Combine(companyFolder, "PersonalProjectManager"); // Tạo thư mục riêng cho ứng dụng
                    _databaseFile = Path.Combine(appFolder, "ppm_data_v1.db"); // Đổi tên file DB có thể kèm version

                    Debug.WriteLine($"Database path determined: {_databaseFile}");

                    // Tạo thư mục ứng dụng và công ty nếu chưa có
                    if (!Directory.Exists(appFolder))
                    {
                        Directory.CreateDirectory(appFolder); // CreateDirectory tạo cả thư mục cha nếu cần
                        Debug.WriteLine($"Application data directory created: {appFolder}");
                    }

                    bool dbExists = File.Exists(_databaseFile);
                    Debug.WriteLine($"Database file exists check: {dbExists}");

                    if (!dbExists)
                    {
                        SQLiteConnection.CreateFile(_databaseFile);
                        Debug.WriteLine($"Database file created: {_databaseFile}");
                        CreateTables(); // Chỉ tạo bảng khi tạo file mới
                    }
                    else
                    {
                        // Nếu file DB đã tồn tại, có thể thêm logic kiểm tra/cập nhật schema ở đây
                        // Ví dụ: CheckSchemaVersionAndUpgrade();
                        Debug.WriteLine("Database file already exists. Schema creation skipped (consider adding schema migration logic if needed).");
                        // Đảm bảo Foreign Key được bật cho kết nối hiện tại (phòng trường hợp setting cũ)
                        EnableForeignKeys();
                    }

                    _isInitialized = true; // Đánh dấu đã khởi tạo thành công
                    Debug.WriteLine("--- Database Initialization Finished Successfully ---");
                }
                catch (Exception ex)
                {
                    // Log lỗi nghiêm trọng và ném lại để ứng dụng biết khởi tạo thất bại
                    Debug.WriteLine($"!!! FATAL DATABASE INITIALIZATION ERROR: {ex.Message}\n{ex.StackTrace}");
                    throw new InvalidOperationException($"Không thể khởi tạo cơ sở dữ liệu tại '{_databaseFile}': {ex.Message}", ex);
                }
            }
        }

        /// <summary>
        /// Lấy chuỗi kết nối đến database.
        /// </summary>
        /// <returns>Chuỗi kết nối.</returns>
        /// <exception cref="InvalidOperationException">Ném lỗi nếu InitializeDatabase chưa được gọi.</exception>
        private static string GetConnectionString()
        {
            if (!_isInitialized || string.IsNullOrEmpty(_databaseFile))
            {
                Debug.WriteLine("!!! CRITICAL ERROR: Attempted to get connection string before database was successfully initialized.");
                throw new InvalidOperationException("Database has not been successfully initialized. Ensure InitializeDatabase() was called and completed without errors on startup.");
            }
            // Pooling=True giúp tái sử dụng kết nối, có thể cải thiện hiệu năng.
            // Foreign Keys=True; là quan trọng để đảm bảo ràng buộc khóa ngoại hoạt động.
            // Journal Mode=WAL (Write-Ahead Logging) thường cho hiệu năng tốt hơn trong môi trường đa luồng (mặc dù app này có thể không cần), nhưng cần kiểm tra kỹ. Tạm thời giữ mặc định.
            return $"Data Source={_databaseFile};Version=3;Pooling=True;Foreign Keys=True;";
        }

        /// <summary>
        /// Đảm bảo Foreign Key được bật cho các kết nối mới.
        /// Có thể gọi sau khi InitializeDatabase nếu DB đã tồn tại.
        /// </summary>
        private static void EnableForeignKeys()
        {
            try
            {
                ExecuteNonQuery("PRAGMA foreign_keys = ON;");
                Debug.WriteLine("Foreign key support enabled for existing database connection pool.");
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"!!! WARNING: Failed to explicitly enable foreign keys on existing database. Error: {ex.Message}");
                // Không ném lỗi ở đây vì chuỗi kết nối đã có "Foreign Keys=True"
            }
        }


        /// <summary>
        /// Tạo các bảng trong database dựa vào file schema.sql.
        /// Chỉ nên gọi khi tạo database mới.
        /// </summary>
        private static void CreateTables()
        {
            string schemaPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "schema.sql");
            Debug.WriteLine($"Attempting to load schema from: {schemaPath}");

            if (!File.Exists(schemaPath))
            {
                Debug.WriteLine($"!!! ERROR: schema.sql not found at {schemaPath}. Ensure 'Copy to Output Directory' is set to 'Copy if newer' or 'Copy always'.");
                throw new FileNotFoundException("Không tìm thấy file schema.sql. Hãy đảm bảo file này được copy vào thư mục chạy ứng dụng.", schemaPath);
            }

            string script;
            try
            {
                script = File.ReadAllText(schemaPath);
                if (string.IsNullOrWhiteSpace(script))
                {
                    Debug.WriteLine("!!! WARNING: schema.sql is empty. No tables will be created.");
                    return;
                }
            }
            catch (IOException ex)
            {
                Debug.WriteLine($"!!! ERROR reading schema.sql: {ex.Message}");
                throw new IOException($"Không thể đọc file schema.sql: {ex.Message}", ex);
            }


            try
            {
                using (var connection = new SQLiteConnection(GetConnectionString()))
                {
                    connection.Open();
                    Debug.WriteLine("Database connection opened for table creation.");
                    using (var command = new SQLiteCommand(script, connection))
                    {
                        // Thực thi toàn bộ script
                        command.ExecuteNonQuery();
                    }
                    Debug.WriteLine("Schema script executed successfully.");
                }
            }
            catch (SQLiteException sqliteEx)
            {
                Debug.WriteLine($"!!! SQLITE ERROR creating tables: {sqliteEx.Message} (ErrorCode: {sqliteEx.ErrorCode})\n--- Schema Script Start ---\n{script}\n--- Schema Script End ---\nStackTrace: {sqliteEx.StackTrace}");
                throw new Exception($"Lỗi SQLite khi tạo bảng: {sqliteEx.Message}", sqliteEx);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"!!! GENERAL ERROR creating tables: {ex.Message}\nStackTrace: {ex.StackTrace}");
                throw new Exception($"Lỗi không xác định khi tạo bảng: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Thực thi một câu lệnh non-query (INSERT, UPDATE, DELETE).
        /// </summary>
        /// <param name="query">Câu lệnh SQL.</param>
        /// <param name="parameters">Các tham số cho câu lệnh.</param>
        /// <returns>Số dòng bị ảnh hưởng, hoặc -1 nếu có lỗi.</returns>
        public static int ExecuteNonQuery(string query, Dictionary<string, object?>? parameters = null)
        {
            int affectedRows = -1; // Mặc định là lỗi
            try
            {
                using (var connection = new SQLiteConnection(GetConnectionString()))
                {
                    connection.Open();
                    using (var command = new SQLiteCommand(query, connection))
                    {
                        AddParameters(command, parameters);
                        affectedRows = command.ExecuteNonQuery();
                    }
                }
            }
            catch (SQLiteException ex)
            {
                LogError("ExecuteNonQuery", query, parameters, ex);
                // Không ném lỗi, trả về -1
            }
            catch (Exception ex)
            {
                LogError("ExecuteNonQuery", query, parameters, ex);
                // Không ném lỗi, trả về -1
            }
            return affectedRows;
        }

        /// <summary>
        /// Thực thi câu lệnh và trả về giá trị đơn lẻ (ví dụ: COUNT(*), MAX(ID), last_insert_rowid()).
        /// </summary>
        /// <param name="query">Câu lệnh SQL.</param>
        /// <param name="parameters">Các tham số cho câu lệnh.</param>
        /// <returns>Giá trị trả về (có thể là null nếu lỗi hoặc không có kết quả).</returns>
        public static object? ExecuteScalar(string query, Dictionary<string, object?>? parameters = null)
        {
            object? result = null;
            try
            {
                using (var connection = new SQLiteConnection(GetConnectionString()))
                {
                    connection.Open();
                    using (var command = new SQLiteCommand(query, connection))
                    {
                        AddParameters(command, parameters);
                        result = command.ExecuteScalar();
                    }
                }
            }
            catch (SQLiteException ex)
            {
                LogError("ExecuteScalar", query, parameters, ex);
                return null; // Trả về null khi có lỗi
            }
            catch (Exception ex)
            {
                LogError("ExecuteScalar", query, parameters, ex);
                return null; // Trả về null khi có lỗi
            }
            // Chuyển đổi DBNull.Value thành null của C#
            return (result == DBNull.Value) ? null : result;
        }

        /// <summary>
        /// Thực thi câu lệnh SELECT và trả về DataTable.
        /// </summary>
        /// <param name="query">Câu lệnh SQL SELECT.</param>
        /// <param name="parameters">Các tham số cho câu lệnh.</param>
        /// <returns>DataTable chứa kết quả (sẽ là DataTable rỗng nếu không có dữ liệu hoặc lỗi).</returns>
        public static DataTable GetDataTable(string query, Dictionary<string, object?>? parameters = null)
        {
            DataTable dataTable = new DataTable();
            try
            {
                using (var connection = new SQLiteConnection(GetConnectionString()))
                {
                    connection.Open();
                    using (var command = new SQLiteCommand(query, connection))
                    {
                        AddParameters(command, parameters);
                        using (var adapter = new SQLiteDataAdapter(command))
                        {
                            // Fill sẽ tự mở và đóng kết nối nếu nó chưa mở, nhưng ta đã mở rồi.
                            adapter.Fill(dataTable);
                        }
                    }
                }
            }
            catch (SQLiteException ex)
            {
                LogError("GetDataTable", query, parameters, ex);
                // Trả về DataTable rỗng khi có lỗi
            }
            catch (Exception ex)
            {
                LogError("GetDataTable", query, parameters, ex);
                // Trả về DataTable rỗng khi có lỗi
            }
            return dataTable;
        }

        /// <summary>
        /// Helper method để thêm tham số vào SQLiteCommand.
        /// </summary>
        private static void AddParameters(SQLiteCommand command, Dictionary<string, object?>? parameters)
        {
            if (parameters == null) return;

            foreach (var param in parameters)
            {
                // Quan trọng: Sử dụng DBNull.Value cho các giá trị null
                command.Parameters.AddWithValue(param.Key, param.Value ?? DBNull.Value);
            }
        }

        /// <summary>
        /// Helper method để ghi log lỗi SQL.
        /// </summary>
        private static void LogError(string operation, string query, Dictionary<string, object?>? parameters, Exception exception)
        {
            string paramsString = "None";
            if (parameters != null)
            {
                try
                {
                    // Cố gắng serialize parameters để dễ đọc hơn, ẩn giá trị nhạy cảm nếu cần
                    paramsString = string.Join(", ", parameters.Select(p => $"{p.Key}='{FormatParameterValue(p.Value)}'"));
                }
                catch { paramsString = "[Error formatting parameters]"; }
            }

            string errorMessage = exception is SQLiteException sqliteEx
                ? $"!!! SQLITE ERROR in {operation}: {sqliteEx.Message} (ErrorCode: {sqliteEx.ErrorCode})"
                : $"!!! GENERAL ERROR in {operation}: {exception.Message}";

            Debug.WriteLine($"{errorMessage}\n--- Query ---\n{query}\n--- Parameters ---\n{paramsString}\n--- StackTrace ---\n{exception.StackTrace}");
        }

        /// <summary>
        /// Helper để format giá trị tham số cho log (tránh hiển thị quá dài hoặc dữ liệu nhạy cảm).
        /// </summary>
        private static string FormatParameterValue(object? value)
        {
            if (value == null || value == DBNull.Value) return "NULL";
            if (value is byte[] bytes) return $"[Binary data, Length={bytes.Length}]";
            string strValue = value.ToString() ?? string.Empty;
            if (strValue.Length > 100) // Giới hạn độ dài log
            {
                return strValue.Substring(0, 100) + "...";
            }
            // Có thể thêm logic để ẩn mật khẩu hoặc thông tin nhạy cảm khác ở đây
            // if (parameterName.ToLower().Contains("password")) return "****";
            return strValue;
        }

        /// <summary>
        /// Định dạng chuẩn cho việc lưu trữ DateTime vào SQLite (nên dùng UTC nếu có thể, nhưng hiện tại dùng local time).
        /// </summary>
        public const string SqliteDateTimeFormat = "yyyy-MM-dd HH:mm:ss";

        /// <summary>
        /// Chuyển đổi DateTime thành chuỗi theo định dạng chuẩn để lưu vào SQLite.
        /// </summary>
        public static string ToSqliteDateTimeString(DateTime dateTime)
        {
            // Chuyển đổi sang giờ UTC nếu cần: dateTime.ToUniversalTime().ToString(SqliteDateTimeFormat, CultureInfo.InvariantCulture);
            return dateTime.ToString(SqliteDateTimeFormat, CultureInfo.InvariantCulture);
        }

        /// <summary>
        /// Chuyển đổi chuỗi từ SQLite thành DateTime.
        /// </summary>
        /// <param name="dateTimeString">Chuỗi đọc từ CSDL.</param>
        /// <param name="defaultValue">Giá trị trả về nếu chuỗi null, rỗng hoặc không hợp lệ.</param>
        /// <returns>Giá trị DateTime.</returns>
        public static DateTime ParseSqliteDateTimeString(string? dateTimeString, DateTime defaultValue = default)
        {
            if (string.IsNullOrWhiteSpace(dateTimeString))
            {
                return defaultValue;
            }
            if (DateTime.TryParseExact(dateTimeString, SqliteDateTimeFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime result))
            {
                // Giả định giờ lưu trong DB là Local, nếu là UTC thì cần .ToLocalTime()
                // return DateTime.SpecifyKind(result, DateTimeKind.Utc).ToLocalTime();
                return DateTime.SpecifyKind(result, DateTimeKind.Unspecified); // Hoặc Local nếu chắc chắn
            }
            else
            {
                Debug.WriteLine($"[DatabaseHelper] Warning: Could not parse DateTime string '{dateTimeString}' using format '{SqliteDateTimeFormat}'. Returning default value.");
                return defaultValue;
            }
        }
    }
}
#nullable restore