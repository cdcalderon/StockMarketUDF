const filterComposer = require('../server/common/filterComposerUtils');

let securityController = (Stock) => {

    let get = (req, res) => {
        let query = filterComposer.getFilterQuery(req.body);

        Stock.find(query.filterQuery)
            .then((securities => {
                console.log(securities);

                securities = securities.map((s) => {
                    return {symbol: s.symbol};
                });
                res.send(securities);
            }));
    };

    return {
        get: get
    }
};

module.exports = securityController;