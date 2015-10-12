<!DOCTYPE html>
<html lang="fr">
	<head>
		<meta charset="utf-8" />
		<link rel="stylesheet" href="./game/styles/main.css" />
		<script type="text/javascript" src="./game/libs/jscolor/jscolor.js"></script>
		<script src="./game/scripts/functions.js"></script>
	</head>

	<body>
		<div id="game">
			<form name="formulaire">
				<br /><br /><br /><br />
				<br /><br /><br /><br />

				Choisissez une couleur :<br />
				<input name="color" class="color {slider:false}" onChange="localStorage.lastcolor=this.value;" />

				<br /><br />

				Choisissez un pseudo :<br />
				<input name="pseudo" type="text" value="" onChange="localStorage.lastname=this.value;" />

				<br /><br /><br />

				<input type="button" value="Jouer !" onClick="play();"/>
			</form>
		</div>
	</body>
	<script>
	if(getQuerystring('alert')) {
		alert("Arret du serveur !");
		window.location.replace("http://"+document.location.hostname+"/");
	}
	if(getQuerystring('kick')) {
		alert("Tu as ete kick du serveur !");
		window.location.replace("http://"+document.location.hostname+"/");
	}
	if(getQuerystring('lost')) {
		alert("Perte de la connexion au serveur (crash ?)");
		window.location.replace("http://"+document.location.hostname+"/");
	}
	if(localStorage.lastcolor) {
		document.getElementsByName("color")[0].setAttribute("value", localStorage.lastcolor);
	}
	if(localStorage.lastname) {
		document.getElementsByName("pseudo")[0].setAttribute("value", localStorage.lastname);
	}

	function play() {
		if((localStorage.lastcolor) && (localStorage.lastname) && (localStorage.lastname != "")) {
			if(localStorage.lastname.length <= 10) {
				document.formulaire.action = "./game/?name="+localStorage.lastname+"&color="+localStorage.lastcolor;
				document.formulaire.submit();
			}
			else {
				alert("Votre pseudo est trop long !");
			}
		}
		else {
			alert("Veuillez choisir un pseudo et une couleur !");
		}
	}
	</script>
</html>
