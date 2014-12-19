$(function() {
  var columnDefs = [
    { name: 'id', title: '#', data:'id', targets: [ 0 ], searchable: false, visible: false },
    { name: 'name', title: 'Nombre', data:'name', targets: [ 1 ] },
    { name: 'size', title: 'Tamaño', data:'size', targets: [ 2 ] },
    { name: 'started', title: 'Fecha inicio', data:'started', targets: [ 3 ], type: 'date', render: dateRenderer },
    { name: 'ended', title: 'Fecha fin', data:'ended', targets: [ 4 ], type: 'date', render: dateRenderer }
  ];

  $('#filesTable').dataTable({
    columnDefs: columnDefs,
    processing: true,
    serverSide: true,
    ajax: $.fn.dataTable.pipeline( {
      url: '/files',
      pages: 5 // number of pages to cache
    } )
  });
});

function formatDate(date) {
	var day = date.getDate();
	var month = date.getMonth() + 1;
	var year = date.getFullYear();
  var hour = date.getHours();
  var min = date.getMinutes();
  var sec = date.getSeconds();

	return (day < 10 ? '0' + day : day) + '/' +
			(month < 10 ? '0' + month : month) + '/' +
			year + ' ' +
      (hour < 10 ? '0' + hour : hour) + ':' +
      (min < 10 ? '0' + min : min) + ':' +
      (sec < 10 ? '0' + sec : sec)
}

function dateRenderer(data, type, row) {
	var date = new Date(data);

	return formatDate(date);
}
