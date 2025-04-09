#nullable enable
using System;
using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace PersonalProjectManager.Converters
{
    [ValueConversion(typeof(bool), typeof(Visibility))]
    [ValueConversion(typeof(bool?), typeof(Visibility))]
    public class InverseBooleanToVisibilityConverter : IValueConverter
    {
        public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            bool boolValue = false;
            // Sửa cách kiểm tra nullable bool
            if (value is bool b)
            {
                boolValue = b;
            }
            else if (value == null && targetType == typeof(bool?)) // Nếu là nullable bool và giá trị là null
            {
                boolValue = false; // Coi null là false
            }
            // Bỏ trường hợp else if (value is bool? nb) ...

            // Đảo ngược logic so với BooleanToVisibilityConverter thông thường
            return boolValue ? Visibility.Collapsed : Visibility.Visible;
        }

        public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            if (value is Visibility visibility)
            {
                // Đảo ngược logic
                return visibility != Visibility.Visible;
            }
            return false;
        }
    }
}
#nullable restore
