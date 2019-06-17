var BOXCOLORS = [
	"Tomato",
	"YellowGreen",
	"SlateBlue",
	"SkyBlue",
	"Salmon",
	"Plum",
	"OrangeRed",
	"Coral",
	"LightSeaGreen",
	"DodgerBlue",
	"CornflowerBlue",
]

var Scene = function(data) {
	var self = this;

	this.start = data.buho.pos;
	this.map = data.map;

	this.shape = new createjs.Shape();
	this.shape.graphics.beginFill("gray");

	// Set scene position to center
	this.shape.x = ($(window).width() / 2) - (this.start.x * 50) - 25;
	this.shape.y = ($(window).height() / 2) - (this.start.y * 50) - 25;

	this.boxes = [];
	this.buho = new Buho(data.buho);
	this.exit = new ExitDoor({
		pos: data.exit.pos,
		arc_num: data.boxes.length,
		canvasPos: (function(pos) { // Translate map pos to canvas pos
			return {x: self.shape.x + (pos.x * 50) + 25, y: self.shape.y + (pos.y * 50) + 25};
		})(data.exit.pos),
	});

	// Set up map image
	var y = 0;
	$.each(this.map, function(_, row) {
		var x = 0;
		$.each(row.split(""), function(_, block) {
			if (block == "w") {
				self.shape.graphics.drawRect(x, y, 50, 50);
			}
			x += 50;
		});
		y += 50;
	});

	// Set up boxes
	var boxes_colors = random.sample(BOXCOLORS, data.boxes.length);
	$.each(data.boxes, function(i, box) {
		self.boxes.push(new PointBox({
			pos: box,
			color: boxes_colors[i],
			canvasPos: (function(pos) { // Translate map pos to canvas pos
				return {x: self.shape.x + (pos.x * 50) + 25, y: self.shape.y + (pos.y * 50) + 25};
			})(box),
		}));
	})

	// Bind stage to this scene and boxes
	this.bindStage = function(stage) {
		stage.addChild(self.shape);
		self.buho.bindStage(stage);
		self.exit.bindStage(stage);

		$.each(self.boxes, function(_, box) {
			box.bindStage(stage);
		})
	}

	// Set up scene, buho, boxes layer
	this.setUpLayer = function(stage) {
		stage.setChildIndex(self.buho.shape, 0);

		$.each(self.boxes, function(_, box) {
			stage.setChildIndex(box.shape, 5);
		})

		stage.setChildIndex(self.shape, 10);
	}

	// Moving buho
	// buho need to change to right direction before moving
	this.buhoMove = function(vect) {
		// 
		if (!self.buho.rotate(vect)) {
			var pos = Object.assign({}, self.buho.pos);
			pos.x += vect.x;
			pos.y += vect.y;

			if (self.checkBlock(pos)) {
				self.buho.pos.x += vect.x;
				self.buho.pos.y += vect.y;
				
				// Move scene
				createjs.Tween.get(self.shape).to({
					x: self.shape.x + vect.x * -50,
					y: self.shape.y + vect.y * -50,
				}, 150);

				createjs.Tween.get(self.exit.shape).to({
					x: self.exit.shape.x + ((vect.x * -1) * 50),
					y: self.exit.shape.y + ((vect.y * -1) * 50),
				}, 150);

				// Move PointBox
				$.each(self.boxes, function(_, box) {
					if (!box.been_carried) {;
						createjs.Tween.get(box.shape).to({
							x: box.shape.x + ((vect.x * -1) * 50),
							y: box.shape.y + ((vect.y * -1) * 50),
						}, 150);
					}
				});
			}
		}
	}

	// If buho facing a box and have nothing on its back, it can grab the box
	this.buhoGrabRelease = function() {
		facing_block = self.buho.getFacing();
		if (self.buho.carry == null) {
			$.each(self.boxes, function(i, box) {
				if (box.pos.x == facing_block.x && box.pos.y == facing_block.y) {
					self.buho.carry = i;
					box.been_carried = true;

					// Carry the box with animation
					box.pos = self.buho.pos;
					createjs.Tween.get(box.shape).to({
						x: self.buho.shape.x,
						y: self.buho.shape.y
					}, 150);
				}
			});
		}

		else {
			// Check is there place infront of buho
			if (self.map[facing_block.y][facing_block.x] == "-") {
				var breaked = false;
				$.each(self.boxes, function(i, box) {
					if (box.pos.x == facing_block.x && box.pos.y == facing_block.y) {
						breaked = true;
						return false;
					}
				});

				// Put down box if there's no box infront
				if (!breaked) {
					var box_index = self.buho.carry;
					var box = self.boxes[box_index];
					self.buho.carry = null;

					box.been_carried = false;
					box.pos = facing_block;

					// Put the box down with animation
					createjs.Tween.get(box.shape).to({
						x: self.buho.shape.x + (self.buho.direction.x * 50),
						y: self.buho.shape.y + (self.buho.direction.y * 50)
					}, 150);

					if (self.exit.pos.x == box.pos.x && self.exit.pos.y == box.pos.y) {
						self.exit.throwBox(box);
						self.boxes.pop(box_index);
						return {removedChild: box};
					}
				}
			}
		}
		return {};
	}

	// Check the block is avalible
	this.checkBlock = function(pos) {
		// Check map overlap
		if (self.map[pos.y][pos.x] != "w") {
			var breaked = false

			// Check PointBox overlap
			$.each(self.boxes, function(_, box) {
				if (box.pos.x == pos.x && box.pos.y == pos.y) {
					breaked = true;
					return false;
				}
			})

			if (!breaked) {return true}
		}
		return false;
	}

	this.appear = function(delay=150, duration=2000) {
		if (delay == 0 && duration == 0) {
			self.shape.alpha = 1;
			self.buho.shape.alpha = 1;
			self.exit.shape.alpha = 1;

			$.each(self.boxes, function(_, box) {
				box.shape.alpha = 1;
			});
		}
		else {
			createjs.Tween.get(self.shape).wait(delay).to({alpha: 1}, duration);
			createjs.Tween.get(self.buho.shape).wait(delay).to({alpha: 1}, duration);
			createjs.Tween.get(self.exit.shape).wait(delay).to({alpha: 1}, duration);

			$.each(self.boxes, function(_, box) {
				createjs.Tween.get(box.shape).wait(delay).to({alpha: 1}, duration);
			});
		}
	}

	// If buho touch enter exit and exit are open, then hide every shape
	this.disappear = function(delay=150, duration=2000) {
		if (delay == 0 && duration == 0) {
			self.shape.alpha = 0;
			self.buho.shape.alpha = 0;
			self.exit.shape.alpha = 0;

			$.each(self.boxes, function(_, box) {
				box.shape.alpha = 0;
			});
		}
		else {
			createjs.Tween.get(self.shape).wait(delay).to({alpha: 0}, duration);
			createjs.Tween.get(self.buho.shape).wait(delay).to({alpha: 0}, duration);
			createjs.Tween.get(self.exit.shape).wait(delay).to({alpha: 0}, duration);

			$.each(self.boxes, function(_, box) {
				createjs.Tween.get(box.shape).wait(delay).to({alpha: 0}, duration);
			});
		}
	}

	// Remove all of the shape from stage
	// CAN'T BE UNDO
	this.removeFromStage = function(stage) {
		stage.removeChild(self.shape);
		stage.removeChild(self.buho.shape);
		stage.removeChild(self.exit.shape);

		$.each(self.boxes, function(_, box) {
			stage.removeChild(box.shape);
		});
	}
}

var Buho = function(data) {
	var self = this;

	this.direction = data.direction;
	this.carry = null;
	this.pos = data.pos;

	// Add shaoe
	self.shape = new createjs.Shape();
	self.shape.graphics.beginFill("rgb(52, 61, 70)").drawRect(0, 0, 50, 50);
	self.shape.graphics.beginFill("white").drawRect(5, 5, 40, 40).drawRect(12, 40, 5, 10).drawRect(33, 40, 5, 10);

	self.shape.x = ($(document).width() / 2);
	self.shape.y = ($(document).height() / 2);
	self.shape.regX = self.shape.regY = 25;

	this.bindStage = function(stage) {
		stage.addChild(self.shape);
	}


	// Rotate buho
	this.rotate = function(direction) {
		// console.log(direction.x != self.direction.y || direction.y != self.direction.y)
		if (direction.x != self.direction.x || direction.y != self.direction.y) {
			self.direction.x = direction.x;
			self.direction.y = direction.y;

			var angle;
			if (direction.x != 0) {
				angle = (direction.x + 1) * 90 + 90;
			}
			else {
				angle = (1 - direction.y) * 90;
			}
			self.shape.rotation = angle

			return true;
		}
		return false;
	}

	// Get the block pos what buho is facing
	this.getFacing = function() {
		return {x: self.pos.x + self.direction.x, y: self.pos.y + self.direction.y};
	}
}

var ExitDoor = function(data) {
	var self = this;

	this.opened = false;
	this.arc_num = data.arc_num;
	this.arc_finished = 0;
	this.pos = data.pos;

	// Add shape
	this.shape = new createjs.Shape();
	this.shape.graphics.setStrokeStyle(6);

	// Add arc peice
	var arc_size = (Math.PI * 2) / data.arc_num / 2;
	var arc_visible = false;
	for (var arc_start=0;arc_start<(Math.PI * 2);arc_start+=arc_size) {
		if (arc_visible) {
			this.shape.graphics.beginStroke("white").arc(25, 25, 19, arc_start, arc_start + arc_size, 0);
			arc_visible = false;
		}
		else {
			arc_visible = true;
		}
	}

	// this.shape.filters = [
	// 	new createjs.ColorFilter(1,1,1,.5)
	// ];
	// this.shape.cache(0, 0, 100, 100);

	this.shape.regX = this.shape.regY = 25
	this.shape.x = data.canvasPos.x;
	this.shape.y = data.canvasPos.y;

	// Add animation
	createjs.Tween.get(this.shape, {loop: true}).to(
		{rotation:0}).to({rotation:50}, 700).to({rotation:40}, 720).to(
		{rotation:120}, 350).to({rotation:170}, 700).to({rotation:160}, 720).to(
		{rotation:240}, 350).to({rotation:290}, 700).to({rotation:280}, 720).to({rotation:360}, 350);


	this.bindStage = function(stage) {
		stage.addChild(self.shape);
	}

	this.throwBox = function(box) {
		$.each(self.shape.graphics._instructions, function(_, instruction) {
			if (instruction.style == "white") {
				instruction.style = box.color;
				self.arc_finished += 1;
				return false;
			}
		});

		if (self.arc_finished == self.arc_num) {
			self.opened = true;
		}
	}
}

var PointBox = function(data) {
	var self = this;

	this.pos = data.pos;
	this.been_carried = false;
	this.color = data.color;

	// Add shape
	this.shape = new createjs.Shape();
	this.shape.graphics.beginFill(data.color).drawRect(10, 10, 30, 30);

	this.shape.x = data.canvasPos.x;
	this.shape.y = data.canvasPos.y;
	this.shape.regX = this.shape.regY = 25;

	// Add animation
	createjs.Tween.get(this.shape, {loop: true}).to({rotation: 0}).to({
		rotation: 180, rotationDir: -1}, 3000).to({rotation: 360, rotationDir: -1}, 3000);

	// Bind stage to this scene and boxes
	this.bindStage = function(stage) {
		stage.addChild(self.shape);
	}
}