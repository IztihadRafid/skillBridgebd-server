const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000


//middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.1rbhjut.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // DATABASE COLLECTION
        const userCollection = client.db("skillBridge-DB").collection("users")
        const jobCollection = client.db("skillBridge-DB").collection("jobs")
        const jobCartCollection = client.db("skillBridge-DB").collection("jobCarts")



        //---------------------------------------------------------------------------
        //Users realted API
        //---------------------------------------------------------------------------
        app.post('/users',async(req,res)=>{
            const user =req.body;
            const query = {email: user.email}
            const existingUser = await userCollection.findOne(query);
            if(existingUser){
                return res.send({messsage: 'user already exists',insertedId:null})
            }
            const result = await userCollection.insertOne(user);
            res.send(result)
        })

        app.get('/users',async(req,res)=>{
            const result = await userCollection.find().toArray()
            res.send(result);
        })

        //---------------------------------------------------------------------------
        //Getting all jobs and showing to client site
        //---------------------------------------------------------------------------
        app.get('/jobs', async (req, res) => {
            const result = await jobCollection.find().toArray();
            res.send(result)
        })

        //===========================================================================
        // MAKE ADMIN 
        //===========================================================================
        app.patch('/users/admin/:id',async(req,res)=>{
            const id = req.params.id;
            const filter = {_id : new ObjectId(id)};
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter,updatedDoc) ;
            res.send(result)
        })
        
        //===========================================================================
        //delete user by admin
        //===========================================================================
        app.delete('/users/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await userCollection.deleteOne(query);
            res.send(result)
        })


        //---------------------------------------------------------------------------
        //Getting all applied jobs and showing to client site
        //---------------------------------------------------------------------------
        app.get('/jobcarts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await jobCartCollection.find(query).toArray()
            res.send(result)
        })

        //---------------------------------------------------------------------------
        //posting job apply from client and stored in DB 
        //---------------------------------------------------------------------------
        app.post('/jobcarts', async (req, res) => {
            const cartItem = req.body;
            const result = await jobCartCollection.insertOne(cartItem);
            res.send(result)
        })

        //---------------------------------------------------------------------------
        //Deleting applied jobs from cart
        //---------------------------------------------------------------------------
        app.delete('/jobcarts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await jobCartCollection.deleteOne(query);
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send("SkillBridge-BD is Running")
})

app.listen(port, () => {
    console.log(`Server is Running on port ${port}`);
})