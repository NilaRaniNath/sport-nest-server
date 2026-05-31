const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const cors = require('cors');
const { createRemoteJWKSet } = require('jose-cjs');
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

const JWKS=createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const logger =(req,res,next)=>{
  console.log(`${req.method} | ${req.url}`);
  next();
};


const verifyToken = async(req,res,next)=>{
  const {authorization}=req.headers;
  // console.log(req.headers);
  const token = authorization?.split(' ')[1];
if(!token){
  return res.status(401).json({message:'Unauthorize'})
}
 try {
    const JWKS = createRemoteJWKSet(
      new URL('http://localhost:3000/api/auth/jwks')
    )
    const { payload } = await jwtVerify(token, JWKS);
    req.user=payload;
   
     next();
  } catch (error) {
    console.error('Token validation failed:', error)
    throw error
  }


 
}



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

    app.get("/facilities/:id",logger,verifyToken, async (req, res) => {
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

 
    app.get("/booking/:userId", async (req, res) => {
      try {
        const { userId } = req.params;
        const query = {userId: userId }; 
        const result = await bookingCollection.find(query).toArray();
        res.json(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch user bookings", error });
      }
    });

   
    app.post("/booking", async (req, res) => {
      try {
        const bookingData = req.body;
        const result = await bookingCollection.insertOne(bookingData);
        res.json(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to create booking", error });
      }
    });


    app.patch("/booking/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { bookingDate, timeSlot, hours } = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid Booking ID format" });
        }

        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            bookingDate,
            timeSlot,
            hours: Number(hours),
          },
        };

        const result = await bookingCollection.updateOne(filter, updatedDoc);
        res.json(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update booking", error });
      }
    });

    
    app.delete("/booking/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid Booking ID format" });
        }

        const query = { _id: new ObjectId(id) };
        const result = await bookingCollection.deleteOne(query);
        res.json(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete booking", error });
      }
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

// Root Route
app.get('/', (req, res) => {
  res.send('SportNest Server is Running!')
})

// Listen
app.listen(port, () => {
  console.log(`SportNest app listening on port ${port}`)
})