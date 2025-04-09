#nullable enable
using System;
using System.Globalization;
using System.Windows; // Cần cho Visibility
using System.Windows.Data;

namespace PersonalProjectManager.Converters
{
    [ValueConversion(typeof(bool), typeof(Visibility))]
    [ValueConversion(typeof(bool?), typeof(Visibility))] // Hỗ trợ cả nullable bool
    public class BooleanToVisibilityConverter : IValueConverter
    {
        public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            bool boolValue = false;
            // Sửa cách kiểm tra nullable bool
            if (value is bool b)
            {
                boolValue = b;
            }
            // Bỏ kiểm tra 'is bool?' vì CS8116
            // else if (value == null && targetType == typeof(bool?)) // Cách kiểm tra khác nếu cần
            // {
            //     boolValue = false; // Coi null là false
            // }

            bool invert = parameter is string paramString && paramString.Equals("Invert", StringComparison.OrdinalIgnoreCase);

            if (invert)
            {
                return boolValue ? Visibility.Collapsed : Visibility.Visible;
            }
            else
            {
                return boolValue ? Visibility.Visible : Visibility.Collapsed;
            }
        }

        public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            bool invert = parameter is string paramString && paramString.Equals("Invert", StringComparison.OrdinalIgnoreCase);
            if (value is Visibility visibility)
            {
                bool result = (visibility == Visibility.Visible);
                return invert ? !result : result;
            }
            return false;
        }
    }
}
#nullable restore
