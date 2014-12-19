var db = require('../db/schemas.js');

exports.find = function(req, res) {
  var term = req.query.search.value;
  var start = parseInt(req.query.start);
  var length = parseInt(req.query.length);
  var orderby = parseInt(req.query.order[0].column);
  var orderdir = req.query.order[0].dir;

  var query = {};
  var sort = {};

  if (orderby >= 0) {
    var cols = ['name', 'size', 'started', 'ended'];

    sort[cols[orderby]] = orderdir == 'asc' ? 1 : -1;
  }

  if (term != '') {
    query = {
      $or: [
        { name: new RegExp(term, 'gi') },
        { size: new RegExp(term, 'gi') },
        { started: new RegExp(term, 'gi') },
        { ended: new RegExp(term, 'gi') },
      ]
    }
  }

  db.Fichero.count({}, function(err, total) {
    if (err) {
      console.error(err);
      res.json({ error: err });
    }

    db.Fichero.find(query, null, { skip: start, limit: length, sort: sort }, function(err, results) {
      if (err) {
        console.error(err);
        res.json({ error: err });
      }

      var records = {
        draw: parseInt(req.query.draw),
        recordsTotal: total,
        recordsFiltered: results.length,
        data: results
      };

      res.json(records);
    });
  });

/* EJEMPLO
  //console.log(req.query);
  var total = 100;
  var records = {
    draw: parseInt(req.query.draw),
    recordsTotal: total,
    recordsFiltered: 0,
    data: []
  };
  var data = [];

  for (var i = 0; i < total; i++) {
    data.push({
      DT_RowId: i + 1,
      DT_RowData: {
        anyData: 'datos-extra' + i
      },
      id: i + 1,
      name: 'fichero ' + i,
      size: (i + 2) * 23,
      started: '20141218',
      ended: '20141219'
    });
  }

  if (term && term != '') {
    data = data.filter(function(item) {
      var match = false;

      for (var key in item) {
        if (item[key].toString().indexOf(term) != -1) { // ALL CONTENT SEARCH
          match = true;

          break;
        }
      }

      return match;
    });
  }

  if (data.length > length) {
    if (start >= data.length) {
      start = data.length - 1;
    }

    if ((length + start) > data.length) {
      length = data.lentgh - start;
    }

    data = data.splice(start, length);
  }

  records.data = data;
  records.recordsFiltered = term == '' ? total : records.data.length;
  res.json(records);
*/
};
