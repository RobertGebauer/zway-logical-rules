/*** LogicalRules2 Z-Way HA module *******************************************

Forked from LogicalRules out of https://github.com/Z-Wave-Me/home-automation.

******************************************************************************/

function LogicalRules2(id, controller) {
	LogicalRules2.super_.call(this, id, controller);

	this.subscribedDevices = [];

	this._testRule = _.bind(function () {
		this.testRule();
	}, this);
}

inherits(LogicalRules2, AutomationModule);
_module = LogicalRules2;

LogicalRules2.prototype.init = function (config) {
	LogicalRules2.super_.prototype.init.call(this, config);

	this.config.tests.forEach(_.bind(function (test) {
		if (test.testType === "binary") {
			this.subscribeToDeviceChanges(test.testBinary, true);
		} else if (test.testType === "multilevel") {
			this.subscribeToDeviceChanges(test.testMultilevel, true);
		} else if (test.testType === "remote") {
			this.subscribeToDeviceChanges(test.testRemote, true);
		} else if (test.testType === "sensorDiscrete") {
			this.subscribeToDeviceChanges(test.testSensorDiscrete, true);
		} else if (test.testType === "time") {
			this.subscribeToDeviceChanges(test.testTime, true);
		} else if (test.testType === "nested") {
			test.testNested.tests.forEach(function (xtest) {
				if (xtest.testType === "binary") {
					this.subscribeToDeviceChanges(xtest.testBinary, true);
				} else if (xtest.testType === "multilevel") {
					this.subscribeToDeviceChanges(xtest.testMultilevel, true);
				} else if (xtest.testType === "remote") {
					this.subscribeToDeviceChanges(xtest.testRemote, true);
				} else if (xtest.testType === "sensorDiscrete") {
					this.subscribeToDeviceChanges(xtest.testSensorDiscrete, true);
				} else if (xtest.testType === "time") {
					this.subscribeToDeviceChanges(xtest.testTime, true);
				}
			});
		}
	}, this));
};

LogicalRules2.prototype.stop = function () {
	var self = this;

	this.config.tests.forEach(function (test) {
		if (test.testType === "binary") {
			self.unsubscribeToDeviceChanges(test.testBinary);
		} else if (test.testType === "multilevel") {
			self.unsubscribeToDeviceChanges(test.testMultilevel);
		} else if (test.testType === "remote") {
			self.unsubscribeToDeviceChanges(test.testRemote);
		} else if (test.testType === "sensorDiscrete") {
			self.unsubscribeToDeviceChanges(test.testSensorDiscrete);
		} else if (test.testType === "time") {
			self.unsubscribeToDeviceChanges(test.testTime);
		} else if (test.testType === "nested") {
			test.testNested.tests.forEach(function (xtest) {
				if (xtest.testType === "binary") {
					self.unsubscribeToDeviceChanges(xtest.testBinary);
				} else if (xtest.testType === "multilevel") {
					self.unsubscribeToDeviceChanges(xtest.testMultilevel);
				} else if (xtest.testType === "remote") {
					self.unsubscribeToDeviceChanges(xtest.testRemote);
				} else if (xtest.testType === "sensorDiscrete") {
					self.unsubscribeToDeviceChanges(xtest.testSensorDiscrete);
				} else if (xtest.testType === "time") {
					self.unsubscribeToDeviceChanges(xtest.testTime);
				}
			});
		}
	});

	this.subscribedDevices = [];

	LogicalRules2.super_.prototype.stop.call(this);
};

LogicalRules2.prototype.subscribeToDeviceChanges = function (test) {
	if (!!!test.triggerRuleCheckOnChange) {
		// should be listened to changes but the user does not want to trigger rule check by this device
		return;
	}

	if (this.subscribedDevices.indexOf(test.device) === -1) {
		this.subscribedDevices.push(test.device);
		this.controller.devices.on(test.device, "change:metrics:level", this._testRule);
		this.controller.devices.on(test.device, "change:metrics:change", this._testRule);
	}
};

LogicalRules2.prototype.unsubscribeToDeviceChanges = function (test) {
	this.controller.devices.off(test.device, "change:metrics:level", this._testRule);
	this.controller.devices.off(test.device, "change:metrics:change", this._testRule);
};

LogicalRules2.prototype.testRule = function (tree) {
	var res = null,
		topLevel = !tree,
		self = this,
		langFile = self.loadModuleLang();

	if (!tree) {
		tree = this.config;
	}

	if (tree.logicalOperator === "and") {
		res = true;

		tree.tests.forEach(function (test) {
			if (test.testType === "multilevel") {
				res = res && self.op(self.controller.devices.get(test.testMultilevel.device).get("metrics:level"), test.testMultilevel.testOperator, test.testMultilevel.testValue);
			} else if (test.testType === "binary") {
				res = res && (self.controller.devices.get(test.testBinary.device).get("metrics:level") === test.testBinary.testValue);
			} else if (test.testType === "remote") {
				var dev = self.controller.devices.get(test.testRemote.device);
				res = res && ((_.contains(["on", "off"], test.testRemote.testValue) && dev.get("metrics:level") === test.testRemote.testValue) || (_.contains(["upstart", "upstop", "downstart", "downstop"], test.testRemote.testValue) && dev.get("metrics:change") === test.testRemote.testValue));
			} else if (test.testType === "sensorDiscrete") {
				res = res && (self.controller.devices.get(test.testSensorDiscrete.device).get("metrics:level") === test.testSensorDiscrete.testValue);
			} else if (test.testType === "time") {
				var curTime = new Date(),
					time_arr = test.testTime.testValue.split(":").map(function (x) { return parseInt(x, 10); });
				res = res && self.op(curTime.getHours() * 60 + curTime.getMinutes(), test.testTime.testOperator, time_arr[0] * 60 + time_arr[1]);
			} else if (test.testType === "nested") {
				res = res && self.testRule(test.testNested);
			}
		});
	} else if (tree.logicalOperator === "or") {
		res = false;

		tree.tests.forEach(function (test) {
			if (test.testType === "multilevel") {
				res = res || self.op(self.controller.devices.get(test.testMultilevel.device).get("metrics:level"), test.testMultilevel.testOperator, test.testMultilevel.testValue);
			} else if (test.testType === "binary") {
				res = res || (self.controller.devices.get(test.testBinary.device).get("metrics:level") === test.testBinary.testValue);
			} else if (test.testType === "remote") {
				var dev = self.controller.devices.get(test.testRemote.device);
				res = res || ((_.contains(["on", "off"], test.testRemote.testValue) && dev.get("metrics:level") === test.testRemote.testValue) || (_.contains(["upstart", "upstop", "downstart", "downstop"], test.testRemote.testValue) && dev.get("metrics:change") === test.testRemote.testValue));
			} else if (test.testType === "sensorDiscrete") {
				res = res || (self.controller.devices.get(test.testSensorDiscrete.device).get("metrics:level") === test.testSensorDiscrete.testValue);
			} else if (test.testType === "time") {
				var curTime = new Date(),
					time_arr = test.testTime.testValue.split(":").map(function (x) { return parseInt(x, 10); });
				res = res || self.op(curTime.getHours() * 60 + curTime.getMinutes(), test.testTime.testOperator, time_arr[0] * 60 + time_arr[1]);
			} else if (test.testType === "nested") {
				res = res || self.testRule(test.testNested);
			}
		});
	} else if (tree.logicalOperator === " none") {
		self.controller.addNotification("error", langFile.WrongOperator, "module", "LogicalRules2");
	}

	if (topLevel && res) {
		tree.action.switches && tree.action.switches.forEach(function (devState) {
			var vDev = self.controller.devices.get(devState.device);
			if (vDev) {
				if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") !== devState.status)) {
					vDev.performCommand(devState.status);
				}
			}
		});
		tree.action.dimmers && tree.action.dimmers.forEach(function (devState) {
			var vDev = self.controller.devices.get(devState.device);
			if (vDev) {
				if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") !== devState.status)) {
					vDev.performCommand("exact", { level: devState.status });
				}
			}
		});
		tree.action.thermostats && tree.action.thermostats.forEach(function (devState) {
			var vDev = self.controller.devices.get(devState.device);
			if (vDev) {
				if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") !== devState.status)) {
					vDev.performCommand("exact", { level: devState.status });
				}
			}
		});
		tree.action.locks && tree.action.locks.forEach(function (devState) {
			var vDev = self.controller.devices.get(devState.device);
			if (vDev) {
				if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") !== devState.status)) {
					vDev.performCommand(devState.status);
				}
			}
		});
		tree.action.scenes && tree.action.scenes.forEach(function (scene) {
			var vDev = self.controller.devices.get(scene);
			if (vDev) {
				vDev.performCommand("on");
			}
		});
	}

	return res;
};

LogicalRules2.prototype.op = function (dval, op, val) {
	if (op === "=") {
		return dval === val;
	} else if (op === "!=") {
		return dval !== val;
	} else if (op === ">") {
		return dval > val;
	} else if (op === "<") {
		return dval < val;
	} else if (op === ">=") {
		return dval >= val;
	} else if (op === "<=") {
		return dval <= val;
	}

	return null; // error!!  
};
