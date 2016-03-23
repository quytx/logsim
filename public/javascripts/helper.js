// Add a new gate to the graph when a certain type of gate is clicked
var addGate = function(graph, type, xpos, ypos) {
    var newGate;
    switch(type) {
        case "logic.Input":
            newGate = new joint.shapes.logic.Input({ position: { x: xpos, y: ypos}});
            break;
        case "logic.Output":
            newGate = new joint.shapes.logic.Output({ position: { x: xpos, y: ypos}});
            break;
        case "logic.And":
            newGate = new joint.shapes.logic.And({ position: { x: xpos, y: ypos}});
            break;    
        case "logic.Or":
            newGate = new joint.shapes.logic.Or({ position: { x: xpos, y: ypos}});
            break;    
        case "logic.Not":
            newGate = new joint.shapes.logic.Not({ position: { x: xpos, y: ypos}});
            break;    
        case "logic.Nand":
            newGate = new joint.shapes.logic.Nand({ position: { x: xpos, y: ypos}});
            break;    
        case "logic.Nor":
            newGate = new joint.shapes.logic.Nor({ position: { x: xpos, y: ypos}});
            break;    
        case "logic.Xor":
            newGate = new joint.shapes.logic.Xor({ position: { x: xpos, y: ypos}});
            break;    
        case "logic.Xnor":
            newGate = new joint.shapes.logic.Xnor({ position: { x: xpos, y: ypos}});
            break;
        case "logic.Mux21":
            newGate = new joint.shapes.logic.Mux21({ position: { x: xpos, y: ypos}});
            break;  
        case "logic.Mux21_16":
            newGate = new joint.shapes.logic.Mux21_16({ position: { x: xpos, y: ypos}});
            break;
        case "logic.Splitter":
            newGate = new joint.shapes.logic.Splitter({ position: { x: xpos, y: ypos}});
            break;  
        case "logic.Joiner":
            newGate = new joint.shapes.logic.Joiner({ position: { x: xpos, y: ypos}});
            break;
        case "logic.SMC":
            newGate = new joint.shapes.logic.SMC({ position: { x: xpos, y: ypos}});
            break;
        case "logic.Register":
            newGate = new joint.shapes.logic.Register({ position: { x: xpos, y: ypos}});
            break;      
        // case "logic.rect":
        //     newGate = new joint.shapes.logic.rect({ position: { x: xpos, y: ypos}});
        //     break;                      
        case "logic.Dff":
            newGate = new joint.shapes.logic.Dff({ position: { x: xpos, y: ypos}});
            newGate.outQ = undefined;
            newGate.clk = 0;
            newGate.reset = function() {
                newGate.outQ = undefined;
                newGate.clk = 0;
            }
            newGate.nextTimeStep = function() {
                var wireIn = rgraph.getConnectedLinks(newGate, { inbound: true });
                if (wireIn.length > 0) {
                    var inD = wireIn[0].get('signal'); // current input signal
                    if (newGate.clk === 0) {
                        newGate.clk = 1;
                        newGate.outQ = (inD === 1) ? true : false;
                    } else {
                        newGate.clk = 0;
                    }
                }
                
                // console.log(newGate);
            }
            newGate.operation = function(input) {
                return newGate.outQ;
            }

            break;           
        default:
            break;
    }
    graph.addCell(newGate);
}

var notify = function(text, type) {
    $.notify(text, {globalPosition: 'top right', className: type || 'error', autoHide: true, autoHideDelay: 5000, showAnimation: 'fadeIn', hideAnimation: 'fadeOut'});
}

var WIRE = 'logic.Wire';
var BUS = 'logic.Bus';
var SPLITTER = 'logic.Splitter';
var JOINER = 'logic.Joiner';
var SMC = 'logic.SMC';
var REG = 'logic.Register';

var busInputGates = ['logic.Mux21_16', 'logic.Splitter', 'logic.SMC', 'logic.Register'];
var busOutputGates = ['logic.Mux21_16', 'logic.Joiner', 'logic.SMC', 'logic.Register'];
var multiInputGates = ['logic.Joiner'];
var multiOutputValue = ['logic.SMC'];
var mixInputTypes = ['logic.Register'];

var hasBusInput = function(cell) {
    return _.indexOf(busInputGates, cell.attributes.type) > -1;
}

var hasBusOutput = function(cell) {
    return _.indexOf(busOutputGates, cell.attributes.type) > -1;
}

var hasMultiInput = function(cell) {
    return _.indexOf(multiInputGates, cell.attributes.type) > -1;
}

var hasMultiOutputValues = function(cell) {
    return _.indexOf(multiOutputValue, cell.attributes.type) > -1;
}

var hasMixInput = function(cell) {
    return _.indexOf(mixInputTypes, cell.attributes.type) > -1;
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

// Helper Function to label SMC output wires
//var labelSMC = function(smcCell) 

// Source: http://stackoverflow.com/questions/34577581/how-to-enable-draw-grid-lines-for-jointjs-graph
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
}

function setError(gate, text) {
    gate.set('errMsg', text);
}

function clearError(gate) {
    gate.unset('errMsg');
}



