//import 'babel-polyfill';
import { Device } from './device';
import { Iadapter } from './Iadapter';

import util	= require('util');
import events = require('events');
import net	= require('net');
import dgram = require('dgram');

// https://github.com/RisingStack/node-typescript-starter
export default class Server extends events.EventEmitter {

        private connections: any = {};
        private devices:Array<Device> = [];
		private opts:object;

		constructor(private adapter:Iadapter) {
			super();

			return this;
		}

		private setAdapter(adapter:Iadapter){

			this.adapter = adapter;
		}

		private getAdapter() {
			return this.adapter;
		}

		async run() {
			try {
				let that = this;
				that.emit('before_init');

				if (!that.adapter)
					throw 'The app don\'t set the device_adapter to use. Which model is sending data to this server?';

				that.setAdapter(this.adapter);
				that.connections = await that.setServerProtocols(that.adapter.connections, that.adapter.port);

				that.emit('init');

				/* FINAL INIT MESSAGE */
				if(that.adapter.debug)
					console.log(`LISTENER running at port ${that.adapter.port}`, `MODEL: ${that.adapter.connection_name}`);

				return that.connections;
			} catch (error) {
				console.error(error);
			}

		}

		private setServerProtocols(connections:any, port:number){
			let that = this;
			return new Promise(async (resolve, rejected) => {
				try {
					let typeConnections = (typeof connections == 'string')? [ connections ] : connections;
					let servers = { tcp: {}, udp: {} };
					typeConnections.forEach(async (type:string) => {
						switch (type) {
							case 'TCP':
								servers.tcp = await that.createTcpServer(port);
								break;
							case 'UDP':
								servers.udp = await that.createUdpServer(port);
								break;
							default:
								return;
						}
					});

					resolve(servers);
				} catch(error) {
					rejected(error);
				}
			});
		}

		private setListenerDevice(device:Device){
			const deviceId = device.UID;
			let that = this;
			let localDevice = this.devices.find(_device => _device.UID === deviceId);

			if(localDevice) {
				console.log('device not found');
				return;
			}
				

			device.on('connected', ()=> {
				that.emit('connections', device);
			});

			device.on('ping', msg => {
				console.log('message');
				
				that.emit('tracker', msg, device)
			});

			device.on('alarm', (code, msg, detail) => {
				const info = {
					code,
					msg,
					detail
				};
				that.emit('alarms', info, device);
			});

			device.on('disconnected', ()=> {
				that.emit('disconnections', device);
				that.devices.splice(that.devices.indexOf(device), 1);
			});

			this.devices.push(device);
		}

		private createTcpServer(port:number){
			let that = this;
			return new Promise((resolve, rejected) => {
				
				let server = net.createServer( connection => {
					let deviceAdapter = new Device(that.getAdapter());

					connection.on('data', function (data) {
						deviceAdapter.emit("data",data);
					});

					connection.on('end', function () {
						deviceAdapter.emit("end", false);
					});

					that.setListenerDevice(deviceAdapter);

				}).listen(port);

				server.on('error', (err) => {
				  console.log(err);
				});
				resolve({
					connection: server
				})
			});

		}

		private createUdpServer(port:number){
			let that = this;
			return new Promise((resolve, rejected) => {
				let server = dgram.createSocket('udp4');

				server.on('message', (message, remote) => {
					const adapter = that.getAdapter();
					const parseMsg = adapter.parse_data(message);
					const deviceId = parseMsg.device_id;

					if(!deviceId){
						console.log("device id null");
						return;
					}

					let device = that.devices.find(device => device.UID === deviceId);

					if(!device) {
						console.log("new device");
						device = new Device(that.getAdapter());
						that.setListenerDevice(device);
					}

					device.emit("data", message.toString());
				});

				server.on('error', (err) => {
				  console.error('fail in upd server', err);
				});
				server.bind(port);

				resolve({
					connection: server
				});
			});
		}

}
