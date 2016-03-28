var VERSION = "Version 1.0";
// Add a new gate to the graph when a certain type of gate is clicked
$(function() {
    window.views = {
        'logic.Input':      joint.shapes.logic.Input,
        'logic.InputLow':   joint.shapes.logic.InputLow,
        'logic.Output':     joint.shapes.logic.Output,
        'logic.And':        joint.shapes.logic.And,
        'logic.Or':         joint.shapes.logic.Or,
        'logic.Not':        joint.shapes.logic.Not,
        'logic.Nand':       joint.shapes.logic.Nand,
        'logic.Nor':        joint.shapes.logic.Nor,
        'logic.Xor':        joint.shapes.logic.Xor,
        'logic.Xnor':       joint.shapes.logic.Xnor,
        'logic.Mux21':      joint.shapes.logic.Mux21,
        'logic.Mux21B':   joint.shapes.logic.Mux21B,
        'logic.Splitter':   joint.shapes.logic.Splitter,
        'logic.Joiner':     joint.shapes.logic.Joiner,
        'logic.SMC':        joint.shapes.logic.SMC,
        'logic.PM':         joint.shapes.logic.PM,
        'logic.RF':         joint.shapes.logic.RF,
        'logic.RAM':        joint.shapes.logic.RAM,
        'logic.ALU':        joint.shapes.logic.ALU,
        'logic.Register':   joint.shapes.logic.Register,
        'logic.Dff':        joint.shapes.logic.Dff
    };
});

var WIRE = 'logic.Wire';
var BUS = 'logic.Bus';
var MUX21B = 'logic.Mux21B';
var SPLITTER = 'logic.Splitter';
var JOINER = 'logic.Joiner';
var SMC = 'logic.SMC';
var REG = 'logic.Register';
var ALU = 'logic.ALU';
var PM = 'logic.PM';
var RF = 'logic.RF';
var RAM = 'logic.RAM';

var addGate = function(graph, type, xpos, ypos) {
    var newGate = new window.views[type]({ position: { x: xpos, y: ypos}});
    graph.addCell(newGate);
}

function setGrid(paper, gridSize, color) {  
    // Set grid size on the JointJS paper object (joint.dia.Paper instance)
    paper.options.gridSize = gridSize;
    // Draw a grid into the HTML 5 canvas and convert it to a data URI image
    var canvas = $('<canvas/>', { width: gridSize, height: gridSize });
    canvas[0].width = gridSize;
    canvas[0].height = gridSize;
    var context = canvas[0].getContext('2d');
    context.beginPath();
    context.rect(1, 1, 1, 1);
    context.fillStyle = color || '#AAAAAA';
    context.fill();
    // Finally, set the grid background image of the paper container element.
    var gridBackgroundImage = canvas[0].toDataURL('image/png');
    paper.$el.css('background-image', 'url("' + gridBackgroundImage + '")');
}   // Source: http://stackoverflow.com/questions/34577581/how-to-enable-draw-grid-lines-for-jointjs-graph

var notify = function(text, type) {
    $.notify(text, {globalPosition: 'top right', className: type || 'error', autoHide: true, autoHideDelay: 5000, showAnimation: 'fadeIn', hideAnimation: 'fadeOut'});
}


var multiInputValueSamePort = [ JOINER ];
var multiOutputValueSamePort = [ SMC ];

var hasMultiInputValuesSamePort = function(cell) {
    return _.indexOf(multiInputValueSamePort, cell.attributes.type) > -1;
}

var hasMultiOutputValuesSamePort = function(cell) {
    return _.indexOf(multiOutputValueSamePort, cell.attributes.type) > -1;
}


var setLabel = function(link, label, index, optionalPos) {
    var pos = optionalPos === undefined ? 0.5 : optionalPos;
    link.label(index, { position: pos, attrs: { text: { text: label, fill: 'white', 'font-family': 'sans-serif' }, rect: { fill: 'black', stroke: 'black', 'stroke-width': 8, rx: 0, ry: 0 } }});
}

var hasNoLabel = function(cell, pos) {
    return cell.attributes.labels === undefined || _.findWhere(cell.attributes.labels, {position: pos}) === undefined;
}

var nextLabelIndex = function(cell, pos) {
    if (cell.attributes.labels === undefined) return 0;
    var i = _.findIndex(cell.attributes.labels, { position: pos});
    return (i === -1) ? cell.attributes.labels.length : i;
}


var file,reader,graphJSON;

function handleFileSelect(evt) {
    if (typeof window.FileReader !== 'function') {
        alert("This browser doesn't support file API.");
        return;
    }
    file = evt.target.files[0]; // FileList object
    reader = new FileReader();
    reader.onload = (function(theFile) {
        return function(e) {
            graphJSON = JSON.parse(e.target.result);
        };
    })(file);
    reader.readAsText(file);
}

function saveGraph(btn) {
    var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rgraph.toJSON()));
    btn.setAttribute("href", "data:" + data);
    btn.setAttribute("download", "my_circuit.json");
}

function loadGraph() {
    if (graphJSON === undefined) { 
        alert("Please select a file first!");
        return; 
    }
    try {
        rgraph.fromJSON(graphJSON);
        notify("Successfully loaded!", 'success');
    } catch (err) {
        console.error(err);
        notify("Error: The saved file is from an older version. The circuit might not work as expected!");
    }
    
}

function clearGraph() {
    if (simulateOn) $("#resetBtn").click();
    rgraph.clear();
    notify("Cleared!", 'success');
}

document.getElementById('files').addEventListener('change', handleFileSelect, false);
$("#version").html(VERSION);
