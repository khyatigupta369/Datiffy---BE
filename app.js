const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const {Pool}  = require('pg');

const app = express()
const port = 3000

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'users',
    password: 'postgre123',
    port: 5432,
});
``
app.use(bodyParser.json());

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    const userExists = await pool.query(`Select *
                                         from users 
                                         where username = $1
                                         or email = $2 `, 
                                         [username, email]);
    if (userExists.rows.length > 0) {
        return res.status(400).json({ error: 'Username or Email already Registered'});
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(`Insert into users
                                    (username, email, password)
                                    values ($1, $2, $3)
                                    returning *`, 
                                    [username, email, password]);

    res.status(201).json({user: result.rows[0] });
});

app.post('/login', async (req, res) => {
    const {username, password} = req.body;

    const result = await pool.query(`select * from users
                                    where username = $1`,
                                    [username]);

    if (result.rows.length === 0){
        return res.status(401).json({error: 'Invalid credentials, Please Try Again'});
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
        return res.status(401).json({error: 'Invalid credentials, Please Try Again'});
    }

    const token = jwt.sign({userId: user.id}, 'Datiffy', {expiresIn: '1h'});

    await pool.query(`update users
                        set token = $1 
                        where id = $2`, 
                        [token, user.id]);
    
    res.json({token});

});

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute - 1ms * 1000 * 60
    max: 5, // 5 requests per minute
})

app.get('/secure-endpoint', limiter, (req, res) => {
    res.json({message: 'This is a secure endpoint'});
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


