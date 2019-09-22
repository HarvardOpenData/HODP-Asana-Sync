function AsanaTask(gid) {
  if (!(this instanceof AsanaTask)) { return new AsanaTask(gid); }
  this.gid = gid;
  this.subtasks = []
  this.tags = []
  this.followers = []
  this.description = ""
  this.title = ""
  this.section = ""
  this.dueDate = "";
  this.assignee = "";
  this.difficulty = "";
  this.category = "";
  
  this.fill = function() {
    var url = "tasks/" + this.gid;
    var taskJson = JSON.parse(asanaFetch(url));
    var taskData = taskJson.data;
    this.title = taskData.name;
    console.log("retrieved " + this.title + " task");
    if(taskData.memberships.length > 0 && taskData.memberships[0].section){
      this.section = taskData.memberships[0].section.name;
      if(this.section == this.title || !this.section) {
        return;
      }
    }
    if(taskData.assignee) {
      this.assignee = taskData.assignee.name;
      this.assigneeGid = taskData.assignee.gid;
    }
    this.tags = taskData.tags.map(function(tagJson) {
      return tagJson.name;
    }); 
    this.description = taskData.notes;
    this.dueDate = taskData.due_on;
    
    var custom_fields = {}
    
    taskData.custom_fields.forEach(function(field){
      custom_fields[field.name] = field;
    });
    
    if(custom_fields["Difficulty"] && custom_fields["Difficulty"].enum_value){
      this.difficulty = custom_fields["Difficulty"].enum_value.name;
    }
    
    if(custom_fields["Category"] && custom_fields["Category"].enum_value){
      this.category = custom_fields["Category"].enum_value.name;
    }
    
    var subtasksUrl = url + "/subtasks";
    var subtasksJson = JSON.parse(asanaFetch(subtasksUrl));
    var subtaskData = subtasksJson.data; 
    this.subtasks = subtaskData.map(function(subtaskJson){
      return subtasksJson.name;
    });
    
    this.followers = taskData.followers.map(function(followerJson){
      return followerJson.name;
    });
  }
  
  this.getAssigneeEmail = function(){
    if(this.assigneeEmail){
      return this.assigneeEmail;
    }
    if(this.assignee && this.assigneeGid){
      var url = "users/"+ this.assigneeGid; 
      var assigneeJson = JSON.parse(asanaFetch(url));
      var assigneeData = assigneeJson["data"];
      this.assigneeEmail = assigneeData.email;
      return this.assigneeEmail;
    }
  }
}
