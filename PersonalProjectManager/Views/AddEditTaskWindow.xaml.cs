#nullable enable
using PersonalProjectManager.ViewModels;
using System.Windows;


namespace PersonalProjectManager.Views
{
    /// <summary>
    /// Interaction logic for AddEditTaskWindow.xaml
    /// </summary>
    public partial class AddEditTaskWindow : Window
    {
        public AddEditTaskWindow(AddEditTaskViewModel viewModel)
        {
            InitializeComponent();
            DataContext = viewModel;

            viewModel.OnSave = (task) =>
            {
                DialogResult = true;
            };
            viewModel.OnCancel = () =>
            {
                DialogResult = false;
            };
        }

        private void SaveButton_Click(object sender, RoutedEventArgs e)
        {
            if (DataContext is AddEditTaskViewModel vm)
            {
                if (vm.Save()) // Validation đã được gọi bên trong Save()
                {
                    // Đóng window (DialogResult đã được set bởi OnSave)
                }
            }
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            // Để IsCancel=True tự xử lý
        }
    }
}
#nullable restore