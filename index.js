const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const path = require("path");
//middleware
app.use(cors());
app.use(express.json());

// logger middleware
app.use((req, res, next) => {
  const logDetails = `Method: ${req.method}, URL: ${req.originalUrl}, Time: ${new Date().toISOString()}`;
  console.log(logDetails); 
  next(); 
});

// Static File Middleware for Lesson Images
const imagesDir = path.join(__dirname, "./images"); 
app.use("/images", express.static(imagesDir, {
  fallthrough: false 
}));

// Middleware to handle errors when an image file is not found
app.use((err, req, res, next) => {
  if (err.status === 404) {
    res.status(404).send({ error: "Image file not found" });
  } else {
    next(err); // Pass other errors to the next error handler
  }
});


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
    
    
    


    // get lessons
    app.get("/lessons", async (req, res) => {
      const result = await courseCollection.find().toArray();
      res.send(result);
    });
    // put ==> update lesson update
    app.put("/lessons/:id", async (req, res) => {
      const id = req.params.id;
      const findLesson = await courseCollection.findOne({
        _id: new ObjectId(id),
      });
      if (!findLesson) {
        return res.status(404).send({ message: "Lesson not found" });
      }
      const updatedData = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: false };
      const updateDoc = {
        $set: updatedData,
      };
      const result = await courseCollection.updateOne(
        filter,
        updateDoc,
        options
      );
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
      

      try {
        
        const course = await courseCollection.findOne({
          _id: new ObjectId(lessonId),
        });

        if (!course) {
          return res.status(404).send({ error: "Course not found." });
        }

        
        const existingCartItem = await cartCollection.findOne({
          lesson_id: lessonId,
        });

        if (existingCartItem) {
          
          const updateResult = await cartCollection.updateOne(
            { lesson_id: lessonId },
            { $inc: { space: 1 } }
          );
          // decrement from lesson
          const updateLesson = await courseCollection.updateOne(
            { _id: new ObjectId(lessonId) },
            {
              $inc: { space: -1 },
            }
          );
          return res.send({
            message: "Lesson already exists in the cart. Space incremented.",
            cartUpdateResult: updateResult,
          });
        } else {
          
          const newCartItem = {
            lesson_id: lessonId,
            image: cartData.image,
            subject: cartData.subject,
            location: cartData.location,
            price: cartData.price,
            space: 1, 
          };

          const insertResult = await cartCollection.insertOne(newCartItem);

          if (insertResult.acknowledged) {
            const updateLesson = await courseCollection.updateOne(
              { _id: new ObjectId(lessonId) },
              {
                $inc: { space: -1 },
              }
            );
            return res.send({
              message: "New lesson added to the cart.",
              cartInsertResult: insertResult,
            });
          } else {
            return res
              .status(500)
              .send({ error: "Failed to insert data into the cart." });
          }
        }
      } catch (error) {
        console.error("Error:", error);
        res
          .status(500)
          .send({ error: "An error occurred while processing the request." });
      }
    });

    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;

      try {
        
        const cartItem = await cartCollection.findOne({ lesson_id: id });

        if (!cartItem) {
          return res.status(404).send({ error: "Cart item not found." });
        }

        const spaceToAdd = cartItem.space || 0; 

        
        const result = await cartCollection.deleteOne({ lesson_id: id });

        if (result.deletedCount > 0) {
          
          const updateResult = await courseCollection.updateOne(
            { _id: new ObjectId(id) },
            { $inc: { space: spaceToAdd } } 
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
        res
          .status(500)
          .send({ error: "An error occurred while processing the request." });
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