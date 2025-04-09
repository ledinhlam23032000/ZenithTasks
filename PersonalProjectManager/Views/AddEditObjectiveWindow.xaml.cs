#nullable enable
using PersonalProjectManager.ViewModels;
using System.Windows;

namespace PersonalProjectManager.Views
{
    /// <summary>
    /// Interaction logic for AddEditObjectiveWindow.xaml
    /// </summary>
    public partial class AddEditObjectiveWindow : Window
    {
        public AddEditObjectiveWindow(AddEditObjectiveViewModel viewModel)
        {
            InitializeComponent();
            DataContext = viewModel;

            // Gán sự kiện cho ViewModel để đóng Window
            viewModel.OnSave = (objective) =>
            {
                DialogResult = true; // Đóng Window với kết quả OK
                // ViewModel sẽ xử lý việc lưu dữ liệu
            };
            viewModel.OnCancel = () =>
            {
                DialogResult = false; // Đóng Window với kết quả Cancel
            };
        }

        private void SaveButton_Click(object sender, RoutedEventArgs e)
        {
            if (DataContext is AddEditObjectiveViewModel vm)
            {
                // Gọi phương thức Save của ViewModel, nó sẽ gọi OnSave nếu thành công
                // và OnSave sẽ set DialogResult = true
                if (vm.Save())
                {
                    // Đóng window (DialogResult đã được set bởi OnSave)
                }
                // Nếu Save() trả về false (do validation), không đóng window
            }
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            // DialogResult sẽ tự động là false do IsCancel=True
            // Nếu muốn gọi logic Cancel của ViewModel (hiện không cần) thì gọi vm.Cancel() ở đây
            // Rồi mới đóng window hoặc để IsCancel tự xử lý
        }
    }
}
#nullable restore