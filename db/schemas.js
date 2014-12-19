var mongoose = require('mongoose');
var dbhost = process.env.MONGODB_DB_HOST || 'localhost';
var dbport = process.env.MONGODB_DB_PORT || 27017;
var dbuser = process.env.MONGODB_DB_USER || 'admin';
var dbpass = process.env.MONGODB_DB_PASS || '';

mongoose.connect('mongodb://' + dbuser + ':' + dbpass + '@' + dbhost + ':' + dbport + '/upload');

var Schema = mongoose.Schema;

var FicheroSchema = new Schema({
	id: String,
	name: { type: String, required: true },
  size: { type: Number, required: true },
  place: { type: Number, required: true },
  downloaded: { type: Number, required: true },
  completed: { type: Boolean, required: true },
	started: { type: Date, required: true },
	ended: { type: Date }
});

exports.Fichero = mongoose.model('Fichero', FicheroSchema);
