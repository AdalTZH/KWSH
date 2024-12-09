const rowsPerPage = 5;
let currentPage = { cti: 1, queenbee: 1 };
const maxQuestionLength = 50; // Maximum length for question display
const maxAnswerLength = 100; // Maximum length for answer display

function truncate(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function displayTable(page, data, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = ''; // Clear existing rows

    const start = (page - 1) * rowsPerPage;
    const end = page * rowsPerPage;
    const paginatedItems = data.slice(start, end);

    for (const item of paginatedItems) {
        const truncatedQuestion = truncate(item.question, maxQuestionLength);
        const truncatedAnswer = truncate(item.answer, maxAnswerLength);
        const row = `<tr>
            <td>${item.FAQID}</td>
            <td title="${item.question}">${truncatedQuestion}</td>
            <td title="${item.answer}">${truncatedAnswer}</td>
            <td class="action-buttons">
                <button class="material-symbols-outlined read-btn" data-id="${item.FAQID}">visibility</button>
                <button class="material-icons-sharp edit-btn" data-id="${item.FAQID}">edit</button>
                <button class="material-icons-sharp delete-btn" data-id="${item.FAQID}">delete</button>
            </td>
        </tr>`;
        tbody.innerHTML += row;
    }

    // Add event listeners for edit, delete, and read buttons
    document.querySelectorAll(`#${tbodyId} .edit-btn`).forEach(button => {
        button.addEventListener('click', handleEdit);
    });

    document.querySelectorAll(`#${tbodyId} .delete-btn`).forEach(button => {
        button.addEventListener('click', handleDelete);
    });

    document.querySelectorAll(`#${tbodyId} .read-btn`).forEach(button => {
        button.addEventListener('click', handleRead);
    });
}

function handleRead(event) {
    const id = event.target.getAttribute('data-id');

    // Fetch the data for the selected FAQ
    fetch(`http://localhost:3000/faqs/${id}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('view-faq-question').value = data.question;
            document.getElementById('view-faq-answer').value = data.answer;
            document.getElementById('view-faq-cti').value = data.CTI;
            document.getElementById('view-form-container').style.display = 'block';
        })
        .catch(error => console.error('Error fetching FAQ data:', error));
}

function handleEdit(event) {
    const id = event.target.getAttribute('data-id');

    // Fetch the data for the selected FAQ
    fetch(`http://localhost:3000/faqs/${id}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('edit-faq-id').value = data.FAQID;
            document.getElementById('edit-faq-question').value = data.question;
            document.getElementById('edit-faq-answer').value = data.answer;
            document.getElementById('edit-faq-cti').value = data.CTI;
            document.getElementById('edit-form-container').style.display = 'block';
        })
        .catch(error => console.error('Error fetching FAQ data:', error));
}

function handleDelete(event) {
    const id = event.target.getAttribute('data-id');
    if (confirm('Are you sure you want to delete this FAQ?')) {
        fetch(`http://localhost:3000/faqs/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('FAQ deleted successfully!');
                location.reload(); // Reload the page to reflect changes
            } else {
                alert('Failed to delete FAQ.');
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

function prevPage(type) {
    if (currentPage[type] > 1) {
        currentPage[type]--;
        fetchFAQs(type);
    }
}

function nextPage(type) {
    fetch(`http://localhost:3000/faqs?cti=${type === 'cti'}`).then(response => response.json()).then(data => {
        if ((currentPage[type] * rowsPerPage) < data.length) {
            currentPage[type]++;
            fetchFAQs(type);
        }
    }).catch(error => console.error('Error fetching FAQ data:', error));
}

function fetchFAQs(type) {
    fetch(`http://localhost:3000/faqs?cti=${type === 'cti'}`)
        .then(response => response.json())
        .then(data => {
            const tbodyId = type === 'cti' ? 'faq-tbody' : 'queenbee-faq-tbody';
            displayTable(currentPage[type], data, tbodyId);
        })
        .catch(error => console.error('Error fetching FAQ data:', error));
}

// Initialize table with the first page
fetchFAQs('cti');
fetchFAQs('queenbee');

document.addEventListener('DOMContentLoaded', () => {
    const createFaqBtn = document.getElementById('create-faq-btn');
    const faqFormContainer = document.getElementById('faq-form-container');
    const closeFormBtn = document.getElementById('close-form-btn');
    const editFormContainer = document.getElementById('edit-form-container');
    const closeEditFormBtn = document.getElementById('close-edit-form-btn');
    const viewFormContainer = document.getElementById('view-form-container');
    const closeViewFormBtn = document.getElementById('close-view-form-btn');

    // Show the form when the button is clicked
    createFaqBtn.addEventListener('click', () => {
        faqFormContainer.style.display = 'block';
    });
    
    closeFormBtn.addEventListener('click', () => {
        faqFormContainer.style.display = 'none';
    });

    closeEditFormBtn.addEventListener('click', () => {
        editFormContainer.style.display = 'none';
    });

    closeViewFormBtn.addEventListener('click', () => {
        viewFormContainer.style.display = 'none';
    });

    // Add a click event listener to the document to hide the form if clicked outside of it
    document.addEventListener('click', (event) => {
        document.addEventListener('click', (event) => {
        if (!faqFormContainer.contains(event.target) && !createFaqBtn.contains(event.target)) {
            faqFormContainer.style.display = 'none';
        }
        if (!editFormContainer.contains(event.target) && !document.querySelector('.edit-btn').contains(event.target)) {
            editFormContainer.style.display = 'none';
        }
        if (!viewFormContainer.contains(event.target) && !document.querySelector('.read-btn').contains(event.target)) {
            viewFormContainer.style.display = 'none';
        }
    });
    });

    closeViewFormBtn.addEventListener('click', () => {
        document.getElementById('view-form-container').style.display = 'none';
    });

    closeFormBtn.addEventListener('click', () => {
        faqFormContainer.style.display = 'none';
    });

    closeEditFormBtn.addEventListener('click', () => {
        editFormContainer.style.display = 'none';
    });

    document.getElementById('faq-form').addEventListener('submit', event => {
        event.preventDefault(); // Prevent the default form submission

        const question = document.getElementById('faq-question').value;
        const answer = document.getElementById('faq-answer').value;
        
        if (!question || !answer) {
            alert('Please fill out both the question and answer fields.');
            return;
        }

        // Handle the form submission for creating FAQs
        const cti = document.getElementById('faq-cti').value;
        const chatbotID = 1; // Replace with the appropriate ChatbotID if needed

        const faqData = {
            question: question,
            answer: answer,
            cti: cti,
            chatbotID: chatbotID
        };

        fetch('http://localhost:3000/faqs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(faqData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('FAQ created successfully!');
                faqFormContainer.style.display = 'none';
                document.getElementById('faq-form').reset();
                // Reload the FAQs to include the new entry
                fetchFAQs('cti');
                fetchFAQs('queenbee');
            } else {
                alert('Failed to create FAQ. Please try again.');
            }
        })
        .catch(error => console.error('Error:', error));
    });
    
    // Handle the form submission for editing FAQs
    document.getElementById('edit-faq-form').addEventListener('submit', event => {
        event.preventDefault(); // Prevent the default form submission
        const id = document.getElementById('edit-faq-id').value;
        const question = document.getElementById('edit-faq-question').value;
        const answer = document.getElementById('edit-faq-answer').value;
        const cti = document.getElementById('edit-faq-cti').value;

        const updatedFaqData = {
            question: question,
            answer: answer,
            cti: cti
        };

        fetch(`http://localhost:3000/faqs/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedFaqData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('FAQ updated successfully!');
                editFormContainer.style.display = 'none';
                document.getElementById('edit-faq-form').reset();
                // Reload the page to get the updated data
                location.reload();
            } else {
                alert('Failed to update FAQ. Please try again.');
            }
        })
        .catch(error => console.error('Error:', error));
    });
});
