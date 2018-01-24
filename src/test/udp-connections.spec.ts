import assert = require('assert');
import dgram = require('dgram');
import { Buffer } from 'buffer';
import { should } from 'chai';
import { setInterval, clearInterval } from 'timers';
import chai = require('chai');
import "mocha";

import Server from '../server';
import { Gps103Adapter } from '../adapters/gps103/Adapter';
import { Iadapter } from '../server/Iadapter';


var sinon = require('sinon');

describe('events', () => {

  let server:Server | null;
  let adapter:Iadapter;
  let message:Buffer;
  let client:any;
  let connections:any;
  before(async () => {
    adapter = new Gps103Adapter();
    adapter.connections = ['UDP'];

    server = new Server(adapter);
    client = dgram.createSocket('udp4');
    message = new Buffer("imei:12345678999123,tracker,161003171049,,F,091045.000,A,1017.6730,N,07845.7982,E,0.00,0;")
    connections = await server.run();
  });

  describe('UDP events test', () => {
    it('new connection device', done => {
      
      const imei = 12345678999123;
      let spy = sinon.spy();
      if(!server)
        throw new Error('fail');

      server.once('connections', device => {
        should().equal(device.uid, imei);
        done();
      });

      client.send(message, adapter.port, 'localhost');

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
      let i = 0;
      const interval = setInterval(()=>{
        client.send(message, adapter.port, 'localhost');
        if(i> 3){
            clearInterval(interval);
        }
        i++;
      },300);

    });

    after(()=> {
      server = null;
    });

  });

  

});
