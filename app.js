var express = require('express');  
var bodyParser = require("body-parser");
var app = express();  
var server = require('http').createServer(app);  
var io = require('socket.io')(server);
var httpPort = 4202;
var socketPort = 4201;
var debug = false;

var onlinePlayers = [];
var online = false;
const fs = require('fs');

const version = "0.0";

process.argv.forEach(function (val, index, array) {
  console.log(index + ': ' + val);
  if (index == 0 && val == "-debug") {
	  debug = true;
	  httpPort = 4204;
	  socketPort = 4203;
  }
});

// async
function replaceContents(file, replacement, cb) {

  fs.readFile(replacement, (err, contents) => {
    if (err) return cb(err);
    fs.writeFile(file, contents, cb);
  });

}

replaceContents("/var/www/html/sites/production/poly/current.png", "/var/www/html/sites/production/poly/offline.png", function(){});

app.use(express.static(__dirname + '/bower_components'));  
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.post('/prefabs',function(request,response){
	
	connection.query("TRUNCATE `prefabs`", function(err, results) {
		if (err) throw err
		var prefabs = request.body.prefabs;
		for (var x = 0; x < prefabs.length; x ++) {
			var prefab = prefabs[x];
			connection.query("INSERT INTO `prefabs` VALUES('"+prefab.id+"', '"+prefab.path+"')", function(err, results){});
		}
	});
	
	

});

app.post('/playerOnline',function(request,response){
	if (onlinePlayers.indexOf(parseInt(request.body['id'])) !== -1) {
		response.send(true);	
	} else {
		response.send(false);
	}
	

});

app.post('/online',function(request,response){
	if (online) {
		response.send(true);	
	} else {
		response.send(false);
	}
	

});

app.post('/version',function(request,response){
	
	if (request.body.version != version) {
		response.send(version);
	} else {
		response.send(true);
	}

});

app.listen(httpPort,function(){
  console.log("Started on PORT 4202");
});

server.listen(socketPort);  

process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
    replaceContents("/var/www/html/sites/production/poly/current.png", "/var/www/html/sites/production/poly/offline.png", function(){
	    
		if (options.cleanup) console.log('clean');
		if (err) console.log(err.stack);
		if (options.exit) process.exit();
    });

}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

var spawn = {};
var mysql = require('mysql')

var connection = mysql.createConnection({
  host: 'integer-studios.c4vv4wqp7uro.us-west-2.rds.amazonaws.com',
  user: 'intstudios',
  password: 'wareVoid123I',
  database: 'polytechnica'
});

function onPlayerLogin(playerID) {
	
	var i = onlinePlayers.indexOf(playerID);
	if(i == -1) {
		onlinePlayers.push(playerID);
	}
	
}

function onPlayerDisconnect(playerID) {
	
	var i = onlinePlayers.indexOf(playerID);
	if(i != -1) {
		onlinePlayers.splice(i, 1);
	}
	
}

function LoadObjects(list, iterator, callback) {
					var results = new Object();

    // this is the function that will start all the jobs
    // list is the collections of item we want to iterate over
    // iterator is a function representing the job when want done on each item
    // callback is the function we want to call when all iterations are over

    var doneCount = 0;  // here we'll keep track of how many reports we've got

    function report(index, object) {
        // this function resembles the phone number in the analogy above
        // given to each call of the iterator so it can report its completion
		
        doneCount++;
        
        results[index] = object;

        // if doneCount equals the number of items in list, then we're done
        if(doneCount === list.length)
            callback(results);
    }

    // here we give each iteration its job
    for(var i = 0; i < list.length; i++) {
        // iterator takes 2 arguments, an item to work on and report function
        //? stuff
         var row = list[i];
		 row.scripts = [];
        iterator(i, row, report);
    }
}

function LoadCraftable(object, callback) {
	
	connection.query("SELECT * FROM `craftable` WHERE `object`='"+object.id+"'", function (err, craftable){
		if (err || craftable.length == 0)
			callback(false);
		connection.query("SELECT * FROM `craftable-stack` WHERE `object`='"+object.id+"' AND `type`='RECIPE'", function (err, recipe){
			var recipeObj = new Object();
			for (var x = 0; x < recipe.length; x ++) {
				recipeObj[x] = recipe[x];
			}
			connection.query("SELECT * FROM `craftable-stack` WHERE `object`='"+object.id+"' AND `type`='INPUT'", function (err, input){
				var inputObj = new Object();
				for (var x = 0; x < input.length; x ++) {
					inputObj[x] = input[x];
				}
				connection.query("SELECT * FROM `craftable-stack` WHERE `object`='"+object.id+"' AND `type`='OUTPUT'", function (err, output){
					var outputObj = new Object();
					if (output.length == 1)
						outputObj = output[0];
					var returnJSON = new Object();
					returnJSON.recipe = recipeObj;
					returnJSON.input = inputObj;
					returnJSON.output = outputObj;
					returnJSON.type = "craftable";
					returnJSON.craftableType = craftable.type;
					if (craftable.metadata != null) {
						returnJSON.metadata = JSON.parse(craftable.metadata);
					} else {
						returnJSON.metadata = "";
					}
					callback(returnJSON);
				});
			});
			
		});
	
	});
	
}

function saveScripts(object, isPlayer) {
	var playerID = "NULL";
	var objectID = "NULL";
	if (isPlayer) {
		playerID = "'"+object.id+"'";
	} else {
		objectID = "'"+object.id+"'";
	}
	if (object.scripts.length > 0) {
		var insertInventory = function(playerID, objectID, inventory) {
			connection.query("INSERT INTO `"+inventory.type+"` VALUES(NULL, "+objectID+", "+playerID+")", function(err, results){
					var invID = results.insertId;

					for (var z = 0; z < inventory.slots.length; z ++) {
						var slot = inventory.slots[z];
						connection.query("INSERT INTO `inventory-slot` VALUES('"+invID+"', '"+slot.id+"', '"+slot.item+"', '"+slot.quality+"', '"+slot.size+"')", function(err, results){});
						
					}
				});
		};
		var scripts = object['scripts'];
		if (scripts != null) {
		for (var y = 0; y < scripts.length; y ++) {
			var script = scripts[y];
			switch (script.type) {
				case "gatherable":
					connection.query("INSERT INTO `"+script.type+"` VALUES(NULL, '"+object.id+"', '"+script.strength+"', '"+script.repeats+"', '"+script.refills+"', '"+script.runout+"')", function(err, results){});
					break;
				case "inventory":
					insertInventory(playerID, objectID, script);
					script = "";
					break;
				case "craftable":
					var metadata = script.metadata;
					var recipeInput = script.recipeInput;
					var recipeOutput = script.recipeOutput;
					var input = script.input;
					for (var x = 0; x < recipeInput.length; x ++) {
						var rInput = recipeInput[x];
						connection.query("INSERT INTO `craftable-stack` VALUES('"+object.id+"', '"+rInput.id+"', '"+rInput.quality+"', '"+rInput.size+"', 'RECIPE')", function(err, results){});
					}
					for (var x = 0; x < input.length; x ++) {
						var rInput = input[x];
						connection.query("INSERT INTO `craftable-stack` VALUES('"+object.id+"', '"+rInput.id+"', '"+rInput.quality+"', '"+rInput.size+"', 'INPUT')", function(err, results){});
					}
					if (recipeOutput != null && recipeOutput.id != null) {
						connection.query("INSERT INTO `craftable-stack` VALUES('"+object.id+"', '"+recipeOutput.id+"', '"+recipeOutput.quality+"', '"+recipeOutput.size+"', 'OUTPUT')", function(err, results){});		
					}
					if (metadata == null || metadata.length == 0) {
						metadata = "NULL"
					} else {
						var str = JSON.stringify(metadata);
						metadata = "'"+str+"'";
					}
					connection.query("INSERT INTO `craftable` VALUES('"+object.id+"', 'CRAFT', "+metadata+")", function(err, results){});

					script = "";
				break;
				}
			}
		}
		
	}
}


connection.connect(function(err) {
	if (err) throw err
        
		console.log('MySQL Connected...')
				
		
		io.on('connection', function(client) {  
// 			if (online) 
// 				client.();
			replaceContents("/var/www/html/sites/production/poly/current.png", "/var/www/html/sites/production/poly/online.png", function(){});

			online = true;
			onlinePlayers = [];
		    console.log('Game Server connected...');
			
			client.on('spawn', function(data) {
		        spawn = data;
		    });
			
			client.on('playerSave', function(data) {
	    	  connection.query("DELETE FROM `inventory-slot` WHERE `inventory` IN (SELECT `id` FROM `inventory` WHERE `player`='"+data.id+"')", function(err, results){
		    	  connection.query("DELETE FROM `inventory` WHERE `player`='"+data.id+"'", function(err, results){})
	    	  });
		      connection.query("UPDATE `player-object` SET `health`='"+data.health+"',`hunger`='"+data.hunger+"',`thirst`='"+data.thirst+"',`position-x`='"+data['position-x']+"',`position-y`='"+data['position-y']+"',`position-z`='"+data['position-z']+"',`rotation-x`='"+data['rotation-x']+"',`rotation-y`='"+data['rotation-y']+"',`rotation-z`='"+data['rotation-z']+"' WHERE `player` = '"+data.id+"'", function(err, results){
			    	if (err) throw err
			    	saveScripts(data, true);

					client.emit('playerSave', {status: true}); 
		      });
		      
		    });
		    
		    client.on('playerDisconnect', function(data){
			    onPlayerDisconnect(data["id"]); 
		    });
		    
		    client.on('playerLogin', function(data) {
			    onPlayerLogin(data["id"]);
		        connection.query("SELECT * FROM `player` p LEFT JOIN `player-object` o ON p.id = o.player WHERE p.`id`='"+data['id']+"'", function(err, results) {
			        if (err) throw err
			        playerData = results[0];
			        playerData.connection = data['connection'];
			        if (playerData.player != playerData.id) {
				        //no data first time
				        playerData['position-x'] = spawn.x;
				        playerData['position-y'] = spawn.y;
				        playerData['position-z'] = spawn.z;
				        
				        playerData['rotation-x'] = 0;
				        playerData['rotation-y'] = 0;
				        playerData['rotation-z'] = 0;
				        
						playerData['health'] = 100.0;
						playerData['hunger'] = 100.0;
						playerData['thirst'] = 100.0;
						connection.query("INSERT INTO `player-object` VALUES('"+playerData.id+"', '100', '100', '100', '"+spawn.x+"', '"+spawn.y+"', '"+spawn.z+"', '0', '0', '0')", function(err, results){});
				        client.emit('playerLogin', playerData);
			        } else {
				        connection.query("SELECT * FROM `inventory-slot` WHERE `inventory` IN (SELECT `id` FROM `inventory` WHERE `player`='"+playerData.id+"')", function(err, results){
					       	var inventories = new Object();
						   	var currentInv = -1;
						   	var currentIndex = -1;
					        for (var i = 0; i < results.length; i++) {
						          var row = results[i];
						          if (currentInv != row.inventory) {
								  	currentIndex ++;
							      	currentInv = row.inventory;
							      	inventories[currentIndex] = {type: "inventory", id: row.inventory, slots: []};
						          }
						          row.id = row.slot;
								  inventories[currentIndex].slots.push(row);
								  
							}
							
							playerData["scripts"] = inventories;
					        client.emit('playerLogin', playerData);
				        });
			        }
			    });
		    });
		    
		    client.on('setPrefabs', function(data) {
		        connection.query("TRUNCATE `prefabs`", function(err, results) {
					if (err) throw err
					var prefabs = data;
					for (var x = 0; x < prefabs.length; x ++) {
						var prefab = prefabs[x];
						connection.query("INSERT INTO `prefabs` VALUES('"+prefab.id+"', '"+prefab.path+"')", function(err, results){});
					}
					client.emit('setPrefabs', {"status": true});
				});
		    });
		    
		     client.on('loadPrefabs', function(data) {
		        connection.query("SELECT * FROM `prefabs`", function(err, rows) {
					if (err) throw err
					var results = new Object();
				    for (var i = 0; i < rows.length; i++) {
					    var row = rows[i];
						results[i] = row;
					}
					client.emit('loadPrefabs', results);
				});
		    });
			client.on('setObjects', function(data) {
				connection.query("TRUNCATE `craftable`", function(err, results){});
				connection.query("TRUNCATE `craftable-stack`", function(err, results){});

				connection.query("TRUNCATE `gatherable`", function(err, results){});
				connection.query("DELETE FROM `inventory-slot` WHERE `inventory` IN (SELECT `id` FROM `inventory` WHERE `player` IS NULL)", function(err, results){
					connection.query("DELETE FROM `inventory` WHERE `player` IS NULL", function(err, results){});
				});
		        connection.query("TRUNCATE `objects`", function(err, results) {
					if (err) throw err
					var objects = data;
					
					for (var x = 0; x < objects.length; x ++) {
						var object = objects[x];
						connection.query("INSERT INTO `objects` VALUES('"+object.id+"', '"+object.prefab+"', '"+object["position-x"]+"', '"+object["position-y"]+"', '"+object["position-z"]+"', '"+object["rotation-x"]+"', '"+object["rotation-y"]+"', '"+object["rotation-z"]+"', '"+object["scale-x"]+"', '"+object["scale-y"]+"', '"+object["scale-z"]+"')", function(err, results){});
						saveScripts(object, false);
					}
										
					client.emit('setObjects', {"status": true});
				});
		    });
		    client.on('loadObjects', function(data) {
		        connection.query("SELECT * FROM `objects`", function(err, rows) {
					if (err) throw err
					LoadObjects(rows, function(index, object, callback){
						//get scripts		
					    connection.query("SELECT * FROM `gatherable` WHERE `object`='"+object.id+"'", function(err, results){
						     if (results.length != 0) {
							    for (var x = 0; x < results.length; x ++) {
								    var result = results[0];
								     object.scripts.push({id: result['gatherable-id'], strength: result.strength, repeats: result.repeats, refills: result.refills, runout: result.runout, type: "gatherable"});
							    }
						    }
							connection.query("SELECT * FROM `inventory-slot` WHERE `inventory` IN (SELECT `id` FROM `inventory` WHERE `object`='"+object.id+"')", function(err, invSQL){
						       	var inventories = new Object();
							   	var currentInv = -1;
							   	var currentIndex = -1;
						        for (var i = 0; i < invSQL.length; i++) {
							          var row = invSQL[i];
							          if (currentInv != row.inventory) {
								        if (currentIndex>-1)
								        	object.scripts.push(inventories[currentIndex]);
									  	currentIndex ++;
								      	currentInv = row.inventory;
								      	inventories[currentIndex] = {type: "inventory", id: row.inventory, slots: []};
							          }
							          row.id = row.slot;
									  inventories[currentIndex].slots.push(row);
									  
								}
								
								LoadCraftable(object, function(craftable){
									if (craftable !== false)
										object.scripts.push(craftable);
									callback(index, object);

								});
								
					        });
						    
					    });
					  

					}, 
					function(data){
						client.emit('loadObjects', data);
					});



				});
		    });
		    client.on('disconnect', function() {
			    replaceContents("/var/www/html/sites/production/poly/current.png", "/var/www/html/sites/production/poly/offline.png", function(){});

		      console.log('Game Server Disconnected.');
			  online = false;
		   });
		});
		
  
});
