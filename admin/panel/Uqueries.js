const rowsPerPage = 12;
let currentPage = 1;
const maxQuestionLength = 50; // Maximum length for question display

function truncate(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function displayTable(page, data) {
    const tbody = document.getElementById('query-tbody');
    tbody.innerHTML = ''; // Clear existing rows

    const start = (page - 1) * rowsPerPage;
    const end = page * rowsPerPage;
    const paginatedItems = data.slice(start, end);

    for (const item of paginatedItems) {
        const truncatedQuestion = truncate(item.UnansweredQuery, maxQuestionLength);
        if (item.UnansweredQuery_id === 0) continue;
        const row = `<tr>
            <td>${item.UnansweredQuery_id}</td>
            <td title="${item.UnansweredQuery}">${truncatedQuestion}</td>
            <td class="action-buttons">
            <button class="material-symbols-outlined view-query-btn" data-id="${item.UnansweredQuery_id}">visibility</button>
                <button class="material-icons-sharp delete-btn" data-id="${item.UnansweredQuery_id}">delete</button>
            </td>
        </tr>`;
        tbody.innerHTML += row;
    }

    // Add event listeners for read and delete button

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', handleDelete);
    });

    document.querySelectorAll('.view-query-btn').forEach(button => {
        button.addEventListener('click', handleViewQuery);
    });
}

function handleDelete(event) {
    const id = event.target.getAttribute('data-id');
    if (confirm('Are you sure you want to delete this query?')) {
        fetch(`http://localhost:3000/unanswered-queries/${id}`, {
            method: 'DELETE',
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Query deleted successfully');
                // Refresh the table after deletion
                fetch('http://localhost:3000/unanswered-queries')
                    .then(response => response.json())
                    .then(data => displayTable(currentPage, data))
                    .catch(error => console.error('Error fetching unanswered queries:', error));
            } else {
                alert('Error deleting query');
            }
        })
        .catch(error => console.error('Error deleting query:', error));
    }
}

function handleViewQuery(event) {
    const id = event.target.getAttribute('data-id');

    // Fetch the data for the selected unanswered query
    fetch(`http://localhost:3000/unanswered-queries/${id}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('view-query-text').textContent = data.UnansweredQuery;
            document.getElementById('view-query-container').style.display = 'block';
        })
        .catch(error => console.error('Error fetching query data:', error));
}

// Add event listeners to view buttons
document.addEventListener('click', (event) => {
    const viewQueryContainer = document.getElementById('view-query-container');
    const viewQueryBtn = document.querySelectorAll('.view-query-btn');
    
    if (!viewQueryContainer.contains(event.target) && !viewQueryBtn.some(btn => btn.contains(event.target))) {
        viewQueryContainer.style.display = 'none';
    }
});

// Add event listener for the close button
document.getElementById('close-view-query-btn').addEventListener('click', () => {
    document.getElementById('view-query-container').style.display = 'none';
});


function prevPage(data) {
    if (currentPage > 1) {
        currentPage--;
        displayTable(currentPage, data);
    }
}

function nextPage(data) {
    if ((currentPage * rowsPerPage) < data.length) {
        currentPage++;
        displayTable(currentPage, data);
    }
}

// Fetch and initialize table with the first page of data
fetch('http://localhost:3000/unanswered-queries')
    .then(response => response.json())
    .then(data => {
        displayTable(currentPage, data);
        
        // Add pagination controls
        document.getElementById('prev-btn').addEventListener('click', () => prevPage(data));
        document.getElementById('next-btn').addEventListener('click', () => nextPage(data));
    })
    .catch(error => console.error('Error fetching unanswered queries:', error));
