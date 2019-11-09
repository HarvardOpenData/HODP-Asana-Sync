function syncAsana() {
  var project = new AsanaProject(membersProjectsGid());
  project.getTasks();
  updateGoogleSheets(project.tasks);
}

/* function emailAllOverdue() {
  var projectsJson = JSON.parse(asanaFetch("projects?archived=false"));
  var projectsData = projectsJson["data"];
  var assignees = {};
  projectsData.forEach(function(projectJson){
    var projectGid = projectJson.gid;
    var project = new AsanaProject(projectGid);
    project.getTasks(); 
    project.tasks.forEach(function(task){
      if(task.dueDate){
        var dueDate = Date.parse(task.dueDate);
        var today = new Date();
        if(today > dueDate && task.assigneeGid){
          var assigneeEmail = task.getAssigneeEmail();
          if(assigneeEmail){
            if(!assignees[assigneeEmail]){
              assignees[assigneeEmail] = [];
            }
            assignees[assigneeEmail].push({
              taskTitle : task.title,
              taskUrl : "https://app.asana.com/0/" + project.gid + "/" + task.gid
            });
          }
        }
      }
    });
  });
  
  for(var email in assignees){
    var subject = "[Action Requested] You have HODP tasks overdue";
    var content = "Hi,\n\n You are receiving this email because the following tasks are overdue in the HODP Asana: \n\n";
    assignees[email].forEach(function(task){
      content += "[" + task.taskTitle + "]: " + task.taskUrl + "\n";
    });
    content += "\nPlease either complete the tasks, change the due dates, or ask that the tasks be reassigned."
    
    MailApp.sendEmail(email, subject, content, {
      name: "Harvard Open Data Project"
    })
  }
}*/

function emailAllOverdue(){ 
  var overdueTasks = getOverdueTasks();
  var assignees = {};
  overdueTasks.forEach(function(task){
      if(task.dueDate){
        var dueDate = Date.parse(task.dueDate);
        var today = new Date();
        if(today > dueDate && task.assigneeGid){
          var assigneeEmail = task.getAssigneeEmail();
          if(assigneeEmail){
            if(!assignees[assigneeEmail]){
              assignees[assigneeEmail] = [];
            }
            assignees[assigneeEmail].push({
              taskTitle : task.title,
              taskUrl : "https://app.asana.com/0/0/" + task.gid
            });
          }
        }
      }
    });
  for(var email in assignees){
    var subject = "[Action Requested] You have HODP tasks overdue";
    var content = "Hi,\n\n You are receiving this email because the following tasks are overdue in the HODP Asana: \n\n";
    assignees[email].forEach(function(task){
      content += "[" + task.taskTitle + "]: " + task.taskUrl + "\n";
    });
    content += "\nPlease either complete the tasks, change the due dates, or ask that the tasks be reassigned."
    
    MailApp.sendEmail(email, subject, content, {
      name: "Harvard Open Data Project"
    })
  }
}

function getOverdueTasks() {
  var dateString = Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd");
  var tasksSearchUrl = "workspaces/971046034376905/tasks/search?completed=false&due_on.before=" + dateString;
  var overdueTasksJson = JSON.parse(asanaFetch(tasksSearchUrl))
  var overdueTasksData = overdueTasksJson["data"];
  var overdueTasksGids = overdueTasksData.map(function(data) {return data.gid});
  var overdueTasks = [];
  overdueTasksGids.forEach(function(gid) {
    var task = new AsanaTask(gid);
    task.fill();
    overdueTasks.push(task);
  });
  return overdueTasks;
}

function emailOverdueMemberProjects(project) {
  project.tasks.forEach(function(task){
    var dueDate = Date.parse(task.dueDate);
    var today = new Date();
    if(today > dueDate && task.assigneeGid){
      var taskUrl = "https://app.asana.com/0/" + project.gid + "/" + task.gid;
      var subject = "[" + task.title + "] is overdue.";
      var content = "You are receiving this email because [" + task.title + "] is overdue on the HODP Asana. \
\n\nPlease either complete the task, change the task to a later date, or ask that the task be reassigned. You can do so at this url: " + taskUrl + ". You will receive this email every 24 hours until this is changed.\
\n\nIf for some reason you cannot change the task yourself, please respond to this email and we will do so for you. Thank you!"
      Logger.log(content);
      var assigneeEmail = task.getAssigneeEmail();
      MailApp.sendEmail(assigneeEmail, subject, content); 
    }
  });
}

function updateGoogleSheets(tasks) {
  var spreadsheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1HGegvm3OcLSV3zyI1fUcoPLHMUbDaM5ZWJSVb3Gx69Y/edit#gid=0");
  var sheet = spreadsheet.getSheets()[0];
  var range = sheet.getRange("A2:I");
  range.deleteCells(SpreadsheetApp.Dimension.ROWS);
  tasks.forEach(function(task) {
    var newRow = [
      task.title,
      task.description,
      task.section,
      task.assignee,
      task.category,
      task.difficulty,
      task.subtasks.length,
      task.dueDate,
      task.tags.join(", "),
    ]
    sheet.appendRow(newRow);
  });
  setFormatting(sheet);
}

function setFormatting(sheet) {
  var rules = sheet.getConditionalFormatRules();
  var newRules = []; 
  for(var i = 0; i < rules.length; i++){
    var rule = rules[i];
    var ranges = rule.getRanges();
    if(ranges.length > 0) {
      var range = ranges[0];
      var rangeName = range.getA1Notation();
      var colChar = rangeName.charAt(0);
      var newRule = rule.copy().setRanges([sheet.getRange(colChar + ":" + colChar)]);
      newRules.push(newRule);
    }
  }
  
  sheet.setConditionalFormatRules(newRules);
  sheet.getRange("A:G").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
}

function asanaFetch(url) {
  const options = {
    method : "GET",
    headers : {
      Authorization : "Bearer " + asanaToken()
    },
    muteHttpExceptions: true
  }
  if (url.charAt(0) == "/") {
    url = url.substring(1);
  }
  var result = UrlFetchApp.fetch("https://app.asana.com/api/1.0/" + url, options)
  if(result.getResponseCode() != "200"){
    var headers = result.getHeaders();
    if(headers.hasOwnProperty("Retry-After")){
      var retryAfterSeconds = parseInt(headers["Retry-After"]);
      Logger.log("Rate limited. Waiting for" + retryAfterSeconds + "to retry");
      console.log("Rate limited. Waiting for" + retryAfterSeconds + "to retry");
      Utilities.sleep(retryAfterSeconds * 1000);
      return asanaFetch(url);
    }
    else{
      throw new Error("Received invalid response: " + result.getContentText());
    }
  }
  return result.getContentText();
}

function membersProjectsGid() {
  return "1140949342574617";
}