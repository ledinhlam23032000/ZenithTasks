#nullable enable
using System;
using System.Globalization;
using System.Windows; // Cần cho Visibility
using System.Windows.Data;

namespace PersonalProjectManager.Converters
{
    /// <summary>
    /// Chuyển đổi một giá trị số (thường là Count) thành Visibility.
    /// Mục đích: Hiển thị một phần tử (ví dụ: TextBlock "Không có...") KHI giá trị là 0,
    /// và ẩn nó đi khi giá trị khác 0.
    /// Có thể đảo ngược logic bằng cách truyền Parameter="Invert".
    /// </summary>
    [ValueConversion(typeof(int), typeof(Visibility))]
    [ValueConversion(typeof(double), typeof(Visibility))]
    [ValueConversion(typeof(decimal), typeof(Visibility))]
    public class ZeroToVisibilityConverter : IValueConverter
    {
        /// <summary>
        /// Chuyển đổi từ số sang Visibility.
        /// </summary>
        /// <param name="value">Giá trị số (int, double, decimal...).</param>
        /// <param name="targetType">Kiểu đích (Visibility).</param>
        /// <param name="parameter">"Invert" để đảo ngược logic (hiện khi > 0, ẩn khi = 0).</param>
        /// <param name="culture">Thông tin văn hóa.</param>
        /// <returns>Visibility.Visible hoặc Visibility.Collapsed.</returns>
        public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            bool isZero = false;
            bool invert = parameter is string paramString && paramString.Equals("Invert", StringComparison.OrdinalIgnoreCase);

            if (value is int i) isZero = (i == 0);
            else if (value is double d) isZero = Math.Abs(d) < 0.0001; // So sánh số thực
            else if (value is decimal dec) isZero = (dec == 0m);
            else if (value == null) isZero = true; // Coi null như là 0

            // Logic mặc định: Hiện khi isZero = true
            // Logic đảo ngược: Hiện khi isZero = false
            bool shouldBeVisible = invert ? !isZero : isZero;

            return shouldBeVisible ? Visibility.Visible : Visibility.Collapsed;
        }

        /// <summary>
        /// Chuyển đổi ngược không được hỗ trợ.
        /// </summary>
        public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            throw new NotSupportedException("ZeroToVisibilityConverter cannot convert back.");
        }
    }
}
#nullable restore
