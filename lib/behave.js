var fs = require('fs');
var zip = require("zip");
var unzip = require("unzip");
var mkdirp = require('mkdirp');
var request = require('request');

/**

{
	output: 'features/',
	manual: false,
	projects: [
		{
			jira: 'HOT',
			projectID: '10103',
			userID: 'amlyYToxZDg3MGMyZC1lZTFjLTRiNzQtOGY5NC1mYzEwY2Y0ZTcxZmE=',
			apiKey: 'af82e64539342987b0420aa130df8e2188ff9d15'
		}
	],
  	project: 'HOT'
}

**/

module.exports = function (config) {
	console.log(config);

	var _project;

	this.findProject = function() {
	  var result = null,
	      configProject = config.project;

	  if (configProject) {
		  config.projects.forEach(function (project) {
		  	var id = project.jira || project.projectID;

		    if (id.toUpperCase() === configProject.toUpperCase()) {
		      result = project;
		    }
		  });
		} else if (config.projects) {
			result = config.projects[0];
		}

	  return result;
	};

	this.downloadFeatures = function() {
	  _project = this.findProject();

	  if (_project) {
	  	this.streamFeatures();
	  } else {
	  	throw new Error('Cannot find project');
	  }
	};

	this.streamFeatures = function() {
	  var self = this;
	  var url = 'https://behave.pro/rest/cucumber/1.0/project/' + _project.projectID + '/features';
	  var qs = {};

	  if (config.manual) {
	  	qs.manual = config.manual;
	  }

      this.createOutputFolder(function () {
      	request({
      		url: url,
      		qs: qs,
      		gzip: true,
      		auth: {
      			user: _project.userID,
      			pass: _project.apiKey
      		}
      	}).pipe(unzip.Parse()).on('entry', function (entry) {
      		self.processDownload(entry);
      	});
	  });
	};

	this.createOutputFolder = function (callback) {
		if (!fs.existsSync(config.output)) {
			mkdirp(config.output, function (err) {
				if (err) {
					throw new Error(err);
				} else {
					console.log('Output folder was created: ' + config.output);
					callback();
				}
			});
		} else {
			callback();
		}
	};

	this.featureIssue = function(data) {
	  var result;
	  var re = new RegExp('(' + _project.jira + '-\\S+)');

	  data.split("\n").forEach(function (line) {
	    var issue = re.exec(line);
	    if (!result && issue) {
	      result = issue[0];
	    }
	  });

	  return result;
	};

	this.processDownload = function(entry) {
		var self = this;

		entry.on('data', function(chunk) {
			var data = chunk.toString();
		    var feature = entry.path;
		    var issue = self.featureIssue(data);
		    var filename = feature;

		    if (issue) {
			    console.log("Found feature for issue: " + issue);
			    filename = issue + "." + filename;
			}

			filename = config.output + filename;

			fs.writeFile(filename, data, function (err) {
				if (err) {
					throw new Error(err);
				} else {
					console.log(filename + " Created.");
				}
			});
		});

	};

	this.downloadFeatures();

};


