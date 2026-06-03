const express = require('express');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const dotenv = require('dotenv');

const cors = require('cors');

const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');

dotenv.config();



const app = express();

const port = process.env.PORT || 8000;



app.use(cors());

app.use(express.json());



const uri = process.env.MONGODB_URI;



const JWKS = createRemoteJWKSet(new URL(`${process.env.BETTER_AUTH_URL|| 'http://localhost:3000'}/api/auth/jwks`));



const client = new MongoClient(uri, {

  serverApi: {

    version: ServerApiVersion.v1,

    strict: true,

    deprecationErrors: true,

  }

});



const logger = (req, res, next) => {

  console.log(`${req.method} | ${req.url}`);

  next();

};



const verifyToken = async (req, res, next) => {

  // const header = req.headers.authorization;

  // const token = authorization?.split(' ')[1];
const header = req.headers.authorization;
if (!header) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  const token = header.split(" ")[1];




  if (!token) {

    return res.status(401).json({ message: 'Unauthorized: Token missing' });

  }



  try {

    const { payload } = await jwtVerify(token, JWKS);

    // req.user = payload;

    next();

  } catch (error) {

    console.error('Token validation failed:', error.message);

    return res.status(403).json({ message: 'Forbidden: Invalid token', error: error.message });

  }

};



async function run() {

  try {

    // await client.connect();

   

    const db = client.db("sportnest");

    const facilitiesCollection = db.collection("facilities");

    const bookingCollection = db.collection("booking");



    // 1. all facilities

    app.get("/facilities", logger, async (req, res) => {

  try {

   

    const { search, sportType } = req.query;

    let query = {};



   

    if (search) {

      query.$or = [

        { name: { $regex: search, $options: 'i' } },

        { facility_type: { $regex: search, $options: 'i' } }

      ];

    }



   

    if (sportType) {

     

      query.facility_type = { $regex: `${sportType}`, $options: 'i' };

    }



   

    console.log("MongoDB Query Object:", JSON.stringify(query));



    const cursor = facilitiesCollection.find(query);

    const result = await cursor.toArray();

   

    res.send(result);

  } catch (error) {

    console.error("Error fetching facilities:", error);

    res.status(500).send({ message: "Internal Server Error" });

  }

});



    // ২. single facility api

    app.get("/facilities/:id", logger, verifyToken, async (req, res) => {

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



    // 3. single booking list

    app.get("/booking/:email", async (req, res) => {

      try {

        const { email } = req.params;

        const query = { userEmail: email };

        const result = await bookingCollection.find(query).toArray();

        res.json(result);

      } catch (error) {

        res.status(500).send({ message: "Failed to fetch user bookings by email", error });

      }

    });



    // 4. new booking

    app.post("/booking",logger,verifyToken, async (req, res) => {

      try {

        const bookingData = req.body;

        const result = await bookingCollection.insertOne(bookingData);

        res.json(result);

      } catch (error) {

        res.status(500).send({ message: "Failed to create booking", error });

      }

    });



    // 5. update booking

    app.patch("/booking/:id",logger,verifyToken, async (req, res) => {

      try {

        const { id } = req.params;

        const { bookingDate, timeSlot, hours, totalPrice } = req.body;



        if (!ObjectId.isValid(id)) {

          return res.status(400).send({ message: "Invalid Booking ID format" });

        }



        const filter = { _id: new ObjectId(id) };

        const updatedDoc = {

          $set: {

            bookingDate,

            timeSlot,

            hours: Number(hours),

            totalPrice: Number(totalPrice),

          },

        };



        const result = await bookingCollection.updateOne(filter, updatedDoc);

       

        if (result.modifiedCount === 0) {

          return res.status(400).json({ message: "No changes were made or booking not found" });

        }



        res.json(result);

      } catch (error) {

        console.error("Backend update error:", error);

        res.status(500).send({ message: "Failed to update booking", error: error.message });

      }

    });



    // 6. delete booking

    app.delete("/booking/:id",logger,verifyToken, async (req, res) => {

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



    // 7. featured

    app.get("/featured", async (req, res) => {

      try {

        const cursor = facilitiesCollection.find().limit(6);

        const result = await cursor.toArray();

        res.send(result);

      } catch (error) {

        res.status(500).send({ message: "Internal Server Error", error });

      }

    });



    // 8. new facility add API

    app.post("/facilities",logger,verifyToken, async (req, res) => {

      try {

        const facilityData = req.body;

        const result = await facilitiesCollection.insertOne(facilityData);

        res.status(201).json(result);

      } catch (error) {

        console.error("Failed to add facility:", error);

        res.status(500).send({ message: "Failed to create facility listing", error: error.message });

      }

    });



    // 9-manage facilities owner data find

    app.get("/owner-facilities/:email", async (req, res) => {

      try {

        const { email } = req.params;

        const query = { ownerEmail: email };

        const result = await facilitiesCollection.find(query).toArray();

        res.send(result);

      } catch (error) {

        res.status(500).send({ message: "Failed to fetch owner facilities", error: error.message });

      }

    });



    // 10. added facility update API (PATCH)

    app.patch("/facilities/:id",logger,verifyToken, async (req, res) => {

      try {

        const { id } = req.params;

        const { name,facility_type, location, price_per_hour, image } = req.body;



        if (!ObjectId.isValid(id)) {

          return res.status(400).send({ message: "Invalid Facility ID format" });

        }



        const filter = { _id: new ObjectId(id) };

        const updatedDoc = {

          $set: {

            name,

            facility_type,

            location,

            price_per_hour: Number(price_per_hour),

            image,

          },

        };



        const result = await facilitiesCollection.updateOne(filter, updatedDoc);

        res.json(result);

      } catch (error) {

        res.status(500).send({ message: "Failed to update facility", error: error.message });

      }

    });



    // 11. added facility delete API (DELETE)

    app.delete("/facilities/:id",logger,verifyToken, async (req, res) => {

      try {

        const { id } = req.params;



        if (!ObjectId.isValid(id)) {

          return res.status(400).send({ message: "Invalid Facility ID format" });

        }



        const query = { _id: new ObjectId(id) };

        const result = await facilitiesCollection.deleteOne(query);

        res.json(result);

      } catch (error) {

        res.status(500).send({ message: "Failed to delete facility", error: error.message });

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

