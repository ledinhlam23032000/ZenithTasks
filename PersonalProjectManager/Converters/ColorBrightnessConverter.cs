#nullable enable
using System;
using System.Globalization;
using System.Windows.Data;
using System.Windows.Media; // Cần cho Color và SolidColorBrush

namespace PersonalProjectManager.Converters
{
    /// <summary>
    /// Converts a Color or SolidColorBrush to a new SolidColorBrush with adjusted brightness.
    /// Parameter should be a double representing the brightness factor (e.g., 0.8 for darker, 1.2 for lighter).
    /// </summary>
    [ValueConversion(typeof(object), typeof(SolidColorBrush))]
    public class ColorBrightnessConverter : IValueConverter
    {
        public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            Color originalColor = Colors.Transparent; // Màu mặc định nếu không convert được

            if (value is SolidColorBrush brush)
            {
                originalColor = brush.Color;
            }
            else if (value is Color color)
            {
                originalColor = color;
            }
            else
            {
                // Nếu giá trị đầu vào không phải Color hoặc SolidColorBrush, trả về màu gốc hoặc màu trong suốt
                return value as SolidColorBrush ?? new SolidColorBrush(originalColor);
            }

            // Lấy hệ số điều chỉnh độ sáng từ parameter
            double factor = 1.0;
            if (parameter is double d)
            {
                factor = d;
            }
            else if (parameter is string s && double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out double parsedDouble))
            {
                factor = parsedDouble;
            }

            // Đảm bảo factor hợp lệ (ví dụ: > 0)
            if (factor <= 0) factor = 1.0;

            // Điều chỉnh độ sáng (nhân các thành phần RGB với factor, giữ nguyên Alpha)
            // Giới hạn giá trị trong khoảng 0-255
            byte r = (byte)Math.Max(0, Math.Min(255, Math.Round(originalColor.R * factor)));
            byte g = (byte)Math.Max(0, Math.Min(255, Math.Round(originalColor.G * factor)));
            byte b = (byte)Math.Max(0, Math.Min(255, Math.Round(originalColor.B * factor)));

            return new SolidColorBrush(Color.FromArgb(originalColor.A, r, g, b));
        }

        public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            // Chuyển đổi ngược không cần thiết cho trường hợp này
            throw new NotSupportedException("ColorBrightnessConverter cannot convert back.");
        }
    }
}
#nullable restore
