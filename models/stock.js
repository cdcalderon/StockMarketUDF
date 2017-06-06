// Symbol	Name	LastSale	MarketCap	IPOyear	Sector	industry	Summary Quote

const mongoose = require('mongoose');

let Stock = mongoose.model('Stock', {
    symbol: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    },
    name: {
        type: String,
        default: null
    },
    lastSale: {
        type: String,
        default: null
    },
    marketCap: {
        type: String,
        default: null
    },
    ipoYear: {
        type: String,
        default: null
    },
    sector: {
        type: String,
        default: null
    },
    industry: {
        type: String,
        default: null
    },
    summaryQuoteUrl: {
        type: String,
        default: null
    },
    exchange: {
        type: String,
        default: null
    }
});

module.exports = {
    Stock
};