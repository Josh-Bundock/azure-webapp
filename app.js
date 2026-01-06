// Import the modules required for the cloud-based web applications (Express, Cosmosdb, Node.js)
const express = require('express');
const { CosmosClient } = require('@azure/cosmos');
const path = require('path');

// Create the Express app & define port
const app = express();
const port = process.env.PORT || 3000;

// Cosmos DB connection details
const endpoint = process.env.COSMOS_URI;
const key = process.env.COSMOS_PRIMARY_KEY;
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
    const userMessage = req.body.message;
    
    if (!userMessage || userMessage.trim() === "") {
        return res.status(400).send("Message cannot be empty");
    }

    // Create item object with unique ID
    const newItem = {
        id: new Date().toISOString(),
        message: userMessage.trim(),
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

// UPDATE an item by ID
app.put('/update-item/:id', async (req, res) => {
    const id = req.params.id;
    const newMessage = req.body.message;

    if (!newMessage) return res.status(400).send("Message cannot be empty");
    
    try {
        const { database } = await client.databases.createIfNotExists({ id: databaseId });
        const { container } = await database.containers.createIfNotExists({ id: containerId });

        const { resource: item } = await container.item(id, id).read();
        item.message = newMessage;

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