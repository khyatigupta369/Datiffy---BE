const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const ejs = require('ejs');
const { Pool } = require('pg');

const date = require(__dirname + '/today.js');

const app = express();
const port = 3000;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'users',
    password: 'postgre123',
    port: 5432,
});

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

const items = [];

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute - 1ms * 1000 * 60
    max: 5, // 5 requests per minute
})

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/work", (req, res) => {
    res.render("list", { listTitle: date.getDate(), items: items });
});

app.get("/register", (req, res) => {
    res.render("register", { error: "" });
});

app.get("/login", (req, res) => {
    res.render("login", { error: "" });
});

app.post("/work", (req, res) => {
    const item = req.body.newItem;
    items.push(item);
    res.redirect("/work");
});

app.post('/register', limiter, async (req, res) => {
    const { username, email, password } = req.body;
    console.log(req.body)
    console.log(username, email, password);

    const userExists = await pool.query(`Select *
                                         from users 
                                         where username = $1
                                         or email = $2 `,
        [username, email]);
    if (userExists.rows.length > 0) {
        return res.render("register", { error: 'Username or Email already Registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(`Insert into users
                                    (username, email, password)
                                    values ($1, $2, $3)
                                    returning *`,
        [username, email, hashedPassword]);

    res.redirect("/login");
    // TODO: TO CREATE API ENDPOINT
    // res.json({ token });
});

app.post('/login', limiter, async (req, res) => {
    const { username, password } = req.body;

    const result = await pool.query(`select * from users
                                    where username = $1`,
        [username]);

    if (result.rows.length === 0) {
        return res.render("login", { error: 'Invalid credentials, Please Try Again' });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials, Please Try Again' });
    }

    const token = jwt.sign({ userId: user.id }, 'Datiffy', { expiresIn: '1h' });

    await pool.query(`update users
                        set token = $1 
                        where id = $2`,
        [token, user.id]);

    res.redirect("/work");
});

app.get('/secure-endpoint', limiter, (req, res) => {
    res.json({ message: 'This is a secure endpoint' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


