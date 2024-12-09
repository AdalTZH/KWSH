document.addEventListener('DOMContentLoaded', () => {
    fetchDashboardUpdates();
    updateTotalInteractions();
    updateTotalLiveSessions();
    updateTotalRatings();
});

function fetchDashboardUpdates() {
    fetch('http://localhost:3000/dashboard-updates')
        .then(response => response.json())
        .then(data => {
            populateUpdatesTable(data);
        })
        .catch(error => console.error('Error fetching dashboard updates:', error));
}

function populateUpdatesTable(data) {
    const tbody = document.getElementById('updates-tbody');
    tbody.innerHTML = ''; // Clear existing rows

    const maxItems = 5; // Maximum number of items to display

    // Create rows by combining the latest queries, comments, and ratings
    for (let i = 0; i < maxItems; i++) {
        const query = data.latestQueries[i] || 'No data';
        const comment = data.latestComments[i] || 'No data';
        const rating = data.latestRatings[i] || 'No data';

        const row = `<tr>
            <td>${query}</td>
            <td>${comment}</td>
            <td>${rating}</td>
        </tr>`;
        
        tbody.innerHTML += row;
    }
}

// Function to fetch total interactions and update the DOM
function updateTotalInteractions() {
    fetch('http://localhost:3000/chat-interactions')
        .then(response => response.json())
        .then(data => {
            // Assume data is an array of objects with ChatID and totalInteractions
            const totalInteractionsElement = document.getElementById('convo');
            
            // Find the total number of interactions
            let totalInteractions = 0;
            data.forEach(item => {
                // Continue to next iteration if ChatID is 0
                if (item.ChatID === 0) return;
                totalInteractions += item.totalInteractions;
            });

            totalInteractionsElement.innerHTML = `<h1>${totalInteractions} Interactions</h1>`;
        })
        .catch(error => {
            console.error('Error fetching total interactions:', error);
        });
}

function updateTotalLiveSessions() {
    fetch('http://localhost:3000/total-live-sessions')
        .then(response => response.json())
        .then(data => {
            const totalLiveSessionsElement = document.getElementById('live-session-count');
            totalLiveSessionsElement.innerHTML = `<h1>${data.totalLiveSessions} times</h1>`;
        })
        .catch(error => {
            console.error('Error fetching total live sessions:', error);
        });
}

function updateTotalRatings() {
    fetch('http://localhost:3000/total-ratings')
        .then(response => response.json())
        .then(data => {
            const totalRatingsElement = document.getElementById('rating-count');
            totalRatingsElement.innerHTML = `<h1>${data.totalRatings}</h1>`;
        })
        .catch(error => {
            console.error('Error fetching total ratings:', error);
        });
}

// Function to handle logout
function logout() {
    window.location.href = '../index.html';
}

function reloadData() {
    fetchDashboardUpdates();
    updateTotalInteractions();
    updateTotalLiveSessions();
    updateTotalRatings();
}

// Add event listener to the reload button
const reloadButton = document.getElementById('reloadButton');
if (reloadButton) {
    reloadButton.addEventListener('click', function () {
        reloadData();
    });
}

// Add event listener to the logout button
const logoutButton = document.getElementById('logoutButton');
if (logoutButton) {
    logoutButton.addEventListener('click', function () {
        logout();
    });
}



