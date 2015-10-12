var localPseudo = getQuerystring('pseudo');
var localColor = getQuerystring('color');

if (localPseudo == '' || localColor == '') {
	window.location.replace("http://"+document.location.hostname+"/");
}


// Envoi des infos du joueur au serveur
socket.emit('playerInitInfos', { 
	pseudo:localPseudo, 
	color:localColor
});

// définition des évennements
document.addEventListener("keydown",_keyDown,false);
document.addEventListener("keyup",_keyUp,false);

var controller = { right: 0, left: 0 };

// MainLoop
var connectFails = 0;
setInterval(function() { 
	if (controller.right == 1) {
		socket.emit('rotate', 'right');
	}

	if (controller.left == 1) {
		socket.emit('rotate', 'left');
	}

	if (controller.up == 1) {
		socket.emit('energize', 'up');
	}

	if (controller.down == 1) {
		socket.emit('energize', 'down');
	}

	if (socket.socket.connected == false) {
		connectFails++;
	} else {
		connectFails--;
	}

	if (connectFails<0) {
		connectFails = 0;
	} 
	else if (connectFails > 20) {
		window.location.replace("http://"+document.location.hostname+"/?lost=1");
	}
},50);

// Fonctions
function _keyDown(e) {
	var keyCode = e.keyCode;
	switch (keyCode) {
		case 38: // UP
			controller.up = 1;
		break;

		case 40: // DOWN
			controller.down = 1;
		break;

		case 39: // RIGHT
			controller.right = 1;
		break;

		case 37: // LEFT
			controller.left = 1;
		break;
	}
}

function _keyUp(e) {
	var keyCode = e.keyCode;
	switch (keyCode) {
		case 38: // UP
			controller.up = 0;
		break;

		case 40: // DOWN
			controller.down = 0;
		break;

		case 39: // RIGHT
			controller.right = 0;
		break;

		case 37: // LEFT
			controller.left = 0;
		break;
	}
}