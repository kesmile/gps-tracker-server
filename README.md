# gps-tracker-server

This library allows to connect devices GPS with connections TCP and UDP using events, a lot of devices GPS have different protocols with this module you can create your own adapter and decode the GPS that you need.

## Features
- Connections TPC and UDP at the same time.
- Alarms ON LINE - OFF LINE
- Timer alarm ONLINE
- Custom Adapters (decoder)

## Installation

With package manager [npm](http://npmjs.org/):

npm install gps-tracker-server

## Adapter

Once you have installed you can create your own adapter, the adapter has the next structure:

- **connections:** This parameter indicates that connections are allow, those parameters can be a string with those values *TCP* || *UDP* or both in a array ``` ['TCP','UDP'] ```.

- **connection_name:** This parameter should be a string, this is the name of the adapter it can be a protocol name for example.

- **port:** When the server is running you can choose what port you want to get all request from the devices, this parameter should be a number for example: *5000*.

- **parseData:** This method is called when a new request is sending for the devices, give one parameter *data* you'll need to parse the message and it will return a JSON object with this structure:

``` javascript
{
  start: decode[6], // status
  device_id: decode[0].substring(5),// mandatory
  cmd: decode[1], // mandatory
  data: [
    decode[2], // local time
    decode[5], // time UTC
    decode[7], // latitude
    decode[8],
    decode[9], // longitude
    decode[10],
    decode[11] // speed
  ],
  action: ''// ping || alarm || other
}
```

- **getAlarm** This method is called if a request is an alarm, give one parameter *cmd* this parameter should contain the original code from the device GPS, it should return a JSON object with this structure:

``` javascript
{
  code: 'MOTION_SENSOR',
  msg: 'Shock alarm',
  type: 'ALARM'
}
```
- **getPingData** This method returns all information about the last request, this method give one parameter that contain a message parsed from parseData() it should return a JSON with this structure:

``` javascript
{
  latitude: number,
  longitude: number,
  speed: number,
  orientation: number | null,
  mileage: number | null,
  accuracy: null,
  imei: null,
  inserted: new Date(),
  cmd: '' //code from gps
}
```


## Using
Adapter example for GPS103 protocol.

``` javascript
export default class Gps103Adapter {
  connections = ['TCP', 'UDP'];
  connection_name = 'GPS103';
  port = 5000;
  debug = false;

  parseData(data) {
    data = data.toString();
    let decode = data.split(',');

    if (decode.length < 5) {
      throw new Error('fail');
    }

    let pdata = {
      start: decode[6], // status
      device_id: decode[0].substring(5),// mandatory
      cmd: decode[1], // mandatory
      data: [
        decode[2], // local time
        decode[5], // time UTC
        decode[7], // latitude
        decode[8],
        decode[9], // longitude
        decode[10],
        decode[11] // speed
      ],
      action: ''
    };
    switch (pdata.cmd) {
      case "tracker":
      pdata.action = "ping";
      break;
      case "sensor alarm":
      case "move":
      case "acc alarm":
      case "help me":
      case "acc on":
      case "acc off":
      pdata.action = "alarm";
      break;
      default:
      pdata.action = "other";
    }

    return pdata;
  }

  getAlarm(cmd) {
    switch (cmd) {
      case 'sensor alarm':
        return { code: 'MOTION_SENSOR', msg: 'Shock alarm', type: 'ALARM' };
      case 'help me':
        return { code: 'SOS', msg: 'SOS alarm', type: 'ALARM' };
      case 'low battery':
        return { code: 'LOW_BATTERY', msg: 'low battery alarm', type: 'ALARM' };
      case 'move':
        return { code: 'MOVE', msg: 'move alarm', type: 'MOVE' };
      case 'speed':
        return { code: 'SPEED', msg: 'Over seed alarm', type: 'SPEED' };
      case 'acc alarm':
        return { code: 'ACC_ALARM', msg: 'Acc alarm', type: 'ALARM' };
      case 'acc on':
        return { code: 'ACC_ON', msg: 'Acc on alarm', type: 'ALARM' };
      case 'acc off':
        return { code: 'ACC_OFF', msg: 'Acc off alarm', type: 'ALARM' };
      case 'off_line':
        return { code: 'OFF_LINE', msg: 'Device is offline', type: 'ALARM' };
      case 'on_line':
        return { code: 'ON_LINE', msg: 'Device is online', type: 'ALARM' };
      default:
        return null;
    }
  }

  getPingData(msg) {
    let str = msg.data;
    return {
      latitude: minuteToDecimal(str[2], str[3]),,
      longitude: minuteToDecimal(str[4], str[5]),,
      speed: parseInt(str[6]),
      orientation: 0,
      mileage: 0,
      accuracy: null,
      imei: null,
      inserted: new Date(),
      cmd: null
    }
  }
}

```

## Implementation

``` javascript

import Gps103Adapter from './adapter';
import { Server } from 'gps-tracker-server';

async function start() {

  try {
    let adapter = new Gps103Adapter();
    let server = new Server(adapter);

    server.on('connections', device => {
      //set alarm offline
      device.maxInterval = 120 * 1000 //ten minutes
      device.alarmOffline = true;
      device.startTimerStatusOnline();

      console.log('device start', device.UID);
    })

    server.on('tracker', (msg, device) => {
      console.log(msg, device.UID);
    })

    server.on('alarms', (info, device) => {
      console.log(info, device.UID);
    });

    server.on('disconnections', device => {
      console.log(device.UID);
    });

    await server.run();
    console.log("server start");
  }
  catch (err) {
    console.log(err);
    process.exit(1);
  }

}

start();

```

### TODO

- [X] Upload to github
- [X] Create npm module
- [X] Update README.md
- [X] Documentation
- [ ] Complete unit tests
- [ ] Server Manager
- [ ] Typescript support
