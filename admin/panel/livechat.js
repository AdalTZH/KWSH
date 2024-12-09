const rowsPerPage = 12;
let currentPage = { livechat: 1 };

const maxCommentLength = 100; // Maximum length for comment display

function truncate(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatTime(dateString) {
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return new Date(dateString).toLocaleTimeString(undefined, options);
}

function displayTable(page, data, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = ''; // Clear existing rows

    const start = (page - 1) * rowsPerPage;
    const end = page * rowsPerPage;
    const paginatedItems = data.slice(start, end);

    for (const item of paginatedItems) {
        const truncatedComment = truncate(item.Comment, maxCommentLength);
        if (item.LiveSession_id === 0) continue;

        // Format the date and time before displaying
        const formattedDate = item.Date ? formatDate(item.Date) : 'N/A';
        const formattedTime = item.Date ? formatTime(item.Date) : 'N/A';

        const row = `<tr>
            <td>${item.LiveSession_id}</td>
            <td>${item.Rating}</td>
            <td title="${item.Comment}">${truncatedComment}</td>
            <td>${item.Email}</td>
            <td>${formattedDate}</td>
            <td>${formattedTime}</td>
            <td class="action-buttons">
                <button class="material-icons-sharp delete-btn" data-id="${item.LiveSession_id}">delete</button>
            </td>
        </tr>`;
        tbody.innerHTML += row;
    }

    // Add event listeners for delete button
    document.querySelectorAll(`#${tbodyId} .delete-btn`).forEach(button => {
        button.addEventListener('click', handleDelete);
    });
}

function handleDelete(event) {
    const id = event.target.getAttribute('data-id');
    if (confirm('Are you sure you want to delete this live chat feedback?')) {
        fetch(`http://localhost:3000/livechat-feedback/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Live chat feedback deleted successfully!');
                location.reload(); // Reload the page to reflect changes
            } else {
                alert('Failed to delete live chat feedback.');
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

function prevPage(type) {
    if (currentPage[type] > 1) {
        currentPage[type]--;
        fetchLiveChatFeedback();
    }
}

function nextPage(type) {
    fetch('http://localhost:3000/livechat-feedback').then(response => response.json()).then(data => {
        if ((currentPage[type] * rowsPerPage) < data.length) {
            currentPage[type]++;
            fetchLiveChatFeedback();
        }
    }).catch(error => console.error('Error fetching live chat feedback data:', error));
}

function fetchLiveChatFeedback() {
    fetch('http://localhost:3000/livechat-feedback')
        .then(response => response.json())
        .then(data => {
            console.log('Fetched live chat feedback data:', data); // Log fetched data
            displayTable(currentPage.livechat, data, 'livechat-tbody');
        })
        .catch(error => console.error('Error fetching live chat feedback data:', error));
}

// Initialize table with the first page
fetchLiveChatFeedback();
