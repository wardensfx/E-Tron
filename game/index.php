<!DOCTYPE html>
<html lang="fr">
	<head>
		<meta charset="utf-8" />
		<link rel="stylesheet" href="./styles/main.css" />
		<script src="./libs/svg.js"></script>
		<script src="./scripts/functions.js"></script>
		<script src="../socket.io/socket.io.js"></script>
		<script type="text/javascript">
		   var socket = io.connect();
		</script>
	</head>

	<body>
		<div id="game">
			<div id="mainPage"></div>
		</div>
		<div id="infoBar">
			<div class="scores" id="scores"></div>

			<div class="scores">		
				<input id="b1" type="button" class="chat" value="Rejoindre la partie" onclick="_setSpec()" />
			</div>


			<div class="scores" id="specs"></div>

			<div class="scores">		
				<input id="b2" style="display:none;" type="button" class="chat" value="Mode spectateur" onclick="_setSpec()" />
			</div>


			<div class="comments">
				<b>Chatbox :</b>
				<input type="text" class="chat" id="textChat" onkeypress="if (event.keyCode == 13) _sendMsg()" />
				<input type="button" class="chat" value="Envoyer" onclick="_sendMsg()" />
				
				<div id="comments"></div>
			</div>
		</div>
	</body>
	
	<script src="./scripts/main.js"></script>
	<script src="./scripts/events.js"></script>
</html>
