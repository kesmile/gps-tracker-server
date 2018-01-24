import assert = require('assert');
import net = require('net');
import dgram = require('dgram');
import { Buffer } from 'buffer';

import Server from '../server';
import { Gps103Adapter } from '../adapters/gps103/Adapter';
import { Iadapter } from '../server/Iadapter';

import chai = require('chai');
var sinon = require('sinon');

import { should } from 'chai';
import "mocha";
import { setInterval, clearInterval } from 'timers';

describe('events', () => {

  let server:Server | null;
  let adapter:Iadapter;
  let message:Buffer;
  let client:any;
  let connections:any;
  before(async () => {
    adapter = new Gps103Adapter();
    adapter.connections = ['TCP'];
    server = new Server(adapter);
    client = dgram.createSocket('udp4');
    message = new Buffer("imei:12345678999123,tracker,161003171049,,F,091045.000,A,1017.6730,N,07845.7982,E,0.00,0;")
    connections = await server.run();
  });

  describe('TCP events test', () => {
    it('new connection device', done => {
      const imei = 12345678999123;

      if(!server)
        throw new Error('fail');

      server.once('connections', device => {
        should().equal(device.uid, imei);
        done();
      });

      let client = net.connect({ port: adapter.port },()=> {
          client.write(message);
          client.end();
      });

    });

    it('end connection', done => {
      const imei = 12345678999123;

      if(!server)
        throw new Error('fail');

      server.once('disconnections', device => {
        should().equal(device.uid, imei);
        done();
      });

      let client = net.connect({ port: adapter.port },()=> {
          client.write(message);
          client.end();
      });

    });

    it('tracker by device', done => {
      
      const imei = 12345678999123;
      let attempt = 0;

      if(!server)
        throw new Error('fail');

      server.on('tracker', device => {
        if(attempt > 3){
          done();
        }
        attempt++;
        
      });

      let client = net.connect({ port: adapter.port },()=> {
          let i = 0;
          const interval = setInterval(()=>{
            client.write(message);
            if(i> 3){
              clearInterval(interval);
              client.end();
            }
            i++;
          },300);
      });

    });

  });

  after(async () => {
    connections.tcp.unref();
    server = null;
  });

});
