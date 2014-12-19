exports.index = function(req, res) {
  res.render('index', { title: 'Upload App v0.0.2', active: 'index' });
};

exports.uploaded = function(req, res) {
  res.render('uploaded', { title: 'Upload App v0.0.2', active: 'uploaded' });
};
