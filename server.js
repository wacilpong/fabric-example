let express = require('express');
let app = express();
let fs = require('fs');

app.use('/r', express.static(__dirname));

app.get('/', function(req, res) {
	fs.readFile('./fabricTest.html', function(err, data) {
		if(err) {
			console.log(err);
		} else {
			res.writeHead(200, {'Content-Type' : 'text/html'});
			res.end(data);
		}
	});
});

app.listen(55555, function() {
	console.log('Start server on interstella 55555 port.');
});
