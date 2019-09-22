function AsanaProject(gid) {
  if (!(this instanceof AsanaProject)) { return new AsanaProject(gid); }
  this.gid = gid
  this.tasks = [];
  this.getTasks = function(){
    var url = "projects/" + this.gid + "/tasks?completed_since=now";
    var tasksJson = JSON.parse(asanaFetch(url));
    var tasksData = tasksJson.data;
    var tasks = [];
    tasksData.forEach(function(taskJson){
      var newTask = new AsanaTask(taskJson.gid);
      newTask.fill();
      if(newTask.section != newTask.title) {
        tasks.push(newTask);
      }
    });
    this.tasks = tasks;
  }
}
