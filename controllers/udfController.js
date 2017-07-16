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

             // let startDateTimestamp = moment.unix(req.query.from).format("MM/DD/YYYY");
             // let endDateTimestamp = moment.unix(req.query.to).format("MM/DD/YYYY");
         let startDateTimestamp = new Date(req.query.from * 1000);
         let endDateTimestamp = new Date(req.query.to * 1000);
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
                    } else {
                        res.status(404).send('resource not found');
                    }
                });
    };

    let getAllSymbols = (req, res) => {
        Stock.find()
            .then((symbols) => {
                if (symbols != null) {
                    let responseSymbols = symbols.map((s) => {
                        return s.symbol;
                    });

                    responseSymbols =_.uniq(responseSymbols);

                    res.send(responseSymbols);
                } else {
                    res.status(404).send('resource not found');
                }
            });
    };

    let getSymbolsPartial = (req, res) => {
        let part = req.query.part;
        Stock.find({ "symbol": { "$regex": part, "$options": "i" } })
            .then((symbols) => {
                if (symbols != null) {
                    symbols = symbols.map((s) => {
                        return s.symbol;
                    });
                    res.send(symbols);
                } else {
                    res.status(404).send('resource not found');
                }
            });
    };

    let getAllStocksFull = (req, res) => {
        Stock.find()
            .then((symbols) => {
                if (symbols != null) {
                    let responseSymbols = symbols.map((s) => {
                        return {
                            symbol: s.symbol,
                            exchange: s.exchange,
                            summaryQuoteUrl: s.summaryQuoteUrl,
                            industry: s.industry,
                            sector: s.sector,
                            name: s.name
                        };
                    });

                    responseSymbols =_.uniq(responseSymbols);

                    res.send(responseSymbols);
                } else {
                    res.status(404).send('resource not found');
                }
            });
    };

    // Populate StockmInformation locally, I need this since reading from nasdaq csv files is not working from Heroku,
    // so I need to store all  symbols in my local Db and then execute updateStockInformationHeroku locally which will post
    // to axios.post(`${herokuUDFBaseUrl}/api/udf/updateStocksFromCollectionHeroku`
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

    // Execute this Locally, it will hit a n endpoint hosted in heroku api/udf/updateStocksFromCollectionHeroku
    // which will trigger updateStocksHeroku
    let updateStockInformationHeroku = (req, res) => {

        Stock.find()
            .then((stocks) => {
                console.log(stocks);

                let stocksFormated = stocks.map((stock) => {
                    return {
                        symbol:stock._doc.symbol,
                        name: stock._doc.name,
                        lastSale: stock._doc.lastSale,
                        marketCap: stock._doc.marketCap,
                        ipoYear: stock._doc.ipoYear,
                        sector: stock._doc.sector,
                        industry: stock._doc.industry,
                        summaryQuoteUrl: stock._doc.summaryQuoteUrl,
                        exchange: stock._doc.exchange
                    }
                });
                let stockChunks = _.chunk(stocksFormated, 100);

                let genStockChunks = genStocks(stockChunks);

                let chunk = genStockChunks.next();

                let intervalId = setInterval(() => {
                    axios.post(`${herokuUDFBaseUrl}/api/udf/updateStocksFromCollectionHeroku` , {
                        params: chunk.value
                    }).then(function(data) {
                        console.log( `success ${data.data}`)
                    }).catch(function(err){
                        console.log(err)
                    });
                    chunk = genStockChunks.next();
                    if(chunk.done === true){
                        clearInterval(intervalId);
                        res.status(200).send('ok');
                    }
                },1000);
            });
    };


    //Hosted in Heroku executed by updateStockInformationHeroku
    let updateStocksHeroku = (req, res) => {
        let stocks = req.body.params.map((stock) => {
            return new Stock({
                symbol:stock.symbol.trim(),
                name: stock.name,
                lastSale: stock.lastSale,
                marketCap: stock.marketCap,
                ipoYear: stock.ipoYear,
                sector: stock.sector,
                industry: stock.industry,
                summaryQuoteUrl: stock.summaryQuoteUrl,
                exchange: stock.exchange
            })
        });
        console.log(`Stokcs############ : ${stocks}`);

        let index = 0;
        console.log(`index : ${index}`);
        for (let stock of stocks ) {
            Stock.find({symbol: stock.symbol})
                .count()
                .then((count) => {
                index++;
                    console.log(`index : ${index}`);
                    console.log(`${stock.symbol} Stocks: ${count}`);
                    if(count === 0){

                        stock.save().then((doc) => {
                            console.log('success saving.. : ', doc);
                        }, (e) => {
                            console.log('error saving.. : ', e);
                        });

                    } else {
                        console.log(`${stock.symbol} already in DB`);
                    }

                    if(index === stocks.length-1){
                        res.status(200).send('ok');
                    }
                });

        }
    };

    let populateStocks = (stockInfoUrl, exchange) => {
        return new Promise((resolve, reject) => {
            saveStocks(stockInfoUrl, exchange, resolve, reject)
        });
    };

    let saveStocks = (stockInfoUrl, exchange, resolve, reject) =>{
        csv()
            .fromStream(request.get(stockInfoUrl))
            .on('csv', (csvRow) => {
                console.log(csvRow);
                let symbol = csvRow[0] != null ? csvRow[0].trim(): 'N/A';

                if(symbol.toLowerCase() ==='more'){
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
    };

    let parseDate = (input) => {
        let parts = input.split('-');
        return Date.UTC(parts[0], parts[1]-1, parts[2]);
    };

    let convertYahooHistoryToUDFFormat = (data) => {
        return {
            // t: _.pluck(data, 'date').map((date) => {
            //     return parseDate(moment(date).format("YYYY-MM-DD")) / 1000;
            // }),
            t: _.pluck(data, 'date').map((date) => {
                return new Date(date) / 1000;
            }),
            c: _.pluck(data, 'close'),
            o: _.pluck(data, 'open'),
            h: _.pluck(data, 'high'),
            l: _.pluck(data, 'low'),
            v: _.pluck(data, 'volume'),
            s: 'ok'
        };
    };

    function *genStocks(array) {
        for (let i = 0; i < array.length; i++) {
            yield array[i];
        }
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
        getAllSymbols,
        updateStockInformation,
        updateStockInformationHeroku,
        updateStocksHeroku,
        getAllStocksFull,
        getSymbolsPartial

    }

};

module.exports = udfController;