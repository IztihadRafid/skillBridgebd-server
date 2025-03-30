const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken')
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

        //===========================================================================
        // JWT REALTED API
        //===========================================================================
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' })//create token
            res.send({ token })
        })
        //*************************************************************************** */
        //                                     MIDDLEWARES
        //*************************************************************************** */
        const verifiedToken = (req, res, next) => {
            console.log('inside verify token: ', req.headers.authorization)
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: "unauthorized access" })
                }
                req.decoded = decoded;
                next()
            })
        }


        //---------------------------------------------------------------------------
        //  Verify Admin after verify token
        //---------------------------------------------------------------------------
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            };
            next()
        }



        //---------------------------------------------------------------------------
        //Users realted API
        //---------------------------------------------------------------------------
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ messsage: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result)
        })

        app.get('/users', verifiedToken, async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result);
        })

        app.get('/users/admin/:email', verifiedToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
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
        app.patch('/users/admin/:id', verifiedToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })

        //===========================================================================
        //delete user by admin
        //===========================================================================
        app.delete('/users/:id', verifiedToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result)
        })



        //---------------------------------------------------------------------------
        // Adding New JObs from client to DB
        //---------------------------------------------------------------------------
        app.post('/jobs', verifiedToken, verifyAdmin, async (req, res) => {
            const newJob = req.body;
            const result = await jobCollection.insertOne(newJob);
            res.send(result)
        })

        
        //---------------------------------------------------------------------------
        // DELETE JOB FROM CLIENT BY ADMIN
        //---------------------------------------------------------------------------  
        app.delete('/jobs/:id',verifiedToken,verifyAdmin,async(req,res)=>{
            const id = req.params.id;
            const query ={_id: new ObjectId(id)};
            const result = await jobCollection.deleteOne(query);
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