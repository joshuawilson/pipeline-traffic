'use strict';

// imports
var particles = require('./particles');

var transform = ["transform", "msTransform", "webkitTransform", "mozTransform", "oTransform"];
var transformProperty = getSupportedPropertyName(transform);

var jenkinsJobs = [
  //'http://jenkins-demo.apps.demo.aws.paas.ninja/job/pipeline-example/',
  //'http://jenkins-demo.apps.demo.aws.paas.ninja/job/pipeline-example-copy1/',
  //'http://jenkins-demo.apps.demo.aws.paas.ninja/job/pipeline-example-copy2/',
  'http://jenkins-demo.apps.demo.aws.paas.ninja/job/pending-input/',
  'http://jenkins-demo.apps.demo.aws.paas.ninja/job/complicated-steps/',
  'http://jenkins-demo.apps.demo.aws.paas.ninja/job/fail-step/'
];

function getJobJSON(restURL){
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
        console.log("xhr succeeded: " + xhr.status + ' results: ' + xhr.responseText);
        return getRunsJSON(restURL + '/runs', JSON.parse(xhr.responseText).name);
      } else {
        console.log("xhr failed: " + xhr.status);
      }
    }
  };
  xhr.open('get', restURL, true);
  xhr.send(null);
}

function getRunsJSON(restURL, msName){
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
        console.log("xhr succeeded: " + xhr.status + ' results: ' + xhr.responseText);
        return addMicroServiceToRegistry(JSON.parse(xhr.responseText), restURL, msName);
      } else {
        console.log("xhr failed: " + xhr.status);
      }
    }
  };
  xhr.open('get', restURL, true);
  xhr.send(null);
}

function loadPredefinedJenkinsJobs(jenkinsJobs) {
  for (var i = 0; i < jenkinsJobs.length; i++) {
    getJobJSON(jenkinsJobs[i] + 'wfapi');
  }
}

loadPredefinedJenkinsJobs(jenkinsJobs);



// Run the particles for traffic display.
particles.init();



function getSupportedPropertyName(properties) {
  for (var i = 0; i < properties.length; i++) {
    if (typeof document.body.style[properties[i]] != "undefined") {
      return properties[i];
    }
  }
  return null;
}

var processCounter = 0;
var microserviceID = 1;
var currentStageID = 1;
function stageStepGen(microServiceID) {
  var msID = microServiceID;

  var stageSize = 10;
  var stageID = msID + '-' + currentStageID;

  var currentStage = document.getElementById(stageID);
/*
  if (processCounter === 0) {
    currentStage.classList.remove('hidden');
  }
*/

  if (msID.startsWith('ms-prod')) {
    moveBallInProd(currentStage, 0);
    microserviceID = 1;
    currentStageID = 1;
    processCounter = 0;
    return;
    
  } else {
    moveBall(currentStage, processCounter, stageSize);
  }

  if((stageSize) === processCounter) {
    // reset counters and move on
    currentStageID++;
    stageID = msID + '-' + currentStageID;
    var nextStage = document.getElementById(stageID);
    processCounter = 0;
    if (nextStage !== null) {
      moveToNextStage(currentStage, nextStage);
    } else {
      // Go to Prod
      currentStageID = 1;
      nextStage = document.getElementById("ms-prod-1-1");
      moveToNextStage(currentStage, nextStage);
      stageStepGen('ms-prod-1');
    }
  }
  processCounter++;
}

function moveBall(commitId, current, total) {
  var location = (current / total) * 100;

    //stageId.classList.remove('hidden');
  if (transformProperty) {
    commitId.style[transformProperty] = 'translate3d(' + location + '% ,0,0)';
  }
}

function moveBallInProd(stageId, prodHeight) {
  var y = prodHeight || 0;
  if (transformProperty) {
    //stageId.style[transformProperty] = 'translate3d(0,0,0)';
    stageId.style[transformProperty] = 'translate3d(50%, ' + y + '% ,0)';
  }
}

function moveToNextStage(currentStageID, nextStageID) {
  currentStageID.classList.add('hidden');
  nextStageID.classList.remove('hidden');
  nextStageID.style[transformProperty] = 'translate3d(0,0,0)';
}

//var timer1 = setInterval(moveCommits, 500, 'ms-' + microserviceID);
var timer1 = setInterval(moveCommits, 300);

//setTimeout(function() {clearInterval(timer1)}, 8000);

function moveCommits() {
  for (var i = 0; i < microServiceRegistry.length; i++) {
    for (var j = 0; j < microServiceRegistry[i].commits.length; j++) {
      var commit = microServiceRegistry[i].commits[j];
      if (commit.status === 'in_progress') {
        if (commit.amountOfStageComplete > 99) {
          continue;
        }
        console.log('commit.id = ' + commit.id + ' | commit.amountOfStageComplete = ' + commit.amountOfStageComplete);
        commit.amountOfStageComplete = commit.amountOfStageComplete + commit.stageMovementInterval;
        var commitDiv = document.getElementById(commit.id);
        if (transformProperty) {
          commitDiv.style[transformProperty] = 'translate3d(' + commit.amountOfStageComplete + '% ,0,0)';
        }
      }
    }
  }
}




var microServiceRegistry = [];
var stageMovementFactor = 300;
function createCommit(jobName, runId, runName, runStatus, stageId, stageName, stageStatus, duration) {
  return {
    id: jobName + '-' + runId + '-' + runName + '-' + stageId,
    runId: runId,
    runName: runName,
    runStatus: runStatus,
    currentStageID: stageId,
    currentStage: stageName,
    status: stageStatus.toLowerCase(),
    runTime: duration,
    stageMovementInterval: (stageMovementFactor/duration)*100,
    amountOfStageComplete: 0
  };
}
function getAllCommits(jobName, runs) {
  var commits = [], stages, i, j;

  for (i = 0; i < runs.length; i++) {
    if (runs[i].status !== "SUCCESS") {
      stages = runs[i].stages;
      for (j = 0; j < stages.length; j++) {
        commits.push(createCommit(jobName, runs[i].id, runs[i].name, runs[i].status, stages[j].id, stages[j].name, stages[j].status, stages[j].durationMillis));
      }
    }
    if (runs[i].status === "FAILED" || runs[i].status === "ABORTED") {
      break;
    }
  }

  return commits;
}

// Build the HTML for the commit / ball
function addCommitElement(commit) {
  var div = document.createElement('div');
  div.id = commit.id;
  div.classList.add('commit', commit.status);
  div.style = 'transform: translate3d(0%, 0, 0);';

  return div;
}

// For each commit/ball look up the stage it goes in and then pull that div and add the commit to it.
// This should support multiple commits in one stage.
// This should also support a limited range of stages. (i.e. just new stages)
function addAllCommitElements(commits, stages) {
  for (var j = 0; j < commits.length; j++) {
    for (var k = 0; k < stages.length; k++) {
      if (stages[k].stageID === commits[j].currentStageID) {
        var stageDiv = document.getElementById(stages[k].id);
        stageDiv.appendChild(addCommitElement(commits[j]));
      }
    }
  }
}

// Compare each commit to the last list of commits. Once you find a match check if the status is different. 
// If the status has changed then change it in the UI.
function updateCommitStatus(ms, prevMs) {
  for (var i = 0; i < ms.commits.length; i++) {
    for (var j = 0; j < prevMs.commits.length; j++) {
      if (ms.commits[i].id === prevMs.commits[j].id) {
        if (ms.commits[i].status !== prevMs.commits[j].status) {
          var commitDiv = document.getElementById(ms.commits[i].id);
          commitDiv.classList.add(ms.commits[i].status);
          commitDiv.classList.remove(prevMs.commits[j].status);
        }
      }
    }
  }
}

// if you can find any completed stages, in a completed run, in the UI then remove them. They should already be hidden.
function removeOldCommits(prevMs, runs) {
  for (var i = 0; i < runs.length; i++) {
    // TODO: figure out what to do with duplicates for Pending and Fail
    if (runs[i].status === "SUCCESS" || (i > 0 && (runs[i].status === "FAILED" || runs[i].status === "ABORTED"))) {
      var stages = runs[i].stages;
      var id = '';
      for (var j = 0; j < stages.length; j++) {
        for (var k = 0; k < prevMs.commits.length; k++) {
          id = prevMs.name + '-' + runs[i].id + '-' + runs[i].name + '-' + stages[j].id;
          if (prevMs.commits[k].id === id) {
            var commitDiv = document.getElementById(id);
            commitDiv.remove();
          }
        }
      }
    }
  }
}

// Create a model of a stage
function createStage(jobName, stageId, stageName, duration) {
  return {
    id: jobName + '-' + 'stage' + '-' + stageId,
    stageID: stageId,
    name: stageName,
    msName: jobName,
    runTime: duration
  };
}

// Build a model of all of the stages in a run
function createListOfStages(jobName, runStages) {
  var stages = [];
  for (var i = 0; i < runStages.length; i++) {
    stages.push(createStage(jobName, runStages[i].id, runStages[i].name, runStages[i].durationMillis));
  }
  return stages;
}

// For a given pipeline, add all the stages to the UI.
function addStagesElement(ms) {
  var stages = document.getElementById(ms.name + '-stages');
  var html = '';

  for (var i = 0; i < ms.stages.length; i++) {
    html += 
      '<div id="' + ms.stages[i].id + '" class="stage">' +
        '<h2>' + ms.stages[i].name + '</h2>' +
      '</div><!-- /stage -->';
  }

  stages.innerHTML = html;
}

// For a given Job / MicroService add it to the UI.
function addPipelineElement(ms) {
  var pipeline = document.getElementById("pipeline-container");
  var div = document.createElement('div');
  div.id = ms.name;
  div.classList.add('microservice');

  div.innerHTML =
    '<h1>' +
      ms.name + //':' +
      //'<span>build: ' + ms. + '</span>' +
    '</h1>' +
    '<div id="' + ms.name + '-stages" class="stages">' +
    '</div><!-- /stages -->' +
    '<div class="stage stage-lg">' +
      '<h2>Production</h2>' +
      '<div id="' + ms.name + '-prod-1" class="commit" style="transform: translate3d(50%, 0, 0);"></div>' +
    '</div><!-- /stage-lg -->';

  pipeline.appendChild(div);
  addStagesElement(ms);
  addAllCommitElements(ms.commits, ms.stages);
}

// This is the initial creation of the pipelines and should only be called on page load.
function addMicroServiceToRegistry(runJSON, restURL, msName) {
  var i, stages, commits;

  for (i = 0; i < runJSON.length; i++) {
    // Find the fist completed run and build a list of the stages in it for reference.
    // However if none of the runs are successful then take the last run
    if (runJSON[i].status === "SUCCESS" || i === runJSON.length - 1) {
      stages = createListOfStages(msName, runJSON[i].stages);
      break;
    }
  }

  // returns undefined if all stages are successful
  commits = getAllCommits(msName, runJSON);

  var ms = {
    name: msName,
    stages: stages,
    commits: commits,
    jobRuns: restURL
  };
  
  if (document.getElementById(msName)) {
    // if this pipeline already exists on the screen then just update it
    updateMicroService(ms);
  } else {
    microServiceRegistry.push(ms);
    addPipelineElement(ms);
  }
}

// Called by pollJenkins
// This is how we know when a new Run happens and update the UI with it.
function updateMicroService(ms, jobRuns) {
  var i,j;
  var oldNumberOfStages = ms.stages.length;
  var newNumberOfStages = jobRuns[0].stages.length;
  var prevMs = JSON.parse(JSON.stringify(ms)); // deep-copy commits
  var commitsToAdd = [];

  for (i = 0; i < jobRuns.length; i++) {
    // Get the latest complete list of stages, we need updated times.
    if (jobRuns[i].status === "SUCCESS") {
      ms.stages = createListOfStages(ms.name, jobRuns[i].stages);
      break;
    }
  }

  ms.commits = getAllCommits(ms.name, jobRuns);

  // Get a list of the commits that have just been added
  for (i = 0; i < ms.commits.length; i++) {
    var foundMatchingCommit = false;
    for (j = 0; j < prevMs.commits.length; j++) {
      if (ms.commits[i].id == prevMs.commits[j].id) {
        foundMatchingCommit = true;
      }
    }
    if (!foundMatchingCommit) {
      commitsToAdd.push(ms.commits[i])
    }
  }

  
  // Compare old stages to new to see if they changed. If they changed then update the html.
  if (oldNumberOfStages !== newNumberOfStages) {
    addStagesElement(ms);
    addAllCommitElements(ms.commits, ms.stages);
    // TODO: need to reset position of commits if they are moving/transitioning in the pipeline
  } else {
    updateCommitStatus(ms, prevMs);
    removeOldCommits(prevMs, jobRuns);
    addAllCommitElements(commitsToAdd, ms.stages);
  }
  
  return ms;
}

function getRunsJSONUpdates(microServiceToBeUpdated){
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
        //console.log("xhr succeeded: " + xhr.status + ' results: ' + xhr.responseText);
        return microServiceToBeUpdated = updateMicroService(microServiceToBeUpdated, JSON.parse(xhr.responseText));
      } else {
        console.log("xhr failed: " + xhr.status);
      }
    }
  };
  xhr.open('get', microServiceToBeUpdated.jobRuns, true);
  xhr.send(null);
}

function pollJenkins() {
  for (var i = 0; i < microServiceRegistry.length; i++) {
    getRunsJSONUpdates(microServiceRegistry[i]);
  }
}

var timer = setInterval(pollJenkins, 5000);