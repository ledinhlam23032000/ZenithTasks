#nullable enable
using System;
using System.Globalization;
using System.Windows.Data;

namespace PersonalProjectManager.Converters
{
    /// <summary>
    /// Chuyển đổi giá trị null thành false và giá trị không null thành true.
    /// Hữu ích để bật/tắt các control dựa trên việc một đối tượng có được chọn hay không.
    /// Ví dụ: bật nút "Xem chi tiết" chỉ khi SelectedProject không null.
    /// </summary>
    [ValueConversion(typeof(object), typeof(bool))]
    public class NullToBooleanConverter : IValueConverter
    {
        /// <summary>
        /// Chuyển đổi từ nguồn (source) sang đích (target).
        /// </summary>
        /// <param name="value">Giá trị cần chuyển đổi (ViewModel property).</param>
        /// <param name="targetType">Kiểu dữ liệu đích (thường là bool).</param>
        /// <param name="parameter">Tham số tùy chọn (không dùng ở đây).</param>
        /// <param name="culture">Thông tin văn hóa (không dùng ở đây).</param>
        /// <returns>True nếu value không null, ngược lại False.</returns>
        public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            // Nếu có tham số "Invert", đảo ngược logic
            bool invert = parameter is string paramString && paramString.Equals("Invert", StringComparison.OrdinalIgnoreCase);

            bool result = (value != null);
            return invert ? !result : result;
        }

        /// <summary>
        /// Chuyển đổi ngược từ đích (target) về nguồn (source).
        /// Thường không cần thiết cho binding một chiều hoặc khi logic không cần chuyển ngược.
        /// </summary>
        public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            // Không triển khai chuyển đổi ngược cho trường hợp này
            throw new NotSupportedException("NullToBooleanConverter cannot convert back.");
        }
    }
}
#nullable restore
