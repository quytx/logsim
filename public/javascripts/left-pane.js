var lgraph = new joint.dia.Graph();

var lpaper = new joint.dia.Paper({
    el: $('#left-col'),
    model: lgraph,
    width: 300, height: 1000, gridSize: 5,
    snapLinks: false,
    linkPinning: false,
    interactive: false,
    validateMagnet: function(cellView, magnet) {
        return false;   // disable linking in left panel
    }
});

// zoom the viewport by 20%
lpaper.scale(1.2,1.2);

var defaultX = 25;
var defaultXr = 155;
var defaultY = 30;
var gapY = 55;

// Default gates
var lgates = {
    // repeater: new joint.shapes.logic.Repeater({ position: { x: 410, y: 25 }}),
    
    // Input and output
    input: new joint.shapes.logic.Input({ position: { x: defaultX, y: defaultY }}),
    inputlow: new joint.shapes.logic.InputLow({ position: { x: defaultX, y: defaultY + 1 * gapY }}),
    output: new joint.shapes.logic.Output({ position: { x: defaultXr + 28, y: defaultY }}),

    // Logic gates
    not: new joint.shapes.logic.Not({ position: { x: defaultX, y: defaultY + 2 * gapY }}),
    dff: new joint.shapes.logic.Dff({ position: { x: defaultXr, y: defaultY + 2 * gapY }}),
    dffb: new joint.shapes.logic.DffB({ position: { x: defaultXr, y: defaultY + 1 * gapY }}),
    and: new joint.shapes.logic.And({ position: { x: defaultX, y: defaultY + 3 * gapY }}),
    nand: new joint.shapes.logic.Nand({ position: { x: defaultXr, y: defaultY + 3 * gapY }}),
    or: new joint.shapes.logic.Or({ position: { x: defaultX, y: defaultY + 4 * gapY }}),
    nor: new joint.shapes.logic.Nor({ position: { x: defaultXr, y: defaultY + 4 * gapY }}),
    xor: new joint.shapes.logic.Xor({ position: { x: defaultX, y: defaultY + 5 * gapY }}),
    xnor: new joint.shapes.logic.Xnor({ position: { x: defaultXr, y: defaultY + 5 * gapY }}),
    mux21: new joint.shapes.logic.Mux21({ position: { x: defaultX, y: defaultY + 6 * gapY }}),
    mux21b: new joint.shapes.logic.Mux21B({ position: { x: defaultXr, y: defaultY + 6 * gapY }}),
    joiner: new joint.shapes.logic.Joiner({ position: { x: defaultX, y: defaultY + 7 * gapY }}),
    splitter: new joint.shapes.logic.Splitter({ position: { x: defaultXr, y: defaultY + 7 * gapY }}),
    alu: new joint.shapes.logic.ALU({ position: { x: defaultX, y: defaultY + 8 * gapY }}),
    smc: new joint.shapes.logic.SMC({ position: { x: defaultXr, y: defaultY + 8 * gapY }}),
    reg: new joint.shapes.logic.Register({ position: { x: defaultXr, y: defaultY + 9 * gapY }}),

    pm: new joint.shapes.logic.PM({ position: { x: defaultXr, y: defaultY + 10 * gapY + 10 }}),
    rf: new joint.shapes.logic.RF({ position: { x: defaultXr, y: defaultY + 11 * gapY + 10 }}),
    ram: new joint.shapes.logic.RAM({ position: { x: defaultX, y: defaultY + 11 * gapY + 10 }}),
    
    seqin: new joint.shapes.logic.SeqIn({ position: { x: defaultX, y: defaultY + 13 * gapY }}),
    counter: new joint.shapes.logic.Counter({ position: { x: defaultX + 28, y: defaultY + 14 * gapY }})
    // More gates here (remember to add to helper.js as well)

};

var selectedGate;
var highlightedCell;


var resetLeftPane = function(cells) {
    lgraph.resetCells(_.toArray(cells));
}

// add gates and wires to the lgraph
resetLeftPane(lgates);

lpaper.on('cell:pointerdown', function(cellView, evt, x, y) { 
    // addGate(rgraph, cellView.model.attributes.type, 50, 50);
    if (highlightedCell !== undefined) highlightedCell.unhighlight();
    cellView.highlight();
    highlightedCell = cellView;
    selectedGate = cellView.model.attributes.type;
})



