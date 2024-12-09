document.addEventListener('DOMContentLoaded', function() {
  const addAdminForm = document.getElementById('add-admin-form');
  const changePasswordForm = document.getElementById('change-password-form');

  if (addAdminForm) {
      addAdminForm.addEventListener('submit', function(event) {
          event.preventDefault();

          const username = document.getElementById('admin-username').value;
          const password = document.getElementById('admin-password').value;
          const email = document.getElementById('admin-email').value;
          const phoneNo = document.getElementById('admin-phone').value;

          fetch('http://localhost:3000/add-admin', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  username,
                  password,
                  email,
                  phoneNo
              })
          })
          .then(response => response.json())
          .then(data => {
              if (data.success) {
                  alert('Admin added successfully.');
                  addAdminForm.reset();
              } else {
                  alert('Error adding admin: ' + data.message);
              }
          })
          .catch(error => {
              console.error('Error:', error);
              alert('Error adding admin.');
          });
      });
  }

  if (changePasswordForm) {
      changePasswordForm.addEventListener('submit', function(event) {
          event.preventDefault();

          const userId = document.getElementById('user-id').value;
          const currentPassword = document.getElementById('current-password').value;
          const newPassword = document.getElementById('new-password').value;
          const confirmPassword = document.getElementById('confirm-password').value;

          if (newPassword !== confirmPassword) {
              alert('New passwords do not match.');
              return;
          }

          fetch('http://localhost:3000/change-password', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  userId,
                  currentPassword,
                  newPassword
              })
          })
          .then(response => response.json())
          .then(data => {
              if (data.success) {
                  alert('Password changed successfully.');
                  changePasswordForm.reset();
              } else {
                  alert('Error changing password: ' + data.message);
              }
          })
          .catch(error => {
              console.error('Error:', error);
              alert('Error changing password.');
          });
      });
  }
});
