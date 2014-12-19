window.addEventListener('load', ready);

var socket = io.connect('http://localhost:3000', {
  'reconnect': true,
  'reconnection delay': 500,
  'max reconnection attempts': 10
});
var drop;
var addedFiles = {};

function ready() {
  if (window.File && window.FileReader) {
    uploader();
  } else {
    document.getElementById('uploadArea').innerHTML = 'Tu navegador no soporte la API File. Por favor, actualizalo.';
  }
}

function cancelEvent(e) {
  if (e.preventDefault) e.preventDefault();

  return false;
}

function progressBar(id) {
  var progressContainer = document.createElement('div');
  var progressBar = document.createElement('div');

  progressContainer.className = 'progress';
  progressBar.id = 'progress-' + id;
  progressBar.className = 'progress-bar';
  progressBar.style = 'width: 0;';
  progressBar.innerHTML = '0%';
  progressContainer.appendChild(progressBar);

  return progressContainer;
}

function uploader() {
  drop = document.getElementById('drop-area');

  drop.addEventListener('dragover', cancelEvent, false);
  drop.addEventListener('dragenter', cancelEvent, false);

  drop.addEventListener('drop', function(e) {
    e = e || window.event;

    if (e.preventDefault) e.preventDefault();

    var list = document.getElementById('file-list');
    var dt = e.dataTransfer;
    var files = dt.files;

    for (var i = 0, len = files.length; i < len; i++) {
      var file = files[i];

      if (!addedFiles[file.name]) {
        var fileNumber = uuid();

        fileAdded(fileNumber, file);

        addedFiles[file.name] = {
          id: fileNumber,
          file: file,
          reader: new FileReader()
        };
      }

      startUpload(file.name);
    }

    return false;
  }, false);
}

function fileAdded(fileNumber, file) {
  var list = document.getElementById('file-list');
  var fileContainer = document.createElement('div');
  var fileInfo = document.createElement('div');
  var fileProgress = document.createElement('div');
  var progressContainer = progressBar(fileNumber);

  fileContainer.id = 'file-' + fileNumber;
  fileContainer.className = 'row';
  fileInfo.className = 'col-md-4';
  fileProgress.className = 'col-md-8';

  fileInfo.innerHTML = file.name + ' (' + file.size + ' B)';

  fileProgress.appendChild(progressContainer);
  fileContainer.appendChild(fileInfo);
  fileContainer.appendChild(fileProgress);
  list.appendChild(fileContainer);
}

function startUpload(name) {
  addedFiles[name].reader.onload = function(evt) {
    socket.emit('upload', { name: name, id: addedFiles[name].id, data: evt.target.result });
  };

  socket.emit('start', { name: name, id: addedFiles[name].id, size: addedFiles[name].file.size });
}

function updateBar(id, percent){
  var bar = document.getElementById('progress-' + id);

  bar.innerHTML = percent + '%';
  bar.style.width = percent + '%';
}

function refresh(){
    location.reload(true);
}

function disconected() {
  var overlay = document.createElement('div');
  var loading = document.createElement('div');
  var status = document.createElement('div');

  status.id = 'overlay-msg';
  status.innerHTML = '<p>Se ha perdido la conexión. No recargue la página, se está intentando recuperar la conexión</p>';
  loading.id = 'overlay-loading';
  overlay.id = 'overlay';
  overlay.appendChild(loading);
  overlay.appendChild(status);

  document.body.appendChild(overlay);
}

function connected() {
  var overlay = document.getElementById('overlay');

  if (overlay) {
    document.body.removeChild(overlay);

    if (Object.keys(addedFiles).length > 0) {
      for (var name in addedFiles) {
        startUpload(name);
      }
    }
  }
}

socket.on('moreData', function (data) {
  var name = data['name'];

  updateBar(addedFiles[name].id, data['percent']);

  var place = data['place'] * 524288; //The Next Blocks Starting Position
  var newFile; //The Variable that will hold the new Block of Data

  if (addedFiles[name].file.webkitSlice) {
    newFile = addedFiles[name].file.webkitSlice(place, place + Math.min(524288, (addedFiles[name].file.size - place)) );
  } else if (addedFiles[name].file.mozSlice) {
    newFile = addedFiles[name].file.mozSlice(place, place + Math.min(524288, (addedFiles[name].file.size - place)) );
  } else {
    newFile = addedFiles[name].file.slice(place, place + Math.min(524288, (addedFiles[name].file.size - place)) );
  }

  if (addedFiles[name].reader.readAsBinaryString) {
    addedFiles[name].reader.readAsBinaryString(newFile);
  } else {
    addedFiles[name].reader.readAsArrayBuffer(newFile);
  }
});

socket.on('alreadyExists', function(data) {
  var id = data['id'];
  var bar = document.getElementById('progress-' + id);

  bar.innerHTML = 'El fichero ya existe en el servidor';
  bar.style.width = '100%';
});

socket.on('done', function (data) {
  var name = data['name'];
  var id = addedFiles[name].id;
  var bar = document.getElementById('progress-' + id);

  bar.innerHTML = '100%';
  bar.style.width = '100%';

  delete addedFiles[name];
});

socket.on('connect', function(data) {
  connected();
});

socket.on('disconnect', function(data) {
  disconected();
});
