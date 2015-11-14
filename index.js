var tessel = require('tessel');
var blelib = require('ble-ble113a');
var encoding = require('eddystone-url-encoding');

var ble = blelib.use(tessel.port['A']);

var readyCB = function(err) {
	console.log('Scanning...');
	ble.startScanning();
};

ble.on('ready', readyCB);

ble.on('discover', function(peripheral) {
	console.log("Discovered peripheral!", peripheral.toString());
	var uuid = getUUID(peripheral.advertisingData);
	console.log("UUID", uuid.toString());

	if (uuid.toString() == 'feaa') {
		console.log("Found physical web beacon!");
		var url = getUrl(peripheral.advertisingData);
		console.log("URL", url.toString());
	}
});

function getUUID(data) {
	var uuid = "NA";
	data.forEach(function(e){
		if (e.typeFlag == 3) {
			uuid = e.data;
		}
	});
	return uuid;
}

function getUrl(data) {
	var url = "NA";
	var hex = [];

	data.forEach(function(e){
		if (e.typeFlag == 22) {
			url = e.data;
		}
	});

	url.forEach(function(e) {
		hex.push(parseInt(e, 16));
	});

	return encoding.decode(new Buffer(hex.slice(4)));
}
