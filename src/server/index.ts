//import 'babel-polyfill';
import { Device } from './device';

import util			= require('util');
import events	= require('events');
import net	= require('net');
import dgram = require('dgram');

// https://github.com/RisingStack/node-typescript-starter
export default class Server extends events.EventEmitter {

        private connection: any = {};
        private devices:Array<Device> = [];
        private device_adapter:any = null;

		constructor(private opts:any) {
			super();
			let defaults = {
				debug: false,
				port:	8080,
				device_adapter:	false,
				connection: 'TCP'
			};

			this.opts = Object.assign(defaults, opts);
			return this;
		}

		setAdapter(adapter:any){
			if (typeof adapter.adapter != 'function')
				throw 'The adapter needs an adpater() method to start an instance of it';

			this.device_adapter = adapter;
		}

		getAdapter() {
			return this.device_adapter;
		}

		async run() {
			try {
				let that = this;
				that.emit('before_init');

				if (that.opts.device_adapter === false)
					throw 'The app don\'t set the device_adapter to use. Which model is sending data to this server?';

				if(typeof that.opts.device_adapter == 'string')
					throw new Error('Adapter is a string object');

				that.setAdapter(this.opts.device_adapter);
				that.connections = await that.setServerProtocols(this._opts.connections, this._opts.port);

				that.emit('init');

				/* FINAL INIT MESSAGE */
				//console.log(`LISTENER running at port ${that._opts.port}`, `MODEL: ${that.getAdapter().model_name}`);
				return that.connections;
			} catch (error) {
				console.error(error);
			}

		}

		setServerProtocols(connections, port){
			let that = this;
			return new Promise(async (resolve, rejected) => {
				try {
					let typeConnections = (typeof connections == 'string')? [ connections ] : connections;
					let servers = { tcp: null, udp: null };
					typeConnections.forEach(async type => {
						switch (type) {
							case 'TCP':
								servers.tcp = await that.createTcpServer(port);
								break;
							case 'UDP':
								servers.udp = await that.createUdpServer(port);
								break;
						}
					});

					resolve(servers);
				} catch(error) {
					rejected(error);
				}
			});
		}

		setListenerDevice(device){
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
				that.emit('disconnections', ...device);
				that.devices.splice(that.devices.indexOf(device), 1);
			});

			this.devices.push(device);
		}

		createTcpServer(port){
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

		createUdpServer(port){
			let that = this;
			return new Promise((resolve, rejected) => {
				let server = dgram.createSocket('udp4');

				server.on('message', function (message, remote) {
					const adapter = that.getAdapter().adapter(null);
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
