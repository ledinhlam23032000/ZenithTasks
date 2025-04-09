#nullable enable
using System;
using System.Globalization;
using System.Windows.Data;
using System.Windows.Media; // Cần cho Brush và Brushes

namespace PersonalProjectManager.Converters
{
    /// <summary>
    /// Converts a Boolean value to a Brush (e.g., Green for false, Red for true).
    /// Useful for changing text color based on error status.
    /// Parameter can be "Invert" to swap the colors.
    /// </summary>
    [ValueConversion(typeof(bool), typeof(Brush))]
    public class BooleanToBrushConverter : IValueConverter
    {
        // Bạn có thể thay đổi màu mặc định ở đây nếu muốn
        public Brush TrueBrush { get; set; } = Brushes.Red; // Màu khi bool là true (mặc định là lỗi)
        public Brush FalseBrush { get; set; } = Brushes.Green; // Màu khi bool là false (mặc định là thành công/bình thường)

        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            bool boolValue = false;
            if (value is bool b)
            {
                boolValue = b;
            }

            bool invert = parameter is string paramString && paramString.Equals("Invert", StringComparison.OrdinalIgnoreCase);

            if (invert)
            {
                // Nếu invert: true -> FalseBrush, false -> TrueBrush
                return boolValue ? FalseBrush : TrueBrush;
            }
            else
            {
                // Mặc định: true -> TrueBrush, false -> FalseBrush
                return boolValue ? TrueBrush : FalseBrush;
            }
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            // Chuyển đổi ngược thường không cần thiết cho converter này
            throw new NotSupportedException("BooleanToBrushConverter cannot convert back.");
        }
    }
}
#nullable restore