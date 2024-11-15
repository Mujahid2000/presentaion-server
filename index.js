const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();

//middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@mujahid.frqpuda.mongodb.net/?retryWrites=true&w=majority&appName=Mujahid`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const courseCollection = client.db("project_1").collection("lessons");
    const cartCollection = client.db("project_1").collection("carts");
    const orderCollection = client.db("project_1").collection("orders");

    // Logger middleware
    app.use((req, res, next) => {
      const logDetails = `Method: ${req.method}, URL: ${
        req.originalUrl
      }, Time: ${new Date().toISOString()}`;
      console.log(logDetails); // Log to the console
      next(); // Pass control to the next middleware
    });

    // get lessons
    app.get("/lessons", async (req, res) => {
      const result = await courseCollection.find().toArray();
      res.send(result);
    });

    app.get("/search", async (req, res) => {
      const result = await courseCollection.find().toArray();
      res.send(result);
    });

    // cart
    app.post("/cart", async (req, res) => {
      const cartData = req.body;
      const lessonId = cartData.lesson_id;
      console.log("Lesson ID received:", lessonId);
    
      try {
        // কোর্স ডেটা ফেচ করে নিশ্চিত করি লেসনটি আছে কিনা
        const course = await courseCollection.findOne({ _id: new ObjectId(lessonId) });
    
        if (!course) {
          return res.status(404).send({ error: "Course not found." });
        }
    
        // কার্টে চেক করি লেসনটি আগে থেকেই আছে কিনা
        const existingCartItem = await cartCollection.findOne({ lesson_id: lessonId });
    
        if (existingCartItem) {
          // যদি লেসনটি কার্টে থাকে, তাহলে শুধু space ১ যোগ করি
          const updateResult = await cartCollection.updateOne(
            { lesson_id: lessonId },
            { $inc: { space: 1 } }
          );
    
          return res.send({
            message: "Lesson already exists in the cart. Space incremented.",
            cartUpdateResult: updateResult,
          });
        } else {
          // যদি লেসনটি কার্টে না থাকে, নতুন ডাটা ইনসার্ট করি এবং স্পেস ১ সেট করি
          const newCartItem = {
            lesson_id: lessonId,
            image: cartData.image,
            subject: cartData.subject,
            location: cartData.location,
            space: 1, // নতুন স্পেস মান ১
          };
    
          const insertResult = await cartCollection.insertOne(newCartItem);
    
          if (insertResult.acknowledged) {
            return res.send({
              message: "New lesson added to the cart.",
              cartInsertResult: insertResult,
            });
          } else {
            return res.status(500).send({ error: "Failed to insert data into the cart." });
          }
        }
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ error: "An error occurred while processing the request." });
      }
    });
    
    
    
    

    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
    
      try {
        // কার্ট থেকে ডিলিট করার আগে ডকুমেন্টটি রিট্রিভ করুন
        const cartItem = await cartCollection.findOne({ lesson_id: id });
    
        if (!cartItem) {
          return res.status(404).send({ error: "Cart item not found." });
        }
    
        const spaceToAdd = cartItem.space || 0; // রিট্রিভ করা স্পেসের মান
    
        // কার্ট থেকে ডকুমেন্ট ডিলিট করুন
        const result = await cartCollection.deleteOne({ lesson_id: id });
    
        if (result.deletedCount > 0) {
          // কোর্স কালেকশনে স্পেস আপডেট করুন
          const updateResult = await courseCollection.updateOne(
            { _id: new ObjectId(id) },
            { $inc: { space: spaceToAdd } } // স্পেস যোগ করুন
          );
    
          res.send({
            message: "Item deleted successfully and course space updated.",
            cartDeleteResult: result,
            courseUpdateResult: updateResult,
          });
        } else {
          res.status(500).send({ error: "Failed to delete the cart item." });
        }
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ error: "An error occurred while processing the request." });
      }
    });
    

    app.get("/cart", async (req, res) => {
      const result = await cartCollection.find().toArray();
      res.send(result);
    });

    // order
    app.post("/order", async (req, res) => {
      const orderData = req.body;
      const cartData = await cartCollection.find().toArray();
      const result = await orderCollection.insertOne({
        ...orderData,
        cartData,
      });
      if (result.acknowledged) {
        await cartCollection.deleteMany({});
      }
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("running server");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
