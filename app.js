// NOTE: used https://github.com/ddollar/heroku-push to get around port 22 access requirement for Heroku

var express = require('express');
var app = express();

var quotes = [
	{ author : 'Audrey Hepburn', text : "Nothing is impossible, the word itself says 'I'm possible'!"},
	{ author : 'Walt Disney', text : "You may not realize it when it happens, but a kick in the teeth may be the best thing in the world for you"},
	{ author : 'Unknown', text : "Even the greatest was once a beginner. Don't be afraid to take that first step."},
	{ author : 'Neale Donald Walsch', text : "You are afraid to die, and you're afraid to live. What a way to exist."}
];

var story = [
	{ "id": "b1", "top": "200", "left": "200", "text": "Events/Plots", "width": 150,
		"contents": "This is the content of the events and plots bubble."
	}, 
	{ "id": "b2", "top": "400", "left": "200", "text": "The Matron<br/>and the safe<br/>world",
		"contents": "This is the next contents bubble.\nOnce upon a time there was an old lady.\nShe lived in a brown shoe and smelled like socks.\nAnd this is another line in the second bubble."
	}
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
	/*
	if (story.length <= req.params.id || req.params.id < 0) {
		res.statusCode = 404;
		return res.send('Error 404: No quote found');
	}
	*/

	var s = story.filter(function (item) { return item.id == req.params.id; });
	if (s.length > 0) {
		if (req.body.hasOwnProperty('left')) {
			s[0].top = req.body.top;
			s[0].left = req.body.left;
		}
		if (req.body.hasOwnProperty('text')) {
			s[0].text = req.body.text;
		}
		if (req.body.hasOwnProperty('width')) {
			s[0].width = req.body.width;
			s[0].height = req.body.height;
		}
		if (req.body.hasOwnProperty('contents')) {
			s[0].contents = req.body.contents;
		}
	} else {
		// adding new
		var s = {};
		// copy top-level properties
		for (var keys = Object.keys(req.body), l = keys.length; l; --l) {
		   s[keys[l-1]] = req.body[keys[l-1]];
		}
		story.push(s);
	}
	
	res.json(s);
});

app.post('/delete/:id', function(req, res) {
	var s = story.filter(function (item) { return item.id == req.params.id; });
	if (s.length > 0) {
		var index = story.indexOf(s[0]);
		if (index != -1) {
			story.splice(index, 1);
		}
	}
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