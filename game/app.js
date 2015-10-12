var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require("socket.io").listen(server);

io.set('log level', 1);
app.set('port', 25550);

// Accès aux pages
app.get('/', function(req, res){
  var html = require('fs').readFileSync(__dirname+'/../index.php');
  res.end(html);
})
.get('/game', function(req, res) {
  var html = require('fs').readFileSync(__dirname+'/index.php');
  res.end(html);
});

// Accès aux essources
app.get('/game/:res1/:res2', function(req, res){
  var rsr = require('fs').readFileSync(__dirname+'/'+req.params.res1+'/'+req.params.res2);
  res.end(rsr);
})
.get('/game/libs/:res1/:res2', function(req, res){
  var rsr = require('fs').readFileSync(__dirname+'/libs/'+req.params.res1+'/'+req.params.res2);
  res.end(rsr);
});

// Cas de page inexistante
app.use(function(req, res, next){
    res.setHeader('Content-Type', 'text/plain');
    res.send(404, 'Page introuvable !');
});

server.listen(app.get('port'));


/*=============================================*/


// définition des variables
var iTicks = 0;					// Index des ticks du jeu
var iBullets = 0;				// Index des balles placées
var iBuffer = 0;				// Index du tableau de balles du buffer
var iBlank = 0;					// Index des balles non placées 
var pNbr = 0;						// Nombre de joueurs (specs compris)
var pNbrAlive = 0;			// Nombre de joueurs vivants
var pNbrSpecs = 0;			// Nombre de spectateurs

var global = { 
  tickRate: 40,					// Nombre d'itération par secondes
  startDelay: 2000,			// Délay avant début du round en ms
	energyRegenFreq: 2,		// Nombre d'itérations avant regen
	speedBase: 3,					// Vitesse de déplacement par défaut
  rotateInc: 9,					// Vitesse de rotation
	bulletMax: 2000,			// Nombre de balles maximum à l'écran
	blankFreq: 170,				// Nombre d'itérations entre chaque coupure de ligne
	blankDuree: 10,				// Nombre d'itérations pendant lequel le trait est coupé
	victoryPoints: 2,			// Nombre de points attribués à une victoire
	areaW: 800,						// Largeur de l'écran de jeu
	areaH: 600,						// Hauteur de l'écran de jeu
  paused: 0,						// Met en pause le jeu quand égal à 1
  // Variables destinées aux bonus :
	bonusFreq: 250,				// Nombre d'itérations entre chaque apparition de bonus aléatoire
	bonusTime: 100,				// Nombre d'itérations pendant lequel un bonus dure après son démarrage
	bSpeedPlus: 2,				// Valeur d'incrémentation de la vitesse par le bonus
	bSpeedMoins: 1 				// Valeur de dérémentation de la vitesse par le bonus
};

var players = new Array();
function Player(x,y,o,c,id,pseudo,color) {
	this.x=x;
	this.y=y;
	this.o=o;
	this.c=c;
	this.w = 6;
	this.id=id;
	this.pseudo=pseudo;
	this.color=color; 
	this.points = 0;
	this.victories = 0;
	this.alive = false;
	this.spec = true;
	this.rainbow = 0;
	this.energy = 0;
	// Durée des effets des bonus 
	this.bArrow = 0;
	this.bSpeed = 0;
	this.bSpeedPlus = false;
	this.bSpeedMoins = false;
};

var bulletTable = Array();
var bulletBuffer = Array();
function bullet(player) {
	this.x = player.x - ((player.w + 1) * Math.sin(player.o*(3.14/180)));
	this.y = player.y - ((player.w + 1) * -Math.cos(player.o*(3.14/180)));
	this.w = player.w;
	this.owner = player.id;
	this.color = player.color;
};

var bonusTable = Array();
function bonus() {
	var image = "speed-Other";
	switch(Math.floor(Math.random()*6)) {
		case 0:
			image = "speed-Other";
			break;
		case 1:
			image = "speed+Other";
			break;
		case 2:
			image = "speed-Self";
			break;
		case 3:
			image = "speed+Self";
			break;
		case 4:
			image = "arrowSelf";
			break;
		case 5:
			image = "arrowOther";
			break;
	}
	this.x = Math.floor(Math.random()*(800-25));
	this.y = Math.floor(Math.random()*(600-25));
	this.w = 25;
	this.image = image;
};


// Si des joueurs sont toujours dans l'instance précédente
io.sockets.emit('newMessage',{ 
	pseudo:"<font color='#c00'>Server crashed</font>",
	message:"Please refresh."
});


// Instance du joueur connecté
io.sockets.on('connection', function (socket) {
	// Rotation des joueurs
  socket.on('rotate', function (sens) {
		if(sens == 'right') {
			// Si le joueur a un malus d'inversement des touches
			if (players[_getId(socket.id)].bArrow > 0) {
				players[_getId(socket.id)].o -= global.rotateInc;
			}
			// Sinon il tourne comme il faut
			else {
				players[_getId(socket.id)].o += global.rotateInc;
			}
		}
		if(sens == 'left') {
			// Si le joueur a un malus d'inversement des touches
			if (players[_getId(socket.id)].bArrow > 0) {
				players[_getId(socket.id)].o += global.rotateInc;
			}
			// Sinon il tourne comme il faut
			else {
				players[_getId(socket.id)].o -= global.rotateInc;
			}
		}
  });

  // Modificateur de vitesse perso des joueurs
  socket.on('energize', function (sens) {
		if (players[_getId(socket.id)].energy > 1 && players[_getId(socket.id)].c > 1) { 
			if (sens == 'up') {
				players[_getId(socket.id)].c += 2;
			}
			if (sens == 'down') {
				players[_getId(socket.id)].c -= 1;
			}
		}
		// Descente de l'énergie
		if (sens == 'up') {
			players[_getId(socket.id)].energy-=15;
		}
		if (sens == 'down') {
			players[_getId(socket.id)].energy-=7;
		}
  });


  // Initialisation
  socket.on('playerInitInfos', function (e) {
		var info = new Player(-1000, -1000, 0, global.speedBase, socket.id, e.pseudo, e.color);
		players.push(info);
		pNbr++;
		pNbrSpecs++;
  	console.log("Connexion de "+e.pseudo+":"+socket.id);
  	io.sockets.emit('newMessage',{ 
			pseudo:"<i><font color='#555'>Connection de</font></i>",
			message:"<i>"+e.pseudo+"</i>"
		});
  	socket.emit('refreshBullets',bulletTable);
	  io.sockets.emit('refreshScores',players);
  });


  // Déconnexion
  socket.on('disconnect', function () {
		var id = _getId(socket.id);
		// If pour éviter le crash du serveur
		if (players[id]) {
			console.log("Deconnexion de "+players[id].pseudo+":"+socket.id);
			io.sockets.emit('newMessage',{ 
				pseudo:"<i><font color='#555'>D&eacute;connection de</font></i>",
				message:"<i>"+players[id].pseudo+"</i>"
			});

			pNbr--;
			if(players[id].alive == true) {
				pNbrAlive--;
			} 
			if(players[id].spec == true) {
				pNbrSpecs--;
			}
			
			players.splice(id, 1);

			socket.broadcast.emit('removePlayer',id);
		  socket.broadcast.emit('refreshScores',players);
		}
  });


  // Broadcast des nouveaux messages
  socket.on('sendMsg', function (e) {
		io.sockets.emit('newMessage',{ 
			pseudo:"<font color='#"+e.color+"'>"+e.pseudo+"</font>",
			message:escapeHtml(e.message)
		});
		console.log(e.pseudo + " : " + e.message);
  });


  // Toggle du mode spectateur pour le joueur
  socket.on('setSpec', function (e) {
  	if (players[_getId(socket.id)]) {
			players[_getId(socket.id)].spec = !players[_getId(socket.id)].spec;
		  io.sockets.emit('refreshScores',players);
			if(players[_getId(socket.id)].spec == true) {
				players[_getId(socket.id)].alive = false;
				players[_getId(socket.id)].x = -1000;
				players[_getId(socket.id)].y = -1000;
		    io.sockets.emit('refreshPlayers',players);
				pNbrSpecs++;
				pNbrAlive--;
			} else {
				pNbrSpecs--;
			}
			console.log("Statut spectateur pour " + players[_getId(socket.id)].pseudo + " : " + players[_getId(socket.id)].spec);
	  }
	});

});


// Récupération des entrées console
process.stdin.resume();
process.stdin.setEncoding('utf8');
 
process.stdin.on('data', function (cin) {
	var order = cin.split(":");

	// Chomp des arguments
	order[0] = order[0].replace(/(\n|\r)+$/, '');
	if(order[1]) {
		order[1] = order[1].replace(/(\n|\r)+$/, '');
	}

	// Switch de l'ordre
	switch (order[0].toLowerCase()) {
		// Envoi d'un message serveur dans le chat
		case "say":
			io.sockets.emit('displayAlert',order[1], '#c00', 1000);
			io.sockets.emit('newMessage',{ 
				pseudo:"<font color='#cc0000'>Server</font>",
				message:"<font color='#cc0000'>"+order[1]+"</font>"
			});
			break;

		// Toggle la trainée arc en ciel sur un joueur
		case "rainbow":
			var matched;
			var reg = new RegExp(order[1], "gi");

			for(var i in players) {
				var match = reg.test(players[i].pseudo);

				if(match) {
					matched = players[i];
					matched.rainbow = !matched.rainbow;
					console.log("Value of rainbow for " + matched.pseudo + " : " + matched.rainbow);
					break;
				}
			}
			break;

		// Liste les joueurs en ligne
		case "list":
			console.log(pNbr + " joueur(s) en ligne : ");
			for(var i in players) {
				console.log(players[i].pseudo + " - " + players[i].points);
			}
			break;

		// Arrête proprement le serveur en notifiant les utilisateurs
		case "stop":
			console.log("Arret du serveur");
			io.sockets.emit('stopServer', 1);
			server.close();
			process.exit(code=0);
			break;

		// Exclue un joueur
		case "kick":
			var player = _getSocketId(order[1]);
			if(player) {
				io.sockets.socket(player.sockId).emit('kickPlayer',1);
				io.sockets.emit('newMessage',{ 
					pseudo:"<i><font color='#555'>Kick de</font></i>",
					message:"<i>"+player.pseudo+"</i>"
				});
			}
			break;

		default:
			console.log("Undefined Command : '" + order[0] + "'");
	}
});

// MainLoop <================================
var lastNbr = 0;
setInterval(function() {
	// Si des joueurs sont encore en vie, on joue.
	if ((pNbrAlive > 1 && pNbr > 1) || (pNbrAlive == 1 && pNbr-pNbrSpecs == 1)) {	
		// Si le jeu n'est pas en pause
		if (global.paused == 0) {			
			// Déplacement des joueurs vivants
			for (var i in players) {
				if (players[i].alive == true && players[i].spec == false) {
					// Actualisation de la couleur si le joueur est RAINBOWDASH !!!
					if (players[i].rainbow == 1) {
						players[i].color = rainbow(global.blankFreq, iBlank);
					}

					// Déplacement du joueur
					players[i].x += players[i].c * Math.sin(players[i].o*(3.14/180));
					players[i].y += players[i].c * -Math.cos(players[i].o*(3.14/180));
	
					// Vérification du blank
					if (iBlank >= global.blankFreq + global.blankDuree) { iBlank = 0; }
	
					// Blocage du blank activé au début de la partie
					if (iTicks > (global.startDelay / global.tickRate)) {
						// Trace
						if (iBlank < global.blankFreq) {
							bulletTable[iBullets] = new bullet(players[i]);
							bulletBuffer[iBuffer] = new bullet(players[i]);
							iBuffer++;
							iBullets++;
						}
					}
					
					// Regen énergie
					if (iTicks%global.energyRegenFreq == 0) {
						if (players[i].energy <= 100) {
							players[i].energy++;
						}
						// Reprise de la vitesse normale
						if(players[i].bSpeed <= 0) {
							if(players[i].c > global.speedBase) { players[i].c--; }
							if(players[i].c < global.speedBase) { players[i].c++; }
						}
						else {
							// Si bonus de vitesse
							if (players[i].bSpeedPlus) {
								if(players[i].c > global.speedBase + global.bSpeedPlus) { players[i].c--; }
								if(players[i].c < global.speedBase + global.bSpeedPlus) { players[i].c++; }
							}
							// Si bonus de déscélération
							else if (players[i].bSpeedMoins) {
								if(players[i].c > global.speedBase - global.bSpeedMoins) { players[i].c--; }
								if(players[i].c < global.speedBase - global.bSpeedMoins) { players[i].c++; }
							}
						}
					}
					if (players[i].energy <= -5) { players[i].energy = -5; }
					
					// Réduction du temps des bonus
					if (players[i].bSpeed > 0) { players[i].bSpeed--; }
					if (players[i].bArrow > 0) { players[i].bArrow--; }
				}
			}

			// Gestion de l'ajout des bonus
			_bonusGen();
			
			// Vérification des collisions
			for(var i in players) {
				if(players[i].alive == true) {
					_collide(players[i]);
				}
			}

			// Actualisation des données client
	    io.sockets.emit('refreshPlayers',players);
	    if(bulletBuffer.length > 0) {
		    io.sockets.emit('refreshBullets',bulletBuffer);
				iBuffer = 0;
		    bulletBuffer = [];
		  }
	
			iBlank++;
			iTicks++;
		}	
	}
	// Si personne n'est sur le terrain on se contente de le vider
	else if (pNbr-pNbrSpecs == 0) {
		iTicks = 0;
		iBullets = 0;
		iBuffer = 0;
		bulletTable = [];
		bulletBuffer = [];
		io.sockets.emit('resetGround',1);
	}
	// Réinitialisation du terrain si plus personne n'est vivant
	else {
		global.paused = 1;
		iBullets = 0;
		iBuffer = 0;
		bulletTable = [];
		bulletBuffer = [];
		bonusTable = [];
		var nonSpecs = 0;

		for(var i in players) {
			if(players[i].spec == false) {
				// Ajout d'une victoire au survivant
				if(pNbr-pNbrSpecs > 1 && lastNbr > 1 && players[i].alive == true && players[i].spec == false) {
					io.sockets.emit('displayVictory', players[i].pseudo);
					players[i].points += global.victoryPoints;
					players[i].victories++;
				}
				players[i].x = Math.floor(Math.random()*800);
				players[i].y = Math.floor(Math.random()*600);
				players[i].o = Math.floor(Math.random()*360);
				players[i].alive = true;
				players[i].energy = 0;
				players[i].bSpeed = 0;
				players[i].bArrow = 0;
				players[i].bSpeedPlus = false;
				players[i].bSpeedMoins = false;
				players[i].c = global.speedBase;
				nonSpecs++;
			}
		}

		if (lastNbr <= 1 && pNbr-pNbrSpecs > 1) {
			io.sockets.emit('displayAlert',"Début de partie !", '#fff', (global.startDelay/2)-600);
		}

		pNbrAlive = nonSpecs;

		setTimeout(function() {
			iTicks = 0;
			io.sockets.emit('removeBonus',-1);
		  io.sockets.emit('refreshScores',players);
			io.sockets.emit('resetGround',1);
		  io.sockets.emit('refreshPlayers',players);

			// Lancement de la partie
			global.paused = 0;
			io.sockets.emit('displayAlert',"3", '#c00', (global.startDelay/4)-600);
			setTimeout(function() {
				io.sockets.emit('displayAlert',"2", '#cc0', (global.startDelay/4)-600);
				setTimeout(function() {
					io.sockets.emit('displayAlert',"1", '#0d0', (global.startDelay/4)-600);
				}, global.startDelay/4);
			}, global.startDelay/4);

		}, global.startDelay/2);
	}

	lastNbr = pNbr-pNbrSpecs;
},1000/global.tickRate);



/*=================Fonctions===================*/


// Fonction de récupération de l'id tableau en fonction de l'id socket
	function _getId(socketid) {
		var id;
		for(var i in players) {
			if(players[i].id == socketid) {
				id = i;
			}
		}
		return id;
	}


	// Fonction de récupération du socket id en fonction du pseudo ou d'une partie du pseudo
	// Retourne un objet contenant .sockId et .pseudo (pseudo complet)
	function _getSocketId(pseudo) {
		pseudo = pseudo.replace(/(\n|\r)+$/, '');
		var reg = new RegExp(pseudo, "gi");

		for(var i in players) {
			var match = reg.test(players[i].pseudo);

			if(match) {
				return { 
					sockId:players[i].id, 
					pseudo:players[i].pseudo
				}
			}
		}
	}


	// Gère les collision du joueur passé en paramètre
	function _collide(player) {
		if(player.x < 0) {
			player.x = global.areaW;
		}

		if(player.y < 0) {
			player.y = global.areaH;
		}

		if(player.x > global.areaW) {
			player.x = 0;
		}

		if(player.y > global.areaH) {
			player.y = 0;
		}

		for (var i in bulletTable) {
			distX = (player.x + (player.w / 2)) - (bulletTable[i].x + (bulletTable[i].w / 2));
			distY = (player.y + (player.w / 2)) - (bulletTable[i].y + (bulletTable[i].w / 2));
			dist = Math.sqrt((distX * distX) + (distY * distY));
			if (dist < player.w) {
				pNbrAlive--;
				player.alive = false;

				// Ajout d'un point au owner de la balle
				var id = _getId(bulletTable[i].owner);
				if(players[id]) {
					console.log(player.pseudo+" looses. By "+players[id].pseudo);
					if(player.id != bulletTable[i].owner) {
						players[id].points++;
		    		io.sockets.emit('refreshScores',players);
					}
				}
				break;
			}
		}

		for (var i in bonusTable) {
			distX = (player.x + (player.w / 2)) - (bonusTable[i].x + (bonusTable[i].w / 2));
			distY = (player.y + (player.w / 2)) - (bonusTable[i].y + (bonusTable[i].w / 2));
			dist = Math.sqrt((distX * distX) + (distY * distY));

			// S'il y a collision avec un bonus
			if (dist < 15 /*heignt player+height bonus /2*/) {
				var idPlayer = _getId(player.id);			
				var reg = new RegExp("Other", "gi");
				var match = reg.test(bonusTable[i].image);

				// Si le bonus s'applique aux autres joueurs
				if(match) {
					_bonusApply("other", idPlayer, bonusTable[i].image);
				}
				// Sinon le bonus s'applique à l'utilisateur qui l'utilise
				else {
					_bonusApply("self", idPlayer, bonusTable[i].image);
				}

				// Suppression du bonus dans la table
				bonusTable.splice(i, 1);
				io.sockets.emit('removeBonus',i);
				break;
			}
		}
	}


	// Gestion des bonus
	function _bonusApply(target, id, bonus) {
		if (target == "self") {
			switch(bonus) {
				case "speed-Self":
					players[id].c = global.speedBase - global.bSpeedMoins;
					players[id].bSpeed = global.bonusTime;
					players[id].bSpeedMoins = true;
					players[id].bSpeedPlus = false;
					io.sockets.socket(players[id].id).emit('newPlayerBonus',{color:"#39F", name:"speed"});
					break;

				case "speed+Self":
					players[id].c = global.speedBase + global.bSpeedPlus;
					players[id].bSpeed = global.bonusTime;
					players[id].bSpeedMoins = false;
					players[id].bSpeedPlus = true;
					io.sockets.socket(players[id].id).emit('newPlayerBonus',{color:"#39F", name:"speed"});
					break;

				case "arrowSelf":
					players[id].bArrow = global.bonusTime;
					io.sockets.socket(players[id].id).emit('newPlayerBonus',{color:"#C00", name:"arrow"});
					break;
			}
		}
		else {
			switch(bonus) {
				case "speed-Other":
					for(var i in players) {
						if (i == id) { continue; }
						if (players[i].spec == true) { continue; }
						if (players[i].alive == false) { continue; }
						players[i].c = global.speedBase - global.bSpeedMoins;
						players[i].bSpeed = global.bonusTime;
						players[i].bSpeedMoins = true;
						players[i].bSpeedPlus = false;
						io.sockets.socket(players[i].id).emit('newPlayerBonus',{color:"#39F", name:"speed"});
					}
					break;

				case "speed+Other":
					for(var i in players) {
						if (i == id) { continue; }
						if (players[i].spec == true) { continue; }
						if (players[i].alive == false) { continue; }
						players[i].c = global.speedBase + global.bSpeedPlus;
						players[i].bSpeed = global.bonusTime;
						players[i].bSpeedMoins = false;
						players[i].bSpeedPlus = true;
						io.sockets.socket(players[i].id).emit('newPlayerBonus',{color:"#39F", name:"speed"});
					}
					break;

				case "arrowOther":
					for(var i in players) {
						if (i == id) { continue; }
						if (players[i].spec == true) { continue; }
						if (players[i].alive == false) { continue; }
						players[i].bArrow = global.bonusTime;
						io.sockets.socket(players[i].id).emit('newPlayerBonus',{color:"#C00", name:"arrow"});
					}
					break;
			}
		}
	}


	// Echape les caractères spéciaux html
	function escapeHtml(text) {
	    return text
	         .replace(/&/g, "&amp;")
	         .replace(/</g, "&lt;")
	         .replace(/>/g, "&gt;")
	         .replace(/"/g, "&quot;")
	         .replace(/'/g, "&#039;");
	 }


	// Ajoute un nouveau bonus aléatoire aléatoirement
	function _bonusGen() {
		if((iTicks+1)%global.bonusFreq == 0) {
			bonusTable.push(new bonus());
			io.sockets.emit('displayBonus',bonusTable);
		}
	}


	function rainbow(numOfSteps, step) {
	    // This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distiguishable vibrant markers in Google Maps and other apps.
	    // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
	    // Adam Cole, 2011-Sept-14
	    var r, g, b;
	    var h = step / numOfSteps;
	    var i = ~~(h * 6);
	    var f = h * 6 - i;
	    var q = 1 - f;
	    switch(i % 6){
	        case 0: r = 1, g = f, b = 0; break;
	        case 1: r = q, g = 1, b = 0; break;
	        case 2: r = 0, g = 1, b = f; break;
	        case 3: r = 0, g = q, b = 1; break;
	        case 4: r = f, g = 0, b = 1; break;
	        case 5: r = 1, g = 0, b = q; break;
	    }
	    var c = ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
	    return (c);
	}
