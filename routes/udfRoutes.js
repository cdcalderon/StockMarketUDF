const express = require('express');
const axios = require('axios');
const moment = require('moment');
const _ = require('lodash-node');
// const quotes = require('../server/services/quotes.jobs');
// const gapValidatorUtils = require('../server/common/gapValidatorUtils');
// const charMarkUtils = require('../server/common/charMarkUtils');
// const threeArrowValidatorUtils = require('../server/common/threeArrowValidatorUtils');
// const stockSignalsUtils = require('../server/common/stockSignalsUtils');
const symbolsDB = require('../common/symbols.database');
const quotesService = require('../common/stockMarketQuotesService');

var datafeedHost = "chartapi.finance.yahoo.com";
var lastHistoryErrorTime = null;
var errorSwitchingTime = 60 * 60 * 1000; // switch to Quandl for 1 hour
var quandlCache = {};

var quandlCacheCleanupTime = 3 * 60 * 60 * 100; // 3 hours
setInterval(function() {
    quandlCache = {};
}, quandlCacheCleanupTime);


let routes = function(Stock){
    let udfRouter = express.Router();

    let udfController = require('../controllers/udfController')(
        Stock,
        axios,
        moment,
        _,
        datafeedHost,
        quotesService,
        symbolsDB);

    udfRouter.route('/history')
        .get(udfController.getHistory);

    udfRouter.route('/symbols')
        .get(udfController.getSymbols);

    udfRouter.route('/updateStocks')
        .get(udfController.updateStockInformation);

    udfRouter.route('/updateStocksHeroku')
        .post(udfController.updateStockInformationHeroku);

    udfRouter.route('/updateStocksFromCollectionHeroku')
        .post(udfController.updateStocksHeroku);



    return udfRouter;
}

module.exports = routes;