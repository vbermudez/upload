var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
//var multipart = require('connect-multiparty');
var serveStatic = require('serve-static');
var io = require('socket.io');
var fs = require('fs');
var routes = require('./routes');
var db = require('./db/schemas.js');

// Globals
var app = express();
//var multipartMiddleware = multipart();
var files = {};

// Create required folders if not exists
function createFolder(path, mask, callback) {
  if (typeof mask == 'function') {
    callback = mask;
    mask = 0777;
  }

  fs.mkdir(path, mask, function(err) {
    if (err) {
      if (err.code == 'EEXIST') callback(null);
      else callback(err);
    } else callback(null);
  });
}

createFolder(__dirname + '/temp', function(err) {
  if (err) {
    console.error(err);
  }
});

createFolder(__dirname + '/files', function(err) {
  if (err) {
    console.error(err);
  }
});

// express configuration/middlewares
app.set('views', './views');
app.set('view engine', 'jade');
app.use( serveStatic('public', {'index': false}) );
app.use( methodOverride('X-HTTP-Method') ); // Microsoft
app.use( methodOverride('X-HTTP-Method-Override') );  // Google/Chrome/GData
app.use( methodOverride('X-Method-Override') ); // IBM
app.use( methodOverride('_method') ); // Custom: ex.: ?_method=DELETE
app.use( bodyParser.json() );
app.use( bodyParser.urlencoded({ extended: false }) );

// error handler
app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);

function logErrors(err, req, res, next) {
  console.error(err.stack);
  next(err);
}

function clientErrorHandler(err, req, res, next) {
  if (req.xhr) {
    res.status(500).send({ error: 'BOOOOUUUMM!' });
  } else {
    next(err);
  }
}

function errorHandler(err, req, res, next) {
  res.status(500);
  res.render('error', { error: err });
}

// routes
app.get('/', routes.pages.index);
app.get('/uploaded', routes.pages.uploaded);
app.get('/files', routes.files.find);

// startup
var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('upload app listening at http://%s:%s', host, port);
});

// db.Fichero helpers
function createFile(data) {
  var fich = new db.Fichero(data);

  fich.save(function(err) {
    if (err) {
      console.error('createFile', err);
    }
  });
}

function updateFile(id, data) {
  db.Fichero.findOne({ id: id }, function(err, fich) {
      if (err) {
        console.error('updateFile-findOne', err);
      }

      for (var key in data) {
        fich[key] = data[key];
      }

      fich.save(function(err) {
        if (err) {
          console.error('updateFile-save', err);
        }
      });
  });
}

// Socket events
var sio = io.listen(server);

sio.sockets.on('connection', function(socket) {
  socket.on('start', function (data) { //data contains the variables that we passed through in the html file
    var name = data['name'];
    var id = data['id'];
    files[name] = {  //Create a new entry in The Files Variable
      size: data['size'],
      data: "",
      downloaded: 0,
      id: id
    }
    var place = 0;

    createFile({
      id: id,
      name: name,
      size: data['size'],
      place: place,
      downloaded: 0,
      completed: false,
      started: new Date()
    });

    try {
      var stat = fs.statSync('temp/' +  name);

      if (stat.isFile()) {
        files[name]['downloaded'] = stat.size;
        place = stat.size / 524288;
      }
    } catch(er){ } //It's a New File

    fs.open("temp/" + name, "a", 0755, function(err, fd) {
      if (err) {
        console.log(err);
        socket.emit('alreadyExists', { name: name, id: id });
      } else {
        files[name]['handler'] = fd; //store the file handler so we can write to it later
        socket.emit('moreData', { name: name, id: id, place: place, percent : 0 });
      }
    });
  });

  socket.on('upload', function (data) {
    var name = data['name'];
    var id = data['id'];

    files[name]['downloaded'] += data['data'].length;
    files[name]['data'] += data['data'];

    if (files[name]['downloaded'] == files[name]['size']) {//If File is Fully Uploaded
      fs.write(files[name]['handler'], files[name]['data'], null, 'Binary', function(err, Writen) {
        //Move to another directory
        var inf = fs.createReadStream("temp/" + name);
        var out = fs.createWriteStream("files/" + name);

        inf.pipe(out);
        inf.on('end', function() { //move completed
          fs.unlink("temp/" + name, function () { //This Deletes The Temporary File
            //delete completed
            fs.close(files[name]['handler'], function(err) {
              console.log('Handler closed for file ' + name);
            });

            console.log('File ' + name + ' uploaded successfully');

            updateFile(id, {
              downloaded: files[name]['downloaded'],
              completed: true,
              ended: new Date()
            });

            socket.emit('done', { name: name, id: id });
          });
        });
      });
    } else if(files[name]['data'].length > 10485760) { //If the Data Buffer reaches 10MB
      fs.write(files[name]['handler'], files[name]['data'], null, 'Binary', function(err, Writen) {
        files[name]['data'] = ""; //Reset The Buffer

        var place = files[name]['downloaded'] / 524288;
        var percent = (files[name]['downloaded'] / files[name]['size']) * 100;

        updateFile(id, {
          downloaded: files[name]['downloaded'],
          place: place
        });

        socket.emit('moreData', { name: name, id: id, place: place, percent: percent });
      });
    } else {
      var place = files[name]['downloaded'] / 524288;
      var percent = (files[name]['downloaded'] / files[name]['size']) * 100;

      updateFile(id, {
        downloaded: files[name]['downloaded'],
        place: place
      });

      socket.emit('moreData', { name: name, id: id, place: place, percent: percent });
    }
  });
});
