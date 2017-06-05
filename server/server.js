require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 4600;


app.use(cors());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

const udfRouter = require('../routes/udfRoutes')();
app.use('/api/udf', udfRouter);

app.listen(port, () => {
    console.log(`Started up at port ${port}`)
});

module.exports = { app };