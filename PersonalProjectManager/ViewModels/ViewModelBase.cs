using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace PersonalProjectManager.ViewModels
{
    /// <summary>
    /// Lớp cơ sở cho tất cả các ViewModel, triển khai INotifyPropertyChanged.
    /// Giúp giao diện người dùng tự động cập nhật khi thuộc tính thay đổi.
    /// </summary>
    public abstract class ViewModelBase : INotifyPropertyChanged
    {
        public event PropertyChangedEventHandler? PropertyChanged;

        /// <summary>
        /// Thông báo cho UI rằng một thuộc tính đã thay đổi giá trị.
        /// </summary>
        /// <param name="propertyName">Tên của thuộc tính đã thay đổi. Tự động lấy nếu gọi từ setter.</param>
        protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }

        /// <summary>
        /// Helper method to set property value and raise PropertyChanged event if value changed.
        /// </summary>
        /// <typeparam name="T">Type of the property.</typeparam>
        /// <param name="field">Reference to the backing field.</param>
        /// <param name="value">New value.</param>
        /// <param name="propertyName">Name of the property (automatically captured).</param>
        /// <returns>True if the value was changed, false otherwise.</returns>
        protected bool SetProperty<T>(ref T field, T value, [CallerMemberName] string? propertyName = null)
        {
            if (EqualityComparer<T>.Default.Equals(field, value)) return false;
            field = value;
            OnPropertyChanged(propertyName);
            return true;
        }
    }
}
