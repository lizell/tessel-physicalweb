var tessel = require('tessel');
var blelib = require('ble-ble113a');
var Beacon = require('./lib/beacon');

var http = require('http');

var ble = blelib.use(tessel.port['A']);
var led2 = tessel.led[0].low();

// tessel push beacon.js -l -a http://www.athega.se/chrille -a sill -a false
var DEBUG = process.argv.length > 2 && process.argv.pop() || false;
var trackItem = process.argv.length > 2 && process.argv.pop() || 'sill';
var physicalWebUrl = process.argv.length > 2 && process.argv.pop() || 'http://www.athega.se/chrille';
debug("Initializing with physical web url", physicalWebUrl, "and item", trackItem);

var ready = function() {
	debug('I\'m ready!');

	// Physical Web Beacon
	var beacon = new Beacon();
	beacon.advertiseUrl(physicalWebUrl);
	debug('Advertising', physicalWebUrl);

	// connect wifi now, if not already connected
	if (!wifi.isConnected()) {
		connect();
	} else {
		// Device scanner
		ble.startScanning();
	}
};

var trackPeripheral = function(peripheral) {
	debug("Discovered peripheral!", peripheral.address.toString(), peripheral.rssi);
	track();
};

ble.on('ready', ready);

ble.on('discover', trackPeripheral);

function track() {
	debug("Going to send track request");
	led2.high();
	var req = http.get({
		host: 't-track.herokuapp.com',
		path: '/t/' + trackItem
	}, function(response) {
		var body = '';
		response.on('data', function(d) {
			body += d;
		});
		response.on('end', function() {
			debug(body);
		});
	});
	req.on('error', function(err) {
		debug("Tracking error:", err);
	});
	req.end();
	setTimeout(function led2ToLow() { led2.low(); }, 750);
}


/* the wifi-cc3000 library is bundled in with Tessel's firmware,
 * so there's no need for an npm install. It's similar
 * to how require('tessel') works.
 */
var wifi = require('wifi-cc3000');
var network = 'Tobbe och hans Mats'; // put in your network name here
var pass = 'athegacodebase'; // put in your password here, or leave blank for unsecured
var security = 'wpa2'; // other options are 'wep', 'wpa', or 'unsecured'
var timeouts = 0;

wifi.on('connect', function(data){
	// you're connected
	debug("connect emitted", data);

	// Device scanner
	ble.startScanning();
});

wifi.on('disconnect', function(data){
	// wifi dropped, probably want to call connect() again
	debug("disconnect emitted", data);
})

wifi.on('timeout', function(err){
	// tried to connect but couldn't, retry
	debug("timeout emitted");
	timeouts++;
	if (timeouts > 2) {
		// reset the wifi chip if we've timed out too many times
		powerCycle();
	} else {
		// try to reconnect
		connect();
	}
});

wifi.on('error', function(err){
	// one of the following happened
	// 1. tried to disconnect while not connected
	// 2. tried to disconnect while in the middle of trying to connect
	// 3. tried to initialize a connection without first waiting for a timeout or a disconnect
	debug("error emitted", err);
});

// reset the wifi chip progammatically
function powerCycle(){
	// when the wifi chip resets, it will automatically try to reconnect
	// to the last saved network
	wifi.reset(function(){
		timeouts = 0; // reset timeouts
		debug("done power cycling");
		// give it some time to auto reconnect
		setTimeout(function(){
			if (!wifi.isConnected()) {
				// try to reconnect
				connect();
			}
		}, 20 *1000); // 20 second wait
	})
}

function connect(){
	wifi.connect({
		security: security
		, ssid: network
		, password: pass
		, timeout: 30 // in seconds
	});
}

function debug(msg, arg1, arg2, arg3) {
	if (DEBUG) console.log(msg, arg1, arg2, arg3);
}
