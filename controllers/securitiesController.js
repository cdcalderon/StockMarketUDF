const filterComposer = require('../server/common/filterComposerUtils');

let securityController = (Stock) => {

    let get = (req, res) => {
        let query = filterComposer.getFilterQuery(req.body);

        Stock.find(query.filterQuery)
            .then((gaps => {
                console.log(gaps);
                res.send("OK");
            }));
    };

    return {
        get: get
    }
};

module.exports = securityController;