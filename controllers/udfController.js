let udfController = (
    axios,
    moment,
    _,
    datafeedHost,
    quotes,
    symbolsDB) => {

    const historyQuotesUrl = 'https://demo_feed.tradingview.com/history';
    const symbolsQuotesUrl  = 'https://demo_feed.tradingview.com/symbols';
    const marksQuotesUrl  = 'https://demo_feed.tradingview.com/marks';
    const timescale_marksQuotesUrl  = 'https://demo_feed.tradingview.com/timescale_marks';
    const configQuotesUrl  = 'https://demo_feed.tradingview.com/config';

    //Implement new yahoo UDP quotes service
    //https://github.com/tradingview/yahoo_datafeed/blob/master/yahoo.js
     let getHistory = (req, res) => {
        let symbol = req.query.symbol;
        let resolution = req.query.resolution;
        // let startDateTimestamp = req.query.from;
         // let endDateTimestamp = req.query.to;

         let startDateTimestamp = moment.unix(req.query.from).format("MM/DD/YYYY");
         let endDateTimestamp = moment.unix(req.query.to).format("MM/DD/YYYY");

         // if (lastHistoryErrorTime && Date.now() - lastHistoryErrorTime < errorSwitchingTime) {
         //     requestHistoryFromQuandl(symbol, startDateTimestamp, endDateTimestamp, response);
         //     return;
         // }

         //var symbolInfo = symbolsDB.symbolInfo(symbol);


         quotes.getHistoricalQuotes(symbol, startDateTimestamp, endDateTimestamp)
             .then((fullQuotes) => {

                 let quotes = convertYahooHistoryToUDFFormat(fullQuotes);
                 res.send(quotes);
             })
             .catch((error) => {
                 console.log(error);
             });


         // if (symbolInfo == null) {
         //     throw "unknown_symbol";
         // }
         //
         // var requestLeftDate = new Date(startDateTimestamp * 1000);
         // console.log(requestLeftDate);
         //
         // var year = requestLeftDate.getFullYear();
         // var month = requestLeftDate.getMonth();
         // var day = requestLeftDate.getDate();
         //
         // var endtext = '';
         //
         // if (endDateTimestamp) {
         //     var requestRightDate = new Date(endDateTimestamp * 1000);
         //     var endyear = requestRightDate.getFullYear();
         //     var endmonth = requestRightDate.getMonth();
         //     var endday = requestRightDate.getDate();
         //
         //     endtext = '&d=' + endmonth +
         //         '&e=' + endday +
         //         '&f=' + endyear;
         // }
         //
         // if (resolution.toLowerCase() != "d" && resolution.toLowerCase() != "w" && resolution.toLowerCase() != "m") {
         //     throw "Unsupported resolution: " + resolution;
         // }
         //
         // var address = "ichart.finance.yahoo.com/table.csv?s=" + symbolInfo.name +
         //     "&a=" + month +
         //     "&b=" + day  +
         //     "&c=" + year + endtext +
         //     "&g=" + resolution +
         //     "&ignore=.csv";
         //
         // console.log("Requesting " + address);
         //
         // var that = this;
         //
         // httpGet(datafeedHost, address, function(result) {
         //     var content = JSON.stringify(convertYahooHistoryToUDFFormat(result));
         //
         //     var header = createDefaultHeader();
         //     // header["Content-Length"] = content.length;
         //     // response.writeHead(200, header);
         //     // response.write(content, null, function() {
         //     //     response.end();
         //     // });
         // }, function(error) {
         //     // try another feed
         //     requestHistoryFromQuandl(symbol, startDateTimestamp, endDateTimestamp, response);
         //     lastHistoryErrorTime = Date.now();
         // });







        // axios.get(historyQuotesUrl, {
        //     params: {
        //         symbol: symbol, resolution: resolution, from: from, tom: to
        //     }
        // }).then(function(data) {
        //     res.send(data.data)
        // }).catch(function(err){
        //     res.send(err)
        // });
    };

    function createDefaultHeader() {
        return {"Content-Type": "text/plain", 'Access-Control-Allow-Origin': '*'};
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

        // // input: string "yyyy-mm-dd" (UTC)
        // // output: milliseconds from 01.01.1970 00:00:00.000 UTC
        // function parseDate(input) {
        //     var parts = input.split('-');
        //     return Date.UTC(parts[0], parts[1]-1, parts[2]);
        // }
        //
        // var result = {
        //     t: [], c: [], o: [], h: [], l: [], v: [],
        //     s: "ok"
        // };
        //
        // var lines = data.split('\n');
        //
        // for (var i = lines.length - 2; i > 0; --i) {
        //     var items = lines[i].split(",");
        //
        //     var time = parseDate(items[0]) / 1000;
        //
        //     result.t.push(time);
        //     result.o.push(parseFloat(items[1]));
        //     result.h.push(parseFloat(items[2]));
        //     result.l.push(parseFloat(items[3]));
        //     result.c.push(parseFloat(items[4]));
        //     result.v.push(parseFloat(items[5]));
        // }
        //
        // if (result.t.length === 0) {
        //     result.s = "no_data";
        // }
        //
        // return result;
    }
    function httpGet(datafeedHost, path, callback, failedCallback)
    {
        var options = {
            host: datafeedHost,
            path: path
        };

        onDataCallback = function(response) {
            var result = '';

            response.on('data', function (chunk) {
                result += chunk
            });

            response.on('end', function () {
                if (response.statusCode !== 200) {
                    failedCallback ? failedCallback(response.statusCode) : callback('');
                    return;
                }

                callback(result)
            });
        }

        var req = https.request(options, onDataCallback);

        req.on('socket', function (socket) {
            socket.setTimeout(5000);
            socket.on('timeout', function() {
                console.log('timeout');
                req.abort();
            });
        });

        req.on('error', function(e) {
            console.log('Problem with request: ' + e.message);
            failedCallback ? failedCallback(e) : callback('');
        });

        req.end();
    }


    let getMarksGaps = (req, res) => {
        let symbol = req.query.symbol;
        let resolution = req.query.resolution;
        let from = moment.unix(req.query.from).format("MM/DD/YYYY");
        let to = moment.unix(req.query.to).format("MM/DD/YYYY");
        quotes.getHistoricalQuotes(symbol, from, to)
            .then(quotes.getIndicators)
            .then(quotes.createQuotesWithIndicatorsAndArrowSignals)
            .then((fullQuotes) => {
                let gapSignals = gapValidatorUtils.getGapChartMarks(fullQuotes);
                let marks = charMarkUtils.formatMarksResult(gapSignals);

                res.send(marks);
            })
            .catch((error) => {
                console.log(error);
            });
    };

    let getMarksGreenArrows = (req, res) => {
        let symbol = req.query.symbol;
        let resolution = req.query.resolution;
        let from = moment.unix(req.query.from).format("MM/DD/YYYY");
        let to = moment.unix(req.query.to).format("MM/DD/YYYY");
        quotes.getHistoricalQuotes(symbol, from, to)
            .then(quotes.getIndicators)
            .then(quotes.createQuotesWithIndicatorsAndArrowSignals)
            .then((fullQuotes) => {

                let threeArrowSignals = threeArrowValidatorUtils.getThreeArrowChartMarks(fullQuotes);

                // let gapSignals = getGapChartMarks(fullQuotes);

                // let mergedSignals = mergeSignalsAndSortByTime(gapSignals, threeArrowSignals);

                let marks = charMarkUtils.formatMarksResult(threeArrowSignals);

                res.send(marks);
            })
            .catch((error) => {
                console.log(error);
            });
    };


    let getMarks = (req, res) => {
        let symbol = req.query.symbol;
        let resolution = req.query.resolution;
        let from = moment.unix(req.query.from).format("MM/DD/YYYY");
        let to = moment.unix(req.query.to).format("MM/DD/YYYY");
        quotes.getHistoricalQuotes(symbol, from, to)
            .then(quotes.getIndicators)
            .then(quotes.createQuotesWithIndicatorsAndArrowSignals)
            .then((fullQuotes) => {

                let threeArrowSignals = threeArrowValidatorUtils.getThreeArrowChartMarks(fullQuotes);

                let gapSignals = gapValidatorUtils.getGapChartMarks(fullQuotes);

                let mergedSignals = stockSignalsUtils.mergeSignalsAndSortByTime(gapSignals, threeArrowSignals);

                let marks = charMarkUtils.formatMarksResult(mergedSignals);

                res.send(marks);
            })
            .catch((error) => {
                console.log(error);
            });
    };

    let getSignals = (req, res) => {
        let symbol = req.query.symbol;
        let from = moment.unix(req.query.from).format("MM/DD/YYYY");
        let to = moment.unix(req.query.to).format("MM/DD/YYYY");
        quotes.getHistoricalQuotes(symbol, from, to)
            .then(quotes.getIndicators)
            .then(quotes.createQuotesWithIndicatorsAndArrowSignals)
            .then((fullQuotes) => {

                let threeArrowSignals = threeArrowValidatorUtils.getThreeArrowSignals(fullQuotes);

                let gapSignals = gapValidatorUtils.getGapSignals(fullQuotes);

                let mergedSignals = stockSignalsUtils.mergeSignalsAndSortByTime(gapSignals, threeArrowSignals);

                res.send(mergedSignals);
            })
            .catch((error) => {
                console.log(error);
            });

    };

    let getConfig = (req, res) => {
        res.send(tradingViewConfig);
    };

    let getSymbols = (req, res) => {
        let symbol = req.query.symbol;

        axios.get(symbolsQuotesUrl, {
            params: {
                symbol: symbol
            }
        }).then(function(data) {
            res.send(data.data)
        }).catch(function(err){
            res.send(err)
        });
    };

    let getTimescaleMarks = (req, res) => {
        let symbol = req.query.symbol;
        let resolution = req.query.resolution;
        let from = new Date(req.query.from);
        let to = new Date(req.query.to);

        axios.get(timescale_marksQuotesUrl, {
            params: {
                symbol: symbol, resolution: resolution, from: from, tom: to
            }
        }).then(function(data) {
            res.send(data.data)
        }).catch(function(err){
            res.send(err)
        });
    };



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
        getHistory: getHistory,
        getConfig: getConfig,
        getMarksGaps: getMarksGaps,
        getMarks: getMarks,
        getSignals: getSignals,
        getMarksGreenArrows: getMarksGreenArrows,
        getSymbols: getSymbols,
        getTimescaleMarks: getTimescaleMarks
    }

}

module.exports = udfController;

let tradingViewConfig = `{
    "supports_search": true,
        "supports_group_request": false,
        "supports_marks": true,
        "supports_timescale_marks": false,
        "supports_time": true,
        "exchanges": [
        {
            "value": "",
            "name": "All Exchanges",
            "desc": ""
        },
        {
            "value": "XETRA",
            "name": "XETRA",
            "desc": "XETRA"
        },
        {
            "value": "NSE",
            "name": "NSE",
            "desc": "NSE"
        },
        {
            "value": "NasdaqNM",
            "name": "NasdaqNM",
            "desc": "NasdaqNM"
        },
        {
            "value": "NYSE",
            "name": "NYSE",
            "desc": "NYSE"
        },
        {
            "value": "CDNX",
            "name": "CDNX",
            "desc": "CDNX"
        },
        {
            "value": "Stuttgart",
            "name": "Stuttgart",
            "desc": "Stuttgart"
        }
    ],
        "symbolsTypes": [
        {
            "name": "All types",
            "value": ""
        },
        {
            "name": "Stock",
            "value": "stock"
        },
        {
            "name": "Index",
            "value": "index"
        }
    ],
        "supportedResolutions": [
        "D",
        "2D",
        "3D",
        "W",
        "3W",
        "M",
        "6M"
    ]
}`;
