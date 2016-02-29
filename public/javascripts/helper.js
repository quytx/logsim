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
        case "logic.Dff":
            newGate = new joint.shapes.logic.Dff({ position: { x: xpos, y: ypos}});
            newGate.outQ = undefined;
            newGate.clk = 0;
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
    $.notify(text, {globalPosition: 'top right', className: type || 'error', autoHide: true, autoHideDelay: 8000, showAnimation: 'fadeIn', hideAnimation: 'fadeOut'});
}

var busInputGates = ['logic.Mux21_16', 'logic.Splitter'];
var busOutputGates = ['logic.Mux21_16', 'logic.Joiner'];
var multiInputGates = ['logic.Joiner'];

var hasBusInput = function(cv) {
    return _.indexOf(busInputGates, cv.model.attributes.type) > -1;
}

var hasBusOutput = function(cv) {
    return _.indexOf(busOutputGates, cv.model.attributes.type) > -1;
}

var hasMultiInput = function(cv) {
    return _.indexOf(multiInputGates, cv.model.attributes.type) > -1;
}

var setLabel = function(link, label) {
    link.label(0, { position: 0.5, attrs: { text: { text: label, fill: 'white', 'font-family': 'sans-serif' }, rect: { stroke: 'black', 'stroke-width': 10, rx: 0, ry: 0 } }});
}



