var express = require('express');
var app = express();

var quotes = [
	{ author : 'Audrey Hepburn', text : "Nothing is impossible, the word itself says 'I'm possible'!"},
	{ author : 'Walt Disney', text : "You may not realize it when it happens, but a kick in the teeth may be the best thing in the world for you"},
	{ author : 'Unknown', text : "Even the greatest was once a beginner. Don't be afraid to take that first step."},
	{ author : 'Neale Donald Walsch', text : "You are afraid to die, and you're afraid to live. What a way to exist."}
];

var story = [
	{ "id": "b1", "top": "200", "left": "200", "text": "Events/Plots" }, 
	{ "id": "b2", "top": "400", "left": "200", "text": "The Matron and the safe world" }
];

app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
	res.json(quotes);
});

app.get("/story", function (req, res) {
	res.json(story);
});

app.post('/story/:id', function(req, res) {
	if (!req.body.hasOwnProperty('left') || !req.body.hasOwnProperty('top')) {
		res.statusCode = 400;
		return res.send('Error 400: Post syntax incorrect.');
	}
	if (story.length <= req.params.id || req.params.id < 0) {
		res.statusCode = 404;
		return res.send('Error 404: No quote found');
	}
	
	var s = story.filter(function (item) { return item.id == req.params.id; });
	if (s.length > 0) {
		s[0].top = req.body.top;
		s[0].left = req.body.left;
	}
	
	res.json(s);
});

app.get('/quote/:id', function(req, res) {
	if (quotes.length <= req.params.id || req.params.id < 0) {
		res.statusCode = 404;
		return res.send('Error 404: No quote found');
	}

	var q = quotes[req.params.id];
	res.json(q);
});

app.post('/quote', function(req, res) {
	if (!req.body.hasOwnProperty('author') || !req.body.hasOwnProperty('text')) {
		res.statusCode = 400;
		return res.send('Error 400: Post syntax incorrect.');
	}

	var newQuote = {
		author: req.body.author,
		text: req.body.text
	};

	quotes.push(newQuote);
	res.json(newQuote);
});

app.delete('/quote/:id', function(req, res) {
	if (quotes.length <= req.params.id) {
		res.statusCode = 404;
		return res.send('Error 404: No quote found');
	}

	quotes.splice(req.params.id, 1);
	res.json(true);
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
	console.log("Listening on " + port);
});