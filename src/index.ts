import Server from './server';
import { Gps103Adapter } from './adapters/gps103/Adapter';

const adapter = new Gps103Adapter();

const server = new Server(adapter);

server.on('connections', device => {
    device.alarmOffline = true;
	device.maxInterval = (10 * 1000);
	device.startTimerStatusOnline();
	console.log('start');
});

server.on('alarms', (info, device) => {
  console.log(info.code, device.UID)
});

server.on('tracker', (msg) => {
  console.log(msg.imei);
});

 server.run().then(connection => {
   //console.log(connection);
 });