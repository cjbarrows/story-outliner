$(document).ready(function () {
	FastClick.attach(document.body);
	
	$.getJSON("/story", loadStory);

});

function loadStory (data) {
	$.each(data, function (index, item) {
		$("<p>").offset( { left: item.left, top: item.top } ).addClass("bubble").attr("id", item.id).text(item.text).appendTo("body");
	});
	
	$("p.bubble").draggable( {
								start: onStartDraggingBubble,
								stop: onStopDraggingBubble
							} );
}

function onStartDraggingBubble (event, ui) {
}

function onStopDraggingBubble (event, ui) {
	var id = event.target.id;
	var data = { left: ui.position.left, top: ui.position.top };
	
	$.post("/story/" + id, data, onUpdatePositionCallback);
}

function onUpdatePositionCallback (data) {
	console.log("result");
	console.log(data);
}