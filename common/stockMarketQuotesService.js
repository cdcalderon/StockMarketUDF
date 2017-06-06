const yahooFinance = require('yahoo-finance');
const googleFinance = require('google-finance');
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

let getHistoricalQuotes = (symbol, from, to)=> {
    return googleFinance.historical({
        symbol: symbol,
        from: from,
        to: to
    });

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