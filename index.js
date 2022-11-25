const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ttvi8dx.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    const productCollection = client.db('mobileHunterUser').collection('mobileProducts');
    const categoryCollection = client.db('mobileHunterUser').collection('phoneCategory');
    const userCollection = client.db('mobileHunterUser').collection('phoneUser');

    try {
        app.get('/products', async (req, res) => {
            console.log('p')
            const query = {};
            const cursor = productCollection.find();
            const products = await cursor.toArray();
            const productsFilter = products.filter(product => product.booked === 'none')
            res.send(productsFilter);
        });

        app.get('/category', async (req, res) => {
            const query = {};
            const cursor = categoryCollection.find();
            const categories = await cursor.toArray();
            res.send(categories);
        });

        app.get('/categoryone/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const category = await categoryCollection.findOne(query);
            res.send(category);
        });


        app.get('/allproducts', async (req, res) => {
            const query = {};
            const cursor = productCollection.find();
            const products = await cursor.toArray();
            res.send(products);
        });

        app.post('/mobileusers', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            console.log(result)
            res.send(result);
        })

    }
    finally {

    }

}

run().catch(console.log);

app.get('/', async (req, res) => {
    res.send('Mobile Hunter server is running');
})

app.listen(port, () => console.log(`Mobile Hunter running on ${port}`))