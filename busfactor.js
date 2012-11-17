var $ = function (id) {
  return document.getElementById(id);
};

var isNaN = function (number) {
  return number !== number;
};

var endsWith = function (string, ending) {
  // Check string ending
  return string.slice(string.length-ending.length) === ending;
};

var extend = function (target, source) {
  // Like _.extend
  var key, value;
  for (key in source) {
    // Overwrite target key
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      target[key] = source[key];
    }
  }
  return target;
};

var fetchAll = function (urls, callback) {
  // Make an XHR for each url and
  // call param callback when all requests complete

  var fetch = function (url) {
    var xhr = new XMLHttpRequest();  
    xhr.responsetype = 'json';
    xhr.open('GET', url, true);
    xhr.send();
    xhr.url = url;
    return xhr;
  };

  var complete = function (request) {
    finished += 1;
    if (finished === requests.length) {
      callback.call(null, requests);
    }
  };

  var registerComplete = function (request) {
    request.addEventListener('loadend', complete, false);
  };

  var finished = 0;
  var requests = urls.map(fetch);
  requests.forEach(registerComplete);
};

var computeBusFactor = function (repoJson) {
  // Heuristic to compute the Bus/Truck factor of a repository
  // Things to consider:
  // number of committers/core devs
  // number of contributors
  // number of forks, watchers, stars
  // part of its own organization
  // size
  // language(s)
  // age
  // activity (time since last commit)
  return (
    1 * (1+repoJson.teams.length) + // People who hopefully get paid to know the code
    0.5 * repoJson.contributors.length +  // People who know some of the code
    0.01 * repoJson.forks +  // People who looked at the code
    0.001 * repoJson.watchers // People who follow the code
  ); 
};


var enterEl = $('repo-enter');
var enterSelectEl = $('repo-select');
var outputEl = $('bus-factor-output');


var getRepo = function () {
  // Clear errors
  errorEl.textContent = '';
  outputEl.className = '';

  // Fetch github repo info
  var validUserRepoName = /^[-a-zA-Z]+\/[-a-zA-Z]+$/;
  var userRepoName = this.value.toString();

  if (!validUserRepoName.test(userRepoName)) {
    throw new Error("Invalid repo name");
  }

  // Load repo with its contributors and teams
  var repoUrl = 'https://api.github.com/repos/'+userRepoName;
  var urls = [repoUrl, repoUrl+'/contributors', repoUrl+'/teams'];

  var handleXhrs = function (xhrs) { 
    var json = xhrs.reduce(function (obj, xhr) {
      var parsed;

      if (xhr.status !== 200 && !endsWith(xhr.url, '/teams')) {
	throw new Error("Failed to fetch "+xhr.url+" .");
      }

      // Invalid JSON will throw SyntaxErrors
      try {
	parsed = JSON.parse(xhr.responseText);
      } catch (error) {
	console.error(error);
	throw new Error("Failed to parse JSON for "+xhr.url+" .");
      }

      if (xhr.url === repoUrl) {
	obj = extend(obj, parsed);
      } else if (endsWith(xhr.url, '/teams')) {
	if (parsed && parsed.message && parsed.message === "Not Found") {
	  obj.teams = [];
	} else {
	  obj.teams = parsed;	  
	}
      } else if (endsWith(xhr.url, '/contributors')) {
	obj.contributors = parsed;
      } else {
	throw new Error("Unknown XHR to"+xhr.url+" .");
      }
      return obj;
    }, {});

    var busFactor = computeBusFactor(json).toFixed(2);
    if (!isNaN(busFactor)) {
      outputEl.textContent = busFactor;
    } else {
      outputEl.textContent = 'No idea.';
    }

  };

  // Fetch and merge all repo data
  fetchAll(urls, handleXhrs);

  // Show loading
  outputEl.textContent = 'Loading ...';
};

enterSelectEl.addEventListener('change', getRepo);
enterEl.addEventListener('change', getRepo);

var errorEl = $('bus-factor-error');

var displayError = function(error) {
  outputEl.textContent = '!';
  outputEl.className = 'error';
  errorEl.textContent = error.message.slice('Uncaught Error: '.length);
};
window.addEventListener('error', displayError);