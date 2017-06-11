const request=require('request')
const csv=require('csvtojson');
const amexStocksUrl = 'http://www.nasdaq.com/screening/companies-by-name.aspx?letter=0&exchange=amex&render=download';
const nasdaqStocksUrl = 'http://www.nasdaq.com/screening/companies-by-name.aspx?letter=0&exchange=nasdaq&render=download';
const nyseStocksUrl = 'http://www.nasdaq.com/screening/companies-by-name.aspx?letter=0&exchange=nyse&render=download';
const herokuUDFBaseUrl = 'https://enigmatic-waters-56889.herokuapp.com';

let udfController = (
    Stock,
    axios,
    moment,
    _,
    datafeedHost,
    quotes,
    symbolsDB) => {

    const symbolsQuotesUrl  = 'https://demo_feed.tradingview.com/symbols';

    //Implement new yahoo UDP quotes service
    //https://github.com/tradingview/yahoo_datafeed/blob/master/yahoo.js
     let getHistory = (req, res) => {

             let symbol = req.query.symbol;
             let resolution = req.query.resolution;

             let startDateTimestamp = moment.unix(req.query.from).format("MM/DD/YYYY");
             let endDateTimestamp = moment.unix(req.query.to).format("MM/DD/YYYY");
         if(symbol != null && startDateTimestamp != null && endDateTimestamp != null) {
             quotes.getHistoricalQuotes(symbol, startDateTimestamp, endDateTimestamp)
                 .then((fullQuotes) => {

                     let quotes = convertYahooHistoryToUDFFormat(fullQuotes);
                     res.send(quotes);
                 })
                 .catch((error) => {
                     console.log(error);
                 });
         }
    };

    let getSymbols = (req, res) => {
        let symbol = req.query.symbol;
        let symbolArr = symbol.split(':');
        if(symbolArr.length === 2) {
            symbol = symbolArr[1];
        }
            Stock.findOne({symbol: symbol})
                .then((symbol) => {
                    if (symbol != null) {
                        let responseSymbol =
                            {
                                name: symbol.symbol,
                                'exchange-traded': symbol.exchange,
                                'exchange-listed': symbol.exchange,
                                timezone: "America/New_York",
                                minmov: 1,
                                minmov2: 0,
                                pricescale: 10,
                                pointvalue: 1,
                                session: "0930-1630",
                                has_intraday: false,
                                has_no_volume: false,
                                ticker: symbol.symbol,
                                description: symbol.name,
                                type: "stock",
                                supported_resolutions: [
                                    "D"
                                ]
                            };
                        res.send(responseSymbol);
                    }
                });
    };

    let updateStockInformation = (req, res) => {
        Promise.all([
            populateStocks(nasdaqStocksUrl, 'NasdaqNM'),
            populateStocks(nyseStocksUrl, 'NYSE'),
            populateStocks(amexStocksUrl, 'AMEX')
            ]
        ).then((data) => {
            res.status(200).send('ok');
        }).catch((e) => {
            console.log(e);
        });
    };

    let updateStockInformationHeroku = (req, res) => {
        Promise.all([
            populateStocksHeroku(nasdaqStocksUrl, 'NasdaqNM'),
            populateStocksHeroku(nyseStocksUrl, 'NYSE'),
            populateStocksHeroku(amexStocksUrl, 'AMEX')
            ]
        ).then((data) => {
            res.status(200).send('ok');
        }).catch((e) => {
            console.log(e);
        });
    };

    let updateStockSingleHeroku = (req, res) => {
        let stock = new Stock({
            symbol:req.query.symbol,
            name: req.query.name,
            lastSale: req.query.lastSale,
            marketCap: req.query.marketCap,
            ipoYear: req.query.ipoYear,
            sector: req.query.sector,
            industry: req.query.industry,
            summaryQuoteUrl: req.query.summaryQuoteUrl,
            exchange: req.query.exchange
        });

        stock.save().then((doc) => {
            console.log('success saving.. : ', doc);
        }, (e) => {
            console.log('error saving.. : ', e);
        });


    };

    let populateStocks = (stockInfoUrl, exchange) => {
        return new Promise((resolve, reject) => {
            saveStocks(stockInfoUrl, exchange, resolve, reject)
        });
    };

    let populateStocksHeroku = (stockInfoUrl, exchange) => {
        return new Promise((resolve, reject) => {
            saveStocksToHeroku(stockInfoUrl, exchange, resolve, reject)
        });
    };

    let saveStocks = (stockInfoUrl, exchange, resolve, reject) =>{
        csv()
            .fromStream(request.get(stockInfoUrl))
            .on('csv', (csvRow) => {
                console.log(csvRow);
                let symbol = csvRow[0] != null ? csvRow[0].trim(): 'N/A';

                if(symbol.toLowerCase() == 'more'){
                    console.log(symbol);
                }
                Stock.find({symbol: symbol})
                    .count()
                    .then((count) => {
                        console.log(`${symbol} Stocks: ${count}`);
                        if(count === 0){

                            //insert
                            let stock = new Stock({
                                symbol:symbol,
                                name: csvRow[1],
                                lastSale: csvRow[2],
                                marketCap: csvRow[3],
                                ipoYear: csvRow[4],
                                sector: csvRow[5],
                                industry: csvRow[6],
                                summaryQuoteUrl: csvRow[7],
                                exchange: exchange
                            });

                            stock.save().then((doc) => {
                                console.log('success saving.. : ', doc);
                            }, (e) => {
                                console.log('error saving.. : ', e);
                            });

                        } else {
                            console.log(`${symbol} already in DB`);
                        }
                    });

            })
            .on('done',(error)=>{
                if(error != null) {
                    console.log(error);
                    reject(error);
                }
                resolve('OK');
            });
    }

    let saveStocksToHeroku = (stockInfoUrl, exchange, resolve, reject) =>{
        csv()
            .fromStream(request.get(stockInfoUrl))
            .on('csv', (csvRow) => {

                console.log(csvRow);
                let symbol = csvRow[0] != null ? csvRow[0].trim(): 'N/A';

                if(symbol.toLowerCase() === 'more'){
                    console.log(symbol);
                }

                let stock = {
                    symbol:symbol,
                    name: csvRow[1],
                    lastSale: csvRow[2],
                    marketCap: csvRow[3],
                    ipoYear: csvRow[4],
                    sector: csvRow[5],
                    industry: csvRow[6],
                    summaryQuoteUrl: csvRow[7],
                    exchange: exchange
                };

                axios.post(`${herokuUDFBaseUrl}/api/udf/updatestocksheroku` , {
                    params: stock
                }).then(function(data) {
                    res.send(data.data)
                }).catch(function(err){
                    res.send(err)
                });

            })
            .on('done',(error)=>{
                if(error != null) {
                    console.log(error);
                    reject(error);
                }
                resolve('OK');
            });
    }


    function parseDate(input) {
        var parts = input.split('-');
        return Date.UTC(parts[0], parts[1]-1, parts[2]);
    }

    function convertYahooHistoryToUDFFormat(data) {
        return {
            t: _.pluck(data, 'date').map((date) => {
                return parseDate(moment(date).format("YYYY-MM-DD")) / 1000;
            }),
            c: _.pluck(data, 'close'),
            o: _.pluck(data, 'open'),
            h: _.pluck(data, 'high'),
            l: _.pluck(data, 'low'),
            v: _.pluck(data, 'volume'),
            s: 'ok'
        };
    }

    function requestHistoryFromQuandl(symbol, startDateTimestamp, endDateTimestamp, response) {
        function dateToYMD(date) {
            var obj = new Date(date * 1000);
            var year = obj.getFullYear();
            var month = obj.getMonth();
            var day = obj.getDate();
            return year + "-" + month + "-" + day;
        }

        function sendResult(content) {
            var header = createDefaultHeader();
            header["Content-Length"] = content.length;
            response.writeHead(200, header);
            response.write(content, null, function() {
                response.end();
            });
        }

        var from = dateToYMD(startDateTimestamp);
        var to = dateToYMD(endDateTimestamp);

        var key = symbol + "|" + from + "|" + to;

        if (quandlCache[key]) {
            console.log("Return QUANDL result from cache: " + key);
            sendResult(quandlCache[key]);
            return;
        }

        var address = "/api/v3/datatables/WIKI/PRICES.json" +
            "?api_key=" + process.env.QUANDL_API_KEY + // you should create a free account on quandl.com to get this key
            "&ticker=" + symbol +
            "&date.gte=" + from +
            "&date.lte=" + to;

        console.log("Sending request to quandl for symbol " + symbol + ". url=" + address);

        httpGet("www.quandl.com", address, function(result) {
            if (response.finished) {
                // we can be here if error happened on socket disconnect
                return;
            }
            var content = JSON.stringify(convertQuandlHistoryToUDFFormat(result));
            quandlCache[key] = content;
            sendResult(content);
        });

    };

    return {
        getHistory,
        getSymbols,
        updateStockInformation,
        updateStockInformationHeroku,
        updateStockSingleHeroku
    }

};

module.exports = udfController;