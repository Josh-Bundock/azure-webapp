// Wait for the Document Object Model (DOM) to fully load
document.addEventListener('DOMContentLoaded', () => {
    // Get references to HTML elements
    const button = document.getElementById('addItemButton'); // The "Submit" button
    const input = document.getElementById('messageInput'); // The text field
    
    // Add click event listener to the button
    button.addEventListener('click', async () => {
        // Get the value typed by the user
        const message = input.value.trim(); // Remove extra spaces
        
        // Validate input
        if (!message) {
            alert("Please enter a message before submitting.");
            return; // Stop if empty
        }

        // Send message to server via fetch
        try {
            const response = await fetch('/add-item', {
                method: 'POST', // POST request
                headers: { 'Content-Type': 'application/json' }, // Send JSON
                body: JSON.stringify({ message }) // Wrap message in JSON
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
            <p>${item.message}</p>
            <button class="updateBtn" data-id="${item.id}">Update</button>
            <button class="deleteBtn" data-id="${item.id}">Delete</button>
            `;

        container.appendChild(div);
    });
    attachButtonEvents();
}

// Attach events to Update and Delete buttons
function attachButtonEvents() {
    document.querySelectorAll('.deleteBtn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');

            await fetch(`/delete-item/${id}`, { method: 'DELETE' });
            loadMessages();
        });
    });
    
    document.querySelectorAll('.updateBtn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const newMessage = prompt("Enter new message:");
        
            if (!newMessage) return;
        
            await fetch(`/update-item/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: newMessage })
            });
            
            loadMessages();
        });
    });
}