const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB configuration
const uri = "mongodb+srv://mern-book-store:W5WKP1xB1kpD8t9H@cluster0.ur1zclj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect to MongoDB and define collections
async function run() {
  try {
    await client.connect();
    const db = client.db('BookInventontary');
    const notificationsCollection = db.collection("notifications");
    const ordersCollection = db.collection("orders");
    const bookCollection = db.collection("books");

    console.log('Connected to MongoDB');

    // Routes
    app.get('/', (req, res) => {
      res.send('Hello World!');
    });

    // Notifications
    app.get('/notifications/:email', async (req, res) => {
      try {
        const { email } = req.params;
        const notifications = await notificationsCollection.find({ email }).toArray();
        res.status(200).json(notifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
      }
    });

    app.post('/notifications/:email', async (req, res) => {
      const { email } = req.params;
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message content is required' });
      }
      const newNotification = {
        email,
        message,
        timestamp: new Date(),
      };
      try {
        const result = await notificationsCollection.insertOne(newNotification);
        const insertedNotification = await notificationsCollection.findOne({ _id: result.insertedId });
        res.json(insertedNotification);
      } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Failed to send notification' });
      }
    });

    app.delete('/notifications/:email/:messageId', async (req, res) => {
      try {
        const { email, messageId } = req.params;
        const messageObjectId = new ObjectId(messageId);
        const result = await notificationsCollection.deleteOne({ email: email, _id: messageObjectId });
        if (result.deletedCount === 1) {
          res.status(200).json({ success: true, message: 'Message deleted successfully' });
        } else {
          res.status(404).json({ success: false, error: 'Message not found' });
        }
      } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ success: false, error: 'Failed to delete message' });
      }
    });

    // Orders
    app.post('/orders', async (req, res) => {
      const order = req.body;
      try {
        const result = await ordersCollection.insertOne(order);
        res.status(200).json({ message: 'Order placed successfully', result });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to place order', error });
      }
    });

    app.get('/orders', async (req, res) => {
      try {
        const { status, province } = req.query;
        const query = {};
        if (status) query.status = status;
        const orders = await ordersCollection.find(query).toArray();
        res.json(orders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.delete('/orders/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const result = await ordersCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 1) {
          res.status(200).json({ message: 'Order deleted successfully' });
        } else {
          res.status(404).json({ message: 'Order not found' });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete order', error });
      }
    });

    app.put('/orders/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;
        const result = await ordersCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status } });
        if (result.matchedCount === 1) {
          res.status(200).json({ message: 'Order updated successfully' });
        } else {
          res.status(404).json({ message: 'Order not found' });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update order', error });
      }
    });

    app.put('/orders/:orderId/assign', async (req, res) => {
      try {
        const { orderId } = req.params;
        const { assignedPerson } = req.body;
        await ordersCollection.updateOne({ _id: new ObjectId(orderId) }, { $set: { assignedPerson } });
        res.status(200).json({ message: 'Assigned person updated successfully' });
      } catch (error) {
        console.error('Error updating assigned person:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.put('/ordersdelivery/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { delivered } = req.body;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: 'Invalid order ID format' });
        }
        const objectId = new ObjectId(id);
        const result = await ordersCollection.updateOne({ _id: objectId }, { $set: { delivered: delivered ? 'Yes' : 'No' } });
        if (result.modifiedCount === 1) {
          res.status(200).json({ message: 'Order delivery status updated successfully' });
        } else {
          res.status(404).json({ message: 'Order not found' });
        }
      } catch (error) {
        console.error('Error updating delivery status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // Books
    app.post("/upload-book", async (req, res) => {
      const data = req.body;
      try {
        const result = await bookCollection.insertOne(data);
        res.send(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to upload book' });
      }
    });

    app.get("/all-books", async (req, res) => {
      try {
        const books = await bookCollection.find().toArray();
        res.send(books);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch books' });
      }
    });

    app.patch("/book/:id", async (req, res) => {
      const id = req.params.id;
      const updateBookData = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = { $set: { ...updateBookData } };
      try {
        const result = await bookCollection.updateOne(filter, updateDoc, options);
        res.send(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to update book' });
      }
    });

    app.delete("/book/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      try {
        const result = await bookCollection.deleteOne(filter);
        res.send(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete book' });
      }
    });

    app.get("/books/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      try {
        const result = await bookCollection.findOne(filter);
        res.send(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch book' });
      }
    });

    app.get("/books", async (req, res) => {
      const query = req.query.category ? { category: req.query.category } : {};
      try {
        const result = await bookCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch books' });
      }
    });

    // Ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
  }
}
run().catch(console.dir);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
