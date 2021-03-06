//Server Setup
var express = require('express');
var server = express();
var path = require('path');
var stormpath = require('express-stormpath');
var http = require("http");

server.use(stormpath.init(server, {
  application: process.env['STORMPATH_APP_HREF'],
  secretKey: process.env['STORMPATH_SECRET_KEY'],
  redirectUrl: '/dashboard',
  getOauthTokenUrl: '/oauth',
  oauthTTL: 3600
}));


server.set('views', path.join(__dirname, 'views'));
server.set('view engine', 'ejs');

var port = process.env.PORT || 8080;

//Routing
server.get('/', function(req, res) {
  res.redirect(302, "/login");
});

server.get('/dashboard', stormpath.loginRequired, function(req, res) {

  console.log('/dashboard');

  res.locals.user.getApiKeys(function(err, collectionResult) {
    if(collectionResult.items.length === 0) {
      res.locals.user.createApiKey(function(err, apiKey) {
        res.locals.apiKeyId = apiKey.id;
        res.locals.apiKeySecret = apiKey.secret;
        res.locals.username = res.locals.user.username;
        apiKeyId = apiKey.id;
        apiKeySecret = apiKey.secret;
        res.render("dashboard.ejs");
        return;
      })

    }
    else {
      collectionResult.each(function(apiKey) {
        console.log("Here 2");
        res.locals.apiKeyId = apiKey.id;
        res.locals.apiKeySecret = apiKey.secret;
        res.locals.username = res.locals.user.username;
        apiKeyId = apiKey.id;
        apiKeySecret = apiKey.secret;
        res.render("dashboard.ejs");
        return;
      })
    }       
  })
});

server.get('/weather/:city', stormpath.apiAuthenticationRequired, function(req, res) {

  if(req.headers.authorization.indexOf('Basic') === 0) {
    getWeather();

  }
  else if(req.headers.authorization.indexOf('Bearer') === 0) {
     var requestedCity = req.params.city.replace(/\s+/g, '');
     if(res.locals.permissions.indexOf(requestedCity) >= 0){
      getWeather();
     }
     else {
      res.status(403).end();
     }

  }
  else {
    res.status(403).end();  
  }

  function getWeather() {
    console.log("Getting weather for " + req.params.city);
    var url = "http://api.openweathermap.org/data/2.5/weather?q=" + req.params.city;
    var data = "";

    http.get(url, function(myRes) {
      myRes.on('data', function(chunk) {
        data += chunk;
      });
      myRes.on('end', function() {
        callback(data);
      });
    }).on('error', function() {
      console.log("Error getting data.");
    });
  }

  function callback(finalData) {
    var json = JSON.parse(finalData);
    console.log(json.main.temp);

    //convert to Farenheight
    var farenheight = Math.round((((parseFloat(json.main.temp) - 273.15) * 1.8) + 32) * 10)/10;
    res.status(200).json(farenheight);
  }
});

//More Setup
server.use(express.static(__dirname + '/static'));

server.listen(port);
console.log('stormpath-express-sample running on port ' + port);
