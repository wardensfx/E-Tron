var draw = SVG('mainPage');
var energyBar = draw.rect(0,5).move(0,598)
	.fill({ color: '#cc0', opacity: '1' })
	.stroke({ color: '#fff', width: '1', opacity: '0.6'});

var port = 25550;
var images = "http://"+document.location.hostname+":"+port+"/game/images/";

var localPlayers = new Array();
var localBullets = new Array();
var localBonus = new Array();
var bonusBars = new Array();

function PlayerEntity(mark, text) {
  this.mark = mark;
  this.text = text;
}

// Gestion des joueurs
socket.on('refreshPlayers', function (players) {
  for(var i in players) {
		// Création des nouveaux joueurs
		if(typeof(localPlayers[i]) === "undefined") {
			var ownColor = '#fff';
    	if(players[i].id == socket.socket.sessionid) {
    		// Attribution d'un marqueur de couleur pour le joueur en cours
    		ownColor = '#c00';
    	}
    	// Création des éléments
    	var circle = draw.circle(6).move(players[i].x,players[i].y)
	     .fill({ color: ownColor, opacity: '1' })
	     .stroke({ color: '#fff', width: '1' });
    	var text = draw.text(players[i].pseudo).font({ size: 12 })
	     .fill({ color: '#fff', opacity: '0.6' })
	     .stroke({ color: '#fff', width: '1', opacity: '0.4'});
	    // Déplacement du texte au dessus du marqueur
	    text.move(players[i].x - text.bbox().width /2, players[i].y - text.bbox().height - 10);
	    // Ajout de l'entité au tableau
	    localPlayers[i] = new PlayerEntity(circle, text);
		} 
		else { 
			// Déplacement du joueur
			localPlayers[i].mark.move(players[i].x, players[i].y);
			localPlayers[i].text.move(players[i].x - localPlayers[i].text.bbox().width /2, players[i].y - localPlayers[i].text.bbox().height - 10);
			
			// Actualisation du joueur local
			if(players[i].id == socket.socket.sessionid) {
				// Affichage du bouton au bon endroit en fonction du mode
    		if(players[i].spec == false) {
					document.getElementById("b1").style.display = "none";
					document.getElementById("b2").style.display = "block";
				}
				else {
					document.getElementById("b2").style.display = "none";
					document.getElementById("b1").style.display = "block";
				}

		    // Actualisation de la barre d'énergie
		    if (players[i].energy > 1) 
		    	{	energyBar.width(((players[i].energy-1)/100)*800); }
		    else
		    	{	energyBar.width(0); }

		    // Actualisation des barres de bonus
		    for(var j in bonusBars) {
		    	switch(bonusBars[j].name) {
		    		case "speed":
		    			bonusBars[j].bar.width(players[i].bSpeed);
		    			break;
		    		case "arrow":
		    			bonusBars[j].bar.width(players[i].bArrow);
		    			break;
		    	}
			  }

	    }
		}
  }
});


// Passage en spectateur
function _setSpec() {
	socket.emit('setSpec', 1);
}


// Ajout d'une barre de bonus
socket.on('newPlayerBonus', function (bonus) {
	// Vérification de la non existence de la barre
	for(var i in bonusBars) {
		if(bonusBars[i].name == bonus.name) {
			return;
		}
  }
  var rect = draw.rect(0,12).move(0,15*(bonusBars.length+1))
								 .fill({ color: bonus.color, opacity: '0.4' });
  bonusBars.push({name: bonus.name, bar: rect});
});


// Rerait d'un joueur
socket.on('removePlayer', function (id) {
	localPlayers[id].mark.remove(); localPlayers[id].text.remove();
	localPlayers.splice(id,1);
});


// Affichage d'un bonus
socket.on('displayBonus', function (bonus) {
	for(var i in bonus) {
		// Création des nouveaux bonus
		if(typeof(localBonus[i]) === "undefined") {
	    localBonus[i] = draw.image(images+""+bonus[i].image+".png")
													.move(bonus[i].x,bonus[i].y);
		}
  }
});


// Retrait d'un bonus
socket.on('removeBonus', function (bonusID) {
	if (bonusID == -1) {
		for(var i in localBonus) {
			localBonus[i].remove();
	  }
	  localBonus = [];
	}
	else {
		localBonus[bonusID].remove();
		localBonus.splice(bonusID,1);
	}
});


// Rafraichissement du tableau de scores
socket.on('refreshScores', function (players) {
	// Arrangement du tableau en fonction des scores
	players = players.sort(function(a,b) {
	  return a.points > b.points;
	}).reverse();
	
	// Formattage de la liste des joueurs
  var list = "<b>Joueurs en ligne : </b><br />";
  var listSpec = "<b>Spectateurs : </b><br />";
  for(var i in players) {
  	if(players[i].spec == 0) {
  		if(players[i].alive == 0) {
				list = list + "<span style='color:#" + players[i].color + "; float:left;'><s>" + players[i].pseudo + "</s></span><span style='float:right;'>- " + players[i].points + " points</span><br />";
			} else {
				list = list + "<span style='color:#" + players[i].color + "; float:left;'>" + players[i].pseudo + "</span><span style='float:right;'>- " + players[i].points + " points</span><br />";
			}
		}
		else {
			listSpec = listSpec + "<span style='color:#" + players[i].color + "; float:left;'>" + players[i].pseudo + "</span><br />";
		}
	}

	// Mise à jour de l'affichage de la liste des joueurs
  document.getElementById("scores").innerHTML = list;
  document.getElementById("specs").innerHTML = listSpec;
});


// Ajout des nouvelles balles contenues dans le buffer
var max = 0;
socket.on('refreshBullets', function (bulletTable) {
  for(var i in bulletTable) {
		// Création des traces
		var length = max + i;
		if(typeof(localBullets[length]) === "undefined") {
	    localBullets[length] = draw.circle(5/*heignt line*/)
				 .move(bulletTable[i].x,bulletTable[i].y)
				 .fill({ color:'#'+bulletTable[i].color })
	       .stroke({ color: '#fff', width: '1', opacity: '0.5' });
	    max++;
		}
  }
});


// Réinitialisation du terrain
socket.on('resetGround', function (e) {
	for(var i in localBullets) {
		localBullets[i].remove();
  }
  localBullets = [];
});


// Arret du serveur
socket.on('stopServer', function (e) {
	window.location.replace("http://"+document.location.hostname+"/?alert=1");
});


// Kick du joueur
socket.on('kickPlayer', function (e) {
	window.location.replace("http://"+document.location.hostname+"/?kick=1");
});


// Gestion d'un nouveau message
socket.on('newMessage', function (e) {
	var tmp = document.getElementById("comments").innerHTML;
	document.getElementById("comments").innerHTML = "<b>"+e.pseudo+" : </b>"+e.message+"<br />"+tmp;
});


// Affichage d'une alerte
socket.on('displayAlert', function(text, color, duration) {
	if(color == '') {
		color = "#fff";
	}
	if(duration == '') {
		duration = 1000;
	}
	var appear, disappear, deleteAlert,
			alert = draw.text(text).font({ size: 36 });

	appear = function() {
		alert.move(400-(alert.bbox().width / 2), 100)
				 .fill({ color: color, opacity: '0' })
			   .animate(100).fill({ opacity: '1' })
			   .after(disappear);
	};

	disappear = function() {
		setTimeout(function() {
			alert.animate(500).fill({ opacity: '0' }).after(deleteAlert);
		}, duration);
	};

	deleteAlert = function() {
		alert.remove();
	}

	appear();
});


// Affichage d'une victoire
socket.on('displayVictory', function(pseudo) {
	var appear, disappear, deleteAlert,
			alert = draw.text("Victoire de "+pseudo+" !").font({ size: 20 });

	appear = function() {
		alert.move(400-(alert.bbox().width / 2), 50)
				 .fill({ color: '#fff', opacity: '0' })
			   .animate(100).fill({ opacity: '1' })
			   .after(disappear);
	};

	disappear = function() {
		setTimeout(function() {
			alert.animate(500).fill({ opacity: '0' }).after(deleteAlert);
		}, 1000);
	};

	deleteAlert = function() {
		alert.remove();
	}

	appear();
});