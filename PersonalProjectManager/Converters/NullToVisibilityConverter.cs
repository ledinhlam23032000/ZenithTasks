#nullable enable
using System;
using System.Globalization;
using System.Windows; // Cần cho Visibility
using System.Windows.Data;

namespace PersonalProjectManager.Converters
{
    /// <summary>
    /// Chuyển đổi giá trị null/không null thành Visibility.
    /// Mặc định: Null -> Collapsed, NotNull -> Visible.
    /// Có thể đảo ngược logic bằng Parameter="Invert" (Null -> Visible, NotNull -> Collapsed).
    /// Hữu ích để ẩn/hiện control dựa trên sự tồn tại của dữ liệu (vd: ẩn nội dung khi có lỗi).
    /// </summary>
    [ValueConversion(typeof(object), typeof(Visibility))]
    public class NullToVisibilityConverter : IValueConverter
    {
        public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            // Coi cả chuỗi rỗng hoặc chỉ chứa khoảng trắng là null cho mục đích hiển thị
            bool isNullOrEmpty = (value == null || (value is string s && string.IsNullOrWhiteSpace(s)));
            bool invert = parameter is string paramString && paramString.Equals("Invert", StringComparison.OrdinalIgnoreCase);

            // Mặc định: hiện khi KHÔNG null/empty
            // Đảo ngược: hiện khi CÓ null/empty
            bool shouldBeVisible = invert ? isNullOrEmpty : !isNullOrEmpty;

            return shouldBeVisible ? Visibility.Visible : Visibility.Collapsed;
        }

        public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            // Chuyển đổi ngược thường không cần thiết
            throw new NotSupportedException("NullToVisibilityConverter cannot convert back.");
        }
    }
}
#nullable restore
