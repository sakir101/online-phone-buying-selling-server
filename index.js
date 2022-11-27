const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ttvi8dx.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    const productCollection = client.db('mobileHunterUser').collection('mobileProducts');
    const categoryCollection = client.db('mobileHunterUser').collection('phoneCategory');
    const userCollection = client.db('mobileHunterUser').collection('phoneUser');
    const bookingCollection = client.db('mobileHunterUser').collection('bookphone');
    const paymentsCollection = client.db('mobileHunterUser').collection('payPrice');
    const reportingCollection = client.db('mobileHunterUser').collection('reportPhone');
    const advertiseCollection = client.db('mobileHunterUser').collection('advertiseProduct');

    try {

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });

        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productCollection.find();
            const products = await cursor.toArray();
            const productsFilter = products.filter(product => product.payment === 'none')
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

        app.post('/create-payment-intent', async (req, res) => {
            const bookingPhone = req.body;
            const price = bookingPhone.productPrice;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });


        app.post('/mobileusers', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        app.post('/bookingphone', async (req, res) => {
            const book = req.body;
            const result = await bookingCollection.insertOne(book);
            res.send(result);
        });

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    payment: 'paid',
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await productCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })


        app.get('/orders', async (req, res) => {
            const cursor = bookingCollection.find({ buyerEmail: { $in: [req.query.email] } });
            const orders = await cursor.toArray();
            res.send(orders)
        });

        app.get('/payment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const item = await bookingCollection.findOne(query);
            res.send(item);
        });

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send({ isSeller: user?.role === 'seller' });
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        });

        app.get('/alluser/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send(user);
        });

        app.post('/addproduct', async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        });

        app.get('/allproducts/:email', async (req, res) => {
            const sellerEmail = req.params.email;
            const query = { sellerEmail }
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        app.delete('/deleteproduct/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
        });

        app.get('/allsellers', async (req, res) => {
            const cursor = userCollection.find({ role: { $in: ["seller"] } });
            const sellers = await cursor.toArray();
            res.send(sellers)
        });

        app.patch('/sellerverify/:email', async (req, res) => {
            const email = req.params.email;

            const update = req.body;
            const query = { email };
            const updatedDocs = {
                $set: {
                    verify: update.verify
                }
            }
            const result = await userCollection.updateOne(query, updatedDocs)


            res.send(result);
        });

        app.patch('/productverify/:email', async (req, res) => {
            const sellerEmail = req.params.email;

            const update = req.body;
            const query = { sellerEmail };
            const updatedDocs = {
                $set: {
                    verify: update.verify
                }
            }
            const result = await productCollection.updateOne(query, updatedDocs)


            res.send(result);
        });

        app.get('/checkverify/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const cursor = await userCollection.findOne(query);
            res.send(cursor);
        });

        app.delete('/deleteuser/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        });

        app.get('/allbuyers', async (req, res) => {
            const cursor = userCollection.find({ role: { $in: ["buyer"] } });
            const buyers = await cursor.toArray();
            res.send(buyers)
        });

        app.post('/reportingphone', async (req, res) => {
            const report = req.body;
            const result = await reportingCollection.insertOne(report);
            res.send(result);
        });

        app.get('/allreports', async (req, res) => {
            const query = {};
            const cursor = reportingCollection.find();
            const reports = await cursor.toArray();
            res.send(reports);
        });

        app.delete('/deleteproduct/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
        });

        app.delete('/deletereport/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await reportingCollection.deleteOne(query);
            res.send(result);
        });

        app.post('/addadvertise/:id', async (req, res) => {
            const advertise = req.body;
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await advertiseCollection.insertOne(advertise);
            const updatedDocs = {
                $set: {
                    advertise: "advertised"
                }
            }
            const updateProduct = await productCollection.updateOne(query, updatedDocs)
            res.send(result);
        });

        app.get('/advertiseProduct', async(req,res)=>{
            const query = {};
            const cursor = advertiseCollection.find();
            const advertiseProduct = await cursor.toArray();
            res.send(advertiseProduct);
        });

        app.get('/orderProduct/:id', async(req,res)=>{
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.findOne(query)
            res.send(result)
        });


    }
    finally {

    }

}

run().catch(console.log);

app.get('/', async (req, res) => {
    res.send('Mobile Hunter server is running');
})

app.listen(port, () => console.log(`Mobile Hunter running on ${port}`))