var scale = 1.0;

var MOUSEWHEEL_SCALE = .01;

$(document).ready(function () {
	// this didn't work with jquery.contextmenu.js:
//	FastClick.attach(document.body);
	
	loadStory();
	
	initializeUI();
	
	$("#diagram").mousewheel(onDiagramMouseWheel);
	$("#diagram_outer").on("gesturechange", onPinch);

	// try to prevent page scrolling (on the iPad) except for the text areas
	$("body").on("touchmove", function (e) {
			if ($(e.target).prop("tagName") == "TEXTAREA") {
			} else {
				e.preventDefault();
			}
		});
});

function loadStory () {
	$.getJSON("/story", onReceiveStory);
}

function initializeUI () {
	$("#splitter").height($("body").height());
	
//	$("#splitter").splitter();

	$("#diagram_outer").draggable( { stop: onStopDraggingDiagram } );

	$("button").button();
	
	$("#addButton").click(onClickAddBubble);
}

function finalizeUI () {
	// don't have transitions on the textarea upon initial load
	
	// trigger a reflow before the class is changed
	document.body.offsetWidth;
	
	$("#words").sortable( { handle: ".handle" } );
	
	$("#words textarea").addClass("textarea-transition");
}

function onReceiveStory (data) {
	$.each(data, function (index, item) {
		createBubble(item);		
	});
	
	finalizeUI();
}

function createBubble (item) {
	var el = $("<div>").offset( { left: item.left, top: item.top } ).addClass("bubble").attr("id", item.id).append("<div class='editable'>" + item.text).appendTo("#diagram");//.text(item.text).appendTo("#diagram");
	
	if (item.width) {
		el.width(item.width);
	}
	if (item.height) {
		el.height(item.height);
	}

	el.draggable( {	start: onStartDraggingBubble,
					drag: onDraggingBubble,
					stop: onStopDraggingBubble
				} );
				
	el.resizable( { stop: onStopResizingBubble } );
	
	el.click(onClickBubble);
//	el.dblclick(onDoubleClickBubble);

	el.find(".editable").editable( { toggleFontSize : false, event: "", lineBreaks: true, callback: onEditBubble } );
	el.find(".editable").on("edit", onEditBubble);

	el.bind("taphold", onTapHoldBubble);
	
	addMenuTo("#" + item.id);
	
	// add words
	// TODO: clean this up:
	var w = $("<textarea>");
	w.attr("id", "w_" + item.id);
	w.text(item.contents);
	var caption = item.text.replace(/<br\/\>/g, " ");
	var x = $("<li>").append(w).append("<div class='handle'><p class='handle-text'>" + caption);
	x.appendTo("#words");
	
	// this (jquery-mobile) will give it a nice rounded, shaded look but it's kinda overkill
//	w.textinput();

	w.autosize();
	w.bind("input propertychange", onChangeContents);
	
	// adjust handle height for margins between <li>
	var h = x.find(".handle");
	h.width(x.height() - 4);
	
	return el;
}

function onChangeContents (event) {
	var id = event.target.id.substr(2);
	
	var contents = $(event.target).val();
	
	updateBubbleContents(id, contents);
}

function onTapHoldBubble (event) {
	$(event.target).contextMenu();
}

function addMenuTo (id) {
	$.contextMenu({
			selector: id,
			callback: function(key, options) {
				if (key == "delete") {
					// TODO: confirm?
					deleteBubble(options.selector.substr(1));
				} else if (key == "edit") {
					console.log($(options.selector));
					editBubbleCaption($(options.selector));
				} else if (key == "write") {
					gotoBubbleWriter($(options.selector));
				}
			},
			items: {
				"edit": { name: "Edit" },
				"write": { name: "Write" },
				"delete": {name: "Delete", icon: "delete"},
			}
		});
}

function getBubbleFromTarget (elem) {
	if (!elem.hasClass("bubble"))
		elem = elem.parent(".bubble");
	return elem;
}

function onBubbleMenuSelect (event, ui) {
	if (ui.cmd == "del") {
		var bubble = getBubbleFromTarget($(ui.target));
		var id = bubble.attr("id");
		deleteBubble(id);
	}
}

function deleteBubble (id) {
	console.log("deleting " + id);
	
	$("#"+ id).remove();
	$("#w_" + id).remove();
	$.post("/delete/" + id, {}, onUpdateCallback);
}

function onDiagramMouseWheel (event, delta, deltaX, deltaY) {
	var px = event.clientX, py = event.clientY;

	// TODO: this is nice to zoom in on a location but it jumps around when zooming on
	// different spots
	$("#diagram").css("-webkit-transform-origin", px + "px " + py + "px");
	
	scale += deltaY * MOUSEWHEEL_SCALE;
	
	if (scale < .1) scale = .1;
	else if (scale > 1) scale = 1;
	
	$("#diagram").css("-webkit-transform", "scale(" + scale + ")");
	
	event.preventDefault();
}

// TODO: throttle this?
function onPinch (event) {
	var s = event.originalEvent.scale;
	
	if (s > 1) {
		scale += s * .02;//MOUSEWHEEL_SCALE;
		if (scale < .1) scale = .1;
		else if (scale > 1) scale = 1;
		$("#diagram").css("-webkit-transform", "scale(" + scale + ")");	
	} else if (s < 1) {
		scale -= s * .02;//MOUSEWHEEL_SCALE;
		if (scale < .1) scale = .1;
		else if (scale > 1) scale = 1;
		$("#diagram").css("-webkit-transform", "scale(" + scale + ")");	
	}
}

function onEditBubble (data) {
	if (data.content) {
		// reset bubble to inline
		$(data.$el).css("display", "inline-block");
		$(data.$el).css("width", "auto");
		
		updateBubbleText(data.$el.parent());
	}
}

function onClickBubble (event) {
	var bubble = getBubbleFromTarget($(event.target));
	
	var alreadySelected = $(bubble).hasClass("selected");
	
	$(".selected").removeClass("selected");
	$(bubble).addClass("selected");
	
	/*
	var elem = $("#w_" + $(bubble).attr("id"));
	console.log(elem.hasClass("highlighted"));
	if (!elem.hasClass("highlighted")) {
		$(".highlighted").removeClass("highlighted");
		elem.addClass("highlighted");
		elem.effect("highlight", {}, 1000);
	}
	*/
	
	var elem = $("#w_" + $(bubble).attr("id"));
	
	if (alreadySelected) {
		gotoBubbleWriter(bubble);
	} else {
		elem.effect("highlight", {}, 1000);
	}
	
	// scroll to corresponding text	
	$("#words_container").animate( { scrollTop: elem.offset().top } );
}

function onDoubleClickBubble (event) {
	var bubble = getBubbleFromTarget($(event.target));
	
	gotoBubbleWriter(bubble);
}

function gotoBubbleWriter (bubble) {
	var elem = $("#w_" + $(bubble).attr("id"));
	elem.effect("highlight", {}, 1000);
	elem.focus();
	var len = elem.val().length;
	elem[0].setSelectionRange(len, len);
}

function editBubbleCaption (bubble) {
	var b = bubble.find(".editable");
	
	b.parent().css("display", "block");
	var w = b.parent().width();
	b.width(w);
	b.editable("open");
}

function onStartDraggingBubble (event, ui) {
}

function onDraggingBubble (event, ui) {
	// TODO: get scaling from transformation matrix
	var zoomScaleX = 1.0;//mtx[0];
	var zoomScaleY = 1.0;//mtx[3];

	// scale the delta by the zoom factor
	var dx = ui.position.left - ui.originalPosition.left;
	var dy = ui.position.top - ui.originalPosition.top;

	ui.position.left = ui.originalPosition.left + (dx / zoomScaleX);
	ui.position.top = ui.originalPosition.top + (dy / zoomScaleY);
}

function onStopDraggingBubble (event, ui) {
	var id = event.target.id;
	var data = { left: ui.position.left, top: ui.position.top };
	
	$.post("/story/" + id, data, onUpdateCallback);
}

function onStopResizingBubble (event, ui) {
	var id = event.target.id;
	var data = { width: ui.size.width, height: ui.size.height };
	
	$.post("/story/" + id, data, onUpdateCallback);
}

function sortByID (a, b) {
	var id_a = a.id.substr(1);
	var id_b = b.id.substr(1);
	return (id_a < id_b ? -1 : 1);
}

function onClickAddBubble (event) {
	var next_id = 1;
	
	var bubbles = $("div.bubble");
	if (bubbles.length > 0) {
		bubbles.sort(sortByID);
	
		next_id = Math.floor(bubbles[bubbles.length - 1].id.substr(1)) + 1;
		
		var newBubble = { left: 100, top: 100, id: "b" + next_id, text: "New bubble.", contents: "Contents of new bubble." };
		var elem = createBubble(newBubble);
		updateBubble(elem);
	}
}

function onUpdateCallback (data) {
//	console.log("updated");
//	console.log(data);
}

function updateBubbleContents (id, contents) {
	var data = { id: id, contents: contents };
	
	$.post("/story/" + id, data, onUpdateCallback);
}

function updateBubble (elem) {
	var id = elem.attr("id");
	
	var data = { id: elem.attr("id"), text: elem.find(".editable")[0].innerHTML,
					left: elem.offset().left, top: elem.offset().top,
					width: elem.width(), height: elem.height(),
					contents: $("#w_" + id).val() };
	
	$.post("/story/" + id, data, onUpdateCallback);
}

function updateBubbleText (elem) {
	var id = elem.attr("id");
	
	var data = { text: elem.find(".editable")[0].innerHTML };
	
	$.post("/story/" + id, data, onUpdateCallback);
}

function onStopDraggingDiagram () {
	// resize to fit viewable area
	var p = $("#diagram_container");
	var o = $("#diagram_outer");
	var d = $("#diagram");
	d.offset( { left: d.offset().left + o.offset().left, top: d.offset().top + o.offset().top } );
	o.offset( { left: 0, top: 0 } );
}
