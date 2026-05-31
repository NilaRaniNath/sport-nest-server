const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json()); 

const uri = process.env.MONGODB_URI;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    
    await client.connect();
    
    const db = client.db("sportnest");
    const facilitiesCollection = db.collection("facilities");
    const bookingCollection = db.collection("booking");

   
    app.get("/facilities", async (req, res) => {
      try {
        const cursor = facilitiesCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Internal Server Error", error });
      }
    });

    
    app.get("/facilities/:id", async (req, res) => {
      try {
        const { id } = req.params;
       
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid ID format" });
        }
        const query = { _id: new ObjectId(id) };
        const result = await facilitiesCollection.findOne(query);
        
        if (!result) {
          return res.status(404).send({ message: "Facility not found" });
        }
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Internal Server Error", error });
      }
    });


    app.post("/booking", async(req,res)=>{
      const bookingData = req.body;
      const result = await bookingCollection.insertOne(bookingData);
      res.json(result);
    });



   
    app.get("/featured", async (req, res) => {
      try {
        const cursor = facilitiesCollection.find().limit(6);
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Internal Server Error", error });
      }
    });

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Database connection error:", error);
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('SportNest Server is Running!')
})

app.listen(port, () => {
  console.log(`SportNest app listening on port ${port}`)
})