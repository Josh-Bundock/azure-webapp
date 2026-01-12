// Wait for the Document Object Model (DOM) to fully load
document.addEventListener('DOMContentLoaded', () => {
    // Get references to HTML elements
    const button = document.getElementById('addItemButton');
    const input = document.getElementById('fullNameInput');
    const staffInput = document.getElementById('staffNumber');
    const locationInput = document.getElementById('location');

    // Add click event listener to the button
    button.addEventListener('click', async () => {
        const fullName = input.value.trim();
        const staffNumber = staffInput.value.trim();
        const location = locationInput.value;

        // Validate input
        if (!fullName) {
            alert("Please enter a full name before submitting.");
            return;
        }
        if (!staffNumber) {
            alert("Please enter a staff number before submitting.");
            return;
        }

        // Send data to server
        try {
            const response = await fetch('/add-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, staffNumber, location })
            });

            if (response.ok) {
                alert('Item added successfully!');

                // Clear inputs
                input.value = "";
                staffInput.value = "";
                locationInput.selectedIndex = 0;

                // Refresh list immediately
                await loadMessages();
            } else {
                alert(await response.text());
            }
        } catch (error) {
            console.error(error);
            alert('Error adding item');
        }
    });

    // Load messages when the web page opens
    loadMessages();
});

// Format ISO date string into readable local date/time
function formatDateTime(isoString) {
    if (!isoString) return "";
    return new Date(isoString).toLocaleString();
}

// Fetch and render all messages in the list
async function loadMessages() {
    const container = document.getElementById('messagesList');
    container.innerHTML = ""; // clear previous items

    const res = await fetch('/items');
    const items = await res.json();

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = "message-item";

        const createdText = formatDateTime(item.createdAt);

        div.innerHTML = `
            <div>
                <p>${item.fullName}</p>
                <small>${createdText}</small>
            </div>
            <button class="infoBtn" data-id="${item.id}">Information</button>
        `;

        container.appendChild(div);
    });

    attachButtonEvents(items);
}

// Attach events to Information button + modal buttons
function attachButtonEvents(items) {
    const modal = document.getElementById('infoModal');
    const modalFullName = document.getElementById('modalFullName');
    const modalStaff = document.getElementById('modalStaffNumber');
    const modalLocation = document.getElementById('modalLocation');

    // If you added a createdAt display in the modal like:
    // <span id="modalCreatedAt"></span>
    // then uncomment the next line and also set it below.
    const modalCreatedAt = document.getElementById('modalCreatedAt');

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
            modalLocation.value = item.location || "Alwyn Hall";

            // Show created time in the modal (only if the element exists)
            if (modalCreatedAt) {
                modalCreatedAt.textContent = formatDateTime(item.createdAt) || "—";
            }

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
        const location = modalLocation.value;

        if (!fullName) {
            alert("Full name cannot be empty");
            return;
        }
        if (!staffNumber) {
            alert("Staff number cannot be empty");
            return;
        }

        await fetch(`/update-item/${currentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, staffNumber, location })
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
