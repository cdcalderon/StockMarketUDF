const express = require('express');

let routes = function(Stock) {
    let securityRouter = express.Router();

    let symbolController = require('../controllers/securitiesController')(Stock);

    securityRouter.route('/filter')
        .post(symbolController.get);

    return securityRouter;
};

module.exports = routes;