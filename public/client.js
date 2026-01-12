// Wait for the Document Object Model (DOM) to fully load
document.addEventListener('DOMContentLoaded', () => {
    // Get references to HTML elements
    const button = document.getElementById('addItemButton'); // The "Submit" button
    const input = document.getElementById('fullNameInput'); // The text field
    const staffInput = document.getElementById('staffNumber'); // NEW

    
    // Add click event listener to the button
    button.addEventListener('click', async () => {
        // Get the value typed by the user
        const fullName = input.value.trim(); // Remove extra spaces
        const staffNumber = staffInput.value.trim(); // NEW
        
        // Validate input
        if (!fullName) {
            alert("Please enter a message before submitting.");
            return; // Stop if empty
        }

        // Send message to server via fetch
        try {
            const response = await fetch('/add-item', {
                method: 'POST', // POST request
                headers: { 'Content-Type': 'application/json' }, // Send JSON
                body: JSON.stringify({ fullName, staffNumber }) // Wrap message in JSON
            });
            // Handle server response
            if (response.ok) {
                alert('Message added successfully!');
                input.value = ""; // Clear input after success
            } else {
                alert('Error adding message');
            }
        } catch (error) {
        console.error(error);
        alert('Error adding message');
        }
    });
    loadMessages(); // Load messages when the web page opens
});


// Fetch and render all messages in the list
async function loadMessages() {
    const container = document.getElementById('messagesList');
    container.innerHTML = ""; // clear previous items

    const res = await fetch('/items');
    const items = await res.json();

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = "message-item";

        div.innerHTML = `
            <p>${item.fullName}</p>
            <button class="infoBtn" data-id="${item.id}">Information</button>
        `;

        container.appendChild(div);
    });
    attachButtonEvents(items);
}

// Attach events to Update and Delete buttons
function attachButtonEvents(items) {
    const modal = document.getElementById('infoModal');
    const modalFullName = document.getElementById('modalFullName');
    const modalStaff = document.getElementById('modalStaffNumber');

    const updateBtn = document.getElementById('modalUpdateBtn');
    const deleteBtn = document.getElementById('modalDeleteBtn');
    const closeBtn = document.getElementById('modalCloseBtn');

    let currentId = null;

    // Open modal when clicking "Information"
    document.querySelectorAll('.infoBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentId = btn.getAttribute('data-id');

            const item = items.find(i => i.id === currentId);
            if (!item) return;

            modalFullName.value = item.fullName || "";
            modalStaff.value = item.staffNumber || "";

            modal.classList.remove('hidden');
        });
    });

    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        currentId = null;
    });

    // Update from modal
    updateBtn.addEventListener('click', async () => {
        if (!currentId) return;

        const fullName = modalFullName.value.trim();
        const staffNumber = modalStaff.value.trim();

        if (!fullName) {
            alert("Message cannot be empty");
            return;
        }
        if (!staffNumber) {
            alert("Staff number cannot be empty");
            return;
        }

        await fetch(`/update-item/${currentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, staffNumber })
        });

        modal.classList.add('hidden');
        currentId = null;
        loadMessages();
    });

    // Delete from modal
    deleteBtn.addEventListener('click', async () => {
        if (!currentId) return;

        const ok = confirm("Are you sure you want to delete this item?");
        if (!ok) return;

        await fetch(`/delete-item/${currentId}`, { method: 'DELETE' });

        modal.classList.add('hidden');
        currentId = null;
        loadMessages();
    });
}
