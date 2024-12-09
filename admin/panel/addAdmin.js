document.getElementById('add-admin-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    const confirmPassword = document.getElementById('admin-confirm-password').value;
    const email = document.getElementById('admin-email').value;
    const phoneNo = document.getElementById('admin-phoneNo').value;

    if (password !== confirmPassword) {
        alert('Passwords do not match.');
        return;
    }

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
            document.getElementById('add-admin-form').reset();
        } else {
            alert('Error adding admin: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error adding admin.');
    });
});