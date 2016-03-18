var globalUsingCognito = false;
var id_token;
var cognitoTasks;
var cognitoId;
var syncToken;
var syncCount;

// Task type for storing tasks
var Task = function(description, id) {
    this.desc = description;
    this.id = id;
    this.done = false;
};

// *******************************************************************
// Functions
// *******************************************************************

// getLocalTasks retrieves the tasks from LocalStorage and processes
// the resulting string into an array of Tasks.
// Returns the array of Tasks or an empty array.
function getLocalTasks() {
    var tasks;
    var sTasks = localStorage.getItem('UnforgivingList_Tasks');
    if (sTasks !== null) {
        tasks = JSON.parse(sTasks);
    } else {
        tasks = [];
    }

    return tasks;
}

// compareTasks is a comparator for sorting Tasks.
// It defines a Task order where incomplete Tasks come before completed
// Tasks and Tasks with higher ids come before Tasks with lower ids.
// Completion takes order precedence over id.
// Returns -1, 0, or 1.
function compareTasks(a, b) {
    var id1 = parseInt(a.id, 10);
    var done1 = a.done;
    var id2 = parseInt(b.id, 10);
    var done2 = b.done;
    // Compare doneness first
    // If first task is done and second is not, second comes first
    if (done1 && !done2) {
        return 1;
    }
    // If second task is done and first is not done, first comes first
    if (done2 && !done1) {
        return -1;
    }
    // Compare ids second
    if (id1 < id2) {
        return 1;
    }
    if (id1 > id2) {
        return -1;
    }
    return 0;
}

// add takes an array of Tasks, tasks, and a description, desc.
// It creates a Task from desc and adds it to tasks.
// Returns an array of Tasks.
function add(tasks, desc) {
    tasks.sort(compareTasks);

    var id = 0;
    if (tasks.length > 0) {
        var maxId = 0;
        for (var i = 0; i < tasks.length; i++) {
            var intId = parseInt(tasks[i].id, 10);
            if (intId > maxId) {
                maxId = intId;
            }
        }
        id = maxId + 1;
    }
    var task = new Task(desc, id);
    tasks.push(task);
    return tasks;
}

// addLocal retrieves the value from the newTaskInput element,
// strips html from the value, creates a Task using the value as
// the description, adds the Task to the current set of Tasks and
// stores the Tasks in LocalStorage.
// Return true if successfully added new Task, false otherwise.
function addLocal() {
    var tasks = getLocalTasks();
    var desc = document.getElementById('newTaskInput').value;
    desc = strip(desc);
    if (desc.length === 0) {
        return false;
    }
    tasks = add(tasks, desc);
    localStorage.setItem('UnforgivingList_Tasks', JSON.stringify(tasks));

    return true;
}

// addCognito retrieves the value from the newTaskInput element,
// strips html from the value, creates a Task using the value as
// the description, adds the Task to the global Cognito tasks list.
// Returns false if task length is equal to 0, true otherwise.
function addCognito() {
    var desc = document.getElementById('newTaskInput').value;
    desc = strip(desc);
    if (desc.length === 0) {
        return false;
    }
    cognitoTasks = add(cognitoTasks, desc);
    return true;
}

// strip takes a string, html, and removes HTML tags from it.
// Returns a sanitized string or "".
function strip(html)
{
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

// check is called when a Task is clicked.
// If the clicked Task is already checked then no action is taken,
// if the clicked Task is not checked, then it becomes checked.
// The new state of the Task is saved to LocalStorage or Cognito
// depending on the login state.
function check() {
    var tasks;
    if (globalUsingCognito) {
        tasks = cognitoTasks;
    } else {
        tasks = getLocalTasks();
    }
    var id = parseInt(this.getAttribute('id'), 10);
    for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].id == id) {
            tasks[i].done = true;
        }
    }

    if (globalUsingCognito) {
        cognitoTasks = tasks;
        saveCognitoTasks(false);
    } else {
        localStorage.setItem('UnforgivingList_Tasks', JSON.stringify(tasks));
    }
    show(tasks);
}

// showLocal gets the tasks from LocalStorage and shows them.
function showLocal() {
    var tasks = getLocalTasks();
    show(tasks);
}

// showCognito shows the global CognitoTasks.
// Requires, globalUsingCognito === true and CognitoTasks have been retrieved.
function showCognito() {
    show(cognitoTasks);
}

// show takes an array of Tasks and displays the tasks on the screen.
// Replaces the html of the display div and replaces it with a list of the tasks.
function show(tasks) {
    tasks.sort(compareTasks);
    var taskList ='<ul>';
    for (var i = 0; i < tasks.length; i++) {
        var checked;
        if (tasks[i].done) {
            checked = "checked";
        } else {
            checked = "unchecked";
        }
        taskList += '<li><label class="taskEntry"><input type="checkbox"' +
        'class="taskEntry checkbox" id="' + tasks[i].id + '" ' + checked + '> ' +
        tasks[i].desc + '</label></li>';
    }
    taskList += '</ul>';

    document.getElementById('tasks').innerHTML = taskList;
    var checkboxes = document.getElementsByClassName('checkbox');
    for (var j = 0; j < checkboxes.length; j++) {
        checkboxes[j].addEventListener('click', check);
    }
}

// ******************************************************************
// Event Handlers
// ******************************************************************
document.getElementById("addTaskButton").onclick = function() {
    if (globalUsingCognito) {
        if (addCognito()) {
            saveCognitoTasks(true);
        }
    } else {
        if (addLocal()) {
            document.getElementById('addTaskModal').style.visibility = 'hidden';
            showLocal();
        }
    }
};

document.getElementById("closeAddTaskModal").onclick = function() {
    document.getElementById('addTaskModal').style.visibility = 'hidden';
};

document.getElementById("closeLoginModal").onclick = function() {
    document.getElementById('loginModal').style.visibility = 'hidden';
    document.getElementById('openLoginModalButton').textContent = 'Login';
    showLocal();
};

document.getElementById("useLocalButton").onclick = function() {
    document.getElementById('loginModal').style.visibility = 'hidden';
    document.getElementById('openLoginModalButton').textContent = 'Login';
    showLocal();
};

document.getElementById('openAddTaskModalButton').addEventListener('click', function() {
    document.getElementById("newTaskInput").value = "";
    document.getElementById('addTaskModal').style.visibility = 'visible';
    document.getElementById('newTaskInput').focus();
} );

document.getElementById("openLoginModalButton").onclick = function() {
    var auth = gapi.auth2.getAuthInstance();
    if (auth.isSignedIn.get()) {
        document.getElementById('logoutModal').style.visibility = 'visible';
    } else {
        document.getElementById('loginModal').style.visibility = 'visible';
    }
};

document.getElementById("logoutButton").onclick = function() {
    signOut();
    document.getElementById('openLoginModalButton').textContent = 'Login';
    document.getElementById('logoutModal').style.visibility = 'hidden';
    showLocal();
};

document.getElementById("closeLogoutModalButton").onclick = function() {
    document.getElementById('logoutModal').style.visibility = 'hidden';
};

// *****************************************************************
// Start script by showing the login modal
document.getElementById('loginModal').style.visibility = 'visible';
// *****************************************************************

// AWS Cognito Login Flow
// ************************************************************************
// Client secret: X8fbf8xLjsvfzhf4wJXf3PCT
function getCognitoTasks() {
    var params = {
        IdentityPoolId: "us-east-1:ca6fe723-a92c-4c18-a534-a3ad9eb7134d",
        Logins: {
            'accounts.google.com': id_token
        }
    };
    //console.log(params);
    // set the Amazon Cognito region
    AWS.config.region = 'us-east-1';
    // initialize the Credentials object with our parameters
    AWS.config.credentials = new AWS.CognitoIdentityCredentials(params);

    // We can set the get method of the Credentials object to retrieve
    // the unique identifier for the end user (identityId) once the provider
    // has refreshed itself
    AWS.config.credentials.get(function(err) {
        if (err) {
            console.log("Error: "+err);
            return;
        }
        //console.log("Cognito Identity Id: " + AWS.config.credentials.identityId);
        cognitoId = AWS.config.credentials.identityId;
        // Other service clients will automatically use the Cognito Credentials provider
        // configured in the JavaScript SDK.
        var cognitoSyncClient = new AWS.CognitoSync();
        cognitoSyncClient.listRecords({
            DatasetName: "UnforgivingList",
            IdentityId: cognitoId,
            IdentityPoolId: "us-east-1:ca6fe723-a92c-4c18-a534-a3ad9eb7134d"
        }, function(err, data) {
            if ( !err ) {
                //console.log(JSON.stringify(data));
                syncToken = data.SyncSessionToken;

                if (data.Count > 0) {
                    syncCount = data.Records[0].SyncCount;
                    var sTasks = data.Records[0].Value;
                    cognitoTasks = JSON.parse(sTasks);
                } else {
                    cognitoTasks = [];
                    syncCount = 0;
                }
                showCognito();
            } else {
                console.error(err);
            }
            document.getElementById('loginModal').style.visibility = 'hidden';
        });
    });
}

function saveCognitoTasks(newTask) {
    // Other service clients will automatically use the Cognito Credentials provider
    // configured in the JavaScript SDK.
    var cognitoSyncClient = new AWS.CognitoSync();
    //console.log('SyncCount is', syncCount);
    cognitoSyncClient.updateRecords({
        DatasetName: "UnforgivingList",
        IdentityId: cognitoId,
        IdentityPoolId: "us-east-1:ca6fe723-a92c-4c18-a534-a3ad9eb7134d",
        RecordPatches: [
            {
                Key: "Tasks",
                Op: 'replace',
                SyncCount: syncCount,
                Value: JSON.stringify(cognitoTasks)
            }
        ],
        SyncSessionToken: syncToken
    }, function(err, data) {
        if ( !err ) {
            //console.log(JSON.stringify(data));
            syncCount = data.Records[0].SyncCount;
        } else {
            // TODO error div showing task wasn't saved.
            console.error(err);
        }
            if (newTask) {
                document.getElementById('addTaskModal').style.visibility = 'hidden';
                getCognitoTasks();
            } else {
                document.getElementById('addTaskModal').style.visibility = 'hidden';
                showCognito();
            }

    });
}


function onSignIn(googleUser) {
    id_token = googleUser.getAuthResponse().id_token;
    document.getElementById('openLoginModalButton').textContent = 'Logout';
    globalUsingCognito = true;
    getCognitoTasks();
}

function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
        globalUsingCognito = false;
        console.log('User signed out.');
    });
}
