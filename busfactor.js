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
    // Google Analytics Async snippet
    var scriptEl = document.createElement('script'); 
    scriptEl.type = 'text/javascript';
    scriptEl.async = true;
    scriptEl.src = url;
    var script = document.getElementsByTagName('script')[0];
    // Put script infront of this script
    script.parentNode.insertBefore(scriptEl, script);
    return scriptEl;
  };

  var complete = function complete(response) {
    responses.push(response);
    if (responses.length === requests.length) {
      callback.call(null, responses);
    }
  };
  window.complete = complete;

  var responses = [];
  var requests = urls.map(fetch);
};

var computeBusFactor = function (repoJson) {
  // Heuristic to compute the Bus/Truck factor of a repository
  // Things to consider:
  // number of committers/core devs
  // number of contributors (weight by amount committed?)
  // number of forks, watchers, stars
  // part of its own organization
  // size
  // language(s)
  // age
  // activity (time since last commit)
  var busFactor = 1;

  if (repoJson.teams) {
    // People who hopefully get paid to know the code
    busFactor += repoJson.teams.length;
  }
  if (repoJson.contributors) {
    // People who know some of the code
    busFactor += 0.5 * repoJson.contributors.length;
  }

  // People who looked at the code
  busFactor += 0.01 * repoJson.forks;

  // People who follow the code
  busFactor += 0.001 * repoJson.watchers;

  return busFactor;
};


var enterEl = $('repo-enter');
var enterSelectEl = $('repo-select');
var outputEl = $('bus-factor-output');


var getRepo = function () {
  // Clear errors
  errorEl.textContent = '';
  outputEl.className = '';

  // Fetch github repo info
  var validUserRepoName = /^[-a-zA-Z0-9]+\/[-a-zA-Z0-9]+$/;
  var userRepoName = this.value.toString();

  if (!validUserRepoName.test(userRepoName)) {
    throw new Error("Invalid repo name");
  }

  // Load repo with its contributors and teams
  var repoUrl = 'https://api.github.com/repos/'+userRepoName;
  var urlify = function (path) { 
    return repoUrl+path+'?callback=complete';
  };
  // TODO: read contributor and team urls from 
  // repo data instead of assuming api url structure
  var urls = ['', '/contributors', '/teams'].map(urlify);

  var handleResponses = function (responses) { 
    var json = responses.reduce(function (obj, response) {
      data = response.data;

      // Detect url based on expected response data
      if (data.url) {  // repo
	obj = extend(obj, data);
      } else if (data.length && data[0].login) { // contributors
	obj.contributors = data;
      } else if (data.length && data[0].name) { // teams (don't have a login)
	obj.teams = data;
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
  fetchAll(urls, handleResponses);

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