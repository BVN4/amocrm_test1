const express = require('express');
const app = express();
const port = 80;

global.auth = require('./auth').init(app);
const action = require('./action');

app.listen(port, () => {
	console.log('Example app listening on port ' + port);
});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});

app.get('/action', (req, res) => {
	const result = action.call(req.query);
	const params = new URLSearchParams({
		name: req.query.name,
		email: req.query.email,
		phone: req.query.phone,
		error: result
	});
	const str = params.toString();
	res.redirect('/?' + str);
});
