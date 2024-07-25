const PORT = 8000;
const express = require('express');
const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config(); // Make sure to use environment variables for sensitive data

const uri = process.env.MONGODB_URI; // Use environment variables for URI


const app = express();
app.use(cors());
app.use(express.json());

// Default Route
app.get('/', (req, res) => {
    res.json('Hello to my app');
});

// Sign up Route
app.post('/signup', async (req, res) => {
    const client = new MongoClient(uri);
    const { email, password } = req.body;

    const generatedUserId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await client.connect();
        const database = client.db('app-data');
        const users = database.collection('users');

        const existingUser = await users.findOne({ email });

        if (existingUser) {
            return res.status(409).send('User already exists. Please login');
        }

        const sanitizedEmail = email.toLowerCase();

        const data = {
            user_id: generatedUserId,
            email: sanitizedEmail,
            hashed_password: hashedPassword
        };

        await users.insertOne(data);

        const token = jwt.sign({ user_id: generatedUserId }, process.env.JWT_SECRET, {
            expiresIn: '24h'
        });

        res.status(201).json({ token, userId: generatedUserId });

    } catch (err) {
        console.log(err);
        res.status(500).json('Internal Server Error');
    } finally {
        await client.close();
    }
});

// Log in Route
app.post('/login', async (req, res) => {
    const client = new MongoClient(uri);
    const { email, password } = req.body;

    try {
        await client.connect();
        const database = client.db('app-data');
        const users = database.collection('users');

        const user = await users.findOne({ email });

        if (!user || !await bcrypt.compare(password, user.hashed_password)) {
            return res.status(400).json('Invalid Credentials');
        }

        const token = jwt.sign({ user_id: user.user_id }, process.env.JWT_SECRET, {
            expiresIn: '24h'
        });

        res.status(200).json({ token, userId: user.user_id });

    } catch (err) {
        console.log(err);
        res.status(500).json('Internal Server Error');
    } finally {
        await client.close();
    }
});

// Get Individual User
app.get('/user', async (req, res) => {
    const client = new MongoClient(uri);
    const userId = req.query.userId;

    try {
        await client.connect();
        const database = client.db('app-data');
        const users = database.collection('users');

        const user = await users.findOne({ user_id: userId });
        if (!user) {
            return res.status(404).json('User not found');
        }

        res.json(user);

    } catch (err) {
        console.log(err);
        res.status(500).json('Internal Server Error');
    } finally {
        await client.close();
    }
});

// Update User with a Match
app.put('/addmatch', async (req, res) => {
    const client = new MongoClient(uri);
    const { userId, matchedUserId } = req.body;

    try {
        await client.connect();
        const database = client.db('app-data');
        const users = database.collection('users');

        const result = await users.updateOne(
            { user_id: userId },
            { $push: { matches: { user_id: matchedUserId } } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json('User not found');
        }

        res.json(result);

    } catch (err) {
        console.log(err);
        res.status(500).json('Internal Server Error');
    } finally {
        await client.close();
    }
});

// Get All Users by userIds
app.get('/users', async (req, res) => {
    const client = new MongoClient(uri);
    const userIdsQuery = req.query.userIds;

    if (!userIdsQuery) {
        return res.status(400).json('No user IDs provided');
    }

    let userIds = [];
    try {
        userIds = JSON.parse(userIdsQuery);
        if (!Array.isArray(userIds)) {
            return res.status(400).json('User IDs should be an array');
        }
    } catch (error) {
        return res.status(400).json('Invalid user IDs format');
    }

    try {
        await client.connect();
        const database = client.db('app-data');
        const users = database.collection('users');

        const foundUsers = await users.find({ user_id: { $in: userIds } }).toArray();
        res.json(foundUsers);

    } catch (err) {
        console.log(err);
        res.status(500).json('Internal Server Error');
    } finally {
        await client.close();
    }
});

// Get All Gendered Users
app.get('/gendered-users', async (req, res) => {
    const client = new MongoClient(uri);
    const gender = req.query.gender;

    try {
        await client.connect();
        const database = client.db('app-data');
        const users = database.collection('users');

        const foundUsers = await users.find({ gender_identity: gender }).toArray();
        res.json(foundUsers);

    } catch (err) {
        console.log(err);
        res.status(500).json('Internal Server Error');
    } finally {
        await client.close();
    }
});

// Update a User
app.put('/user', async (req, res) => {
    const client = new MongoClient(uri);
    const formData = req.body.formData;

    try {
        await client.connect();
        const database = client.db('app-data');
        const users = database.collection('users');

        const result = await users.updateOne(
            { user_id: formData.user_id },
            { $set: formData }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json('User not found');
        }

        res.json(result);

    } catch (err) {
        console.log(err);
        res.status(500).json('Internal Server Error');
    } finally {
        await client.close();
    }
});

// Get Messages by from_userId and to_userId
app.get('/messages', async (req, res) => {
    const { userId, correspondingUserId } = req.query;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const database = client.db('app-data');
        const messages = database.collection('messages');

        const foundMessages = await messages.find({
            from_userId: userId,
            to_userId: correspondingUserId
        }).toArray();

        res.json(foundMessages);

    } catch (err) {
        console.log(err);
        res.status(500).json('Internal Server Error');
    } finally {
        await client.close();
    }
});

// Add a Message
app.post('/message', async (req, res) => {
    const client = new MongoClient(uri);
    const message = req.body.message;

    try {
        await client.connect();
        const database = client.db('app-data');
        const messages = database.collection('messages');

        const insertedMessage = await messages.insertOne(message);
        res.json(insertedMessage);

    } catch (err) {
        console.log(err);
        res.status(500).json('Internal Server Error');
    } finally {
        await client.close();
    }
});

app.listen(PORT, () => console.log('Server running on PORT ' + PORT));


// const PORT = 8000
// const express = require('express')
// const {MongoClient} = require('mongodb')
// const {v4: uuidv4} = require('uuid')
// const jwt = require('jsonwebtoken')
// const cors = require('cors')
// const bcrypt = require('bcrypt')
// // require('dotenv').config()

// const uri = 'mongodb+srv://vshandilya300:mypassword@cluster0.4qe35dr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

// const app = express()
// app.use(cors())
// app.use(express.json())

// // Default
// app.get('/', (req, res) => {
//     res.json('Hello to my app')
// })

// // Sign up to the Database
// app.post('/signup', async (req, res) => {
//     const client = new MongoClient(uri)
//     const {email, password} = req.body

//     const generatedUserId = uuidv4()
//     const hashedPassword = await bcrypt.hash(password, 10)

//     try {
//         await client.connect()
//         const database = client.db('app-data')
//         const users = database.collection('users')

//         const existingUser = await users.findOne({email})

//         if (existingUser) {
//             return res.status(409).send('User already exists. Please login')
//         }

//         const sanitizedEmail = email.toLowerCase()

//         const data = {
//             user_id: generatedUserId,
//             email: sanitizedEmail,
//             hashed_password: hashedPassword
//         }

//         const insertedUser = await users.insertOne(data)

//         const token = jwt.sign(insertedUser, sanitizedEmail, {
//             expiresIn: 60 * 24
//         })
//         res.status(201).json({token, userId: generatedUserId})

//     } catch (err) {
//         console.log(err)
//     } finally {
//         await client.close()
//     }
// })

// // Log in to the Database
// app.post('/login', async (req, res) => {
//     const client = new MongoClient(uri)
//     const {email, password} = req.body

//     try {
//         await client.connect()
//         const database = client.db('app-data')
//         const users = database.collection('users')

//         const user = await users.findOne({email})

//         const correctPassword = await bcrypt.compare(password, user.hashed_password)

//         if (user && correctPassword) {
//             const token = jwt.sign(user, email, {
//                 expiresIn: 60 * 24
//             })
//             res.status(201).json({token, userId: user.user_id})
//         }

//         res.status(400).json('Invalid Credentials')

//     } catch (err) {
//         console.log(err)
//     } finally {
//         await client.close()
//     }
// })

// // Get individual user
// app.get('/user', async (req, res) => {
//     const client = new MongoClient(uri)
//     const userId = req.query.userId

//     try {
//         await client.connect()
//         const database = client.db('app-data')
//         const users = database.collection('users')

//         const query = {user_id: userId}
//         const user = await users.findOne(query)
//         res.send(user)

//     } finally {
//         await client.close()
//     }
// })

// // Update User with a match
// app.put('/addmatch', async (req, res) => {
//     const client = new MongoClient(uri)
//     const {userId, matchedUserId} = req.body

//     try {
//         await client.connect()
//         const database = client.db('app-data')
//         const users = database.collection('users')

//         const query = {user_id: userId}
//         const updateDocument = {
//             $push: {matches: {user_id: matchedUserId}}
//         }
//         const user = await users.updateOne(query, updateDocument)
//         res.send(user)
//     } finally {
//         await client.close()
//     }
// })

// // Get all Users by userIds in the Database
// app.get('/users', async (req, res) => {
//     const client = new MongoClient(uri)
//     const userIds = JSON.parse(req.query.userIds)

//     try {
//         await client.connect()
//         const database = client.db('app-data')
//         const users = database.collection('users')

//         const pipeline =
//             [
//                 {
//                     '$match': {
//                         'user_id': {
//                             '$in': userIds
//                         }
//                     }
//                 }
//             ]

//         const foundUsers = await users.aggregate(pipeline).toArray()

//         res.json(foundUsers)

//     } finally {
//         await client.close()
//     }
// })

// // Get all the Gendered Users in the Database
// app.get('/gendered-users', async (req, res) => {
//     const client = new MongoClient(uri)
//     const gender = req.query.gender

//     try {
//         await client.connect()
//         const database = client.db('app-data')
//         const users = database.collection('users')
//         const query = {gender_identity: {$eq: gender}}
//         const foundUsers = await users.find(query).toArray()
//         res.json(foundUsers)

//     } finally {
//         await client.close()
//     }
// })

// // Update a User in the Database
// app.put('/user', async (req, res) => {
//     const client = new MongoClient(uri)
//     const formData = req.body.formData

//     try {
//         await client.connect()
//         const database = client.db('app-data')
//         const users = database.collection('users')

//         const query = {user_id: formData.user_id}

//         const updateDocument = {
//             $set: {
//                 first_name: formData.first_name,
//                 dob_day: formData.dob_day,
//                 dob_month: formData.dob_month,
//                 dob_year: formData.dob_year,
//                 show_gender: formData.show_gender,
//                 gender_identity: formData.gender_identity,
//                 gender_interest: formData.gender_interest,
//                 url: formData.url,
//                 about: formData.about,
//                 matches: formData.matches
//             },
//         }

//         const insertedUser = await users.updateOne(query, updateDocument)

//         res.json(insertedUser)

//     } finally {
//         await client.close()
//     }
// })

// // Get Messages by from_userId and to_userId
// app.get('/messages', async (req, res) => {
//     const {userId, correspondingUserId} = req.query
//     const client = new MongoClient(uri)

//     try {
//         await client.connect()
//         const database = client.db('app-data')
//         const messages = database.collection('messages')

//         const query = {
//             from_userId: userId, to_userId: correspondingUserId
//         }
//         const foundMessages = await messages.find(query).toArray()
//         res.send(foundMessages)
//     } finally {
//         await client.close()
//     }
// })

// // Add a Message to our Database
// app.post('/message', async (req, res) => {
//     const client = new MongoClient(uri)
//     const message = req.body.message

//     try {
//         await client.connect()
//         const database = client.db('app-data')
//         const messages = database.collection('messages')

//         const insertedMessage = await messages.insertOne(message)
//         res.send(insertedMessage)
//     } finally {
//         await client.close()
//     }
// })


// app.listen(PORT, () => console.log('server running on PORT ' + PORT))