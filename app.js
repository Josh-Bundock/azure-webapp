// Load environment variables from .env
require('dotenv').config();

// Import modules
const express = require('express');
const session = require('express-session');
const path = require('path');
const { CosmosClient } = require('@azure/cosmos');

// Create the Express app & define port
const app = express();
const port = process.env.PORT || 3000;

// ----- Middleware -----
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // needed for form POST (/login)

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    // secure: true, // enable when running HTTPS
  }
}));

// Serve static files (CSS/JS/images) from public, but do NOT auto-serve index.html for "/"
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// ----- Auth middleware -----
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/login');
}

// ----- Login / Logout routes -----
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const allowedUser = process.env.ADMIN_USERNAME || 'admin';
  const allowedPass = process.env.ADMIN_PASSWORD || '@gmd.63fm0-';

  // Basic check (simple & fine for coursework). For stronger security, use hashed passwords.
  if (username !== allowedUser || password !== allowedPass) {
    return res.status(401).send('Invalid username or password');
  }

  req.session.user = { username };
  return res.redirect('/dashboard');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// ----- Page routes -----
app.get('/', (req, res) => {
  // default page
  res.redirect('/dashboard');
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/warden_log', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----- Cosmos DB connection details -----
// NOTE: You should move endpoint/key into .env in a real system.
// Keeping your current values so your app continues working as-is.
const endpoint = "https://dftc-cosmosdb.documents.azure.com:443/";

const client = new CosmosClient({ endpoint, key });

// Database + container names
const databaseId = "guestbook-db";
const containerId = "messages";

// Ensure CosmosDB database + container exist
async function initCosmos() {
  const { database } = await client.databases.createIfNotExists({ id: databaseId });
  await database.containers.createIfNotExists({
    id: containerId,
    partitionKey: { kind: "Hash", paths: ["/id"] }
  });
  console.log("Cosmos DB is ready");
}

// Add item to Cosmos
async function addItem(item) {
  const { database } = await client.databases.createIfNotExists({ id: databaseId });
  const { container } = await database.containers.createIfNotExists({ id: containerId });
  const { resource: createdItem } = await container.items.create(item);
  console.log(`Created item with id: ${createdItem.id}`);
}

// ----- API routes (protected) -----

// Create a new record
app.post('/add-item', requireAuth, async (req, res) => {
  const fullName = req.body.fullName;
  const staffNumber = (req.body.staffNumber || "");
  const location = (req.body.location || "");

  if (!fullName || fullName.trim() === "") {
    return res.status(400).send("Full name cannot be empty");
  }
  if (!staffNumber || staffNumber.trim() === "") {
    return res.status(400).send("Staff number cannot be empty");
  }

  try {
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    const { container } = await database.containers.createIfNotExists({ id: containerId });

    // ✅ Check if staff number is already in use
    const querySpec = {
      query: "SELECT TOP 1 c.fullName FROM c WHERE c.staffNumber = @staffNumber",
      parameters: [{ name: "@staffNumber", value: staffNumber.trim() }]
    };

    const { resources: existing } = await container.items.query(querySpec).fetchAll();

    if (existing.length > 0) {
        const existingName = existing[0].fullName || "someone";
        return res
            .status(409)
            .send(`Staff number ${staffNumber.trim()} is already in use by ${existingName}.`);
        }

    const newItem = {
      id: new Date().toISOString(),
      fullName: fullName.trim(),
      staffNumber: staffNumber.trim(),
      location: location.trim(),
      createdAt: new Date().toISOString(),
      _partitionKey: "guestbook"
    };

    await container.items.create(newItem);
    return res.sendStatus(200);

  } catch (error) {
    console.error("Error adding item to Cosmos DB:", error);
    return res.sendStatus(500);
  }
});


// Read all records
app.get('/items', requireAuth, async (req, res) => {
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

// Update a record by id (fullName/staffNumber/location)
app.put('/update-item/:id', requireAuth, async (req, res) => {
  const id = req.params.id;

  const newFullName = req.body.fullName;
  const newStaffNumber = req.body.staffNumber;
  const newLocation = req.body.location;

  if (newFullName === undefined && newStaffNumber === undefined && newLocation === undefined) {
    return res.status(400).send("Provide 'fullName' and/or 'staffNumber' and/or 'location' to update");
  }

  if (newFullName !== undefined && String(newFullName).trim() === "") {
    return res.status(400).send("Full name cannot be empty");
  }

  if (newStaffNumber !== undefined && String(newStaffNumber).trim() === "") {
    return res.status(400).send("Staff number cannot be empty");
  }

  if (newLocation !== undefined && String(newLocation).trim() === "") {
    return res.status(400).send("Location cannot be empty");
  }

  try {
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    const { container } = await database.containers.createIfNotExists({ id: containerId });

    const { resource: item } = await container.item(id, id).read();

    if (newFullName !== undefined) item.fullName = String(newFullName).trim();
    if (newStaffNumber !== undefined) item.staffNumber = String(newStaffNumber).trim();
    if (newLocation !== undefined) item.location = String(newLocation).trim();

    // Do NOT change createdAt
    await container.item(id, id).replace(item);

    res.sendStatus(200);
  } catch (error) {
    console.error("Error updating item:", error);
    res.sendStatus(500);
  }
});

// Delete a record by id
app.delete('/delete-item/:id', requireAuth, async (req, res) => {
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

// ----- Start server -----
initCosmos()
  .then(() => {
    app.listen(port, () => {
      console.log(`App listening on port ${port}`);
    });
  })
  .catch(err => {
    console.error("Failed to initialize Cosmos DB:", err);
  });
