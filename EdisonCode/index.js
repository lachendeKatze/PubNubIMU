/*
* Copyright (c) 2015 - 2016 Intel Corporation.
*
* Permission is hereby granted, free of charge, to any person obtaining
* a copy of this software and associated documentation files (the
* "Software"), to deal in the Software without restriction, including
* without limitation the rights to use, copy, modify, merge, publish,
* distribute, sublicense, and/or sell copies of the Software, and to
* permit persons to whom the Software is furnished to do so, subject to
* the following conditions:
*
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
* LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
* OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
* WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


var noble   = require('noble');
var PubNub  = require('pubnub');

// These should correspond to the peripheral's service and characteristic UUIDs
var LOCAL_NAME = 'imu';
var IMU_SERVICE_UUID = '917649a0d98e11e59eec0002a5d5c51b'; //no dashes!!!!
var ACC_CHAR_UUID =  '917649a1d98e11e59eec0002a5d5c51b';
var GYRO_CHAR_UUID = '917649a2d98e11e59eec0002a5d5c51b';
var BUTTON_CHAR_UUID = '917649a3d98e11e59eec0002a5d5c51b';

// variables to hold transformed imu data
var ax,ay,az,gx,gy,gz;


//instantiate BLE, make sure you enable BT with 'rfkill unblock bluetooth'
noble.on('stateChange', function(state){
	if(state === 'poweredOn'){
		noble.startScanning();
		console.log('Scanning for BLE peripherals...');
	}else{
		noble.stopScanning();
	}
});

pubnub = new PubNub({
				// Your keys here:
        publishKey : '',
        subscribeKey : ''
});


function transformRawImuData(characteristicuuid, data)
{
    var imuBuffer = new Buffer(data);

    if (characteristicuuid == ACC_CHAR_UUID)
    {
        ax = imuBuffer.readFloatLE(0)*10;
        ay = imuBuffer.readFloatLE(4)*10;
        az = imuBuffer.readFloatLE(8)*10;
    }
    else if (characteristicuuid == GYRO_CHAR_UUID)
    {
        gx = imuBuffer.readFloatLE(0)*10;
        gy = imuBuffer.readFloatLE(4)*10;
        gz = imuBuffer.readFloatLE(8)*10;
    }
    else{console.log("unknown uuid!");}
    // console.log('(ax,ay,az): ('+ax+','+ay+','+az+')');
    // console.log('(gx,gy,gz): ('+gx+','+gy+','+gz+')');
    publishImu();
}

function  publishImu() {
    console.log("pub to pubnub");
    pubnub.publish({
        channel: 'gv-acc',
        message:
        { eon:
            {
                'ax': ax,
                'ay': ay,
                'az': az
            }
        }
    });

    pubnub.publish({
        channel: 'gv-gyro',
        message:
        { eon:
            {
                'gx': gx,
                'gy': gy,
                'gz': gz
            }
        }
    });

}

// legacy from my initial tests, not neded here anymore
pubnub.subscribe({

    channel:'gv-test',
    message: function(m){console.log("pn msg: "+ JSON.stringify(m));}


});

noble.on('discover', function(peripheral){

	console.log('Found BLE Device: [' + peripheral.id + '] ' + peripheral.advertisement.localName);
	if(peripheral.advertisement.localName == LOCAL_NAME){
		console.log('Found: ' + peripheral.advertisement.localName);
	}

   peripheral.connect(function(error)
   {
      console.log('Connected to peripheral: ' + peripheral.uuid);

      peripheral.discoverServices([IMU_SERVICE_UUID], function(error, services) {
        console.log('services: ' + services.length);
        var imuService = services[0];
        console.log('Discovered IMU service');

        imuService.discoverCharacteristics([], function(error, characteristics) {
            characteristics.forEach(function(characteristic) {
                console.log('characteristic UUID: ' + characteristic.uuid);
                // emitSensorData(characteristic);
                 characteristic.on('read', function(data) {
                    // console.log('data length: ' + data.length);
                    // console.log('data type: ' + typeof(data));
                    // var ax = new DataView(data).getFloat32(0,true);
                    transformRawImuData(characteristic.uuid,data);
                 });

                characteristic.notify('true', function(error) { if (error) throw error; });


        });
      });
    });





   });

});
