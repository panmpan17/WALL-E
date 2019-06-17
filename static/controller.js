// Constant varible
ARROWUP = "ArrowUp";
ARROWDOWN = "ArrowDown";
ARROWLEFT = "ArrowLeft";
ARROWRIGHT = "ArrowRight";

JOYSTICKUP = "JoystickUp";
JOYSTICKDOWN = "JoystickDown";
JOYSTICKLEFT = "JoystickLeft";
JOYSTICKRIGHT = "JoystickRight";

var Controller = function(data) {
	var self = this;

	this.keyinterval = data.keyinterval;
	this.eventbind = data.eventbind;
	this.key_index = {};
	this.joystick = null;

	this.key_press_interval = null;
	this.key_last_press = new Date().getTime();

	$.each(data.keybind, function(func, keys) {
		$.each(keys, function(_, key) {
			self.key_index[key] = func;
		});
	});

	// Add key listener
	if (data.keyboard) {
		window.addEventListener("keydown", function(event) {
			var now = new Date().getTime();
			var key = event.key;
			// console.log(self.key_press_interval == null,((now - self.key_last_press) > this.keyinterval))
			if (self.key_press_interval == null && ((now - self.key_last_press) > self.keyinterval)) {

				// Check key in keybind
				if (self.key_index[key] != undefined) {

					self.key_last_press = now;
					self.eventbind(self.key_index[key]);

					self.key_press_interval = setInterval(function() {
						self.key_last_press = new Date().getTime();
						self.eventbind(self.key_index[key]);
					}, self.keyinterval);
				}
			}
		});

		window.addEventListener("keyup",function() {
			clearInterval(self.key_press_interval);
			self.key_press_interval = null;
		});
	}

	// Add joystick
	if (data.joystick) {
		self.joystick = new Joystick({
			key_index: self.key_index,
			position: "downleft",
			size: 70,
			eventbind: self.eventbind,
		});
	}

	this.bindStage = function(stage)  {
		if (self.joystick != null) {
			self.joystick.bindStage(stage);
		}
	}
}

var Joystick = function(data) {
	var self = this;

	// Joystick information
	this.key_index = data.key_index;
	this.position = data.position;
	this.size = data.size;
	this.base_shape = new createjs.Shape();
	this.trigger_shape = new createjs.Shape();

	this.dragging_trigger = false;

	// Joystick position
	if (this.position == "topleft") {
		this.pos = {x: 15, y: 15};
	}
	else if (this.position == "downleft") {
		this.pos = {x: 15, y: $(document).height() - this.size * 2 - 15};
	}
	else if (this.position == "topright") {
		this.pos = {x: $(document).width() - this.size * 2 - 15, y: 15};
	}
	else if (this.position == "downright") {
		this.pos = {x: $(document).width() - this.size * 2 - 15,
			y: $(document).height() - this.size * 2 - 15};
	}
	else {
		this.pos = {x: 0, y: 0};
	}

	// Event trigger control varible
	this.eventbind = data.eventbind;
	this.interval = null;
	this.last_pressed = new Date().getTime();

	// Add Shape
	this.base_shape = new createjs.Shape();
	this.base_shape.graphics.beginFill("#30353a").drawCircle(0, 0, this.size);
	this.base_shape.x = this.pos.x + this.size;
	this.base_shape.y = this.pos.y + this.size;

	this.trigger_shape.graphics.beginFill("#576f87").drawCircle(0, 0, this.size * 0.4);
	self.trigger_shape.x = self.pos.x + self.size;
	self.trigger_shape.y = self.pos.y + self.size;

	// Add mouse listener
	// 
	this.trigger_shape.addEventListener("mousedown", function(event) {
		self.dragging_trigger = true;
	});

	stage.addEventListener("pressmove", function(event) {
		if (!self.dragging_trigger) {
			return;
		}
		resault = (function(event) {
				var relative_x = event.stageX - self.pos.x - self.size;
				var relative_y = event.stageY - self.pos.y - self.size;
		
				// Check if position of mouse too far
				if (Math.abs(relative_x) < self.size * 3 && Math.abs(relative_y) < self.size * 3) {
					if (Math.abs(relative_x) > Math.abs(relative_y)) {
						if (relative_x >= self.size * 0.4) {
							self.trigger_shape.x = self.pos.x + (self.size * 1.5);
							self.trigger_shape.y = self.pos.y + self.size;
							return JOYSTICKRIGHT;
						}
						else if (relative_x <= self.size * -0.4) {
							self.trigger_shape.x = self.pos.x + self.size * 0.5;
							self.trigger_shape.y = self.pos.y + self.size;
							return JOYSTICKLEFT;
						}
					}
					else {
						if (relative_y >= self.size * 0.4) {
							self.trigger_shape.x = self.pos.x + self.size;
							self.trigger_shape.y = self.pos.y + self.size * 1.5;
							return JOYSTICKDOWN;
						}
						else if (relative_y <= self.size * -0.4) {
							self.trigger_shape.x = self.pos.x + self.size;
							self.trigger_shape.y = self.pos.y + self.size * 0.5;
							return JOYSTICKUP;
						}
					}
				}
				self.trigger_shape.x = self.pos.x + self.size;
				self.trigger_shape.y = self.pos.y + self.size;
			})(event);

		// Check joystick is in keybind
		if (self.key_index[resault] != undefined) {
			var now = new Date().getTime();
			if (self.interval == null && (now - self.last_pressed) > 175) {
				self.last_pressed = now;
				self.eventbind(self.key_index[resault]);

				self.interval = setInterval(function() {
					self.last_pressed = new Date().getTime();
					self.eventbind(self.key_index[resault]);
				}, 175);
			}
		}
	});

	stage.mouseMoveOutside = true;
	stage.on("stagemouseup", function(event) {
		self.trigger_shape.x = self.pos.x + self.size;
		self.trigger_shape.y = self.pos.y + self.size;
		clearInterval(self.interval);
		self.interval = null;
		self.dragging_trigger = false;
	});

	// Bind joystick to stage
	this.bindStage = function(stage) {
		stage.addChild(self.base_shape);
		stage.addChild(self.trigger_shape);
	}
}