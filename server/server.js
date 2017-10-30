require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { mongoose } = require('./db/mongoose');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 4600;

const {Stock} = require('../models/stock');

app.use(cors());
app.use(bodyParser.urlencoded({
    parameterLimit: 100000,
    limit: '80mb',
    extended: true
}));
app.use(bodyParser.json());

const udfRouter = require('../routes/udfRoutes')(Stock);
app.use('/api/udf', udfRouter);

const securitiesRouter = require('../routes/securitiesRoutes')(Stock);
app.use('/api/securities', securitiesRouter);

app.listen(port, () => {
    console.log(`Started up at port ${port}`)
});

module.exports = { app };