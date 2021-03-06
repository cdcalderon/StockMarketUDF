const yahooFinance = require('yahoo-finance');
const googleFinance = require('google-finance');
const axios = require('axios');
//http://www.nasdaq.com/screening/companies-by-name.aspx?letter=A&render=download   // Get symbols by first letter
//http://www.nasdaq.com/screening/company-list.aspx

//http://www.nasdaq.com/screening/companies-by-name.aspx?letter=0&exchange=nasdaq&render=download
//http://www.nasdaq.com/screening/companies-by-name.aspx?letter=0&exchange=nyse&render=download
//http://www.nasdaq.com/screening/companies-by-name.aspx?letter=0&exchange=amex&render=download




let getQuoteSnapshot = (symbol, fields) => {
    yahooFinance.snapshot({
        symbol: symbol,
        fields: fields,
    }, function(err, snapshot) {
        console.log(snapshot);
    });
};

let isQuand = (quotes) => {
    let isValid = quotes && quotes.data && quotes.data.dataset && quotes.data.dataset.data;
    return isValid;
};

let getHistoricalQuotesQuand = (symbol, from, to) => {
    console.log("Reading------------------------------ Quand Quotes");
    let quandUrl = `https://www.quandl.com/api/v3/datasets/WIKI/${symbol}.json?start_date=${from}&end_date=${to}&api_key=bnz5KFRPyhYVR2Catk1Q`;
    // let base = 'http://www.quandl.com';
    // var address = "/api/v3/datatables/WIKI/PRICES.json" +
    //     "?api_key=" + 'bnz5KFRPyhYVR2Catk1Q' + // you should create a free account on quandl.com to get this key
    //     "&ticker=" + symbol +
    //     "&date.gte=" + from +
    //     "&date.lte=" + to;

    //console.log("Sending request to quandl for symbol " + symbol + ". url=" + address);

    return axios.get(quandUrl);
    // httpGet("www.quandl.com", address, function(result) {
    //     if (response.finished) {
    //         // we can be here if error happened on socket disconnect
    //         return;
    //     }
    //     var content = JSON.stringify(convertQuandlHistoryToUDFFormat(result));
    //     quandlCache[key] = content;
    //     sendResult(content);
    // });
};

//TODO: Move private method to new file Refactor
let formatQuandQuotes = (quotes) => {
    if(isQuand(quotes)) {
        return quotes.data.dataset.data.map((q) => {
            return {
                symbol: quotes.data.dataset.dataset_code,
                date: q[0],
                open: q[1],
                high: q[2],
                low: q[3],
                close: q[4],
                volume: q[5]
            }
        }).reverse();
    }
};



let getHistoricalQuotes = (symbol, from, to)=> {
    let getHistoricalQuotesYahoo = (symbol, from, to)=> {
        console.log("Reading------------------------------ Yahoo Quotes");
        return yahooFinance.historical({
            symbol: symbol,
            from: from,
            to: to,
            // period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
        });
    };

    return  getHistoricalQuotesYahoo(symbol, from, to).then((yQuotes) => {
        return new Promise((resolve, reject) => {
            if(yQuotes) {
                resolve(yQuotes.reverse()); //order is important, so make sure is sorted from less to greater
            } else{
                reject('Error : could not find any quotes');
            }
        });

    });

    // return getHistoricalQuotesQuand(symbol,from,to).then((quotes) => {
    //     if(isQuand(quotes) && quotes.data.dataset.data.length > 0) {
    //         return new Promise((resolve) => {
    //             resolve(formatQuandQuotes(quotes));
    //         });
    //     } else {
    //         return getHistoricalQuotesGoogle(symbol, from, to).then((gQuotes) => {
    //             if(gQuotes && gQuotes.length > 0) {
    //                 return new Promise((resolve) => {
    //                     resolve(gQuotes);
    //                 });
    //             }
    //         })
    //     }
    // }, (error) => {
    //     if(error) {
    //         return getHistoricalQuotesGoogle(symbol, from, to).then((gQuotes) => {
    //             if(gQuotes) {
    //                 return new Promise((resolve) => {
    //                     resolve(gQuotes);
    //                 });
    //             }
    //         })
    //     }
    // });
    //
    // let getHistoricalQuotesGoogle = (symbol, from, to)=> {
    //     console.log("Reading------------------------------ Google Quotes");
    //     return googleFinance.historical({
    //         symbol: symbol,
    //         from: from,
    //         to: to
    //     });
    //
    //
    //     // return yahooFinance.historical({
    //     //     symbol: symbol,
    //     //     from: from,
    //     //     to: to,
    //     //     // period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
    //     // });
    // };

    // return googleFinance.historical({
    //     symbol: symbol,
    //     from: from,
    //     to: to
    // });

    // return yahooFinance.historical({
    //     symbol: symbol,
    //     from: from,
    //     to: to,
    //     // period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
    // });
};

module.exports = {
    getQuoteSnapshot,
    getHistoricalQuotes
};