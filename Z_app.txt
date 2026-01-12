// Import the modules required for the cloud-based web applications (Express, Cosmosdb, Node.js)
const express = require('express');
const { CosmosClient } = require('@azure/cosmos');
const path = require('path');

// Create the Express app & define port
const app = express();
const port = process.env.PORT || 3000;

// Cosmos DB connection details
const endpoint = "https://dftc-cosmosdb.documents.azure.com:443/";

const client = new CosmosClient({ endpoint, key });

// Your chosen database and container names
const databaseId = "guestbook-db";
const containerId = "messages";

// Middleware - Parse incoming JSON for POST requests
app.use(express.json());

// Middleware - Serve static files (HTML, CSS, JS) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Initialize CosmosDB (database and container) - Ensure they both exist
async function initCosmos() {
    const { database } = await client.databases.createIfNotExists({ id: databaseId
});
    await database.containers.createIfNotExists({
        id: containerId,
        partitionKey: { kind: "Hash", paths: ["/id"] }
    });
    console.log("Cosmos DB is ready");
}

// Add an item to CosmosDB
async function addItem(item) {
    // Ensure database and container exist (optional here, already in initCosmos)
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    const { container } = await database.containers.createIfNotExists({ id: containerId });
    // Create the item in the container
    const { resource: createdItem } = await container.items.create(item);
    console.log(`Created item with id: ${createdItem.id}`);
}

// POST route to add a guestbook message
app.post('/add-item', async (req, res) => {
    const fullName = req.body.fullName;
    const staffNumber = (req.body.staffNumber || "");

    if (!fullName || fullName.trim() === "") {
    return res.status(400).send("Full name cannot be empty");
    }

    const newItem = {
    id: new Date().toISOString(),
    fullName: fullName.trim(),
    staffNumber: staffNumber.trim(),
    _partitionKey: "guestbook"
    };

    try {
        await addItem(newItem);
        res.sendStatus(200);
    } catch (error) {
        console.error("Error adding item to Cosmos DB:", error);
        res.sendStatus(500);
    }
});


// GET route to read all items (guestbook messages)
app.get('/items', async (req, res) => {
    try {
        const { database } = await client.databases.createIfNotExists({ id: databaseId });
        const { container } = await database.containers.createIfNotExists({ id: containerId });

        const { resources: items } = await container.items.query('SELECT * FROM c').fetchAll();

        res.json(items);
    } catch (error) {
        console.error("Error fetching items:", error);
        res.sendStatus(500);
    }
});

// UPDATE an item by ID (message and/or staffNumber)
app.put('/update-item/:id', async (req, res) => {
    const id = req.params.id;

    const newFullName = req.body.fullName;
    const newStaffNumber = req.body.staffNumber;

    if (newFullName === undefined && newStaffNumber === undefined) {
    return res.status(400).send("Provide 'fullName' and/or 'staffNumber' to update");
    }

    if (newFullName !== undefined && String(newFullName).trim() === "") {
    return res.status(400).send("Full name cannot be empty");
    }

    if (newStaffNumber !== undefined && String(newStaffNumber).trim() === "") {
    return res.status(400).send("Staff number cannot be empty");
    }

    try {
        const { database } = await client.databases.createIfNotExists({ id: databaseId });
        const { container } = await database.containers.createIfNotExists({ id: containerId });

        const { resource: item } = await container.item(id, id).read();

        if (newFullName !== undefined) item.fullName = String(newFullName).trim();
        if (newStaffNumber !== undefined) item.staffNumber = String(newStaffNumber).trim();

        await container.item(id, id).replace(item);
        res.sendStatus(200);
    } catch (error) {
        console.error("Error updating item:", error);
        res.sendStatus(500);
    }
});


// DELETE an item by ID
app.delete('/delete-item/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const { database } = await client.databases.createIfNotExists({ id: databaseId });
        const { container } = await database.containers.createIfNotExists({ id: containerId });

        await container.item(id, id).delete();
        res.sendStatus(200);
    } catch (error) {
        console.error("Error deleting item:", error);
        res.sendStatus(500);
    }
});


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Start the server
app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});